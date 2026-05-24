// ── Init ───────────────────────────────────────────────────────────────

var FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#5c73e7" d="M12,3L2,12H5V20H19V12H22L12,3M12,8.5C14.34,8.5 16.46,9.43 18,10.94L16.8,12.12C15.58,10.91 13.88,10.17 12,10.17C10.12,10.17 8.42,10.91 7.2,12.12L6,10.94C7.54,9.43 9.66,8.5 12,8.5M12,11.83C13.4,11.83 14.67,12.39 15.6,13.3L14.4,14.47C13.79,13.87 12.94,13.5 12,13.5C11.06,13.5 10.21,13.87 9.6,14.47L8.4,13.3C9.33,12.39 10.6,11.83 12,11.83M12,15.17C12.94,15.17 13.7,15.91 13.7,16.83C13.7,17.75 12.94,18.5 12,18.5C11.06,18.5 10.3,17.75 10.3,16.83C10.3,15.91 11.06,15.17 12,15.17Z"/></svg>';

function setFavicon() {
  var link = document.querySelector('link[rel="icon"]') || document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = "data:image/svg+xml," + encodeURIComponent(FAVICON_SVG);
  if (!link.parentNode) document.head.appendChild(link);
}

function addSupportButton() {
  if (document.querySelector(".sp-support-btn")) return;
  var link = document.createElement("a");
  link.className = "sp-support-btn";
  link.href = "https://www.buymeacoffee.com/jtenniswood";
  link.target = "_blank";
  link.rel = "noopener";
  link.innerHTML = '<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" style="border-radius:999px;">';
  document.body.appendChild(link);
}

function init() {
  setFavicon();

  // Set CSS custom properties from the active device orientation.
  syncPreviewOrientation();

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var mdi = document.createElement("link");
  mdi.rel = "stylesheet";
  mdi.href = "https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css";
  document.head.appendChild(mdi);

  var fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500&display=swap";
  document.head.appendChild(fonts);

  buildUI();
  addSupportButton();
  syncClockBarUi();
  setupPreviewEvents();
  renderPreview();
  renderButtonSettings();
  connectEvents();
  updateClock();

  document.addEventListener("click", hideContextMenu);
  document.addEventListener("mousedown", handleDocumentSelectionMouseDown);
  document.addEventListener("scroll", hideContextMenu, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideContextMenu();
  });
}

// ── Export / Import ────────────────────────────────────────────────────

