/**
 * Collabora — Per-site storage abstraction
 * Uses chrome.storage.local with global/site-specific merge logic.
 */
(function () {
  'use strict';

  window.Collabora = window.Collabora || {};

  var STORAGE_KEY_GLOBAL = 'global';
  var STORAGE_KEY_SITES = 'sites';

  var storage = {};

  /**
   * Get merged settings for a feature on a specific site.
   * Site-specific settings override global defaults.
   */
  storage.getFeatureSettings = function (featureId, siteKey) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_GLOBAL, STORAGE_KEY_SITES], function (data) {
        var global = (data[STORAGE_KEY_GLOBAL] && data[STORAGE_KEY_GLOBAL][featureId]) || {};
        var site = (data[STORAGE_KEY_SITES] && data[STORAGE_KEY_SITES][siteKey] && data[STORAGE_KEY_SITES][siteKey][featureId]) || {};
        var merged = Object.assign({}, global, site);
        resolve(merged);
      });
    });
  };

  /**
   * Get all feature settings for a site (merged with global).
   */
  storage.getAllForSite = function (siteKey) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_GLOBAL, STORAGE_KEY_SITES], function (data) {
        var globalAll = data[STORAGE_KEY_GLOBAL] || {};
        var siteAll = (data[STORAGE_KEY_SITES] && data[STORAGE_KEY_SITES][siteKey]) || {};
        var result = {};

        var featureIds = new Set(Object.keys(globalAll).concat(Object.keys(siteAll)));
        featureIds.forEach(function (id) {
          result[id] = Object.assign({}, globalAll[id] || {}, siteAll[id] || {});
        });

        resolve(result);
      });
    });
  };

  /**
   * Set site-specific settings for a feature.
   */
  storage.setFeatureSettings = function (featureId, siteKey, settings) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_SITES], function (data) {
        var sites = data[STORAGE_KEY_SITES] || {};
        sites[siteKey] = sites[siteKey] || {};
        sites[siteKey][featureId] = Object.assign({}, sites[siteKey][featureId] || {}, settings);

        chrome.storage.local.set({ sites: sites }, resolve);
      });
    });
  };

  /**
   * Get global settings for a feature.
   */
  storage.getGlobalSettings = function (featureId) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_GLOBAL], function (data) {
        resolve((data[STORAGE_KEY_GLOBAL] && data[STORAGE_KEY_GLOBAL][featureId]) || {});
      });
    });
  };

  /**
   * Set global settings for a feature.
   */
  storage.setGlobalSettings = function (featureId, settings) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_GLOBAL], function (data) {
        var global = data[STORAGE_KEY_GLOBAL] || {};
        global[featureId] = Object.assign({}, global[featureId] || {}, settings);

        chrome.storage.local.set({ global: global }, resolve);
      });
    });
  };

  /**
   * Apply current global settings to a specific site (copy global -> site).
   */
  storage.applyGlobalToSite = function (siteKey) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_GLOBAL, STORAGE_KEY_SITES], function (data) {
        var global = data[STORAGE_KEY_GLOBAL] || {};
        var sites = data[STORAGE_KEY_SITES] || {};
        sites[siteKey] = JSON.parse(JSON.stringify(global));

        chrome.storage.local.set({ sites: sites }, resolve);
      });
    });
  };

  /**
   * Reset site-specific settings (fall back to global).
   */
  storage.resetSite = function (siteKey) {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY_SITES], function (data) {
        var sites = data[STORAGE_KEY_SITES] || {};
        delete sites[siteKey];

        chrome.storage.local.set({ sites: sites }, resolve);
      });
    });
  };

  /**
   * Listen for storage changes.
   */
  storage.onChanged = function (callback) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local') {
        callback(changes);
      }
    });
  };

  window.Collabora.storage = storage;
})();
