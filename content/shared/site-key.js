/**
 * Collabora — Site Key utility
 * Extracts a normalized hostname for per-site preference storage.
 */
(function () {
  'use strict';

  window.Collabora = window.Collabora || {};

  window.Collabora.getSiteKey = function () {
    try {
      return location.hostname.replace(/^www\./, '') || 'local';
    } catch (e) {
      return 'local';
    }
  };
})();
