/**
 * Collabora — Progress Indicator
 * Injects a read-time estimate and scroll progress bar.
 */
(function () {
  'use strict';

  var bar = null;
  var fill = null;
  var label = null;
  var rafId = null;
  var observerId = null;
  var lastTextLen = 0;

  function getScrollPercent() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 100;
    return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
  }

  function handleScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      if (fill) {
        fill.style.width = getScrollPercent() + '%';
      }
    });
  }

  function updateReadTime() {
    var content = Collabora.dom.getReadableContent();
    if (!content) return;

    var text = content.textContent.trim();
    // Only recalculate if text changed significantly (>20% delta)
    if (lastTextLen > 0 && Math.abs(text.length - lastTextLen) / lastTextLen < 0.2) return;
    lastTextLen = text.length;

    var minutes = Collabora.dom.estimateReadTime(text);
    if (label) {
      label.textContent = '~' + minutes + ' min read';
    }
  }

  function createUI() {
    bar = Collabora.dom.create('div', {
      className: 'collabora-progress-bar',
      'data-collabora': 'true'
    });

    fill = Collabora.dom.create('div', {
      className: 'collabora-progress-fill'
    });

    bar.appendChild(fill);
    document.body.appendChild(bar);

    label = Collabora.dom.create('div', {
      className: 'collabora-progress-label',
      'data-collabora': 'true'
    });
    document.body.appendChild(label);

    // Set initial state
    fill.style.width = getScrollPercent() + '%';
    updateReadTime();
  }

  function removeUI() {
    if (bar) { bar.remove(); bar = null; fill = null; }
    if (label) { label.remove(); label = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastTextLen = 0;
  }

  Collabora.features.register('progress-indicator', {
    defaults: { enabled: false },

    enable: function () {
      createUI();

      window.addEventListener('scroll', handleScroll, { passive: true });

      // Watch for SPA content changes
      observerId = Collabora.dom.observeDOM('article, main, [role="main"]', function () {
        setTimeout(updateReadTime, 500);
      });
    },

    disable: function () {
      removeUI();
      window.removeEventListener('scroll', handleScroll);

      if (observerId !== null) {
        Collabora.dom.stopObserving(observerId);
        observerId = null;
      }
    }
  });
})();
