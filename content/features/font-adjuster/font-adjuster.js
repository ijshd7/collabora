/**
 * Collabora — Font Adjuster
 * Per-site font family, size, and line-height customization.
 */
(function () {
  'use strict';

  var FONT_MAP = {
    'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
    'sans-serif': 'Arial, Helvetica, sans-serif',
    'opendyslexic': '"OpenDyslexic", sans-serif',
    'lexend': '"Lexend", sans-serif'
  };

  var fontLinkId = 'collabora-font-link';

  function loadWebFont(fontKey) {
    var existing = document.getElementById(fontLinkId);
    if (existing) existing.remove();

    var fontUrl = null;
    if (fontKey === 'opendyslexic') {
      fontUrl = 'https://fonts.googleapis.com/css2?family=OpenDyslexic&display=swap';
    } else if (fontKey === 'lexend') {
      fontUrl = 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap';
    }

    if (fontUrl) {
      var link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href = fontUrl;
      link.setAttribute('data-collabora', 'true');
      document.head.appendChild(link);
    }
  }

  function removeWebFont() {
    var existing = document.getElementById(fontLinkId);
    if (existing) existing.remove();
  }

  function applySettings(settings) {
    var root = document.documentElement;
    var fontKey = settings.fontFamily || 'system';

    root.style.setProperty('--collabora-font-family', FONT_MAP[fontKey] || FONT_MAP['system']);
    root.style.setProperty('--collabora-font-size', (settings.fontSize || 16) + 'px');
    root.style.setProperty('--collabora-line-height', String(settings.lineHeight || 1.6));

    loadWebFont(fontKey);
  }

  function clearSettings() {
    var root = document.documentElement;
    root.style.removeProperty('--collabora-font-family');
    root.style.removeProperty('--collabora-font-size');
    root.style.removeProperty('--collabora-line-height');
    removeWebFont();
  }

  Collabora.features.register('font-adjuster', {
    defaults: { enabled: false, fontFamily: 'system', fontSize: 16, lineHeight: 1.6 },

    enable: function (settings) {
      applySettings(settings);
    },

    disable: function () {
      clearSettings();
    },

    update: function (settings) {
      applySettings(settings);
    }
  });
})();
