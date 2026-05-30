#!/usr/bin/env python3
"""Build and publish release firmware from a local machine."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ESPHOME_VERSION = "2026.5.1"
DEFAULT_CACHE_ROOT = Path.home() / ".cache" / "espcontrol-local-release"
DEFAULT_OUTPUT_ROOT = ROOT / "dist" / "release"


class LocalReleaseError(RuntimeError):
    pass


def run(cmd: list[str], *, cwd: Path = ROOT, env: dict[str, str] | None = None) -> str:
    print("+ " + " ".join(cmd))
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if result.returncode != 0:
        raise LocalReleaseError(f"Command failed with exit code {result.returncode}: {' '.join(cmd)}")
    return result.stdout


def require_clean_worktree() -> None:
    status = run(["git", "status", "--short"])
    if status.strip():
        raise LocalReleaseError("The working tree has local changes. Commit or stash them before releasing.")


def current_branch() -> str:
    return run(["git", "branch", "--show-current"]).strip()


def docker_command() -> list[str]:
    if shutil.which("docker"):
        try:
            run(["docker", "info"])
            return ["docker"]
        except LocalReleaseError:
            pass
    if shutil.which("sudo"):
        try:
            run(["sudo", "-n", "docker", "info"])
            return ["sudo", "docker"]
        except LocalReleaseError:
            pass
    raise LocalReleaseError("Docker is not available. Start Docker Desktop and try again.")


def release_matrix() -> list[dict[str, str]]:
    raw = run(["python3", "scripts/device_matrix.py", "release"])
    data = json.loads(raw)
    include = data.get("include")
    if not isinstance(include, list) or not include:
        raise LocalReleaseError("Device release matrix is empty.")
    return include


def find_firmware_factory(build_cache: Path) -> Path:
    for path in (build_cache / "build").rglob("firmware.factory.bin"):
        return path
    raise LocalReleaseError(f"Firmware compilation did not produce firmware.factory.bin in {build_cache}")


def prune_cache(path: Path, max_mb: int, *extra: str) -> None:
    if path.exists():
        run(["bash", "scripts/prune_actions_cache.sh", str(path), str(max_mb), *extra])


def build_device(
    device: dict[str, str],
    *,
    tag: str,
    output_dir: Path,
    cache_root: Path,
    esphome_version: str,
    docker: list[str],
) -> None:
    slug = device["slug"]
    chip = device["chip"]
    print(f"\nBuilding {slug}")

    platformio_cache = cache_root / "esphome" / f"platformio-{esphome_version}"
    run_cache_root = cache_root / "esphome" / "release" / tag
    build_cache = run_cache_root / slug
    platformio_cache.mkdir(parents=True, exist_ok=True)
    build_cache.mkdir(parents=True, exist_ok=True)
    (ROOT / "builds").mkdir(exist_ok=True)

    prune_cache(cache_root / "esphome", 6144, "--protect", str(platformio_cache), "--protect", str(run_cache_root))
    prune_cache(cache_root / "esphome" / "release", 1024, "--protect", str(run_cache_root))
    prune_cache(platformio_cache, 4096, "--strategy", "reset")

    shutil.rmtree(ROOT / ".esphome", ignore_errors=True)
    shutil.rmtree(ROOT / "builds" / ".esphome", ignore_errors=True)

    run(
        [
            *docker,
            "run",
            "--rm",
            "--user",
            f"{os.getuid()}:{os.getgid()}",
            "-e",
            "HOME=/config",
            "-e",
            "PLATFORMIO_CORE_DIR=/config/.esphome/platformio",
            "-e",
            "PLATFORMIO_SETTING_ENABLE_TELEMETRY=false",
            "-v",
            f"{ROOT}:/config",
            "-v",
            f"{platformio_cache}:/config/.esphome",
            "-v",
            f"{build_cache}:/config/builds/.esphome",
            f"ghcr.io/esphome/esphome:{esphome_version}",
            "-s",
            "firmware_version",
            tag,
            "compile",
            f"/config/builds/{slug}.factory.yaml",
        ]
    )

    firmware_factory = find_firmware_factory(build_cache)
    build_dir = firmware_factory.parent
    slug_output = output_dir / slug
    slug_output.mkdir(parents=True, exist_ok=True)

    factory = slug_output / f"{slug}.factory.bin"
    ota = slug_output / f"{slug}.ota.bin"
    manifest = slug_output / f"{slug}.manifest.json"
    shutil.copy2(build_dir / "firmware.factory.bin", factory)
    shutil.copy2(build_dir / "firmware.bin", ota)

    run(
        [
            "python3",
            "scripts/firmware_release.py",
            "manifest",
            "--slug",
            slug,
            "--chip",
            chip,
            "--version",
            tag,
            "--factory",
            str(factory),
            "--ota",
            str(ota),
            "--out",
            str(manifest),
        ]
    )
    run(
        [
            "python3",
            "scripts/firmware_release.py",
            "verify-files",
            "--slug",
            slug,
            "--version",
            tag,
            "--manifest",
            str(manifest),
            "--factory",
            str(factory),
            "--ota",
            str(ota),
        ]
    )

    shutil.rmtree(build_cache, ignore_errors=True)
    prune_cache(platformio_cache, 4096, "--strategy", "reset")
    prune_cache(cache_root / "esphome" / "release", 1024, "--protect", str(run_cache_root))
    prune_cache(cache_root / "esphome", 6144, "--protect", str(platformio_cache))


def flatten_assets(output_dir: Path) -> list[Path]:
    assets: list[Path] = []
    for path in sorted(output_dir.glob("*/*")):
        if path.is_file() and path.suffix in {".bin", ".json"}:
            flat = output_dir / path.name
            if path != flat:
                shutil.copy2(path, flat)
            assets.append(flat)
    return sorted(set(assets))


def release_exists(tag: str) -> bool:
    result = subprocess.run(["gh", "release", "view", tag], cwd=ROOT, text=True, capture_output=True)
    return result.returncode == 0


def create_release(tag: str, target: str, prerelease: bool) -> None:
    if release_exists(tag):
        print(f"Release {tag} already exists; uploading assets to the existing release.")
        return

    cmd = [
        "gh",
        "release",
        "create",
        tag,
        "--target",
        target,
        "--notes",
        "Detailed changelog will be added automatically by the local release process.",
        "--fail-on-no-commits",
    ]
    if prerelease:
        cmd.extend(["--prerelease", "--latest=false"])
    run(cmd)


def update_release_notes(tag: str, target: str) -> None:
    try:
        notes = run(["python3", "scripts/release_changelog.py", tag, "--to", target])
    except LocalReleaseError:
        print("Release changelog generation failed; keeping the existing release notes.", file=sys.stderr)
        return
    if notes.strip():
        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as handle:
            handle.write(notes)
            notes_path = Path(handle.name)
        try:
            run(["gh", "release", "edit", tag, "--notes-file", str(notes_path)])
        finally:
            notes_path.unlink(missing_ok=True)


def upload_assets(tag: str, assets: list[Path]) -> None:
    if not assets:
        raise LocalReleaseError("No firmware assets were generated.")
    run(["gh", "release", "upload", tag, *[str(asset) for asset in assets], "--clobber"])


def deploy_docs() -> None:
    run(["gh", "workflow", "run", "pages.yml", "--ref", "main"])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True, help="Release tag, for example v2.1.0")
    parser.add_argument("--target", default="main", help="Git branch or commit used for the GitHub release")
    parser.add_argument("--output-dir", type=Path, help="Directory for generated firmware files")
    parser.add_argument("--cache-root", type=Path, default=DEFAULT_CACHE_ROOT)
    parser.add_argument("--esphome-version", default=os.environ.get("ESPHOME_VERSION", DEFAULT_ESPHOME_VERSION))
    parser.add_argument("--skip-preflight", action="store_true", help="Skip product release checks")
    parser.add_argument("--skip-build", action="store_true", help="Reuse files already present in the output directory")
    parser.add_argument("--create-release", action="store_true", help="Create the GitHub release if it does not exist")
    parser.add_argument("--upload", action="store_true", help="Upload generated assets to the GitHub release")
    parser.add_argument("--deploy-docs", action="store_true", help="Start the docs deployment after upload")
    parser.add_argument("--prerelease", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    output_dir = (args.output_dir or (DEFAULT_OUTPUT_ROOT / args.tag)).resolve()
    cache_root = args.cache_root.resolve()

    try:
        if current_branch() != args.target:
            raise LocalReleaseError(f"Switch to {args.target} before releasing.")
        require_clean_worktree()
        run(["git", "fetch", "origin", "--tags", "--prune"])
        run(["git", "pull", "--ff-only", "origin", args.target])
        run(["gh", "auth", "status"])

        devices = release_matrix()
        slugs = [device["slug"] for device in devices]

        if not args.skip_preflight:
            run(["npm", "run", "check:release-preflight"])

        if not args.skip_build:
            shutil.rmtree(output_dir, ignore_errors=True)
            output_dir.mkdir(parents=True, exist_ok=True)
            docker = docker_command()
            for device in devices:
                build_device(
                    device,
                    tag=args.tag,
                    output_dir=output_dir,
                    cache_root=cache_root,
                    esphome_version=args.esphome_version,
                    docker=docker,
                )

        run(
            [
                "python3",
                "scripts/firmware_release.py",
                "verify-directory",
                "--version",
                args.tag,
                "--dir",
                str(output_dir),
                "--slugs",
                *slugs,
            ]
        )
        assets = flatten_assets(output_dir)

        if args.create_release:
            create_release(args.tag, args.target, args.prerelease)
        if args.upload:
            if not release_exists(args.tag):
                raise LocalReleaseError(f"Release {args.tag} does not exist. Use --create-release or create it first.")
            upload_assets(args.tag, assets)
            update_release_notes(args.tag, args.target)
        if args.deploy_docs:
            deploy_docs()

        print(f"\nLocal release complete: {args.tag}")
        print(f"Firmware files: {output_dir}")
    except (LocalReleaseError, json.JSONDecodeError) as exc:
        print(f"::error::{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
