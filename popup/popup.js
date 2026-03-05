/**
 * Collabora — Popup Controller
 * Manages feature toggles, settings, and communication with content scripts.
 */
(function () {
  'use strict';

  var currentSiteKey = '';
  var currentSettings = {};

  /**
   * Send a message to the background service worker (which relays to content script).
   */
  function sendMessage(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (response) {
        resolve(response || {});
      });
    });
  }

  /**
   * Load current state from the active tab's content script.
   */
  function loadState() {
    sendMessage({ type: 'GET_STATE' }).then(function (response) {
      if (!response || response.error) return;

      currentSiteKey = response.siteKey || '';
      currentSettings = response.settings || {};

      // Display site key
      document.getElementById('site-key').textContent = currentSiteKey;

      // Update toggles
      var features = response.features || {};
      Object.keys(features).forEach(function (id) {
        var toggle = document.querySelector('[data-toggle="' + id + '"]');
        if (toggle) {
          toggle.checked = features[id].active;
          updateSettingsVisibility(id, features[id].active);
        }

        // Update settings controls with current values
        var featureSettings = currentSettings[id] || features[id].defaults || {};
        updateSettingsControls(id, featureSettings);
      });
    });
  }

  /**
   * Show/hide settings panel for a feature.
   */
  function updateSettingsVisibility(featureId, isActive) {
    var panel = document.querySelector('[data-settings="' + featureId + '"]');
    if (panel) {
      panel.classList.toggle('is-visible', isActive);
    }
  }

  /**
   * Update settings control values from stored settings.
   */
  function updateSettingsControls(featureId, settings) {
    var panel = document.querySelector('[data-settings="' + featureId + '"]');
    if (!panel) return;

    Object.keys(settings).forEach(function (key) {
      if (key === 'enabled') return;

      var control = panel.querySelector('[data-setting="' + key + '"]');
      if (!control) return;

      control.value = settings[key];

      // Update display values
      var valueDisplay = panel.querySelector('[data-value="' + key + '"]');
      if (valueDisplay) {
        valueDisplay.textContent = settings[key];
      }
    });

    // Show/hide custom controls for color-contrast
    if (featureId === 'color-contrast') {
      var customGroup = panel.querySelector('[data-custom-group="color-contrast"]');
      if (customGroup) {
        customGroup.style.display = settings.mode === 'custom' ? 'block' : 'none';
      }
    }
  }

  /**
   * Collect all current settings from a feature's panel.
   */
  function collectSettings(featureId) {
    var panel = document.querySelector('[data-settings="' + featureId + '"]');
    if (!panel) return {};

    var settings = {};
    panel.querySelectorAll('[data-setting]').forEach(function (control) {
      var key = control.getAttribute('data-setting');
      var value = control.value;

      // Convert numeric values
      if (control.type === 'range') {
        value = parseFloat(value);
      }

      settings[key] = value;
    });

    return settings;
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function () {
    loadState();

    // Handle feature toggles
    document.querySelectorAll('.toggle__input').forEach(function (toggle) {
      toggle.addEventListener('change', function () {
        var featureId = toggle.getAttribute('data-toggle');
        var isEnabled = toggle.checked;

        updateSettingsVisibility(featureId, isEnabled);

        if (isEnabled) {
          var settings = collectSettings(featureId);
          sendMessage({ type: 'ENABLE_FEATURE', featureId: featureId, settings: settings });
        } else {
          sendMessage({ type: 'DISABLE_FEATURE', featureId: featureId });
        }
      });
    });

    // Handle settings changes (sliders, selects)
    document.querySelectorAll('[data-setting]').forEach(function (control) {
      var eventType = control.tagName === 'SELECT' ? 'change' : 'input';

      control.addEventListener(eventType, function () {
        // Find parent feature
        var settingsPanel = control.closest('[data-settings]');
        if (!settingsPanel) return;
        var featureId = settingsPanel.getAttribute('data-settings');

        // Update display value
        var key = control.getAttribute('data-setting');
        var valueDisplay = settingsPanel.querySelector('[data-value="' + key + '"]');
        if (valueDisplay) {
          valueDisplay.textContent = control.value;
        }

        // Show/hide custom controls for color contrast mode change
        if (featureId === 'color-contrast' && key === 'mode') {
          var customGroup = settingsPanel.querySelector('[data-custom-group="color-contrast"]');
          if (customGroup) {
            customGroup.style.display = control.value === 'custom' ? 'block' : 'none';
          }
        }

        // Send update to content script
        var settings = collectSettings(featureId);
        sendMessage({ type: 'UPDATE_SETTINGS', featureId: featureId, settings: settings });
      });
    });

    // Apply to all sites
    document.getElementById('apply-all').addEventListener('click', function () {
      // Save current site settings as global
      var allSettings = {};
      document.querySelectorAll('.toggle__input').forEach(function (toggle) {
        var featureId = toggle.getAttribute('data-toggle');
        var settings = collectSettings(featureId);
        settings.enabled = toggle.checked;
        allSettings[featureId] = settings;
      });

      // Write each feature to global storage
      var promises = Object.keys(allSettings).map(function (featureId) {
        return new Promise(function (resolve) {
          chrome.storage.local.get(['global'], function (data) {
            var global = data.global || {};
            global[featureId] = allSettings[featureId];
            chrome.storage.local.set({ global: global }, resolve);
          });
        });
      });

      Promise.all(promises).then(function () {
        var btn = document.getElementById('apply-all');
        btn.textContent = 'Applied!';
        setTimeout(function () { btn.textContent = 'Apply to all sites'; }, 1500);
      });
    });

    // Reset this site
    document.getElementById('reset-site').addEventListener('click', function () {
      sendMessage({ type: 'RESET_SITE' }).then(function () {
        loadState();
        var btn = document.getElementById('reset-site');
        btn.textContent = 'Reset!';
        setTimeout(function () { btn.textContent = 'Reset this site'; }, 1500);
      });
    });
  });
})();
