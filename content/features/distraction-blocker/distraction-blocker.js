/**
 * Collabora — Distraction Blocker
 * Strips ads, sidebars, auto-playing media, and floating elements.
 * Levels: gentle (ads), moderate (+ autoplay), aggressive (+ sidebars + floating)
 */
(function () {
  'use strict';

  var blockedFloaters = new Map();
  var pausedMedia = new Set();
  var observerId = null;
  var undoStack = [];

  function getPageTextLength() {
    return document.body.textContent.trim().length;
  }

  function isSafeToHide(el) {
    // Don't hide elements containing > 50% of the page's text
    var elText = el.textContent.trim().length;
    var pageText = getPageTextLength();
    return pageText === 0 || (elText / pageText) < 0.5;
  }

  function hideElement(el) {
    if (el.hasAttribute('data-collabora-blocked')) return;
    if (!isSafeToHide(el)) return;

    el.setAttribute('data-collabora-blocked', 'true');
    el.style.setProperty('display', 'none', 'important');
    undoStack.push(el);
  }

  function unhideElement(el) {
    if (!el.hasAttribute('data-collabora-blocked')) return;
    el.removeAttribute('data-collabora-blocked');
    el.style.removeProperty('display');
  }

  function pauseMedia(el) {
    if (pausedMedia.has(el)) return;
    if (!el.paused) {
      el.pause();
      pausedMedia.add(el);
    }
    if (el.hasAttribute('autoplay')) {
      el.removeAttribute('autoplay');
      el.setAttribute('data-collabora-had-autoplay', 'true');
    }
  }

  function restoreMedia(el) {
    if (el.hasAttribute('data-collabora-had-autoplay')) {
      el.setAttribute('autoplay', '');
      el.removeAttribute('data-collabora-had-autoplay');
    }
    pausedMedia.delete(el);
  }

  function neutralizeFloaters() {
    document.querySelectorAll('*').forEach(function (el) {
      if (el.hasAttribute('data-collabora')) return;
      var computed = getComputedStyle(el);
      if (computed.position !== 'fixed' && computed.position !== 'sticky') return;

      // Keep nav-like elements (near top, small height)
      var rect = el.getBoundingClientRect();
      var isNav = rect.top < 10 && rect.height < window.innerHeight * 0.2;
      if (isNav) return;

      blockedFloaters.set(el, computed.position);
      el.style.setProperty('position', 'relative', 'important');
      el.setAttribute('data-collabora-deflated', 'true');
    });
  }

  function restoreFloaters() {
    blockedFloaters.forEach(function (origPosition, el) {
      el.style.removeProperty('position');
      el.removeAttribute('data-collabora-deflated');
    });
    blockedFloaters.clear();
  }

  function handleUndo(e) {
    if (e.altKey && e.key === 'z') {
      var last = undoStack.pop();
      if (last) unhideElement(last);
    }
  }

  Collabora.features.register('distraction-blocker', {
    defaults: { enabled: false, level: 'moderate' },

    enable: function (settings) {
      var level = settings.level || 'moderate';
      document.body.setAttribute('data-collabora-db-level', level);

      // Moderate and aggressive: pause auto-playing media
      if (level === 'moderate' || level === 'aggressive') {
        document.querySelectorAll('video, audio').forEach(function (el) {
          if (!el.paused || el.hasAttribute('autoplay')) {
            pauseMedia(el);
          }
        });
      }

      // Aggressive: neutralize floating elements
      if (level === 'aggressive') {
        neutralizeFloaters();
      }

      // Watch for dynamically injected ads and media
      observerId = Collabora.dom.observeDOM('iframe, [class*="ad"], video, audio', function (el) {
        if (el.tagName === 'IFRAME') {
          var src = el.src || '';
          if (src.match(/doubleclick|googlesyndication|amazon-adsystem/i)) {
            hideElement(el);
          }
        }
        if ((level === 'moderate' || level === 'aggressive') &&
            (el.tagName === 'VIDEO' || el.tagName === 'AUDIO')) {
          if (!el.paused || el.hasAttribute('autoplay')) {
            pauseMedia(el);
          }
        }
      });

      // Undo shortcut
      document.addEventListener('keydown', handleUndo);
    },

    disable: function () {
      document.body.removeAttribute('data-collabora-db-level');

      // Unhide blocked elements
      document.querySelectorAll('[data-collabora-blocked]').forEach(unhideElement);
      undoStack = [];

      // Restore media
      document.querySelectorAll('video, audio').forEach(restoreMedia);
      pausedMedia.clear();

      // Restore floaters
      restoreFloaters();

      // Stop observer
      if (observerId !== null) {
        Collabora.dom.stopObserving(observerId);
        observerId = null;
      }

      document.removeEventListener('keydown', handleUndo);
    },

    update: function (settings) {
      this.disable();
      this.enable(settings);
    }
  });
})();