function exportConfig() {
  var data = createBackupConfig({
    device: DEVICE_ID,
    slots: NUM_SLOTS,
    exported_at: new Date().toISOString(),
    grid: state.grid,
    sizes: state.sizes,
    button_order: serializeGrid(state.grid),
    button_on_color: state.onColor,
    button_off_color: state.offColor,
    sensor_card_color: state.sensorColor,
    buttons: state.buttons,
    subpages: state.subpages,
    settings: {
      indoor_temp_enable: state._indoorOn,
      outdoor_temp_enable: state._outdoorOn,
      indoor_temp_entity: state.indoorEntity,
      outdoor_temp_entity: state.outdoorEntity,
      temperature_unit: normalizeTemperatureUnit(state.temperatureUnit),
      clock_bar: state.clockBarOn,
      network_status_icon: state.networkStatusOn,
      temperature_degree_symbol: state.temperatureDegreeSymbolOn,
      timezone: state.timezone,
      clock_format: state.clockFormat,
      ntp_server_1: state.ntpServer1,
      ntp_server_2: state.ntpServer2,
      ntp_server_3: state.ntpServer3,
      month_names: serializeMonthNames(state.monthNames),
      screensaver_mode: getActiveScreensaverMode(),
      presence_sensor_entity: state.presenceEntity,
      media_player_sleep_prevention: state.mediaPlayerSleepPreventionOn,
      media_player_sleep_prevention_entity: state.mediaPlayerSleepPreventionEntity,
      screensaver_action: normalizeScreensaverAction(state.screensaverAction),
      clock_screensaver: state.clockScreensaverOn,
      clock_brightness: state.clockBrightnessDay,
      clock_brightness_day: state.clockBrightnessDay,
      clock_brightness_night: state.clockBrightnessNight,
      screensaver_dimmed_brightness: normalizeScreensaverDimmedBrightness(state.screensaverDimmedBrightness),
      screensaver_timeout: state.screensaverTimeout,
      home_screen_timeout: state.homeScreenTimeout,
      screen_rotation: state.screenRotation,
      developer_experimental_features: state.developerExperimentalFeatures,
    },
    screen: {
      brightness_day: Math.round(state.brightnessDayVal),
      brightness_night: Math.round(state.brightnessNightVal),
      automatic_brightness: !!state.automaticBrightnessEnabled,
      schedule_enabled: !!state.scheduleEnabled,
      schedule_on_hour: normalizeHour(state.scheduleOnHour, 6),
      schedule_off_hour: normalizeHour(state.scheduleOffHour, 23),
      schedule_mode: normalizeScheduleMode(state.scheduleMode),
      schedule_wake_timeout: normalizeScheduleWakeTimeout(state.scheduleWakeTimeout),
      schedule_wake_brightness: normalizeScheduleWakeBrightness(state.scheduleWakeBrightness),
      schedule_dimmed_brightness: normalizeScheduleDimmedBrightness(state.scheduleDimmedBrightness),
      schedule_clock_brightness: normalizeScheduleClockBrightness(state.scheduleClockBrightness),
    },
  });

  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var now = new Date();
  var name = "espcontrol-config-" +
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0") + ".json";
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importConfig() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.style.display = "none";

  function cleanupInput() {
    if (input.parentNode) input.parentNode.removeChild(input);
  }

  input.addEventListener("cancel", cleanupInput);
  input.addEventListener("change", function () {
    if (!input.files || !input.files[0]) {
      cleanupInput();
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      cleanupInput();
      showBanner("Invalid file \u2014 could not read backup", "error");
    };
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); } catch (_) {
        showBanner("Invalid file \u2014 could not parse JSON", "error");
        cleanupInput();
        return;
      }

      var backupPlan;
      try {
        backupPlan = planBackupImport(data, { device: DEVICE_ID, slots: NUM_SLOTS });
      } catch (e) {
        showBanner(e.backupMessage || "Invalid config file \u2014 missing required fields", "error");
        cleanupInput();
        return;
      }
      for (var warningIdx = 0; warningIdx < backupPlan.warnings.length; warningIdx++) {
        showBanner(backupPlan.warnings[warningIdx], "warning");
      }

      postText("Button On Color", backupPlan.config.button_on_color);
      postText("Button Off Color", backupPlan.config.button_off_color);
      postText("Sensor Card Color", backupPlan.config.sensor_card_color);

      for (var i = 0; i < NUM_SLOTS; i++) {
        var b = backupPlan.buttons[i];
        var n = i + 1;
        state.buttons[i] = backupNormalizeButtonConfig(b);
        saveButtonConfig(n);
      }

      state.subpages = {};
      state.subpageRaw = {};
      for (var subpageKey in backupPlan.subpages) {
        state.subpages[subpageKey] = backupPlan.subpages[subpageKey];
        saveSubpageEntity(subpageKey);
      }

      postText("Button Order", backupPlan.button_order);
      applyImportedButtonOrder(backupPlan.button_order, backupPlan.importedSizes);
      state.onColor = backupPlan.config.button_on_color;
      state.offColor = backupPlan.config.button_off_color;
      state.sensorColor = backupPlan.config.sensor_card_color;

      if (els.setOnColor && els.setOnColor._syncColor) els.setOnColor._syncColor(state.onColor);
      if (els.setOffColor && els.setOffColor._syncColor) els.setOffColor._syncColor(state.offColor);
      if (els.setSensorColor && els.setSensorColor._syncColor) els.setSensorColor._syncColor(state.sensorColor);

      if (backupPlan.settings) {
        var s = backupPlan.settings;

        postSwitch("Indoor Temp Enable", !!s.indoor_temp_enable);
        postSwitch("Outdoor Temp Enable", !!s.outdoor_temp_enable);
        postText("Indoor Temp Entity", s.indoor_temp_entity || "");
        postText("Outdoor Temp Entity", s.outdoor_temp_entity || "");
        postClockBar(s.clock_bar != null ? !!s.clock_bar : false);
        postNetworkStatusIcon(s.network_status_icon != null ? !!s.network_status_icon : true);
        postTemperatureDegreeSymbol(s.temperature_degree_symbol != null ? !!s.temperature_degree_symbol : true);
        var importedTimezone = s.timezone || state.timezone;
        var importedTemperatureUnit = normalizeTemperatureUnit(s.temperature_unit);
        var importedClockFormat =
          state.clockFormatOptions.indexOf(s.clock_format) !== -1
            ? s.clock_format
            : state.clockFormat;
        var hasNtpServer1 = Object.prototype.hasOwnProperty.call(s, "ntp_server_1");
        var hasNtpServer2 = Object.prototype.hasOwnProperty.call(s, "ntp_server_2");
        var hasNtpServer3 = Object.prototype.hasOwnProperty.call(s, "ntp_server_3");
        var hasMonthNames = Object.prototype.hasOwnProperty.call(s, "month_names");
        var hasDeveloperExperimentalFeatures =
          Object.prototype.hasOwnProperty.call(s, "developer_experimental_features");
        var importedDeveloperExperimentalFeatures = hasDeveloperExperimentalFeatures
          ? !!s.developer_experimental_features
          : state.developerExperimentalFeatures;
        var importedNtpServer1 = hasNtpServer1
          ? normalizeNtpServer(s.ntp_server_1, NTP_SERVER_DEFAULTS[0])
          : state.ntpServer1;
        var importedNtpServer2 = hasNtpServer2
          ? normalizeNtpServer(s.ntp_server_2, NTP_SERVER_DEFAULTS[1])
          : state.ntpServer2;
        var importedNtpServer3 = hasNtpServer3
          ? normalizeNtpServer(s.ntp_server_3, NTP_SERVER_DEFAULTS[2])
          : state.ntpServer3;
        var importedMonthNames = hasMonthNames
          ? normalizeMonthNames(s.month_names)
          : state.monthNames;
        if (s.timezone) postSelect("Screen: Timezone", importedTimezone);
        postSelect("Screen: Temperature Unit", importedTemperatureUnit);
        if (s.clock_format) postSelect("Screen: Clock Format", importedClockFormat);
        if (hasNtpServer1) {
          postText("Screen: NTP Server 1", importedNtpServer1);
        }
        if (hasNtpServer2) {
          postText("Screen: NTP Server 2", importedNtpServer2);
        }
        if (hasNtpServer3) {
          postText("Screen: NTP Server 3", importedNtpServer3);
        }
        if (hasMonthNames) {
          postText("Screen: Month Names", serializeMonthNames(importedMonthNames));
        }
        var importedScreensaverMode = s.screensaver_mode || "disabled";
        if (importedScreensaverMode !== "sensor" &&
            importedScreensaverMode !== "timer" &&
            importedScreensaverMode !== "disabled") {
          importedScreensaverMode = "disabled";
        }
        postText("Screensaver Mode", importedScreensaverMode);
        postText("Presence Sensor Entity", s.presence_sensor_entity || "");
        postSwitch("Screen Saver: Media Player Sleep Prevention", !!s.media_player_sleep_prevention);
        postText("Media Player Sleep Prevention Entity", s.media_player_sleep_prevention_entity || "");
        var importedScreensaverAction = normalizeScreensaverAction(
          s.screensaver_action != null
            ? s.screensaver_action
            : (s.clock_screensaver ? "clock" : "off"));
        var importedScreensaverDimmedBrightness = normalizeScreensaverDimmedBrightness(
          s.screensaver_dimmed_brightness);
        var importedClockBrightnessDay = normalizeClockBrightness(
          s.clock_brightness_day != null ? s.clock_brightness_day : s.clock_brightness,
          35);
        var importedClockBrightnessNight = normalizeClockBrightness(
          s.clock_brightness_night != null ? s.clock_brightness_night : s.clock_brightness,
          importedClockBrightnessDay);
        postScreensaverAction(importedScreensaverAction);
        postSwitch("Screen Saver: Clock", importedScreensaverAction === "clock");
        postClockBrightnessDay(importedClockBrightnessDay);
        postClockBrightnessNight(importedClockBrightnessNight);
        postScreensaverDimmedBrightness(importedScreensaverDimmedBrightness);
        postScreensaverTimeout(s.screensaver_timeout || 300);
        postNumber("Home Screen Timeout", s.home_screen_timeout != null ? s.home_screen_timeout : 60);
        var importedScreenRotation = normalizeScreenRotation(s.screen_rotation);
        if (CFG.features && CFG.features.screenRotation) postSelect("Screen: Rotation", importedScreenRotation);
        if (hasDeveloperExperimentalFeatures) {
          postDeveloperExperimentalFeatures(importedDeveloperExperimentalFeatures);
        }
        state._indoorOn = !!s.indoor_temp_enable;
        state._outdoorOn = !!s.outdoor_temp_enable;
        state.indoorEntity = s.indoor_temp_entity || "";
        state.outdoorEntity = s.outdoor_temp_entity || "";
        state.temperatureUnit = importedTemperatureUnit;
        state.clockBarOn = s.clock_bar != null ? !!s.clock_bar : false;
        state.networkStatusOn = s.network_status_icon != null ? !!s.network_status_icon : true;
        state.temperatureDegreeSymbolOn = s.temperature_degree_symbol != null ? !!s.temperature_degree_symbol : true;
        state.timezone = importedTimezone;
        state.clockFormat = importedClockFormat;
        state.ntpServer1 = importedNtpServer1;
        state.ntpServer2 = importedNtpServer2;
        state.ntpServer3 = importedNtpServer3;
        state.monthNames = importedMonthNames;
        state.customMonthNames = hasCustomMonthNames();
        state.customNtpServers = hasCustomNtpServers();
        state.screensaverMode = importedScreensaverMode;
        state._screensaverModeReceived = true;
        state.presenceEntity = s.presence_sensor_entity || "";
        state.mediaPlayerSleepPreventionOn = !!s.media_player_sleep_prevention;
        state.mediaPlayerSleepPreventionEntity = s.media_player_sleep_prevention_entity || "";
        state.screensaverAction = importedScreensaverAction;
        state._screensaverActionReceived = true;
        state.clockScreensaverOn = importedScreensaverAction === "clock";
        state.clockBrightnessDay = importedClockBrightnessDay;
        state.clockBrightnessNight = importedClockBrightnessNight;
        state.screensaverDimmedBrightness = importedScreensaverDimmedBrightness;
        state.screensaverTimeout = s.screensaver_timeout || 300;
        state.homeScreenTimeout = s.home_screen_timeout != null ? s.home_screen_timeout : 60;
        state.screenRotation = importedScreenRotation;
        if (hasDeveloperExperimentalFeatures) {
          state.developerExperimentalFeatures = importedDeveloperExperimentalFeatures;
        }

        syncTemperatureUi();
        syncClockBarUi();
        syncInput(els.setIndoorEntity, state.indoorEntity);
        syncInput(els.setOutdoorEntity, state.outdoorEntity);
        if (els.setTemperatureUnit) els.setTemperatureUnit.value = state.temperatureUnit;
        syncInput(els.setPresence, state.presenceEntity);
        syncInput(els.setMediaPlayerSleepPrevention, state.mediaPlayerSleepPreventionEntity);
        syncMediaPlayerSleepPreventionUi();
        if (els.setTimezone) els.setTimezone.value = state.timezone;
        if (els.setClockFormat) els.setClockFormat.value = state.clockFormat;
        syncNtpServerUi();
        syncMonthNameUi();
        syncClockScreensaverControls();
        syncScreensaverTimeoutUi();
        syncIdleUi();
        if (els.setScreenRotation) els.setScreenRotation.value = state.screenRotation;
        syncPreviewOrientation();
        if (els.setDeveloperExperimentalFeatures) {
          els.setDeveloperExperimentalFeatures.checked = state.developerExperimentalFeatures;
        }
        if (els.setSsMode) els.setSsMode(getActiveScreensaverMode());
        updateTempPreview();

      }

      var screenSettings = backupPlan.screen;
      if (screenSettings) {
        state.brightnessDayVal = parseFloat(screenSettings.brightness_day);
        if (!isFinite(state.brightnessDayVal)) state.brightnessDayVal = 100;
        state.brightnessNightVal = parseFloat(screenSettings.brightness_night);
        if (!isFinite(state.brightnessNightVal)) state.brightnessNightVal = 75;
        state.automaticBrightnessEnabled = screenSettings.automatic_brightness != null
          ? !!screenSettings.automatic_brightness
          : true;
        state.scheduleEnabled = !!screenSettings.schedule_enabled;
        state.scheduleOnHour = normalizeHour(screenSettings.schedule_on_hour, 6);
        state.scheduleOffHour = normalizeHour(screenSettings.schedule_off_hour, 23);
        state.scheduleMode = normalizeScheduleMode(screenSettings.schedule_mode);
        state.scheduleWakeTimeout = normalizeScheduleWakeTimeout(screenSettings.schedule_wake_timeout);
        state.scheduleWakeBrightness = normalizeScheduleWakeBrightness(
          screenSettings.schedule_wake_brightness != null
            ? screenSettings.schedule_wake_brightness
            : state.scheduleWakeBrightness
        );
        state.scheduleDimmedBrightness = normalizeScheduleDimmedBrightness(
          screenSettings.schedule_dimmed_brightness != null
            ? screenSettings.schedule_dimmed_brightness
            : state.scheduleDimmedBrightness
        );
        state.scheduleClockBrightness = normalizeScheduleClockBrightness(
          screenSettings.schedule_clock_brightness != null
            ? screenSettings.schedule_clock_brightness
            : state.scheduleClockBrightness
        );

        postNumber("Screen: Daytime Brightness", state.brightnessDayVal);
        postNumber("Screen: Nighttime Brightness", state.brightnessNightVal);
        postAutomaticBrightnessEnabled(state.automaticBrightnessEnabled);
        postScreenScheduleOnHour(state.scheduleOnHour);
        postScreenScheduleOffHour(state.scheduleOffHour);
        postScreenScheduleMode(state.scheduleMode);
        postScreenScheduleWakeTimeout(state.scheduleWakeTimeout);
        postScreenScheduleWakeBrightness(state.scheduleWakeBrightness);
        postScreenScheduleDimmedBrightness(state.scheduleDimmedBrightness);
        postScreenScheduleClockBrightness(state.scheduleClockBrightness);
        postScreenScheduleEnabled(state.scheduleEnabled);

        if (els.setDayBrightness) {
          els.setDayBrightness.value = state.brightnessDayVal;
          els.setDayBrightnessVal.textContent = Math.round(state.brightnessDayVal) + "%";
        }
        if (els.setNightBrightness) {
          els.setNightBrightness.value = state.brightnessNightVal;
          els.setNightBrightnessVal.textContent = Math.round(state.brightnessNightVal) + "%";
        }
        syncScreenScheduleUi();
      }

      state.selectedSlots = [];
      state.lastClickedSlot = -1;
      renderPreview();
      renderButtonSettings();
      switchTab("screen");
      showBanner("Configuration imported successfully", "success");
      cleanupInput();
    };
    reader.readAsText(input.files[0]);
  });

  document.body.appendChild(input);
  input.click();
}

