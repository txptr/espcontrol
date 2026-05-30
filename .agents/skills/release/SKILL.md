---
name: release
description: >-
  Create and publish a new GitHub release for this repository by building the
  firmware locally, uploading the release assets, and starting the docs
  deployment. Use when the user says "/release", "make a release", "create a
  GitHub release", "publish a release", "tag a release", "major release",
  "feature release", "minor release", or "patch release".
---

# Local GitHub Release

Create releases from `main`. Firmware release builds now run locally through
`scripts/local_release.py`; publishing a GitHub release no longer starts the
firmware build in GitHub Actions.

## Release Flow

### 1. Check Readiness

Use `main` unless the user explicitly asks for a different branch.

```bash
git status --short --branch
git fetch origin --tags --prune
git switch main
git pull --ff-only origin main
gh auth status
docker info
```

Do not release from uncommitted or unpushed local changes. If local changes are
release-related, commit and push them first. If unrelated changes are present,
explain that they block a clean release and ask how to proceed.

Check recent releases and tags before choosing the new version:

```bash
gh release list --limit 10
git tag --list 'v*' --sort=-v:refname | head -20
```

### 2. Choose the Version

Use long semantic version tags: `vMAJOR.MINOR.PATCH`.

Do not create short release tags such as `v1.0` or `v1.1`. If the user gives a
short tag, normalize it to the long form and confirm before publishing:

```text
v1.0 -> v1.0.0
v1.1 -> v1.1.0
```

If the user gives a full tag like `v1.2.3`, use that exact tag. If the user
asks for a release type instead of a tag, calculate the next version from the
latest stable `vX.Y.Z` tag and confirm the calculated tag before publishing.
Ignore pre-release tags such as `v1.2.3-beta.1` when choosing the stable base.

Version bump rules:

```text
major            v1.2.3 -> v2.0.0
feature or minor v1.2.3 -> v1.3.0
patch            v1.2.3 -> v1.2.4
```

If there is no existing stable release, treat the first stable release as
`v1.0.0` unless the user asks for a different full tag.

### 3. Build, Publish, and Deploy

Run the local release command after the user confirms the calculated tag:

```bash
TAG="vX.Y.Z"
npm run release:local -- \
  --tag "$TAG" \
  --create-release \
  --upload \
  --deploy-docs
```

For a pre-release:

```bash
TAG="vX.Y.Z-beta.N"
npm run release:local -- \
  --tag "$TAG" \
  --create-release \
  --upload \
  --deploy-docs \
  --prerelease
```

The local release script:

- verifies `main` is clean and up to date
- runs the product release preflight checks
- builds every release device with Docker and ESPHome
- generates and verifies `.manifest.json`, `.factory.bin`, and `.ota.bin`
- creates the GitHub release if needed
- uploads firmware assets with `gh release upload --clobber`
- updates release notes from `scripts/release_changelog.py`
- starts the `Deploy Docs` workflow after the firmware assets are uploaded

If a release already exists for the tag, the script uploads assets to that
existing release instead of creating a duplicate.

Do not close GitHub issues as part of this workflow unless the user explicitly
asks; they prefer to test before issues are closed.

### 4. Verify Outputs

After the local command finishes, confirm the release has the expected assets:

```bash
gh release view "$TAG" \
  --json tagName,url,isPrerelease,assets \
  --jq '{tagName, url, isPrerelease, assets: [.assets[].name]}'
```

Expected release assets:

```text
esp32-p4-86.factory.bin
esp32-p4-86.manifest.json
esp32-p4-86.ota.bin
guition-esp32-p4-jc1060p470.factory.bin
guition-esp32-p4-jc1060p470.manifest.json
guition-esp32-p4-jc1060p470.ota.bin
guition-esp32-p4-jc4880p443.factory.bin
guition-esp32-p4-jc4880p443.manifest.json
guition-esp32-p4-jc4880p443.ota.bin
guition-esp32-p4-jc8012p4a1.factory.bin
guition-esp32-p4-jc8012p4a1.manifest.json
guition-esp32-p4-jc8012p4a1.ota.bin
guition-esp32-s3-4848s040.factory.bin
guition-esp32-s3-4848s040.manifest.json
guition-esp32-s3-4848s040.ota.bin
```

Check the docs deployment run:

```bash
gh run list --workflow pages.yml --event workflow_dispatch --limit 5
```

## Report Back

Summarize in plain language:

- release tag and GitHub release URL
- whether the local build and upload completed
- whether the expected firmware assets are attached
- docs deployment run URL and current result if checked
- any action needed from the user, especially if a local build failed
