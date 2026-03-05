/**
 * Collabora — Motion Reducer
 * Pauses GIFs, CSS animations, and auto-playing media.
 */
(function () {
  'use strict';

  var originalGifs = new Map();
  var pausedVideos = new Set();
  var observerId = null;

  function freezeGif(img) {
    if (originalGifs.has(img)) return;
    if (!img.src || !img.src.match(/\.gif(\?|$)/i)) return;
    if (!img.complete) {
      img.addEventListener('load', function onLoad() {
        img.removeEventListener('load', onLoad);
        freezeGif(img);
      });
      return;
    }

    try {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      originalGifs.set(img, img.src);
      img.src = canvas.toDataURL('image/png');
      img.setAttribute('data-collabora-frozen', 'true');
    } catch (e) {
      // Cross-origin images can't be drawn to canvas
    }
  }

  function unfreezeGif(img) {
    if (!originalGifs.has(img)) return;
    img.src = originalGifs.get(img);
    img.removeAttribute('data-collabora-frozen');
    originalGifs.delete(img);
  }

  function pauseVideo(video) {
    if (pausedVideos.has(video)) return;
    if (!video.paused) {
      video.pause();
      pausedVideos.add(video);
    }
    if (video.hasAttribute('autoplay')) {
      video.removeAttribute('autoplay');
      video.setAttribute('data-collabora-had-autoplay', 'true');
    }
  }

  function restoreVideo(video) {
    if (pausedVideos.has(video)) {
      pausedVideos.delete(video);
      // Don't auto-resume — user can manually play if they want
    }
    if (video.hasAttribute('data-collabora-had-autoplay')) {
      video.setAttribute('autoplay', '');
      video.removeAttribute('data-collabora-had-autoplay');
    }
  }

  Collabora.features.register('motion-reducer', {
    defaults: { enabled: false },

    enable: function () {
      // Freeze GIFs
      document.querySelectorAll('img').forEach(function (img) {
        if (img.src && img.src.match(/\.gif(\?|$)/i)) {
          freezeGif(img);
        }
      });

      // Pause autoplay videos
      document.querySelectorAll('video').forEach(pauseVideo);

      // Watch for new GIFs and videos
      observerId = Collabora.dom.observeDOM('img, video', function (el) {
        if (el.tagName === 'IMG' && el.src && el.src.match(/\.gif(\?|$)/i)) {
          freezeGif(el);
        } else if (el.tagName === 'VIDEO') {
          pauseVideo(el);
        }
      });
    },

    disable: function () {
      // Restore GIFs
      originalGifs.forEach(function (originalSrc, img) {
        unfreezeGif(img);
      });
      originalGifs.clear();

      // Restore videos
      document.querySelectorAll('video').forEach(restoreVideo);
      pausedVideos.clear();

      // Stop observing
      if (observerId !== null) {
        Collabora.dom.stopObserving(observerId);
        observerId = null;
      }
    }
  });
})();