// ── Clock (minute-aligned) ─────────────────────────────────────────────

function getTzId(tz) {
  var idx = tz.indexOf(" (");
  return idx > 0 ? tz.substring(0, idx) : tz;
}

function formatGmtOffset(minutes) {
  var sign = minutes >= 0 ? "+" : "-";
  var abs = Math.abs(minutes);
  var h = Math.floor(abs / 60);
  var m = abs % 60;
  return "GMT" + sign + h + (m ? ":" + String(m).padStart(2, "0") : "");
}

function timezoneOffsetMinutes(tzId, date) {
  try {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tzId,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(date);
    var values = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== "literal") values[parts[i].type] = parts[i].value;
    }
    var localAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    return Math.round((localAsUtc - date.getTime()) / 60000);
  } catch (_) {
    return null;
  }
}

function formatTimezoneOption(opt) {
  var tzId = getTzId(opt);
  var offset = timezoneOffsetMinutes(tzId, new Date());
  if (offset == null || !isFinite(offset)) return opt;
  return tzId + " (" + formatGmtOffset(offset) + ")";
}

function appendTimezoneOption(select, opt) {
  var o = document.createElement("option");
  o.value = opt;
  o.textContent = formatTimezoneOption(opt);
  select.appendChild(o);
}

function updateClock() {
  if (!els.clock) return;
  var now = new Date();
  var tzId = getTzId(state.timezone);
  try {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tzId, hour: "numeric", minute: "2-digit",
      hour12: state.clockFormat === "12h"
    }).formatToParts(now);
    var h = "", m = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "hour") h = parts[i].value;
      else if (parts[i].type === "minute") m = parts[i].value;
    }
    els.clock.textContent = (state.clockFormat === "24h"
      ? h.padStart(2, "0") : h) + ":" + m;
  } catch (_) {
    var hr = now.getUTCHours();
    var mn = String(now.getUTCMinutes()).padStart(2, "0");
    els.clock.textContent = String(hr).padStart(2, "0") + ":" + mn;
  }
  var msToNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(updateClock, msToNext + 50);
}

