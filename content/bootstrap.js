/**
 * Collabora — Bootstrap
 * Initializes the feature manager and loads per-site preferences.
 */
(function () {
  'use strict';

  // Mark body for base CSS custom properties
  document.body.setAttribute('data-collabora', 'true');

  // Initialize all features based on stored prefs
  Collabora.features.initAll();

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    var siteKey = Collabora.getSiteKey();

    switch (msg.type) {
      case 'TOGGLE_FEATURE':
        Collabora.features.toggle(msg.featureId, siteKey);
        sendResponse({ success: true, active: Collabora.features.isActive(msg.featureId) });
        break;

      case 'UPDATE_SETTINGS':
        Collabora.storage.setFeatureSettings(msg.featureId, siteKey, msg.settings).then(function () {
          if (Collabora.features.isActive(msg.featureId)) {
            Collabora.features.update(msg.featureId, msg.settings);
          }
          sendResponse({ success: true });
        });
        return true; // async response

      case 'ENABLE_FEATURE':
        Collabora.storage.getFeatureSettings(msg.featureId, siteKey).then(function (settings) {
          Object.assign(settings, msg.settings || {}, { enabled: true });
          Collabora.features.enable(msg.featureId, settings);
          Collabora.storage.setFeatureSettings(msg.featureId, siteKey, settings);
          sendResponse({ success: true });
        });
        return true;

      case 'DISABLE_FEATURE':
        Collabora.features.disable(msg.featureId);
        Collabora.storage.setFeatureSettings(msg.featureId, siteKey, { enabled: false });
        sendResponse({ success: true });
        break;

      case 'GET_STATE':
        var state = Collabora.features.getState();
        Collabora.storage.getAllForSite(siteKey).then(function (allSettings) {
          sendResponse({ siteKey: siteKey, features: state, settings: allSettings });
        });
        return true;

      case 'RESET_SITE':
        Collabora.storage.resetSite(siteKey).then(function () {
          // Re-init with global defaults
          Object.keys(Collabora.features.getState()).forEach(function (id) {
            Collabora.features.disable(id);
          });
          Collabora.features.initAll().then(function () {
            sendResponse({ success: true });
          });
        });
        return true;
    }
  });

  // Listen for storage changes (e.g. from another tab)
  Collabora.storage.onChanged(function (changes) {
    if (changes.global || changes.sites) {
      var siteKey = Collabora.getSiteKey();
      Collabora.storage.getAllForSite(siteKey).then(function (allSettings) {
        Object.keys(allSettings).forEach(function (id) {
          var settings = allSettings[id];
          var isActive = Collabora.features.isActive(id);

          if (settings.enabled && !isActive) {
            Collabora.features.enable(id, settings);
          } else if (!settings.enabled && isActive) {
            Collabora.features.disable(id);
          } else if (settings.enabled && isActive) {
            Collabora.features.update(id, settings);
          }
        });
      });
    }
  });
})();
