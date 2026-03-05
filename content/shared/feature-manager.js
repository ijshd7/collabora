/**
 * Collabora — Feature Manager
 * Central registry for feature lifecycle (enable/disable/update).
 */
(function () {
  'use strict';

  window.Collabora = window.Collabora || {};

  var registry = {};
  var activeFeatures = {};

  var features = {};

  /**
   * Register a feature.
   * @param {string} id - Feature identifier (e.g. 'motion-reducer')
   * @param {object} feature - { enable(settings), disable(), update(settings), defaults }
   */
  features.register = function (id, feature) {
    registry[id] = feature;
  };

  /**
   * Get all registered feature IDs.
   */
  features.getRegistered = function () {
    return Object.keys(registry);
  };

  /**
   * Check if a feature is currently active.
   */
  features.isActive = function (id) {
    return !!activeFeatures[id];
  };

  /**
   * Enable a feature with given settings.
   */
  features.enable = function (id, settings) {
    if (!registry[id]) return;

    // Disable first if already active (clean lifecycle)
    if (activeFeatures[id]) {
      features.disable(id);
    }

    var merged = Object.assign({}, registry[id].defaults || {}, settings || {});
    registry[id].enable(merged);
    activeFeatures[id] = true;

    document.body.setAttribute('data-collabora-' + id, 'active');
  };

  /**
   * Disable a feature.
   */
  features.disable = function (id) {
    if (!registry[id] || !activeFeatures[id]) return;

    registry[id].disable();
    delete activeFeatures[id];

    document.body.removeAttribute('data-collabora-' + id);
  };

  /**
   * Toggle a feature on/off.
   */
  features.toggle = function (id, siteKey) {
    var isActive = features.isActive(id);

    if (isActive) {
      features.disable(id);
      Collabora.storage.setFeatureSettings(id, siteKey, { enabled: false });
    } else {
      Collabora.storage.getFeatureSettings(id, siteKey).then(function (settings) {
        settings.enabled = true;
        features.enable(id, settings);
        Collabora.storage.setFeatureSettings(id, siteKey, settings);
      });
    }
  };

  /**
   * Update settings for an active feature.
   */
  features.update = function (id, newSettings) {
    if (!registry[id] || !activeFeatures[id]) return;
    if (registry[id].update) {
      registry[id].update(newSettings);
    }
  };

  /**
   * Initialize all features based on stored preferences.
   */
  features.initAll = function () {
    var siteKey = Collabora.getSiteKey();

    return Collabora.storage.getAllForSite(siteKey).then(function (allSettings) {
      Object.keys(registry).forEach(function (id) {
        var settings = allSettings[id] || registry[id].defaults || {};
        if (settings.enabled) {
          features.enable(id, settings);
        }
      });
    });
  };

  /**
   * Get current state of all features (for popup).
   */
  features.getState = function () {
    var state = {};
    Object.keys(registry).forEach(function (id) {
      state[id] = {
        active: !!activeFeatures[id],
        defaults: registry[id].defaults || {}
      };
    });
    return state;
  };

  window.Collabora.features = features;
})();
