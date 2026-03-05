/**
 * Collabora — Reading Ruler / Line Focus
 * A CSS overlay that dims everything except the line the cursor is on.
 */
(function () {
  'use strict';

  var overlay = null;
  var topBand = null;
  var bottomBand = null;
  var stripHeight = 40;
  var rafId = null;
  var currentY = 0;
  var keyboardMode = false;

  function handleMouseMove(e) {
    if (keyboardMode) return;
    currentY = e.clientY;
    scheduleUpdate();
  }

  function handleKeyDown(e) {
    if (!overlay) return;

    // Arrow keys for keyboard-mode ruler movement
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var lineStep = parseInt(getComputedStyle(document.body).lineHeight, 10) || 24;

      if (e.key === 'ArrowDown') {
        currentY = Math.min(currentY + lineStep, window.innerHeight);
      } else {
        currentY = Math.max(currentY - lineStep, 0);
      }

      keyboardMode = true;
      scheduleUpdate();
      // Don't prevent default — allow normal scrolling
    }
  }

  // Re-enable mouse tracking when mouse moves
  function handleMouseMoveResetKb(e) {
    if (keyboardMode) {
      keyboardMode = false;
      currentY = e.clientY;
      scheduleUpdate();
    }
  }

  function scheduleUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      updatePosition();
    });
  }

  function updatePosition() {
    if (!topBand || !bottomBand) return;

    var halfStrip = stripHeight / 2;
    var topHeight = Math.max(0, currentY - halfStrip);
    var bottomTop = Math.min(window.innerHeight, currentY + halfStrip);

    topBand.style.height = topHeight + 'px';
    bottomBand.style.top = bottomTop + 'px';
    bottomBand.style.height = (window.innerHeight - bottomTop) + 'px';
  }

  function createOverlay() {
    overlay = Collabora.dom.create('div', {
      className: 'collabora-ruler-overlay',
      'data-collabora': 'true'
    });

    topBand = Collabora.dom.create('div', {
      className: 'collabora-ruler-band collabora-ruler-band--top'
    });

    bottomBand = Collabora.dom.create('div', {
      className: 'collabora-ruler-band collabora-ruler-band--bottom'
    });

    overlay.appendChild(topBand);
    overlay.appendChild(bottomBand);
    document.body.appendChild(overlay);

    // Initial position at center
    currentY = window.innerHeight / 2;
    updatePosition();
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      topBand = null;
      bottomBand = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  Collabora.features.register('reading-ruler', {
    defaults: { enabled: false, stripHeight: 40, opacity: 0.6 },

    enable: function (settings) {
      stripHeight = settings.stripHeight || 40;

      createOverlay();

      // Apply opacity setting
      if (topBand && bottomBand) {
        var bg = 'rgba(0, 0, 0, ' + (settings.opacity || 0.6) + ')';
        topBand.style.background = bg;
        bottomBand.style.background = bg;
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mousemove', handleMouseMoveResetKb);
      document.addEventListener('keydown', handleKeyDown);
    },

    disable: function () {
      removeOverlay();
      keyboardMode = false;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleMouseMoveResetKb);
      document.removeEventListener('keydown', handleKeyDown);
    },

    update: function (settings) {
      if (settings.stripHeight !== undefined) {
        stripHeight = settings.stripHeight;
        updatePosition();
      }
      if (settings.opacity !== undefined && topBand && bottomBand) {
        var bg = 'rgba(0, 0, 0, ' + settings.opacity + ')';
        topBand.style.background = bg;
        bottomBand.style.background = bg;
      }
    }
  });
})();
