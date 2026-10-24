// ==UserScript==
// @name         MetaMango Bulk Audio Importer
// @namespace    https://www.metamango.org/
// @version      1.0.1
// @description  Adds a bulk M3U import panel to the MetaMango audio list.
// @author       @iiNEYMAR (https://t.me/iiNEYMARv1)
// @copyright    @iiNEYMAR
// @license      MIT
// @match        https://www.metamango.org/*
// @match        https://metamango.org/*
// @homepageURL  https://github.com/iineymar/metamango-bulk-importer/blob/main/metamango-bulk-importer.user.js
// @updateURL    https://github.com/iineymar/metamango-bulk-importer/raw/refs/heads/main/metamango-bulk-importer.user.js
// @downloadURL  https://github.com/iineymar/metamango-bulk-importer/raw/refs/heads/main/metamango-bulk-importer.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*!
 * MetaMango Bulk Audio Importer
 * Copyright (c) 2026 iiNEYMAR - https://t.me/iiNEYMARv1
 * Licensed under the MIT License. The copyright notice above must be kept
 * in all copies or substantial portions of this script.
 */

(function metaMangoBulkImporter() {
  "use strict";

  const IMPORTER_CONFIG = {
    addEndpoint: "/api/netAudio/addCustomerNetAudio",
    listEndpoint: "/api/netAudio/getCustomerNetAudioList",
    userDevicesEndpoint: "/api/chmax/customer/userDevices",
    deviceFetchMaxAttempts: 5,
    deviceFetchRetryMilliseconds: 5000,
    credentialRefreshMilliseconds: 2000,
    retryBackoffMilliseconds: 2000,
    trustedHostSuffix: "metamango.org",
    minDelayMilliseconds: 200,
    maxRetryAfterMilliseconds: 30000,
    maxStoreScanDepth: 4,
    debug: false,
    successCode: "0",
    listPageSize: 100,
    maxListPages: 200,
    deviceChannelLimit: 100,
    deviceLimitWarnThreshold: 10,
    deviceCountMaxAttempts: 3,
    deviceCountRetryMilliseconds: 8000,
    resumeStoragePrefix: "mmImporterResume:",
    resumeSaveEvery: 5,
    resumeMaxAgeMilliseconds: 30 * 24 * 60 * 60 * 1000,

    defaultDelayMilliseconds: 800,

    maxRetriesPerChannel: 3,
    maxConsecutiveFailures: 5,
    maxLogLines: 1000,
    dryRunPreviewCount: 20,

    panelElementId: "mm-importer-panel",
    styleElementId: "mm-importer-style",
    launcherElementId: "mm-importer-launcher",
    fontElementId: "mm-importer-font",
    fontUrl: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap",
  };

  const PANEL_STYLES = `
    .mm-importer-panel {
      --mm-color-background: #262624;
      --mm-color-input: #1f1e1d;
      --mm-color-text: #ece9e1;
      --mm-color-muted: #a8a69e;
      --mm-color-border: #3f3e3a;
      --mm-color-primary: #1877f2;
      --mm-color-primary-hover: #166fe5;
      --mm-color-primary-text: #ffffff;
      --mm-color-accent-text: #7ab4ff;
      --mm-color-surface-muted: #30302d;
      --mm-color-surface-hover: #3a3936;
      --mm-color-success-background: #1f3a2b;
      --mm-color-danger: #f28b82;
      --mm-color-warn: #fbbf24;
      --mm-color-success: #6ee7a0;
      --mm-color-log-background: #1a1918;
      --mm-color-log-text: #e0ddd5;
      --mm-panel-width: 360px;
      --mm-spacing-small: 6px;
      --mm-spacing-medium: 8px;
      --mm-radius: 8px;
      --mm-font-size: 14px;

      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      box-sizing: border-box;
      width: var(--mm-panel-width);
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--mm-color-background);
      color: var(--mm-color-text);
      border: 1px solid var(--mm-color-border);
      border-radius: var(--mm-radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      font-family: "Tajawal", "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif;
      font-size: var(--mm-font-size);
      line-height: 1.6;
      text-align: right;
      direction: rtl;
      color-scheme: dark;
      accent-color: var(--mm-color-primary);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(-8px) scale(0.98);
      transform-origin: top right;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s;
    }

    .mm-importer-panel.mm-importer-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: none;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0s;
    }

    .mm-importer-panel input[type="text"],
    .mm-importer-panel input[type="number"],
    .mm-importer-panel input[type="password"] {
      direction: ltr;
      text-align: left;
    }

    .mm-importer-panel *,
    .mm-importer-panel *::before,
    .mm-importer-panel *::after {
      box-sizing: border-box;
    }

    .mm-importer-panel input,
    .mm-importer-panel button,
    .mm-importer-panel select {
      font-family: inherit;
    }

    .mm-importer-panel :focus-visible {
      outline: 2px solid var(--mm-color-accent-text);
      outline-offset: 2px;
    }

    .mm-importer-launcher:focus-visible {
      outline: 2px solid #7ab4ff;
      outline-offset: 2px;
    }

    .mm-importer-launcher:hover {
      background: #166fe5;
    }

    .mm-importer-button:hover:not(:disabled) {
      background: var(--mm-color-surface-hover);
    }

    .mm-importer-button-primary:hover:not(:disabled) {
      background: var(--mm-color-primary-hover);
    }

    .mm-importer-advanced summary,
    .mm-importer-review summary {
      cursor: pointer;
      color: var(--mm-color-muted);
      font-size: 12.5px;
      font-weight: 500;
    }

    .mm-importer-advanced-body {
      display: flex;
      flex-direction: column;
      gap: var(--mm-spacing-medium);
      margin-top: var(--mm-spacing-medium);
    }

    .mm-importer-progress-bar {
      height: 6px;
      border-radius: 3px;
      background: var(--mm-color-border);
      overflow: hidden;
    }

    .mm-importer-progress-fill {
      width: 0;
      height: 100%;
      background: var(--mm-color-primary);
      transition: width 0.2s;
    }

    .mm-importer-header {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--mm-spacing-medium);
      border-bottom: 1px solid var(--mm-color-border);
    }

    .mm-importer-title {
      font-weight: 700;
      font-size: 15px;
    }

    .mm-importer-close-button {
      border: none;
      background: transparent;
      color: var(--mm-color-muted);
      font-size: 18px;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }

    .mm-importer-body {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      gap: var(--mm-spacing-medium);
      padding: var(--mm-spacing-medium);
    }

    .mm-importer-credentials-status {
      padding: var(--mm-spacing-small) var(--mm-spacing-medium);
      border-radius: var(--mm-radius);
      background: var(--mm-color-surface-muted);
      color: var(--mm-color-muted);
      transition: background 0.2s, color 0.2s;
    }

    .mm-importer-credentials-status.mm-importer-status-ready {
      background: var(--mm-color-success-background);
      color: var(--mm-color-success);
    }

    .mm-importer-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .mm-importer-field-label {
      color: var(--mm-color-muted);
      font-size: 12.5px;
      font-weight: 500;
    }

    .mm-importer-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--mm-color-border);
      border-radius: 6px;
      background: var(--mm-color-input);
      color: var(--mm-color-text);
      font-size: var(--mm-font-size);
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .mm-importer-masked-wrap {
      position: relative;
    }

    .mm-importer-mask-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--mm-color-input);
      color: var(--mm-color-text);
      font-size: var(--mm-font-size);
      direction: ltr;
      text-align: left;
      letter-spacing: 1px;
      pointer-events: none;
    }

    .mm-importer-mask-overlay:empty,
    .mm-importer-masked-wrap input:focus ~ .mm-importer-mask-overlay {
      display: none;
    }

    .mm-importer-field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--mm-spacing-small);
    }

    .mm-importer-file-summary {
      color: var(--mm-color-muted);
      font-size: 12.5px;
    }

    .mm-importer-checkbox-row {
      display: flex;
      align-items: center;
      gap: var(--mm-spacing-small);
    }

    .mm-importer-button-row {
      display: flex;
      gap: var(--mm-spacing-small);
    }

    .mm-importer-button {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid var(--mm-color-border);
      border-radius: 6px;
      background: var(--mm-color-surface-muted);
      color: var(--mm-color-text);
      font-size: var(--mm-font-size);
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
    }

    .mm-importer-button-primary {
      border-color: var(--mm-color-primary);
      background: var(--mm-color-primary);
      color: var(--mm-color-primary-text);
      font-weight: 700;
    }

    .mm-importer-button-danger {
      border-color: var(--mm-color-danger);
      color: var(--mm-color-danger);
    }

    .mm-importer-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .mm-importer-progress-text {
      font-weight: bold;
    }

    .mm-importer-log {
      height: 120px;
      overflow-y: auto;
      padding: var(--mm-spacing-small);
      border-radius: 6px;
      background: var(--mm-color-log-background);
      color: var(--mm-color-log-text);
      font-family: Consolas, "Courier New", "Tajawal", monospace;
      font-size: 12.5px;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.6;
      scrollbar-width: thin;
    }

    .mm-importer-log-error {
      color: #fca5a5;
    }

    .mm-importer-log-success {
      color: #86efac;
    }

    .mm-importer-credit {
      flex: none;
      padding: 6px var(--mm-spacing-medium);
      border-top: 1px solid var(--mm-color-border);
      color: var(--mm-color-muted);
      font-size: 12px;
      text-align: center;
    }

    .mm-importer-credit a {
      display: inline-block;
      direction: ltr;
      unicode-bidi: isolate;
      color: var(--mm-color-accent-text);
      font-weight: 500;
      text-decoration: none;
    }

    .mm-importer-credit a:hover,
    .mm-importer-credit a:focus-visible {
      text-decoration: underline;
    }

    .mm-importer-field[hidden],
    .mm-importer-review[hidden],
    .mm-importer-limit-live[hidden],
    .mm-importer-review-row[hidden] {
      display: none;
    }

    .mm-importer-launcher {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      padding: 10px 16px;
      border: none;
      border-radius: 999px;
      background: #1877f2;
      color: #ffffff;
      font-family: "Tajawal", "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
      transition: background 0.15s, transform 0.15s;
    }

    .mm-importer-panel .mm-importer-input:focus {
      border-color: var(--mm-color-primary);
      box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.35);
    }

    select.mm-importer-input {
      cursor: pointer;
    }

    .mm-importer-button:active:not(:disabled) {
      transform: translateY(1px);
    }

    .mm-importer-export-failed-button {
      flex: 2;
      white-space: nowrap;
    }

    .mm-importer-button-danger:hover:not(:disabled) {
      background: rgba(242, 139, 130, 0.12);
    }

    .mm-importer-close-button:hover {
      background: var(--mm-color-surface-muted);
      color: var(--mm-color-text);
    }

    .mm-importer-launcher:active {
      transform: scale(0.96);
    }

    .mm-importer-dropzone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: var(--mm-spacing-medium);
      border: 2px dashed var(--mm-color-border);
      border-radius: var(--mm-radius);
      text-align: center;
      color: var(--mm-color-text);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }

    .mm-importer-dropzone:hover,
    .mm-importer-dropzone:focus-within {
      border-color: var(--mm-color-primary);
    }

    .mm-importer-visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      opacity: 0;
    }

    .mm-importer-dropzone-title {
      font-weight: 500;
    }

    .mm-importer-panel.mm-importer-dragging {
      box-shadow: 0 0 0 2px var(--mm-color-primary), 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .mm-importer-panel.mm-importer-dragging .mm-importer-dropzone {
      border-color: var(--mm-color-primary);
      background: var(--mm-color-surface-muted);
      color: var(--mm-color-accent-text);
    }

    .mm-importer-limit-note {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12.5px;
    }

    .mm-importer-limit-fixed {
      color: var(--mm-color-muted);
    }

    .mm-importer-limit-live {
      color: var(--mm-color-text);
      font-weight: bold;
    }

    .mm-importer-limit-note[data-state="warn"] .mm-importer-limit-live {
      color: var(--mm-color-warn);
    }

    .mm-importer-limit-note[data-state="over"] .mm-importer-limit-live {
      color: var(--mm-color-danger);
    }

    .mm-importer-review-body {
      display: flex;
      flex-direction: column;
      gap: var(--mm-spacing-small);
      margin-top: var(--mm-spacing-small);
    }

    .mm-importer-panel input.mm-importer-review-search {
      direction: rtl;
      text-align: right;
    }

    .mm-importer-review-list {
      max-height: 140px;
      overflow-y: auto;
      border: 1px solid var(--mm-color-border);
      border-radius: 6px;
      scrollbar-width: thin;
    }

    .mm-importer-review-row {
      display: grid;
      grid-template-columns: auto 34px 1fr;
      align-items: center;
      gap: var(--mm-spacing-small);
      padding: 4px 8px;
      border-bottom: 1px solid var(--mm-color-border);
      cursor: pointer;
    }

    .mm-importer-review-row:last-child {
      border-bottom: none;
    }

    .mm-importer-review-row:hover {
      background: var(--mm-color-surface-muted);
    }

    .mm-importer-review-index {
      direction: ltr;
      text-align: center;
      color: var(--mm-color-muted);
      font-size: 11px;
    }

    .mm-importer-review-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mm-importer-review-locked {
      opacity: 0.6;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .mm-importer-panel,
      .mm-importer-panel.mm-importer-open,
      .mm-importer-panel .mm-importer-input,
      .mm-importer-progress-fill,
      .mm-importer-button,
      .mm-importer-launcher,
      .mm-importer-dropzone,
      .mm-importer-credentials-status,
      .mm-importer-close-button {
        transition: none;
      }
    }

    @media (max-width: 480px) {
      .mm-importer-panel {
        top: 8px;
        right: 8px;
        left: 8px;
        width: auto;
        max-width: none;
        max-height: calc(100vh - 16px);
        max-height: calc(100dvh - 16px);
      }

      .mm-importer-panel .mm-importer-input,
      .mm-importer-panel .mm-importer-mask-overlay {
        font-size: 16px;
      }

      .mm-importer-field-row {
        grid-template-columns: 1fr;
      }

      .mm-importer-log {
        height: 100px;
      }

      .mm-importer-launcher {
        right: 12px;
        bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }
  `;

  function debugLog(error) {
    if (IMPORTER_CONFIG.debug) {
      console.debug("[MetaMango Importer]", error);
    }
  }

  const sharedState = {
    accessToken: "",
    token: "",
    serialNumber: "",
    iotId: "",
    devices: [],
    deviceLockedByUser: false,
    hooksInstalled: false,
  };

  function isFirstPartyUrl(rawUrl) {
    try {
      const hostname = new URL(String(rawUrl), window.location.href).hostname;
      const suffix = IMPORTER_CONFIG.trustedHostSuffix;
      return hostname === suffix || hostname.endsWith("." + suffix);
    } catch (ignoredError) {
      return false;
    }
  }

  function captureHeader(headerName, headerValue) {
    if (!headerName || !headerValue) {
      return;
    }
    const lowerCaseName = String(headerName).toLowerCase();
    if (lowerCaseName === "accesstoken") {
      sharedState.accessToken = String(headerValue);
    } else if (lowerCaseName === "token") {
      sharedState.token = String(headerValue);
    }
  }

  function findDeviceBySerialNumber(serialNumber) {
    return sharedState.devices.find(function (device) {
      return device.serialNumber === serialNumber;
    });
  }

  function captureDeviceValue(parameterName, parameterValue) {
    if (!parameterName || parameterValue === undefined || parameterValue === null) {
      return;
    }
    const valueText = String(parameterValue).trim();
    if (!valueText || sharedState.deviceLockedByUser) {
      return;
    }
    const lowerCaseName = String(parameterName).toLowerCase();
    if (lowerCaseName === "sn") {
      sharedState.serialNumber = valueText;
      const matchingDevice = findDeviceBySerialNumber(valueText);
      if (matchingDevice) {
        sharedState.iotId = matchingDevice.iotId;
      }
    } else if (lowerCaseName === "iotid" || lowerCaseName === "useriotid") {
      if (sharedState.devices.length === 0) {
        sharedState.iotId = valueText;
      }
    }
  }

  function normalizeDevice(rawDevice) {
    if (!rawDevice || typeof rawDevice !== "object") {
      return null;
    }
    const rawSerialNumber = rawDevice.sn;
    const rawIotId =
      rawDevice.userIotId !== undefined && rawDevice.userIotId !== null
        ? rawDevice.userIotId
        : rawDevice.iotId;

    const serialNumber =
      rawSerialNumber === undefined || rawSerialNumber === null ? "" : String(rawSerialNumber).trim();
    const iotId = rawIotId === undefined || rawIotId === null ? "" : String(rawIotId).trim();

    if (!serialNumber || !iotId) {
      return null;
    }
    return {
      name: String(rawDevice.name || "").trim() || serialNumber,
      serialNumber: serialNumber,
      iotId: iotId,
    };
  }

  function registerDevicesFromResponse(responseBody) {
    if (
      !responseBody ||
      String(responseBody.code) !== IMPORTER_CONFIG.successCode ||
      !Array.isArray(responseBody.data)
    ) {
      return false;
    }

    const devices = responseBody.data.map(normalizeDevice).filter(Boolean);
    if (devices.length === 0) {
      return false;
    }
    sharedState.devices = devices;

    if (sharedState.deviceLockedByUser && !findDeviceBySerialNumber(sharedState.serialNumber)) {
      sharedState.deviceLockedByUser = false;
    }

    if (!sharedState.deviceLockedByUser) {
      const activeDevice = findDeviceBySerialNumber(sharedState.serialNumber) || devices[0];
      sharedState.serialNumber = activeDevice.serialNumber;
      sharedState.iotId = activeDevice.iotId;
    }
    return true;
  }

  function readXhrResponseBody(xhr) {
    if (xhr.responseType === "" || xhr.responseType === "text") {
      return JSON.parse(xhr.responseText);
    }
    if (xhr.responseType === "json") {
      return xhr.response;
    }
    return null;
  }

  function captureDeviceValuesFromUrl(requestUrl) {
    const parsedUrl = new URL(String(requestUrl), window.location.href);
    parsedUrl.searchParams.forEach(function (value, name) {
      captureDeviceValue(name, value);
    });
  }

  function captureDeviceValuesFromBody(requestBody) {
    if (!requestBody) {
      return;
    }

    if (typeof FormData !== "undefined" && requestBody instanceof FormData) {
      requestBody.forEach(function (value, name) {
        captureDeviceValue(name, value);
      });
      return;
    }

    if (typeof URLSearchParams !== "undefined" && requestBody instanceof URLSearchParams) {
      requestBody.forEach(function (value, name) {
        captureDeviceValue(name, value);
      });
      return;
    }

    if (typeof requestBody === "string") {
      try {
        const parsedJson = JSON.parse(requestBody);
        if (parsedJson && typeof parsedJson === "object") {
          Object.keys(parsedJson).forEach(function (name) {
            captureDeviceValue(name, parsedJson[name]);
          });
        }
        return;
      } catch (ignoredError) {
        debugLog(ignoredError);
      }

      new URLSearchParams(requestBody).forEach(function (value, name) {
        captureDeviceValue(name, value);
      });
    }
  }

  function forEachHeader(headersLike, callback) {
    if (!headersLike) {
      return;
    }
    if (typeof Headers !== "undefined" && headersLike instanceof Headers) {
      headersLike.forEach(function (value, name) {
        callback(name, value);
      });
      return;
    }
    if (Array.isArray(headersLike)) {
      headersLike.forEach(function (pair) {
        callback(pair[0], pair[1]);
      });
      return;
    }
    Object.keys(headersLike).forEach(function (name) {
      callback(name, headersLike[name]);
    });
  }

  function installNetworkHooks() {
    if (sharedState.hooksInstalled) {
      return;
    }
    sharedState.hooksInstalled = true;

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (requestMethod, requestUrl) {
      try {
        this.__mmFirstParty = isFirstPartyUrl(requestUrl);
        if (this.__mmFirstParty) {
          captureDeviceValuesFromUrl(requestUrl);
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
      return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (requestBody) {
      try {
        if (this.__mmFirstParty) {
          captureDeviceValuesFromBody(requestBody);
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
      try {
        this.addEventListener("load", function () {
          try {
            if (String(this.responseURL || "").indexOf(IMPORTER_CONFIG.userDevicesEndpoint) === -1) {
              return;
            }
            registerDevicesFromResponse(readXhrResponseBody(this));
          } catch (ignoredError) {
            debugLog(ignoredError);
          }
        });
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
      return originalSend.apply(this, arguments);
    };

    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (headerName, headerValue) {
      try {
        if (this.__mmFirstParty) {
          captureHeader(headerName, headerValue);
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const requestUrl =
        typeof input === "string"
          ? input
          : typeof URL !== "undefined" && input instanceof URL
            ? input.href
            : (input && input.url) || "";
      try {
        if (isFirstPartyUrl(requestUrl)) {
          captureDeviceValuesFromUrl(requestUrl);
          if (init && init.body) {
            captureDeviceValuesFromBody(init.body);
          }
          if (typeof Request !== "undefined" && input instanceof Request) {
            forEachHeader(input.headers, captureHeader);
          }
          if (init && init.headers) {
            forEachHeader(init.headers, captureHeader);
          }
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }

      const responsePromise = originalFetch.apply(this, arguments);

      try {
        if (String(requestUrl).indexOf(IMPORTER_CONFIG.userDevicesEndpoint) !== -1) {
          responsePromise
            .then(function (response) {
              return response.clone().json();
            })
            .then(function (responseBody) {
              registerDevicesFromResponse(responseBody);
            })
            .catch(debugLog);
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }

      return responsePromise;
    };
  }

  function stripWrappingQuotes(rawValue) {
    if (typeof rawValue === "string" && rawValue.charAt(0) === '"') {
      try {
        return JSON.parse(rawValue);
      } catch (ignoredError) {
        return rawValue;
      }
    }
    return rawValue;
  }

  function findCredentialsInValue(value, depth, found) {
    if (depth > IMPORTER_CONFIG.maxStoreScanDepth || value === null || typeof value !== "object") {
      return;
    }
    Object.keys(value).forEach(function (key) {
      if (key.charAt(0) === "$" || key.charAt(0) === "_") {
        return;
      }
      const lowerCaseKey = key.toLowerCase();
      const child = value[key];
      const isScalarValue = (typeof child === "string" && child !== "") || typeof child === "number";

      if (isScalarValue) {
        const scalarText = String(child);
        if (lowerCaseKey === "accesstoken" && !found.accessToken) {
          found.accessToken = scalarText;
        }
        if (lowerCaseKey === "token" && !found.token) {
          found.token = scalarText;
        }
        if (lowerCaseKey === "sn" && !found.serialNumber) {
          found.serialNumber = scalarText;
        }
        if ((lowerCaseKey === "iotid" || lowerCaseKey === "useriotid") && !found.iotId) {
          found.iotId = scalarText;
        }
      } else if (child !== null && typeof child === "object") {
        findCredentialsInValue(child, depth + 1, found);
      }
    });
  }

  function scanVueStoreForCredentials(found) {
    try {
      const appElement = document.getElementById("app");
      if (!appElement) {
        return;
      }
      const vueRoot = appElement.__vue__;
      const vueApp = appElement.__vue_app__;
      const vueStore =
        (vueRoot && vueRoot.$store) ||
        (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$store);
      if (vueStore && vueStore.state) {
        findCredentialsInValue(vueStore.state, 0, found);
      }
    } catch (ignoredError) {
      debugLog(ignoredError);
    }
  }

  function scanBrowserStorageForCredentials() {
    const found = { accessToken: "", token: "", serialNumber: "", iotId: "" };
    const directKeyMap = {
      accesstoken: "accessToken",
      token: "token",
      sn: "serialNumber",
      iotid: "iotId",
      useriotid: "iotId",
    };

    function resolveFoundKey(rawKey) {
      const lowerCaseKey = String(rawKey).toLowerCase();
      return Object.prototype.hasOwnProperty.call(directKeyMap, lowerCaseKey)
        ? directKeyMap[lowerCaseKey]
        : "";
    }

    [window.localStorage, window.sessionStorage].forEach(function (storage) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          const rawValue = storage.getItem(key);
          const foundKey = resolveFoundKey(key);

          if (foundKey && rawValue) {
            if (!found[foundKey]) {
              found[foundKey] = stripWrappingQuotes(rawValue);
            }
          } else if (rawValue && (rawValue.charAt(0) === "{" || rawValue.charAt(0) === "[")) {
            try {
              findCredentialsInValue(JSON.parse(rawValue), 0, found);
            } catch (ignoredError) {
              debugLog(ignoredError);
            }
          }
        }
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
    });

    document.cookie.split(";").forEach(function (cookiePart) {
      const separatorIndex = cookiePart.indexOf("=");
      if (separatorIndex < 0) {
        return;
      }
      const foundKey = resolveFoundKey(cookiePart.slice(0, separatorIndex).trim());
      if (!foundKey || found[foundKey]) {
        return;
      }
      try {
        found[foundKey] = decodeURIComponent(cookiePart.slice(separatorIndex + 1).trim());
      } catch (ignoredError) {
        debugLog(ignoredError);
      }
    });

    scanVueStoreForCredentials(found);

    return found;
  }

  const EXTINF_ATTRIBUTE_PATTERN = /[\w-]+=(?:"[^"]*"|'[^']*')/g;
  const TVG_NAME_PATTERN = /tvg-name=(?:"([^"]*)"|'([^']*)')/;
  const STREAM_URL_PATTERN = /^[a-z][a-z0-9+.\-]*:\/\/.+$/i;

  function cleanChannelName(rawName) {
    return String(rawName || "").replace(/\s+/g, " ").trim();
  }

  function parseExtinfLine(extinfLine) {
    const attributeNameMatch = extinfLine.match(TVG_NAME_PATTERN);
    const lineWithoutAttributes = extinfLine.replace(EXTINF_ATTRIBUTE_PATTERN, "");
    const firstCommaIndex = lineWithoutAttributes.indexOf(",");
    const displayName =
      firstCommaIndex >= 0 ? lineWithoutAttributes.slice(firstCommaIndex + 1) : "";

    const attributeName = attributeNameMatch ? attributeNameMatch[1] || attributeNameMatch[2] || "" : "";
    return cleanChannelName(displayName || attributeName);
  }

  function parseM3uText(playlistText) {
    const channels = [];
    let pendingName = null;
    let invalidLines = 0;

    const lines = String(playlistText).replace(/^\uFEFF/, "").split(/\r?\n/);

    lines.forEach(function (rawLine) {
      const line = rawLine.trim();

      if (!line || line.indexOf("#EXTM3U") === 0) {
        return;
      }

      if (line.indexOf("#EXTINF") === 0) {
        pendingName = parseExtinfLine(line);
        return;
      }

      if (line.charAt(0) === "#") {
        return;
      }

      if (!STREAM_URL_PATTERN.test(line)) {
        invalidLines += 1;
        pendingName = null;
        return;
      }

      channels.push({
        name: cleanChannelName(pendingName) || line,
        url: line,
      });
      pendingName = null;
    });

    return { channels: channels, invalidLines: invalidLines };
  }

  function normalizeUrl(rawUrl) {
    return String(rawUrl || "").trim().replace(/\/+$/, "");
  }

  function decodePlaylistBytes(bytes) {
    try {
      return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
    } catch (decodeError) {
      debugLog(decodeError);
      return { text: new TextDecoder("windows-1256").decode(bytes), encoding: "windows-1256" };
    }
  }

  function planImport(parsedChannels, existingChannels) {
    const knownUrls = new Set(
      existingChannels.map(function (channel) {
        return normalizeUrl(channel && channel.url);
      })
    );
    const pendingUrls = new Set();
    const pendingChannels = [];
    let skippedAlreadyOnDevice = 0;
    let skippedDuplicateInFile = 0;

    parsedChannels.forEach(function (channel) {
      const normalizedUrl = normalizeUrl(channel.url);
      if (pendingUrls.has(normalizedUrl)) {
        skippedDuplicateInFile += 1;
        return;
      }
      if (knownUrls.has(normalizedUrl)) {
        skippedAlreadyOnDevice += 1;
        return;
      }
      pendingUrls.add(normalizedUrl);
      pendingChannels.push(channel);
    });

    return {
      pendingChannels: pendingChannels,
      skippedAlreadyOnDevice: skippedAlreadyOnDevice,
      skippedDuplicateInFile: skippedDuplicateInFile,
    };
  }

  function parseRetryAfterMilliseconds(headerValue) {
    const seconds = Number(headerValue);
    if (!headerValue || !Number.isFinite(seconds) || seconds <= 0) {
      return 0;
    }
    return Math.min(seconds * 1000, IMPORTER_CONFIG.maxRetryAfterMilliseconds);
  }

  function buildAuthHeaders(credentials) {
    return {
      accept: "application/json, text/plain, */*",
      accesstoken: credentials.accessToken,
      token: credentials.token,
    };
  }

  async function fetchUserDevices(credentials) {
    const response = await fetch(IMPORTER_CONFIG.userDevicesEndpoint, {
      method: "GET",
      headers: buildAuthHeaders(credentials),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("فشل طلب قائمة الأجهزة (HTTP " + response.status + ")");
    }

    return registerDevicesFromResponse(await response.json());
  }

  async function fetchChannelListPage(credentials, serialNumber, pageNumber, channelName) {
    const queryString = new URLSearchParams({
      page: String(pageNumber),
      limit: String(IMPORTER_CONFIG.listPageSize),
      channelName: channelName || "",
      sn: serialNumber,
    }).toString();

    const response = await fetch(IMPORTER_CONFIG.listEndpoint + "?" + queryString, {
      method: "GET",
      headers: buildAuthHeaders(credentials),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("فشل طلب قائمة الصوتيات (HTTP " + response.status + ")");
    }

    const responseBody = await response.json();
    if (String(responseBody.code) !== IMPORTER_CONFIG.successCode) {
      throw new Error(
        "رفض الموقع طلب قائمة الصوتيات (code=" + responseBody.code + ", msg=" + responseBody.msg + ")"
      );
    }
    return responseBody;
  }

  async function fetchAllExistingChannels(credentials, serialNumber) {
    const firstPage = await fetchChannelListPage(credentials, serialNumber, 1);
    const channels = (firstPage.data || []).slice();
    const reportedTotal = Number(firstPage.total);
    const total = Number.isFinite(reportedTotal) ? reportedTotal : channels.length;

    let pageNumber = 2;
    while (channels.length < total && pageNumber <= IMPORTER_CONFIG.maxListPages) {
      const nextPage = await fetchChannelListPage(credentials, serialNumber, pageNumber);
      if (!nextPage.data || nextPage.data.length === 0) {
        break;
      }
      nextPage.data.forEach(function (channel) {
        channels.push(channel);
      });
      pageNumber += 1;
    }

    return { channels: channels, total: total };
  }

  function sleep(milliseconds, signal) {
    return new Promise(function (resolve) {
      if (signal && signal.aborted) {
        resolve();
        return;
      }
      function finish() {
        clearTimeout(timer);
        if (signal) {
          signal.removeEventListener("abort", finish);
        }
        resolve();
      }
      const timer = setTimeout(finish, milliseconds);
      if (signal) {
        signal.addEventListener("abort", finish);
      }
    });
  }

  async function addOneChannel(credentials, serialNumber, iotId, channel) {
    const formData = new FormData();
    formData.append("channelName", channel.name);
    formData.append("url", channel.url);
    formData.append("sn", serialNumber);
    formData.append("iotId", iotId);

    const response = await fetch(IMPORTER_CONFIG.addEndpoint, {
      method: "POST",
      headers: buildAuthHeaders(credentials),
      body: formData,
      credentials: "same-origin",
    });

    if (response.status === 429) {
      return {
        ok: false,
        retryable: true,
        ambiguous: false,
        retryAfterMilliseconds: parseRetryAfterMilliseconds(response.headers.get("retry-after")),
        message: "HTTP 429 (طلبات كثيرة)",
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        retryable: false,
        authFailed: true,
        message: "HTTP " + response.status + " (الجلسة غير صالحة أو انتهت)",
      };
    }
    if (!response.ok) {
      const isServerError = response.status >= 500;
      return { ok: false, retryable: isServerError, ambiguous: isServerError, message: "HTTP " + response.status };
    }

    const responseBody = await response.json();
    if (String(responseBody.code) === IMPORTER_CONFIG.successCode) {
      return { ok: true, retryable: false, message: "" };
    }
    return {
      ok: false,
      retryable: false,
      message: "code=" + responseBody.code + " msg=" + responseBody.msg,
    };
  }

  async function channelAlreadyExists(credentials, serialNumber, channel) {
    try {
      const responseBody = await fetchChannelListPage(credentials, serialNumber, 1, channel.name);
      const targetUrl = normalizeUrl(channel.url);
      return (responseBody.data || []).some(function (existing) {
        return normalizeUrl(existing && existing.url) === targetUrl;
      });
    } catch (ignoredError) {
      return false;
    }
  }

  async function addChannelWithRetries(credentials, serialNumber, iotId, channel, signal) {
    let lastResult = { ok: false, retryable: false, message: "خطأ غير معروف" };

    for (let attempt = 1; attempt <= IMPORTER_CONFIG.maxRetriesPerChannel; attempt += 1) {
      try {
        lastResult = await addOneChannel(credentials, serialNumber, iotId, channel);
      } catch (networkError) {
        lastResult = {
          ok: false,
          retryable: true,
          ambiguous: true,
          message: String(networkError.message || networkError),
        };
      }

      if (lastResult.ok || !lastResult.retryable) {
        return lastResult;
      }

      if (lastResult.ambiguous && (await channelAlreadyExists(credentials, serialNumber, channel))) {
        return { ok: true, retryable: false, message: "" };
      }
      if (attempt === IMPORTER_CONFIG.maxRetriesPerChannel) {
        break;
      }
      await sleep(lastResult.retryAfterMilliseconds || IMPORTER_CONFIG.retryBackoffMilliseconds * attempt, signal);
      if (signal && signal.aborted) {
        return { ok: false, retryable: false, aborted: true, message: lastResult.message };
      }
    }

    return lastResult;
  }

  function hashText(text) {
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
    }
    return (hash >>> 0).toString(36);
  }

  function buildPlaylistFingerprint(channels) {
    return (
      channels.length +
      "-" +
      hashText(
        channels
          .map(function (channel) {
            return normalizeUrl(channel.url);
          })
          .join("\n")
      )
    );
  }

  function resumeStorageKey(serialNumber, fingerprint) {
    return IMPORTER_CONFIG.resumeStoragePrefix + serialNumber + ":" + fingerprint;
  }

  function parseResumeValue(rawValue) {
    if (typeof rawValue !== "string" || rawValue.indexOf("v1|") !== 0) {
      return null;
    }
    try {
      const record = JSON.parse(rawValue.slice(3));
      return record && Array.isArray(record.added) ? record : null;
    } catch (parseError) {
      debugLog(parseError);
      return null;
    }
  }

  function readResumeRecord(serialNumber, fingerprint) {
    try {
      return parseResumeValue(window.localStorage.getItem(resumeStorageKey(serialNumber, fingerprint)));
    } catch (storageError) {
      debugLog(storageError);
      return null;
    }
  }

  function writeResumeRecord(serialNumber, fingerprint, addedUrls) {
    try {
      window.localStorage.setItem(
        resumeStorageKey(serialNumber, fingerprint),
        "v1|" + JSON.stringify({ added: addedUrls, updated: Date.now() })
      );
    } catch (storageError) {
      debugLog(storageError);
    }
  }

  function clearResumeRecord(serialNumber, fingerprint) {
    try {
      window.localStorage.removeItem(resumeStorageKey(serialNumber, fingerprint));
    } catch (storageError) {
      debugLog(storageError);
    }
  }

  function pruneResumeRecords() {
    try {
      const storage = window.localStorage;
      const staleKeys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || key.indexOf(IMPORTER_CONFIG.resumeStoragePrefix) !== 0) {
          continue;
        }
        const record = parseResumeValue(storage.getItem(key));
        if (!record || Date.now() - Number(record.updated || 0) > IMPORTER_CONFIG.resumeMaxAgeMilliseconds) {
          staleKeys.push(key);
        }
      }
      staleKeys.forEach(function (key) {
        storage.removeItem(key);
      });
    } catch (storageError) {
      debugLog(storageError);
    }
  }

  function removeExistingPanel() {
    const existingPanel = document.getElementById(IMPORTER_CONFIG.panelElementId);
    if (existingPanel) {
      existingPanel.remove();
    }
    const existingStyle = document.getElementById(IMPORTER_CONFIG.styleElementId);
    if (existingStyle) {
      existingStyle.remove();
    }
    const existingLauncher = document.getElementById(IMPORTER_CONFIG.launcherElementId);
    if (existingLauncher) {
      existingLauncher.remove();
    }
  }

  function createPanel() {
    removeExistingPanel();

    if (!document.getElementById(IMPORTER_CONFIG.fontElementId)) {
      const fontElement = document.createElement("link");
      fontElement.id = IMPORTER_CONFIG.fontElementId;
      fontElement.rel = "stylesheet";
      fontElement.href = IMPORTER_CONFIG.fontUrl;
      document.head.appendChild(fontElement);
    }

    const styleElement = document.createElement("style");
    styleElement.id = IMPORTER_CONFIG.styleElementId;
    styleElement.textContent = PANEL_STYLES;
    document.head.appendChild(styleElement);

    const panel = document.createElement("div");
    panel.id = IMPORTER_CONFIG.panelElementId;
    panel.className = "mm-importer-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "MetaMango Bulk Importer");
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="mm-importer-header">
        <span class="mm-importer-title">MetaMango Bulk Importer</span>
        <button type="button" class="mm-importer-close-button" title="إغلاق" aria-label="إغلاق">&times;</button>
      </div>
      <div class="mm-importer-body">
        <div class="mm-importer-credentials-status"></div>

        <details class="mm-importer-advanced">
        <summary>الجلسة والجهاز</summary>
        <div class="mm-importer-advanced-body">
        <label class="mm-importer-field">
          <span class="mm-importer-field-label">accesstoken</span>
          <input type="password" class="mm-importer-input mm-importer-access-token-input" autocomplete="off">
        </label>

        <label class="mm-importer-field">
          <span class="mm-importer-field-label">token</span>
          <input type="password" class="mm-importer-input mm-importer-token-input" autocomplete="off">
        </label>

        <label class="mm-importer-field mm-importer-device-field" hidden>
          <span class="mm-importer-field-label">الجهاز</span>
          <select class="mm-importer-input mm-importer-device-select"></select>
        </label>

        <div class="mm-importer-field-row">
          <label class="mm-importer-field">
            <span class="mm-importer-field-label">الرقم التسلسلي للجهاز (sn)</span>
            <div class="mm-importer-masked-wrap">
              <input type="text" class="mm-importer-input mm-importer-serial-input">
              <span class="mm-importer-mask-overlay mm-importer-serial-mask"></span>
            </div>
          </label>
          <label class="mm-importer-field">
            <span class="mm-importer-field-label">معرّف iotId</span>
            <div class="mm-importer-masked-wrap">
              <input type="text" class="mm-importer-input mm-importer-iot-id-input">
              <span class="mm-importer-mask-overlay mm-importer-iot-id-mask"></span>
            </div>
          </label>
        </div>
        </div>
        </details>

        <label class="mm-importer-field">
          <span class="mm-importer-field-label">التأخير بين الطلبات (ملي ثانية)</span>
          <input type="number" min="0" step="100" class="mm-importer-input mm-importer-delay-input">
        </label>

        <label class="mm-importer-dropzone">
          <input type="file" accept=".m3u,.m3u8,.txt" class="mm-importer-file-input mm-importer-visually-hidden">
          <span class="mm-importer-dropzone-title">اسحب ملف M3U هنا أو اضغط للاختيار</span>
          <span class="mm-importer-file-summary">لم يتم تحميل أي ملف.</span>
        </label>
        <div class="mm-importer-limit-note" data-state="idle">
          <div class="mm-importer-limit-fixed"></div>
          <div class="mm-importer-limit-live" hidden></div>
        </div>

        <details class="mm-importer-review" hidden>
          <summary>مراجعة الصوتيات (<span class="mm-importer-review-count"></span>)</summary>
          <div class="mm-importer-review-body">
            <input type="text" class="mm-importer-input mm-importer-review-search" placeholder="بحث بالاسم أو الرابط" autocomplete="off">
            <div class="mm-importer-button-row">
              <button type="button" class="mm-importer-button mm-importer-review-select-all">تحديد الكل</button>
              <button type="button" class="mm-importer-button mm-importer-review-select-none">إلغاء التحديد</button>
            </div>
            <div class="mm-importer-review-list"></div>
          </div>
        </details>

        <label class="mm-importer-checkbox-row">
          <input type="checkbox" class="mm-importer-dry-run-checkbox" checked>
          <span>تجربة (معاينة فقط دون إضافة فعلية)</span>
        </label>

        <div class="mm-importer-button-row">
          <button type="button" class="mm-importer-button mm-importer-button-primary mm-importer-start-button">بدء</button>
          <button type="button" class="mm-importer-button mm-importer-button-danger mm-importer-stop-button" disabled>إيقاف</button>
          <button type="button" class="mm-importer-button mm-importer-export-failed-button" disabled>تنزيل غير المضاف</button>
        </div>

        <div class="mm-importer-progress-text"></div>
        <div class="mm-importer-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="mm-importer-progress-fill"></div></div>
        <div class="mm-importer-log" role="log" aria-live="polite"></div>
      </div>
      <div class="mm-importer-credit">
        تطوير <a dir="ltr" href="https://t.me/iiNEYMARv1" target="_blank" rel="noopener noreferrer">@iiNEYMAR</a>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function startImporter() {
    const panel = createPanel();
    const elements = {
      credentialsStatus: panel.querySelector(".mm-importer-credentials-status"),
      accessTokenInput: panel.querySelector(".mm-importer-access-token-input"),
      tokenInput: panel.querySelector(".mm-importer-token-input"),
      serialInput: panel.querySelector(".mm-importer-serial-input"),
      iotIdInput: panel.querySelector(".mm-importer-iot-id-input"),
      serialMask: panel.querySelector(".mm-importer-serial-mask"),
      iotIdMask: panel.querySelector(".mm-importer-iot-id-mask"),
      deviceField: panel.querySelector(".mm-importer-device-field"),
      deviceSelect: panel.querySelector(".mm-importer-device-select"),
      delayInput: panel.querySelector(".mm-importer-delay-input"),
      fileInput: panel.querySelector(".mm-importer-file-input"),
      fileSummary: panel.querySelector(".mm-importer-file-summary"),
      dryRunCheckbox: panel.querySelector(".mm-importer-dry-run-checkbox"),
      startButton: panel.querySelector(".mm-importer-start-button"),
      stopButton: panel.querySelector(".mm-importer-stop-button"),
      progressText: panel.querySelector(".mm-importer-progress-text"),
      logContainer: panel.querySelector(".mm-importer-log"),
      closeButton: panel.querySelector(".mm-importer-close-button"),
      credentialsDetails: panel.querySelector(".mm-importer-advanced"),
      progressBar: panel.querySelector(".mm-importer-progress-bar"),
      progressFill: panel.querySelector(".mm-importer-progress-fill"),
      exportFailedButton: panel.querySelector(".mm-importer-export-failed-button"),
      limitNote: panel.querySelector(".mm-importer-limit-note"),
      limitFixed: panel.querySelector(".mm-importer-limit-fixed"),
      limitLive: panel.querySelector(".mm-importer-limit-live"),
      reviewDetails: panel.querySelector(".mm-importer-review"),
      reviewCount: panel.querySelector(".mm-importer-review-count"),
      reviewSearch: panel.querySelector(".mm-importer-review-search"),
      reviewSelectAll: panel.querySelector(".mm-importer-review-select-all"),
      reviewSelectNone: panel.querySelector(".mm-importer-review-select-none"),
      reviewList: panel.querySelector(".mm-importer-review-list"),
    };

    pruneResumeRecords();

    const importerState = {
      parsedChannels: [],
      fingerprint: "",
      failedChannels: [],
      isRunning: false,
      stopRequested: false,
      abortController: null,
    };

    elements.delayInput.value = String(IMPORTER_CONFIG.defaultDelayMilliseconds);
    elements.delayInput.min = String(IMPORTER_CONFIG.minDelayMilliseconds);

    function writeLog(message, kind) {
      const lineElement = document.createElement("div");
      lineElement.dir = "auto";
      lineElement.textContent = message;
      if (kind === "error") {
        lineElement.className = "mm-importer-log-error";
      } else if (kind === "success") {
        lineElement.className = "mm-importer-log-success";
      }
      elements.logContainer.appendChild(lineElement);

      while (elements.logContainer.childNodes.length > IMPORTER_CONFIG.maxLogLines) {
        elements.logContainer.removeChild(elements.logContainer.firstChild);
      }
      elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    }

    function setProgress(text, fraction) {
      elements.progressText.textContent = text;
      if (typeof fraction === "number") {
        const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
        elements.progressFill.style.width = percent + "%";
        elements.progressBar.setAttribute("aria-valuenow", String(percent));
      }
    }

    function setRunningState(isRunning) {
      importerState.isRunning = isRunning;
      elements.startButton.disabled = isRunning;
      elements.stopButton.disabled = !isRunning;
      elements.fileInput.disabled = isRunning;
      elements.exportFailedButton.disabled = isRunning || importerState.failedChannels.length === 0;
      elements.reviewDetails.classList.toggle("mm-importer-review-locked", isRunning);
      elements.reviewSelectAll.disabled = isRunning;
      elements.reviewSelectNone.disabled = isRunning;
      elements.reviewSearch.disabled = isRunning;
    }

    function fillInputFromState(inputElement, detectedValue) {
      if (!detectedValue || document.activeElement === inputElement) {
        return;
      }
      const wasEditedByUser =
        inputElement.value !== "" && inputElement.dataset.autoFilledValue !== inputElement.value;
      if (wasEditedByUser) {
        return;
      }
      inputElement.value = detectedValue;
      inputElement.dataset.autoFilledValue = detectedValue;
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function maskSensitiveValue(rawValue) {
      const value = String(rawValue || "");
      if (!value) {
        return "";
      }
      if (value.length <= 4) {
        return "\u2022\u2022\u2022\u2022";
      }
      return value.slice(0, 2) + "\u2022\u2022\u2022\u2022" + value.slice(-2);
    }

    function setupMaskedField(inputElement, maskElement) {
      if (!inputElement || !maskElement) {
        return;
      }
      inputElement.addEventListener("input", function () {
        maskElement.textContent = maskSensitiveValue(inputElement.value);
      });
    }

    setupMaskedField(elements.serialInput, elements.serialMask);
    setupMaskedField(elements.iotIdInput, elements.iotIdMask);

    function isPanelOpen() {
      return panel.classList.contains("mm-importer-open");
    }

    function setPanelOpen(shouldOpen) {
      panel.classList.toggle("mm-importer-open", shouldOpen);
      panel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    }

    function selectedChannels() {
      return importerState.parsedChannels.filter(function (channel) {
        return channel.selected;
      });
    }

    function selectedUniqueCount() {
      return new Set(
        selectedChannels().map(function (channel) {
          return normalizeUrl(channel.url);
        })
      ).size;
    }

    const limitState = {
      serial: "",
      total: null,
      status: "idle",
      attempts: 0,
      lastAttemptTime: 0,
      isFetching: false,
    };

    function renderLimitNote() {
      const limit = IMPORTER_CONFIG.deviceChannelLimit;
      elements.limitFixed.textContent = "الحد الأقصى: " + limit + " صوتية لكل جهاز.";

      const currentSerial = elements.serialInput.value.trim();
      const isReady =
        limitState.status === "ready" && limitState.total !== null && limitState.serial === currentSerial;
      if (!isReady) {
        elements.limitLive.hidden = true;
        elements.limitLive.textContent = "";
        elements.limitNote.dataset.state = "idle";
        return;
      }

      const available = Math.max(0, limit - limitState.total);
      const text = "المتاح على الجهاز: " + available + " من " + limit;
      let state = "ok";
      let selectedCount = 0;

      if (importerState.parsedChannels.length > 0) {
        selectedCount = selectedUniqueCount();
        if (selectedCount > available) {
          state = "over";
        }
      }
      if (state !== "over" && available - selectedCount <= IMPORTER_CONFIG.deviceLimitWarnThreshold) {
        state = "warn";
      }

      elements.limitLive.textContent = text;
      elements.limitLive.hidden = false;
      elements.limitNote.dataset.state = state;
    }

    function setDeviceCount(serialNumber, total) {
      limitState.serial = serialNumber;
      limitState.total = total;
      limitState.status = "ready";
      limitState.attempts = 0;
      renderLimitNote();
    }

    function maybeFetchDeviceCount(hasSession, serialNumber) {
      if (!hasSession || !serialNumber || limitState.isFetching || importerState.isRunning) {
        return;
      }
      if (limitState.serial === serialNumber && limitState.status === "ready") {
        return;
      }
      if (limitState.serial !== serialNumber) {
        limitState.serial = serialNumber;
        limitState.total = null;
        limitState.status = "idle";
        limitState.attempts = 0;
        limitState.lastAttemptTime = 0;
      }
      if (limitState.attempts >= IMPORTER_CONFIG.deviceCountMaxAttempts) {
        return;
      }
      const now = Date.now();
      if (now - limitState.lastAttemptTime < IMPORTER_CONFIG.deviceCountRetryMilliseconds) {
        return;
      }

      limitState.isFetching = true;
      limitState.attempts += 1;
      limitState.lastAttemptTime = now;
      limitState.status = "loading";

      fetchChannelListPage(
        {
          accessToken: elements.accessTokenInput.value.trim(),
          token: elements.tokenInput.value.trim(),
        },
        serialNumber,
        1
      )
        .then(function (page) {
          const rawTotal = page.total;
          const total = rawTotal === undefined || rawTotal === null || rawTotal === "" ? NaN : Number(rawTotal);
          if (limitState.serial === serialNumber) {
            if (Number.isFinite(total)) {
              limitState.total = total;
              limitState.status = "ready";
            } else {
              limitState.status = "failed";
            }
          }
        })
        .catch(function (countError) {
          debugLog(countError);
          if (limitState.serial === serialNumber) {
            limitState.status = "failed";
          }
        })
        .then(function () {
          limitState.isFetching = false;
          renderLimitNote();
        });
    }

    function updateReviewCount() {
      elements.reviewCount.textContent = selectedChannels().length + " / " + importerState.parsedChannels.length;
      renderLimitNote();
    }

    function renderReviewList() {
      const channels = importerState.parsedChannels;
      elements.reviewList.textContent = "";
      elements.reviewSearch.value = "";
      elements.reviewDetails.hidden = channels.length === 0;

      if (channels.length > 0) {
        const fragment = document.createDocumentFragment();
        channels.forEach(function (channel, index) {
          const row = document.createElement("label");
          row.className = "mm-importer-review-row";
          row.title = channel.url;
          row.dataset.index = String(index);

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = channel.selected;

          const indexElement = document.createElement("span");
          indexElement.className = "mm-importer-review-index";
          indexElement.textContent = String(index + 1);

          const nameElement = document.createElement("span");
          nameElement.className = "mm-importer-review-name";
          nameElement.dir = "auto";
          nameElement.textContent = channel.name;

          row.appendChild(checkbox);
          row.appendChild(indexElement);
          row.appendChild(nameElement);
          fragment.appendChild(row);
        });
        elements.reviewList.appendChild(fragment);
        elements.reviewDetails.open = true;
      }
      updateReviewCount();
    }

    function applyReviewFilter() {
      const query = elements.reviewSearch.value.trim().toLowerCase();
      const rows = elements.reviewList.children;
      for (let index = 0; index < rows.length; index += 1) {
        const channel = importerState.parsedChannels[Number(rows[index].dataset.index)];
        rows[index].hidden =
          query !== "" &&
          channel.name.toLowerCase().indexOf(query) === -1 &&
          channel.url.toLowerCase().indexOf(query) === -1;
      }
    }

    function setVisibleSelection(isSelected) {
      const rows = elements.reviewList.children;
      for (let index = 0; index < rows.length; index += 1) {
        if (rows[index].hidden) {
          continue;
        }
        importerState.parsedChannels[Number(rows[index].dataset.index)].selected = isSelected;
        rows[index].querySelector("input").checked = isSelected;
      }
      updateReviewCount();
    }

    const deviceDetectionState = {
      attempts: 0,
      lastAttemptTime: 0,
      isFetching: false,
      renderedSignature: "",
    };

    function renderDeviceOptions() {
      const devices = sharedState.devices;
      const signature = JSON.stringify(devices) + "|" + sharedState.serialNumber;
      if (signature === deviceDetectionState.renderedSignature) {
        return;
      }
      deviceDetectionState.renderedSignature = signature;

      elements.deviceField.hidden = devices.length === 0;
      elements.deviceSelect.innerHTML = "";
      devices.forEach(function (device) {
        const option = document.createElement("option");
        option.value = device.serialNumber;
        option.textContent = device.name + " (..." + device.serialNumber.slice(-4) + ")";
        option.selected = device.serialNumber === sharedState.serialNumber;
        elements.deviceSelect.appendChild(option);
      });
    }

    function maybeFetchUserDevices(hasSession) {
      if (!hasSession || sharedState.devices.length > 0 || deviceDetectionState.isFetching) {
        return;
      }
      if (deviceDetectionState.attempts >= IMPORTER_CONFIG.deviceFetchMaxAttempts) {
        return;
      }
      const now = Date.now();
      if (now - deviceDetectionState.lastAttemptTime < IMPORTER_CONFIG.deviceFetchRetryMilliseconds) {
        return;
      }

      deviceDetectionState.isFetching = true;
      deviceDetectionState.attempts += 1;
      deviceDetectionState.lastAttemptTime = now;

      fetchUserDevices({
        accessToken: elements.accessTokenInput.value.trim(),
        token: elements.tokenInput.value.trim(),
      })
        .catch(debugLog)
        .then(function () {
          deviceDetectionState.isFetching = false;
          refreshCredentials();
        });
    }

    function refreshCredentials() {
      const discovered = scanBrowserStorageForCredentials();

      ["accessToken", "token", "serialNumber", "iotId"].forEach(function (stateKey) {
        if (!sharedState[stateKey] && discovered[stateKey]) {
          sharedState[stateKey] = discovered[stateKey];
        }
      });

      fillInputFromState(elements.accessTokenInput, sharedState.accessToken);
      fillInputFromState(elements.tokenInput, sharedState.token);
      fillInputFromState(elements.serialInput, sharedState.serialNumber);
      fillInputFromState(elements.iotIdInput, sharedState.iotId);

      const hasSession =
        Boolean(elements.accessTokenInput.value) && Boolean(elements.tokenInput.value);
      const hasDevice =
        Boolean(elements.serialInput.value.trim()) && Boolean(elements.iotIdInput.value.trim());

      maybeFetchUserDevices(hasSession);
      renderDeviceOptions();
      maybeFetchDeviceCount(hasSession, elements.serialInput.value.trim());
      renderLimitNote();

      const deviceDetectionGaveUp =
        deviceDetectionState.attempts >= IMPORTER_CONFIG.deviceFetchMaxAttempts &&
        !deviceDetectionState.isFetching &&
        sharedState.devices.length === 0;

      if ((!hasSession || deviceDetectionGaveUp) && !elements.credentialsDetails.dataset.autoOpened) {
        elements.credentialsDetails.open = true;
        elements.credentialsDetails.dataset.autoOpened = "1";
      }

      if (hasSession && hasDevice) {
        const selectedOption = elements.deviceSelect.selectedOptions[0];
        const deviceLabel = selectedOption ? selectedOption.textContent : "";
        elements.credentialsStatus.textContent =
          "تم اكتشاف الجلسة والجهاز" + (deviceLabel ? ": " + deviceLabel : "") + ". جاهز.";
        elements.credentialsStatus.classList.add("mm-importer-status-ready");
      } else if (hasSession && !deviceDetectionGaveUp) {
        elements.credentialsStatus.textContent = "تم اكتشاف الجلسة. جارٍ البحث عن جهازك...";
        elements.credentialsStatus.classList.remove("mm-importer-status-ready");
      } else if (hasSession) {
        elements.credentialsStatus.textContent =
          "تعذّر اكتشاف جهازك تلقائيًا. أدخل رقم الجهاز (sn) ومعرّف iotId أدناه.";
        elements.credentialsStatus.classList.remove("mm-importer-status-ready");
      } else {
        elements.credentialsStatus.textContent =
          "بانتظار الجلسة: استخدم الموقع عاديًا (افتح قسم الصوتيات واضغط Search)، أو ألصق القيم أدناه.";
        elements.credentialsStatus.classList.remove("mm-importer-status-ready");
      }
    }

    elements.deviceSelect.addEventListener("change", function () {
      const chosenDevice = findDeviceBySerialNumber(elements.deviceSelect.value);
      if (!chosenDevice) {
        return;
      }
      sharedState.deviceLockedByUser = true;
      sharedState.serialNumber = chosenDevice.serialNumber;
      sharedState.iotId = chosenDevice.iotId;

      elements.serialInput.value = chosenDevice.serialNumber;
      elements.serialInput.dataset.autoFilledValue = chosenDevice.serialNumber;
      elements.serialInput.dispatchEvent(new Event("input", { bubbles: true }));
      elements.iotIdInput.value = chosenDevice.iotId;
      elements.iotIdInput.dataset.autoFilledValue = chosenDevice.iotId;
      elements.iotIdInput.dispatchEvent(new Event("input", { bubbles: true }));
      refreshCredentials();
    });

    refreshCredentials();
    setInterval(function () {
      if (isPanelOpen() || importerState.isRunning) {
        refreshCredentials();
      }
    }, IMPORTER_CONFIG.credentialRefreshMilliseconds);

    const launcherButton = document.createElement("button");
    launcherButton.id = IMPORTER_CONFIG.launcherElementId;
    launcherButton.type = "button";
    launcherButton.className = "mm-importer-launcher";
    launcherButton.textContent = "استيراد جماعي";
    document.body.appendChild(launcherButton);

    launcherButton.addEventListener("click", function () {
      setPanelOpen(!isPanelOpen());
      if (isPanelOpen()) {
        refreshCredentials();
      }
    });

    elements.closeButton.addEventListener("click", function () {
      setPanelOpen(false);
    });

    async function loadPlaylistFile(selectedFile) {
      if (!selectedFile || importerState.isRunning) {
        return;
      }

      try {
        const decoded = decodePlaylistBytes(await selectedFile.arrayBuffer());
        const parsed = parseM3uText(decoded.text);
        parsed.channels.forEach(function (channel) {
          channel.selected = true;
        });
        importerState.parsedChannels = parsed.channels;
        importerState.fingerprint = buildPlaylistFingerprint(parsed.channels);

        let summary = "تمت قراءة " + parsed.channels.length + " صوتية من " + selectedFile.name + ".";
        if (parsed.invalidLines > 0) {
          summary += " (تم تجاهل " + parsed.invalidLines + " سطرًا ليس رابطًا)";
        }

        const knownSerial = elements.serialInput.value.trim();
        const resumeRecord = knownSerial ? readResumeRecord(knownSerial, importerState.fingerprint) : null;
        if (resumeRecord && resumeRecord.added.length > 0) {
          summary += " | استئناف: أُضيف سابقًا " + resumeRecord.added.length;
        }

        elements.fileSummary.textContent = summary;
        writeLog("تمت قراءة " + parsed.channels.length + " صوتية من الملف (الترميز: " + decoded.encoding + ").");
        if (parsed.invalidLines > 0) {
          writeLog("تم تجاهل " + parsed.invalidLines + " سطرًا لا يبدو رابطًا صالحًا.");
        }
        if (resumeRecord && resumeRecord.added.length > 0) {
          writeLog("استئناف: يوجد سجل سابق لهذا الملف على هذا الجهاز (" + resumeRecord.added.length + " صوتية أُضيفت سابقًا). سيُكمل الاستيراد من حيث توقف.");
        }
      } catch (readError) {
        importerState.parsedChannels = [];
        importerState.fingerprint = "";
        elements.fileSummary.textContent = "تعذّرت قراءة الملف.";
        writeLog("خطأ: تعذّرت قراءة الملف: " + readError.message, "error");
      }
      renderReviewList();
    }

    elements.fileInput.addEventListener("change", function () {
      loadPlaylistFile(elements.fileInput.files && elements.fileInput.files[0]);
    });

    let dragDepth = 0;

    function dragHasFiles(dragEvent) {
      const types = dragEvent.dataTransfer && dragEvent.dataTransfer.types;
      return Boolean(types) && Array.prototype.indexOf.call(types, "Files") !== -1;
    }

    panel.addEventListener("dragenter", function (dragEvent) {
      if (!dragHasFiles(dragEvent)) {
        return;
      }
      dragEvent.preventDefault();
      dragDepth += 1;
      panel.classList.add("mm-importer-dragging");
    });

    panel.addEventListener("dragover", function (dragEvent) {
      if (!dragHasFiles(dragEvent)) {
        return;
      }
      dragEvent.preventDefault();
      dragEvent.dataTransfer.dropEffect = importerState.isRunning ? "none" : "copy";
    });

    panel.addEventListener("dragleave", function (dragEvent) {
      if (!dragHasFiles(dragEvent)) {
        return;
      }
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        panel.classList.remove("mm-importer-dragging");
      }
    });

    panel.addEventListener("drop", function (dragEvent) {
      if (!dragHasFiles(dragEvent)) {
        return;
      }
      dragEvent.preventDefault();
      dragDepth = 0;
      panel.classList.remove("mm-importer-dragging");

      if (importerState.isRunning) {
        writeLog("لا يمكن تغيير الملف أثناء الاستيراد.", "error");
        return;
      }
      const droppedFile = dragEvent.dataTransfer.files && dragEvent.dataTransfer.files[0];
      if (!droppedFile) {
        return;
      }
      if (!/\.(m3u8?|txt)$/i.test(droppedFile.name)) {
        writeLog("نوع الملف غير مدعوم. استخدم m3u أو m3u8 أو txt.", "error");
        return;
      }
      elements.fileInput.value = "";
      loadPlaylistFile(droppedFile);
    });

    elements.reviewList.addEventListener("change", function (changeEvent) {
      const row = changeEvent.target.closest(".mm-importer-review-row");
      if (!row) {
        return;
      }
      importerState.parsedChannels[Number(row.dataset.index)].selected = changeEvent.target.checked;
      updateReviewCount();
    });
    elements.reviewSearch.addEventListener("input", applyReviewFilter);
    elements.reviewSelectAll.addEventListener("click", function () {
      setVisibleSelection(true);
    });
    elements.reviewSelectNone.addEventListener("click", function () {
      setVisibleSelection(false);
    });
    elements.serialInput.addEventListener("input", renderLimitNote);

    elements.exportFailedButton.addEventListener("click", function () {
      const failed = importerState.failedChannels;
      if (failed.length === 0) {
        return;
      }
      const lines = ["#EXTM3U"];
      failed.slice().reverse().forEach(function (channel) {
        lines.push("#EXTINF:-1," + channel.name);
        lines.push(channel.url);
      });
      const blob = new Blob([lines.join("\n") + "\n"], { type: "audio/x-mpegurl;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "metamango-failed.m3u";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
    });

    elements.stopButton.addEventListener("click", function () {
      if (importerState.abortController) {
        importerState.abortController.abort();
      }
      importerState.stopRequested = true;
      writeLog("تم طلب الإيقاف. جارٍ إنهاء الصوتية الحالية...");
    });

    elements.startButton.addEventListener("click", function () {
      runImport();
    });

    async function runImport() {
      if (importerState.isRunning) {
        return;
      }

      function readCredentials() {
        return {
          accessToken: elements.accessTokenInput.value.trim(),
          token: elements.tokenInput.value.trim(),
        };
      }
      const credentials = readCredentials();
      const serialNumber = elements.serialInput.value.trim();
      const iotId = elements.iotIdInput.value.trim();
      const requestedDelay = Number(elements.delayInput.value);
      const delayMilliseconds =
        elements.delayInput.value !== "" && Number.isFinite(requestedDelay)
          ? Math.max(IMPORTER_CONFIG.minDelayMilliseconds, requestedDelay)
          : IMPORTER_CONFIG.defaultDelayMilliseconds;
      const isDryRun = elements.dryRunCheckbox.checked;

      if (importerState.parsedChannels.length === 0) {
        writeLog("اختر ملف M3U أولًا.", "error");
        return;
      }
      const selectedList = selectedChannels();
      if (selectedList.length === 0) {
        writeLog("لم يتم تحديد أي صوتية في جدول المراجعة.", "error");
        return;
      }
      const fingerprint = importerState.fingerprint;
      if (!credentials.accessToken || !credentials.token) {
        writeLog("بيانات الجلسة غير متوفرة. راجع سطر الحالة أعلى اللوحة.", "error");
        return;
      }
      if (!serialNumber || !iotId) {
        writeLog("رقم الجهاز (sn) ومعرّف iotId غير متوفرين. اختر جهازك من القائمة أو أدخلهما في اللوحة.", "error");
        return;
      }

      importerState.stopRequested = false;
      importerState.abortController = new AbortController();
      importerState.failedChannels = [];
      const signal = importerState.abortController.signal;
      setRunningState(true);
      setProgress("", 0);

      try {
        if (Number.isFinite(requestedDelay) && requestedDelay < IMPORTER_CONFIG.minDelayMilliseconds) {
          writeLog("تم رفع التأخير إلى الحد الأدنى: " + IMPORTER_CONFIG.minDelayMilliseconds + " ملي ثانية.");
        }
        writeLog("جارٍ تحميل الصوتيات الموجودة على الجهاز...");
        const beforeImport = await fetchAllExistingChannels(credentials, serialNumber);
        writeLog("عدد الصوتيات الحالية على الجهاز: " + beforeImport.total);
        setDeviceCount(serialNumber, beforeImport.total);

        if (
          beforeImport.channels.length > 0 &&
          !beforeImport.channels.some(function (channel) { return channel && channel.url; })
        ) {
          writeLog("تنبيه: لم أجد حقل url في صوتيات الجهاز، لذلك قد لا تعمل إزالة المكرر. راجع استجابة الموقع.", "error");
        }

        const resumeRecord = readResumeRecord(serialNumber, fingerprint);
        const resumeUrls = new Set(
          resumeRecord
            ? resumeRecord.added.map(function (url) {
                return normalizeUrl(url);
              })
            : []
        );
        if (resumeUrls.size > 0) {
          const deviceUrls = new Set(
            beforeImport.channels.map(function (channel) {
              return normalizeUrl(channel && channel.url);
            })
          );
          let missingFromDevice = 0;
          resumeUrls.forEach(function (url) {
            if (!deviceUrls.has(url)) {
              missingFromDevice += 1;
            }
          });
          writeLog("استئناف: سجل سابق لهذا الملف (" + resumeUrls.size + " صوتية أُضيفت سابقًا).");
          if (missingFromDevice > 0) {
            writeLog("منها " + missingFromDevice + " لم تعد موجودة على الجهاز، وستُضاف من جديد إن كانت محددة.");
          }
        }

        const importPlan = planImport(selectedList, beforeImport.channels);
        const pendingChannels = importPlan.pendingChannels;
        const skippedAlreadyOnDevice = importPlan.skippedAlreadyOnDevice;
        const skippedDuplicateInFile = importPlan.skippedDuplicateInFile;

        writeLog(
          "سيُضاف: " + pendingChannels.length +
          " | موجود مسبقًا على الجهاز: " + skippedAlreadyOnDevice +
          " | مكرر داخل الملف: " + skippedDuplicateInFile
        );

        if (pendingChannels.length === 0) {
          setProgress("لا يوجد ما يُضاف.");
          return;
        }

        if (isDryRun) {
          writeLog("تجربة: لم يُرسل شيء فعليًا. أول الصوتيات التي ستُضاف:");
          pendingChannels.slice(0, IMPORTER_CONFIG.dryRunPreviewCount).forEach(function (channel, index) {
            writeLog((index + 1) + ". " + channel.name + "  ->  " + channel.url);
          });
          writeLog("ألغِ تفعيل «تجربة» واضغط «بدء» لإضافتها فعليًا.", "success");
          setProgress(
            "تجربة: سيُضاف " + pendingChannels.length +
            " | موجود مسبقًا " + skippedAlreadyOnDevice +
            " | مكرر " + skippedDuplicateInFile
          );
          return;
        }

        const confirmed = window.confirm(
          "إضافة " + pendingChannels.length + " صوتية إلى الجهاز " + serialNumber + "؟"
        );
        if (!confirmed) {
          writeLog("تم الإلغاء.");
          return;
        }

        pendingChannels.reverse();

        const addedChannels = [];
        const addedUrlSet = new Set(resumeUrls);
        let successCount = 0;
        let failureCount = 0;
        let consecutiveFailures = 0;
        let processedCount = 0;
        let stoppedAutomatically = false;

        for (let index = 0; index < pendingChannels.length; index += 1) {
          if (importerState.stopRequested) {
            writeLog("تم الإيقاف بواسطة المستخدم.");
            break;
          }

          const channel = pendingChannels[index];
          const result = await addChannelWithRetries(readCredentials(), serialNumber, iotId, channel, signal);

          if (result.aborted) {
            writeLog("تم الإيقاف أثناء انتظار إعادة المحاولة.");
            break;
          }

          if (result.ok) {
            successCount += 1;
            addedChannels.push(channel);
            addedUrlSet.add(normalizeUrl(channel.url));
            if (successCount % IMPORTER_CONFIG.resumeSaveEvery === 0) {
              writeResumeRecord(serialNumber, fingerprint, Array.from(addedUrlSet));
            }
            consecutiveFailures = 0;
            writeLog("[تم " + (index + 1) + "/" + pendingChannels.length + "] " + channel.name, "success");
          } else {
            failureCount += 1;
            importerState.failedChannels.push(channel);
            consecutiveFailures += 1;
            writeLog(
              "[فشل " + (index + 1) + "/" + pendingChannels.length + "] " + channel.name + " | " + result.message,
              "error"
            );
          }

          processedCount = index + 1;

          setProgress(
            "أُضيف " + successCount + " | فشل " + failureCount + " | الإجمالي " + pendingChannels.length,
            (index + 1) / pendingChannels.length
          );

          if (result.authFailed) {
            writeLog(
              "تم الإيقاف: الجلسة غير صالحة. افتح الموقع وحدّث الصفحة أو أعد تسجيل الدخول، ثم أعد التشغيل (سيتم تخطي ما أُضيف).",
              "error"
            );
            stoppedAutomatically = true;
            break;
          }

          if (consecutiveFailures >= IMPORTER_CONFIG.maxConsecutiveFailures) {
            writeLog(
              "تم الإيقاف: " + IMPORTER_CONFIG.maxConsecutiveFailures +
              " إخفاقات متتالية. راجع بيانات الجلسة، أو حد الإضافة (100 صوتية)، أو الخطأ أعلاه.",
              "error"
            );
            stoppedAutomatically = true;
            break;
          }

          await sleep(delayMilliseconds, signal);
        }

        if (stoppedAutomatically && processedCount < pendingChannels.length) {
          const unsentChannels = pendingChannels.slice(processedCount);
          unsentChannels.forEach(function (channel) {
            importerState.failedChannels.push(channel);
          });
          writeLog(
            "بقي " + unsentChannels.length + " صوتية لم تُرسل، وأُضيفت إلى «تنزيل غير المضاف».",
            "error"
          );
        }

        if (successCount > 0) {
          writeResumeRecord(serialNumber, fingerprint, Array.from(addedUrlSet));
        }

        writeLog("جارٍ التحقق من إجمالي الصوتيات على الجهاز...");
        const afterImport = await fetchAllExistingChannels(readCredentials(), serialNumber);
        setDeviceCount(serialNumber, afterImport.total);
        const expectedTotal = beforeImport.total + successCount;

        writeLog(
          "إجمالي الجهاز: قبل=" + beforeImport.total +
          "، أُضيف=" + successCount +
          "، المتوقع=" + expectedTotal +
          "، الفعلي=" + afterImport.total
        );

        const afterHasUrls = afterImport.channels.some(function (channel) {
          return channel && channel.url;
        });
        const afterUrls = new Set(
          afterImport.channels.map(function (channel) {
            return normalizeUrl(channel && channel.url);
          })
        );
        const missingChannels = afterHasUrls
          ? addedChannels.filter(function (channel) {
              return !afterUrls.has(normalizeUrl(channel.url));
            })
          : [];

        if (afterImport.total === expectedTotal && missingChannels.length === 0) {
          writeLog("التحقق ناجح.", "success");
          if (failureCount === 0 && !importerState.stopRequested && successCount === pendingChannels.length) {
            clearResumeRecord(serialNumber, fingerprint);
          }
        } else {
          if (missingChannels.length > 0) {
            writeLog("صوتيات أُبلغ بنجاحها ولم تظهر على الجهاز: " + missingChannels.length, "error");
            missingChannels.slice(0, 10).forEach(function (channel) {
              writeLog("- " + channel.name, "error");
            });
          }
          writeLog(
            "عدم تطابق في التحقق. قد يكون السبب عدم حفظ بعض الصوتيات، أو حذف الموقع لمكرر، أو تعديل آخر على الجهاز أثناء الاستيراد. أعد التشغيل؛ سيتخطى ما أُضيف ويكمل الباقي.",
            "error"
          );
        }
      } catch (error) {
        writeLog("خطأ: " + (error && error.message ? error.message : error), "error");
      } finally {
        setRunningState(false);
      }
    }

    writeLog("جاهز. اختر ملف M3U، أبقِ «تجربة» مفعّلة، واضغط «بدء».");
  }

  installNetworkHooks();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startImporter);
  } else {
    startImporter();
  }
})();
