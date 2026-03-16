/**
 * Collabora — Color Contrast Adjuster
 * CSS filter manipulation for readability.
 * Presets: warm, cool, high-contrast, custom.
 */
(function () {
  'use strict';

  var PRESETS = {
    warm: 'sepia(0.3) saturate(0.8)',
    cool: 'invert(1) hue-rotate(180deg)',
    'high-contrast': 'contrast(1.5) brightness(1.1)',
    none: 'none'
  };

  function applyFilter(settings) {
    var mode = settings.mode || 'warm';
    document.body.setAttribute('data-collabora-cc-mode', mode);

    var filter;
    if (mode === 'custom') {
      var b = settings.brightness !== undefined ? settings.brightness : 1.0;
      var c = settings.contrast !== undefined ? settings.contrast : 1.0;
      var s = settings.saturation !== undefined ? settings.saturation : 1.0;
      var sep = settings.sepia !== undefined ? settings.sepia : 0;
      filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ') sepia(' + sep + ')';
    } else {
      filter = PRESETS[mode] || PRESETS.warm;
    }

    // Apply filter to <html> instead of <body> so that position:fixed
    // elements (reading ruler, timer badge, TTS bar, progress bar)
    // remain anchored to the viewport.
    document.documentElement.style.setProperty('filter', filter, 'important');
    document.documentElement.style.setProperty('min-height', '100vh');
  }

  function clearFilter() {
    document.documentElement.style.removeProperty('filter');
    document.documentElement.style.removeProperty('min-height');
    document.body.removeAttribute('data-collabora-cc-mode');
  }

  Collabora.features.register('color-contrast', {
    defaults: { enabled: false, mode: 'warm', brightness: 1.0, contrast: 1.0, saturation: 1.0, sepia: 0 },

    enable: function (settings) {
      applyFilter(settings);
    },

    disable: function () {
      clearFilter();
    },

    update: function (settings) {
      applyFilter(settings);
    }
  });
})();