// ── SSE ────────────────────────────────────────────────────────────────

function connectEvents() {
  if (_eventSource) { _eventSource.close(); _eventSource = null; }

  function markConnected() {
    state.selectedSlots = [];
    state.lastClickedSlot = -1;
    state.editingSubpage = null;
    state.subpageSelectedSlots = [];
    state.subpageLastClicked = -1;
    orderReceived = false;
    setConfigLocked(false);
    if (els.banner) els.banner.className = "sp-banner";
    els.root.querySelectorAll(".sp-apply-btn").forEach(function (btn) {
      btn.disabled = false;
      btn.textContent = "Apply Configuration";
    });
    clearTimeout(migrationTimer);
    migrationTimer = setTimeout(scheduleMigration, 5000);
    clearTimeout(sliderMigrationTimer);
    pendingSliderSubpageMigrations = {};
    refreshFirmwareVersion();
    refreshScreensaverTimeout();
  }

  function handleDisconnected(source) {
    setConfigLocked(true, "Reconnecting to device\u2026");
    showBanner("Reconnecting to device\u2026", "offline");
    if (source.readyState === 2) {
      source.close();
      _eventSource = null;
      setTimeout(connectEvents, 5000);
    }
  }

  var sseHandlers = {
    "text-button_order": function (val) {
      orderReceived = !!(val && val.trim());
      state.sizes = {};
      state.grid = parseOrder(val);
      state.selectedSlots = state.selectedSlots.filter(function (s) {
        return state.grid.indexOf(s) !== -1;
      });
      scheduleRender();
    },
    "text-button_on_color": function (val) {
      state.onColor = val;
      if (els.setOnColor && els.setOnColor._syncColor) els.setOnColor._syncColor(val);
      renderPreview();
    },
    "text-button_off_color": function (val) {
      state.offColor = val;
      if (els.setOffColor && els.setOffColor._syncColor) els.setOffColor._syncColor(val);
      renderPreview();
    },
    "text-sensor_card_color": function (val) {
      state.sensorColor = val;
      if (els.setSensorColor && els.setSensorColor._syncColor) els.setSensorColor._syncColor(val);
      renderPreview();
    },
    "switch-indoor_temp_enable": function (val, d) {
      state._indoorOn = d.value === true || val === "ON";
      syncTemperatureUi();
      updateTempPreview();
    },
    "switch-outdoor_temp_enable": function (val, d) {
      state._outdoorOn = d.value === true || val === "ON";
      syncTemperatureUi();
      updateTempPreview();
    },
    "switch-screen__clock_bar": function (val, d) {
      state.clockBarOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-screen_clock_bar": function (val, d) {
      state.clockBarOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-clock_bar_enabled": function (val, d) {
      state.clockBarOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-screen__network_status_icon": function (val, d) {
      state.networkStatusOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-screen_network_status_icon": function (val, d) {
      state.networkStatusOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-network_status_enabled": function (val, d) {
      state.networkStatusOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-screen__temperature_degree_symbol": function (val, d) {
      state.temperatureDegreeSymbolOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-screen_temperature_degree_symbol": function (val, d) {
      state.temperatureDegreeSymbolOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "switch-temperature_degree_symbol_enabled": function (val, d) {
      state.temperatureDegreeSymbolOn = d.value === true || val === "ON";
      syncClockBarUi();
    },
    "text-indoor_temp_entity": function (val) {
      state.indoorEntity = val;
      syncInput(els.setIndoorEntity, val);
    },
    "text-outdoor_temp_entity": function (val) {
      state.outdoorEntity = val;
      syncInput(els.setOutdoorEntity, val);
    },
    "select-screen__temperature_unit": function (val, d) {
      state.temperatureUnit = normalizeTemperatureUnit(d.value || val);
      if (els.setTemperatureUnit) els.setTemperatureUnit.value = state.temperatureUnit;
      updateTempPreview();
      renderPreview();
    },
    "number-screensaver_timeout": function (val, d) {
      applyScreensaverTimeoutState(d);
    },
    "number-screen_saver__timeout": function (val, d) {
      applyScreensaverTimeoutState(d);
    },
    "number-screen_saver_timeout": function (val, d) {
      applyScreensaverTimeoutState(d);
    },
    "number-home_screen_timeout": function (val) {
      state.homeScreenTimeout = parseFloat(val) || 0;
      syncIdleUi();
    },
    "switch-screen_saver__clock": function (val, d) {
      state.clockScreensaverOn = d.value === true || val === "ON";
      if (!state._screensaverActionReceived) {
        state.screensaverAction = state.clockScreensaverOn ? "clock" : "off";
      }
      syncClockScreensaverControls();
    },
    "switch-screen_saver__media_player_sleep_prevention": function (val, d) {
      state.mediaPlayerSleepPreventionOn = d.value === true || val === "ON";
      syncMediaPlayerSleepPreventionUi();
    },
    "number-screen_saver__clock_brightness": function (val) {
      if (state.clockBrightnessSplitReceived) return;
      var brightness = normalizeClockBrightness(val, 35);
      state.clockBrightnessDay = brightness;
      state.clockBrightnessNight = brightness;
      syncClockScreensaverControls();
    },
    "number-screen_saver__daytime_clock_brightness": function (val) {
      state.clockBrightnessSplitReceived = true;
      state.clockBrightnessDay = normalizeClockBrightness(val, 35);
      syncClockScreensaverControls();
    },
    "number-screen_saver__nighttime_clock_brightness": function (val) {
      state.clockBrightnessSplitReceived = true;
      state.clockBrightnessNight = normalizeClockBrightness(val, state.clockBrightnessDay);
      syncClockScreensaverControls();
    },
    "select-screen_saver__action": function (val, d) {
      state._screensaverActionReceived = true;
      state.screensaverAction = normalizeScreensaverAction(d.value || val);
      state.clockScreensaverOn = state.screensaverAction === "clock";
      syncClockScreensaverControls();
    },
    "number-screen_saver__dimmed_brightness": function (val) {
      state.screensaverDimmedBrightness = normalizeScreensaverDimmedBrightness(val);
      syncClockScreensaverControls();
    },
    "text-presence_sensor_entity": function (val) {
      state.presenceEntity = val;
      syncInput(els.setPresence, val);
      if (state.screensaverMode === "") {
        if (els.setSsMode) els.setSsMode(getActiveScreensaverMode());
      }
    },
    "text-media_player_sleep_prevention_entity": function (val) {
      state.mediaPlayerSleepPreventionEntity = val;
      syncInput(els.setMediaPlayerSleepPrevention, val);
    },
    "text-screensaver_mode": function (val) {
      state._screensaverModeReceived = true;
      state.screensaverMode = val === "sensor" || val === "timer" || val === "disabled" ? val : "disabled";
      if (els.setSsMode) els.setSsMode(getActiveScreensaverMode());
    },
    "number-screen__daytime_brightness": function (val) {
      state.brightnessDayVal = parseFloat(val) || 100;
      if (els.setDayBrightness) {
        els.setDayBrightness.value = state.brightnessDayVal;
        els.setDayBrightnessVal.textContent = Math.round(state.brightnessDayVal) + "%";
      }
    },
    "number-screen__nighttime_brightness": function (val) {
      state.brightnessNightVal = parseFloat(val) || 75;
      if (els.setNightBrightness) {
        els.setNightBrightness.value = state.brightnessNightVal;
        els.setNightBrightnessVal.textContent = Math.round(state.brightnessNightVal) + "%";
      }
    },
    "switch-screen__automatic_brightness": function (val, d) {
      state.automaticBrightnessEnabled = d.value === true || val === "ON";
      syncScreenScheduleUi();
    },
    "switch-screen__schedule_enabled": function (val, d) {
      state.scheduleEnabled = d.value === true || val === "ON";
      syncScreenScheduleUi();
    },
    "number-screen__schedule_on_hour": function (val) {
      state.scheduleOnHour = normalizeHour(val, 6);
      syncScreenScheduleUi();
    },
    "number-screen__schedule_off_hour": function (val) {
      state.scheduleOffHour = normalizeHour(val, 23);
      syncScreenScheduleUi();
    },
    "select-screen__schedule_mode": function (val, d) {
      state.scheduleMode = normalizeScheduleMode(d.value || val);
      syncScreenScheduleUi();
    },
    "number-screen__schedule_wake_timeout": function (val) {
      state.scheduleWakeTimeout = normalizeScheduleWakeTimeout(val);
      syncScreenScheduleUi();
    },
    "number-screen_schedule_wake_timeout": function (val) {
      state.scheduleWakeTimeout = normalizeScheduleWakeTimeout(val);
      syncScreenScheduleUi();
    },
    "number-schedule_wake_timeout": function (val) {
      state.scheduleWakeTimeout = normalizeScheduleWakeTimeout(val);
      syncScreenScheduleUi();
    },
    "number-screen__schedule_wake_brightness": function (val) {
      state.scheduleWakeBrightness = normalizeScheduleWakeBrightness(val);
      syncScreenScheduleUi();
    },
    "number-screen_schedule_wake_brightness": function (val) {
      state.scheduleWakeBrightness = normalizeScheduleWakeBrightness(val);
      syncScreenScheduleUi();
    },
    "number-schedule_wake_brightness": function (val) {
      state.scheduleWakeBrightness = normalizeScheduleWakeBrightness(val);
      syncScreenScheduleUi();
    },
    "number-screen__schedule_dimmed_brightness": function (val) {
      state.scheduleDimmedBrightness = normalizeScheduleDimmedBrightness(val);
      syncScreenScheduleUi();
    },
    "number-screen_schedule_dimmed_brightness": function (val) {
      state.scheduleDimmedBrightness = normalizeScheduleDimmedBrightness(val);
      syncScreenScheduleUi();
    },
    "number-schedule_dimmed_brightness": function (val) {
      state.scheduleDimmedBrightness = normalizeScheduleDimmedBrightness(val);
      syncScreenScheduleUi();
    },
    "number-screen__schedule_clock_brightness": function (val) {
      state.scheduleClockBrightness = normalizeScheduleClockBrightness(val);
      syncScreenScheduleUi();
    },
    "number-screen_schedule_clock_brightness": function (val) {
      state.scheduleClockBrightness = normalizeScheduleClockBrightness(val);
      syncScreenScheduleUi();
    },
    "number-schedule_clock_brightness": function (val) {
      state.scheduleClockBrightness = normalizeScheduleClockBrightness(val);
      syncScreenScheduleUi();
    },
    "select-screen__timezone": function (val, d) {
      state.timezone = d.value || val || state.timezone;
      if (d.option && Array.isArray(d.option)) {
        state.timezoneOptions = d.option;
        if (els.setTimezone) {
          els.setTimezone.innerHTML = "";
          d.option.forEach(function (opt) {
            appendTimezoneOption(els.setTimezone, opt);
          });
        }
      }
      if (els.setTimezone) els.setTimezone.value = state.timezone;
      if (normalizeTemperatureUnit(state.temperatureUnit) === "Auto") {
        updateTempPreview();
        renderPreview();
      }
      updateClock();
    },
    "select-screen__clock_format": function (val, d) {
      state.clockFormat = d.value || val || state.clockFormat;
      if (d.option && Array.isArray(d.option)) {
        state.clockFormatOptions = d.option;
        if (els.setClockFormat) {
          els.setClockFormat.innerHTML = "";
          d.option.forEach(function (opt) {
            var o = document.createElement("option");
            o.value = opt;
            o.textContent = opt === "12h" ? "12-hour" : "24-hour";
            els.setClockFormat.appendChild(o);
          });
        }
      }
      if (els.setClockFormat) els.setClockFormat.value = state.clockFormat;
      updateClock();
    },
    "text-screen__ntp_server_1": function (val) {
      state.ntpServer1 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[0]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-screen__ntp_server_2": function (val) {
      state.ntpServer2 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[1]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-screen__ntp_server_3": function (val) {
      state.ntpServer3 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[2]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-screen__month_names": function (val) {
      state.monthNames = normalizeMonthNames(val);
      state.customMonthNames = hasCustomMonthNames();
      syncMonthNameUi();
      renderPreview();
    },
    "text-ntp_server_1": function (val) {
      state.ntpServer1 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[0]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-ntp_server_2": function (val) {
      state.ntpServer2 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[1]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-ntp_server_3": function (val) {
      state.ntpServer3 = normalizeNtpServer(val, NTP_SERVER_DEFAULTS[2]);
      state.customNtpServers = state.customNtpServers || hasCustomNtpServers();
      syncNtpServerUi();
    },
    "text-month_names": function (val) {
      state.monthNames = normalizeMonthNames(val);
      state.customMonthNames = hasCustomMonthNames();
      syncMonthNameUi();
      renderPreview();
    },
    "select-screen__rotation": function (val, d) {
      state.screenRotation = normalizeScreenRotation(d.value || val || state.screenRotation);
      if (d.option && Array.isArray(d.option)) {
        state.screenRotationDeviceOptions = d.option;
        state.screenRotationOptions = d.option;
      }
      syncScreenRotationSelect();
      syncPreviewOrientation();
      renderPreview();
    },
    "text_sensor-screen__sunrise": function (val) {
      state.sunrise = val;
      updateSunInfo();
    },
    "text_sensor-screen__sunset": function (val) {
      state.sunset = val;
      updateSunInfo();
    },
    "text_sensor-network_transport": function (val) {
      state.networkTransport = normalizeNetworkTransport(val);
      updateNetworkPreview();
      syncFirmwareUpdateUi();
    },
    "sensor-wifi_strength": function (val) {
      state.networkTransport = "wifi";
      state.wifiStrengthPercent = normalizeWifiStrengthPercent(val);
      updateNetworkPreview();
      syncFirmwareUpdateUi();
    },
    "text_sensor-firmware__version": function (val) {
      setFirmwareVersion(val);
    },
    "text_sensor-firmware_version": function (val) {
      setFirmwareVersion(val);
    },
    "update-firmware__update": function (val, d) {
      setFirmwareUpdateInfo(d);
    },
    "switch-firmware__auto_update": function (val, d) {
      state.firmwareUpdateControlsSupported = true;
      state.autoUpdate = d.value === true || val === "ON";
      if (els.setAutoUpdate) els.setAutoUpdate.checked = state.autoUpdate;
      syncFirmwareUpdateUi();
    },
    "switch-developer__experimental_features": function (val, d) {
      state.developerExperimentalFeatures = d.value === true || val === "ON";
      if (els.setDeveloperExperimentalFeatures) {
        els.setDeveloperExperimentalFeatures.checked = state.developerExperimentalFeatures;
      }
      syncScreenRotationSelect();
      scheduleRender();
    },
    "switch-developer_experimental_features": function (val, d) {
      state.developerExperimentalFeatures = d.value === true || val === "ON";
      if (els.setDeveloperExperimentalFeatures) {
        els.setDeveloperExperimentalFeatures.checked = state.developerExperimentalFeatures;
      }
      syncScreenRotationSelect();
      scheduleRender();
    },
    "select-firmware__update_frequency": function (val, d) {
      state.firmwareUpdateControlsSupported = true;
      state.updateFrequency = d.value || val || state.updateFrequency;
      if (els.setUpdateFreq) els.setUpdateFreq.value = state.updateFrequency;
      if (d.option && Array.isArray(d.option)) {
        state.updateFreqOptions = d.option;
      }
      syncFirmwareUpdateUi();
    },
  };

  var ssePatterns = [
    {
      re: /^text-button_(\d+)_config$/,
      fn: function (m, val) {
        var slot = parseInt(m[1], 10);
        if (slot < 1 || slot > NUM_SLOTS) return;
        var b = state.buttons[slot - 1];
        var migrateConfig = buttonConfigNeedsMigration(val || "");
        var parsed = parseButtonConfig(val || "");
        b.entity = parsed.entity;
        b.label = parsed.label;
        b.icon = parsed.icon;
        b.icon_on = parsed.icon_on;
        b.sensor = parsed.sensor;
        b.unit = parsed.unit;
        b.type = parsed.type;
        b.precision = parsed.precision;
        b.options = parsed.options;
        if (migrateConfig) saveButtonConfig(slot);
        scheduleRender();
      },
    },
    {
      re: /^text-subpage_(\d+)_config$/,
      fn: function (m, val) {
        var slot = parseInt(m[1], 10);
        if (slot < 1 || slot > NUM_SLOTS) return;
        if (!state.subpageRaw[slot]) state.subpageRaw[slot] = { main: "", ext: "", ext2: "", ext3: "" };
        state.subpageRaw[slot].main = val || "";
        applySubpageRaw(slot);
      },
    },
    {
      re: /^text-subpage_(\d+)_config_ext$/,
      fn: function (m, val) {
        var slot = parseInt(m[1], 10);
        if (slot < 1 || slot > NUM_SLOTS) return;
        if (!state.subpageRaw[slot]) state.subpageRaw[slot] = { main: "", ext: "", ext2: "", ext3: "" };
        state.subpageRaw[slot].ext = val || "";
        applySubpageRaw(slot);
      },
    },
    {
      re: /^text-subpage_(\d+)_config_ext_2$/,
      fn: function (m, val) {
        var slot = parseInt(m[1], 10);
        if (slot < 1 || slot > NUM_SLOTS) return;
        if (!state.subpageRaw[slot]) state.subpageRaw[slot] = { main: "", ext: "", ext2: "", ext3: "" };
        state.subpageRaw[slot].ext2 = val || "";
        applySubpageRaw(slot);
      },
    },
    {
      re: /^text-subpage_(\d+)_config_ext_3$/,
      fn: function (m, val) {
        var slot = parseInt(m[1], 10);
        if (slot < 1 || slot > NUM_SLOTS) return;
        if (!state.subpageRaw[slot]) state.subpageRaw[slot] = { main: "", ext: "", ext2: "", ext3: "" };
        state.subpageRaw[slot].ext3 = val || "";
        applySubpageRaw(slot);
      },
    },
  ];

  function handleState(d) {
    rememberEntityPostPath(d);
    var keys = entityStateKeys(d);
    var id = keys[0] || d.id;
    var val = d.state != null ? String(d.state) : "";

    for (var ki = 0; ki < keys.length; ki++) {
      if (sseHandlers[keys[ki]]) { sseHandlers[keys[ki]](val, d); return; }
    }
    if (isFirmwareVersionEvent(id, d)) {
      setFirmwareVersion(val);
      return;
    }
    if (isFirmwareUpdateEvent(id, d)) {
      setFirmwareUpdateInfo(d);
      return;
    }
    if (isFirmwareInstallButtonEvent(id, d)) {
      state.firmwareUpdateControlsSupported = true;
      state.firmwareInstallControlsSupported = true;
      renderFirmwareUpdateStatus();
      return;
    }
    if (isFirmwareCheckButtonEvent(id, d)) {
      state.firmwareUpdateControlsSupported = true;
      renderFirmwareUpdateStatus();
      return;
    }

    for (var i = 0; i < ssePatterns.length; i++) {
      for (var pk = 0; pk < keys.length; pk++) {
        var m = keys[pk].match(ssePatterns[i].re);
        if (m) { ssePatterns[i].fn(m, val, d); return; }
      }
    }

    console.log("[state] unhandled:", id, val);
  }

  if (!eventStreamEnabled()) {
    loadInitialState(handleState, markConnected);
    return;
  }

  var source = new EventSource("/events");
  _eventSource = source;

  source.addEventListener("open", markConnected);
  source.addEventListener("error", function () {
    handleDisconnected(source);
  });
  source.addEventListener("state", function (e) {
    var d;
    try { d = JSON.parse(e.data); } catch (_) { return; }
    handleState(d);
  });

}

function syncInput(el, val) {
  if (el && document.activeElement !== el) el.value = val;
}

function gridHasAny() {
  for (var i = 0; i < NUM_SLOTS; i++) { if (state.grid[i] > 0) return true; }
  return false;
}

function scheduleMigration() {
  if (orderReceived || gridHasAny()) return;
  clearTimeout(migrationTimer);
  migrationTimer = setTimeout(function () {
    if (orderReceived || gridHasAny()) return;
    var pos = 0;
    for (var i = 0; i < NUM_SLOTS; i++) {
      if (state.buttons[i].entity && pos < NUM_SLOTS) {
        state.grid[pos] = i + 1;
        pos++;
      }
    }
    if (pos > 0) {
      renderPreview();
      renderButtonSettings();
      postText("Button Order", serializeGrid(state.grid));
    }
  }, 2000);
}

function updateSunInfo() {
  var el = els.sunInfo;
  if (!el) return;
  if (!state.sunrise && !state.sunset) {
    el.classList.remove("sp-visible");
    return;
  }
  el.classList.add("sp-visible");
  var t = "";
  if (state.sunrise) t += "Sunrise: " + escHtml(state.sunrise);
  if (state.sunrise && state.sunset) t += " \u00a0/\u00a0 ";
  if (state.sunset) t += "Sunset: " + escHtml(state.sunset);
  el.innerHTML = t;
}

function updateTempPreview() {
  if (!els.temp) return;
  var show = state.clockBarOn && (state._indoorOn || state._outdoorOn);
  els.temp.className = "sp-temp" + (show ? " sp-visible" : "");
  var unit = clockBarTemperatureUnitSymbol();
  var indoor = state._indoorVal != null ? state._indoorVal : "24";
  var outdoor = state._outdoorVal != null ? state._outdoorVal : "17";
  if (state._indoorOn && state._outdoorOn) {
    els.temp.textContent = outdoor + unit + " / " + indoor + unit;
  } else if (state._outdoorOn) {
    els.temp.textContent = outdoor + unit;
  } else if (state._indoorOn) {
    els.temp.textContent = indoor + unit;
  }
}

function normalizeNetworkTransport(value) {
  value = String(value == null ? "" : value).trim().toLowerCase();
  return value === "ethernet" ? "ethernet" : "wifi";
}

function normalizeWifiStrengthPercent(value) {
  var n = parseFloat(value);
  if (!isFinite(n)) return 100;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function networkPreviewIconSlug(transport, strengthPercent) {
  if (normalizeNetworkTransport(transport) === "ethernet") return "ethernet";
  var strength = normalizeWifiStrengthPercent(strengthPercent);
  if (strength < 25) return "wifi-strength-1";
  if (strength < 50) return "wifi-strength-2";
  if (strength < 75) return "wifi-strength-3";
  return "wifi-strength-4";
}

function updateNetworkPreview() {
  if (!els.networkPreview) return;
  var show = state.clockBarOn && state.networkStatusOn;
  els.networkPreview.className = "sp-network-preview mdi mdi-" +
    networkPreviewIconSlug(state.networkTransport, state.wifiStrengthPercent) +
    (show ? " sp-visible" : "");
}

if (typeof globalThis !== "undefined" && globalThis.__ESPCONTROL_TEST_HOOKS__) {
  globalThis.__ESPCONTROL_TEST_HOOKS__.config = {
    parseButtonConfig: parseButtonConfig,
    serializeButtonConfig: serializeButtonConfig,
    BACKUP_CONFIG_VERSION: BACKUP_CONFIG_VERSION,
    BACKUP_FORMAT: BACKUP_FORMAT,
    createBackupConfig: createBackupConfig,
    normalizeBackupConfig: normalizeBackupConfig,
    planBackupImport: planBackupImport,
    switchConfirmationEnabled: switchConfirmationEnabled,
    switchConfirmationMode: switchConfirmationMode,
    switchConfirmationMessage: switchConfirmationMessage,
    switchConfirmationDefaultMessageForMode: switchConfirmationDefaultMessageForMode,
    switchConfirmationYesText: switchConfirmationYesText,
    switchConfirmationNoText: switchConfirmationNoText,
    sensorActiveColorEnabled: sensorActiveColorEnabled,
    doorWindowActiveColorEnabled: doorWindowActiveColorEnabled,
    garageLabelDisplayMode: garageLabelDisplayMode,
    actionCardStateEntity: actionCardStateEntity,
    actionCardStateUnit: actionCardStateUnit,
    actionCardStatePrecision: actionCardStatePrecision,
    actionCardStateDisplayMode: actionCardStateDisplayMode,
    alarmPinRequired: alarmPinRequired,
    alarmIconDisplayMode: alarmIconDisplayMode,
    alarmLabelDisplayMode: alarmLabelDisplayMode,
    alarmVisibleActions: alarmVisibleActions,
    alarmCardTypeOptionValues: function (isSub) {
      return alarmCardTypeOptionsForSettings(!!isSub).map(function (option) {
        return option.value;
      });
    },
    normalizeAlarmOptions: normalizeAlarmOptions,
    buttonTypePickerKeysForExperimental: function (enabled, isSub, selectedTypeKey) {
      var oldExperimental = state.developerExperimentalFeatures;
      state.developerExperimentalFeatures = !!enabled;
      var keys = buttonTypePickerKeys(!!isSub, selectedTypeKey || "");
      state.developerExperimentalFeatures = oldExperimental;
      return keys;
    },
    buttonTypeVisibleInPickerForExperimental: function (key, enabled, isSub) {
      var oldExperimental = state.developerExperimentalFeatures;
      state.developerExperimentalFeatures = !!enabled;
      var visible = buttonTypeVisibleInPicker(key, !!isSub);
      state.developerExperimentalFeatures = oldExperimental;
      return visible;
    },
    parseSubpageConfig: parseSubpageConfig,
    serializeSubpageConfig: serializeSubpageConfig,
    buildSubpageGrid: buildSubpageGrid,
    serializeSubpageGrid: serializeSubpageGrid,
    parseBackOrderToken: parseBackOrderToken,
    backOrderToken: backOrderToken,
    backLabelFromOrder: backLabelFromOrder,
    subpageStateDisplayMode: subpageStateDisplayMode,
    buttonConfigNeedsMigration: buttonConfigNeedsMigration,
    subpageConfigNeedsMigration: subpageConfigNeedsMigration,
    normalizeTemperatureUnit: normalizeTemperatureUnit,
    normalizeScreensaverAction: normalizeScreensaverAction,
    screensaverActionOption: screensaverActionOption,
    normalizeScreensaverDimmedBrightness: normalizeScreensaverDimmedBrightness,
    previewHtmlValue: previewHtmlValue,
    buttonTypePreviewFor: function (type, button, options) {
      var oldTimezone = state.timezone;
      var oldUnit = state.temperatureUnit;
      var oldClockFormat = state.clockFormat;
      options = options || {};
      if (options.timezone != null) state.timezone = options.timezone;
      if (options.temperatureUnit != null) {
        state.temperatureUnit = normalizeTemperatureUnit(options.temperatureUnit);
      }
      if (options.clockFormat != null) state.clockFormat = options.clockFormat;
      var typeDef = BUTTON_TYPES[type || ""];
      var preview = typeDef && typeDef.renderPreview
        ? typeDef.renderPreview(button || {}, { escHtml: escHtml, cardSize: options.cardSize || 1 })
        : null;
      state.timezone = oldTimezone;
      state.temperatureUnit = oldUnit;
      state.clockFormat = oldClockFormat;
      return preview;
    },
    networkPreviewIconSlug: networkPreviewIconSlug,
    displayFirmwareVersion: displayFirmwareVersion,
    firmwareVersionFromMetadata: firmwareVersionFromMetadata,
    firmwareInfoFromPublicManifest: firmwareInfoFromPublicManifest,
    firmwareVersionLabelFor: function (version, pending) {
      var oldVersion = state.firmwareVersion;
      var oldPending = state.firmwareVersionRefreshPending;
      state.firmwareVersion = version;
      state.firmwareVersionRefreshPending = !!pending;
      var label = firmwareVersionLabel();
      state.firmwareVersion = oldVersion;
      state.firmwareVersionRefreshPending = oldPending;
      return label;
    },
    entityDetailPaths: entityDetailPaths,
    firmwareUpdateControlsVisibleFor: function (transport, supported) {
      var oldTransport = state.networkTransport;
      var oldSupported = state.firmwareUpdateControlsSupported;
      state.networkTransport = normalizeNetworkTransport(transport);
      state.firmwareUpdateControlsSupported = supported;
      var visible = firmwareUpdateControlsVisible();
      state.networkTransport = oldTransport;
      state.firmwareUpdateControlsSupported = oldSupported;
      return visible;
    },
    firmwareVersionAfterUpdateInfo: function (initialVersion, updateInfo) {
      var oldVersion = state.firmwareVersion;
      var oldLatest = state.firmwareLatestVersion;
      var oldUpdateState = state.firmwareUpdateState;
      var oldReleaseUrl = state.firmwareReleaseUrl;
      var oldChecking = state.firmwareChecking;
      var oldSupported = state.firmwareUpdateControlsSupported;
      var oldInstallSupported = state.firmwareInstallControlsSupported;
      var oldInstallTarget = state.firmwareInstallTargetVersion;
      var oldInstallPostPending = state.firmwareInstallPostPending;
      state.firmwareVersion = "";
      state.firmwareLatestVersion = "";
      state.firmwareUpdateState = "";
      state.firmwareReleaseUrl = "";
      state.firmwareChecking = false;
      state.firmwareUpdateControlsSupported = false;
      state.firmwareInstallControlsSupported = false;
      state.firmwareInstallTargetVersion = "";
      state.firmwareInstallPostPending = false;
      setFirmwareVersion(initialVersion);
      setFirmwareUpdateInfo(updateInfo || {});
      var result = {
        version: state.firmwareVersion,
        latest: state.firmwareLatestVersion,
        updateState: state.firmwareUpdateState,
        installAvailable: firmwareInstallAvailable(),
      };
      state.firmwareVersion = oldVersion;
      state.firmwareLatestVersion = oldLatest;
      state.firmwareUpdateState = oldUpdateState;
      state.firmwareReleaseUrl = oldReleaseUrl;
      state.firmwareChecking = oldChecking;
      state.firmwareUpdateControlsSupported = oldSupported;
      state.firmwareInstallControlsSupported = oldInstallSupported;
      state.firmwareInstallTargetVersion = oldInstallTarget;
      state.firmwareInstallPostPending = oldInstallPostPending;
      return result;
    },
    firmwareStateAfterPublicManifest: function (initialVersion, manifest) {
      var oldVersion = state.firmwareVersion;
      var oldLatest = state.firmwareLatestVersion;
      var oldUpdateState = state.firmwareUpdateState;
      var oldReleaseUrl = state.firmwareReleaseUrl;
      var oldInstallSupported = state.firmwareInstallControlsSupported;
      var oldInstallPostPending = state.firmwareInstallPostPending;
      state.firmwareVersion = "";
      state.firmwareLatestVersion = "";
      state.firmwareUpdateState = "";
      state.firmwareReleaseUrl = "";
      state.firmwareInstallControlsSupported = true;
      state.firmwareInstallPostPending = false;
      setFirmwareVersion(initialVersion);
      setPublicFirmwareInfo(firmwareInfoFromPublicManifest(manifest));
      var result = {
        version: state.firmwareVersion,
        latest: state.firmwareLatestVersion,
        updateState: state.firmwareUpdateState,
        releaseUrl: state.firmwareReleaseUrl,
        updateAvailable: firmwareUpdateAvailable(),
        installAvailable: firmwareInstallAvailable(),
      };
      state.firmwareVersion = oldVersion;
      state.firmwareLatestVersion = oldLatest;
      state.firmwareUpdateState = oldUpdateState;
      state.firmwareReleaseUrl = oldReleaseUrl;
      state.firmwareInstallControlsSupported = oldInstallSupported;
      state.firmwareInstallPostPending = oldInstallPostPending;
      return result;
    },
    findDuplicatePlacementFor: function (grid, start, size, maxSlots) {
      return findDuplicatePlacement(grid.slice(), start, size, maxSlots || NUM_SLOTS);
    },
    importedButtonOrderFor: function (orderStr, existingSizes) {
      var oldSizes = state.sizes;
      var oldGrid = state.grid;
      state.sizes = existingSizes || {};
      state.grid = [];
      for (var i = 0; i < NUM_SLOTS; i++) state.grid.push(0);
      applyImportedButtonOrder(orderStr, {});
      var sizes = {};
      for (var k in state.sizes) sizes[k] = state.sizes[k];
      var grid = state.grid.slice();
      state.sizes = oldSizes;
      state.grid = oldGrid;
      return { grid: grid, sizes: sizes };
    },
    screensaverTimeoutSupportedFor: function (value, limitsLoaded, min, max) {
      var oldLoaded = state.screensaverTimeoutLimitsLoaded;
      var oldMin = state.screensaverTimeoutMin;
      var oldMax = state.screensaverTimeoutMax;
      state.screensaverTimeoutLimitsLoaded = !!limitsLoaded;
      state.screensaverTimeoutMin = min;
      state.screensaverTimeoutMax = max;
      var supported = screensaverTimeoutSupported(value);
      state.screensaverTimeoutLimitsLoaded = oldLoaded;
      state.screensaverTimeoutMin = oldMin;
      state.screensaverTimeoutMax = oldMax;
      return supported;
    },
    temperatureUnitSymbolFor: function (timezone, unit) {
      var oldTimezone = state.timezone;
      var oldUnit = state.temperatureUnit;
      state.timezone = timezone || oldTimezone;
      state.temperatureUnit = normalizeTemperatureUnit(unit);
      var symbol = temperatureUnitSymbol();
      state.timezone = oldTimezone;
      state.temperatureUnit = oldUnit;
      return symbol;
    },
  };
}

// ── Start ──────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
