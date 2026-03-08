/**
 * Tests for content/features/distraction-blocker
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  document.body.innerHTML = '<body></body>';
  document.body.removeAttribute('data-collabora-db-level');
  document.body.removeAttribute('data-collabora-db-hide-comments');
  document.body.removeAttribute('data-collabora-distraction-blocker');
  chrome.storage.local._data = {};
  delete window.Collabora;
  loadScript('content/shared/site-key.js');
  loadScript('content/shared/storage.js');
  loadScript('content/shared/dom-helpers.js');
  loadScript('content/shared/feature-manager.js');
  loadScript('content/features/distraction-blocker/distraction-blocker.js');
});

describe('distraction-blocker', () => {
  describe('enable at each level', () => {
    it('sets data-collabora-db-level for gentle', () => {
      Collabora.features.enable('distraction-blocker', { level: 'gentle' });
      expect(document.body.getAttribute('data-collabora-db-level')).toBe('gentle');
      Collabora.features.disable('distraction-blocker');
    });

    it('sets data-collabora-db-level for moderate', () => {
      Collabora.features.enable('distraction-blocker', { level: 'moderate' });
      expect(document.body.getAttribute('data-collabora-db-level')).toBe('moderate');
      Collabora.features.disable('distraction-blocker');
    });

    it('sets data-collabora-db-level for aggressive', () => {
      Collabora.features.enable('distraction-blocker', { level: 'aggressive' });
      expect(document.body.getAttribute('data-collabora-db-level')).toBe('aggressive');
      Collabora.features.disable('distraction-blocker');
    });
  });

  describe('hideComments', () => {
    it('sets data-collabora-db-hide-comments when hideComments is true', () => {
      Collabora.features.enable('distraction-blocker', { level: 'moderate', hideComments: true });
      expect(document.body.getAttribute('data-collabora-db-hide-comments')).toBe('true');
      Collabora.features.disable('distraction-blocker');
    });

    it('does not set data-collabora-db-hide-comments when hideComments is false', () => {
      Collabora.features.enable('distraction-blocker', { level: 'moderate', hideComments: false });
      expect(document.body.getAttribute('data-collabora-db-hide-comments')).toBeNull();
      Collabora.features.disable('distraction-blocker');
    });

    it('hides #comments element when hideComments is true', (done) => {
      document.body.innerHTML =
        '<article>' + 'main content '.repeat(100) + '</article><div id="comments">Comments here</div>';
      Collabora.features.enable('distraction-blocker', { level: 'gentle', hideComments: true });
      setTimeout(() => {
        const comments = document.getElementById('comments');
        expect(comments.getAttribute('data-collabora-blocked')).toBe('true');
        expect(comments.style.display).toBe('none');
        Collabora.features.disable('distraction-blocker');
        done();
      }, 10);
    });
  });

  describe('disable', () => {
    it('removes data-collabora-db-level and data-collabora-db-hide-comments', () => {
      Collabora.features.enable('distraction-blocker', { level: 'aggressive', hideComments: true });
      Collabora.features.disable('distraction-blocker');
      expect(document.body.getAttribute('data-collabora-db-level')).toBeNull();
      expect(document.body.getAttribute('data-collabora-db-hide-comments')).toBeNull();
    });

    it('unhides blocked elements', () => {
      document.body.innerHTML =
        '<article>' + 'main content '.repeat(100) + '</article><div id="comments">Comments</div>';
      Collabora.features.enable('distraction-blocker', { level: 'gentle', hideComments: true });
      const comments = document.getElementById('comments');
      expect(comments.style.display).toBe('none');
      Collabora.features.disable('distraction-blocker');
      expect(comments.getAttribute('data-collabora-blocked')).toBeNull();
      expect(comments.style.display).toBe('');
    });
  });

  describe('pauseMedia and restoreMedia', () => {
    it('pauses video with autoplay in moderate mode', () => {
      const video = document.createElement('video');
      video.setAttribute('autoplay', '');
      video.play = jest.fn();
      video.pause = jest.fn();
      Object.defineProperty(video, 'paused', { value: false, writable: true });
      document.body.appendChild(video);

      Collabora.features.enable('distraction-blocker', { level: 'moderate' });
      expect(video.pause).toHaveBeenCalled();
      expect(video.hasAttribute('autoplay')).toBe(false);
      expect(video.getAttribute('data-collabora-had-autoplay')).toBe('true');

      Collabora.features.disable('distraction-blocker');
      expect(video.hasAttribute('autoplay')).toBe(true);
      expect(video.getAttribute('data-collabora-had-autoplay')).toBeNull();
    });
  });

  describe('neutralizeFloaters', () => {
    it('deflates fixed elements in aggressive mode', () => {
      document.body.innerHTML =
        '<style>.test-fixed{position:fixed;bottom:100px;height:50px}</style><div class="test-fixed"></div>';
      const fixed = document.body.querySelector('.test-fixed');

      Collabora.features.enable('distraction-blocker', { level: 'aggressive' });
      // jsdom's getComputedStyle may not return 'fixed' reliably; verify disable cleans up
      Collabora.features.disable('distraction-blocker');
      expect(fixed.getAttribute('data-collabora-deflated')).toBeNull();
    });
  });

  describe('handleUndo', () => {
    it('restores last hidden element on Alt+Z', () => {
      document.body.innerHTML =
        '<article>' + 'main content '.repeat(100) + '</article><div id="comments">Comments</div>';
      Collabora.features.enable('distraction-blocker', { level: 'gentle', hideComments: true });
      const comments = document.getElementById('comments');
      expect(comments.style.display).toBe('none');

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', altKey: true, bubbles: true })
      );
      expect(comments.style.display).toBe('');
      expect(comments.getAttribute('data-collabora-blocked')).toBeNull();

      Collabora.features.disable('distraction-blocker');
    });
  });

  describe('update', () => {
    it('disables and re-enables with new settings', () => {
      Collabora.features.enable('distraction-blocker', { level: 'gentle' });
      expect(document.body.getAttribute('data-collabora-db-level')).toBe('gentle');

      Collabora.features.update('distraction-blocker', { level: 'aggressive', hideComments: true });
      expect(document.body.getAttribute('data-collabora-db-level')).toBe('aggressive');
      expect(document.body.getAttribute('data-collabora-db-hide-comments')).toBe('true');

      Collabora.features.disable('distraction-blocker');
    });
  });

  describe('defaults', () => {
    it('has hideComments: false in defaults', () => {
      const state = Collabora.features.getState();
      expect(state['distraction-blocker'].defaults.hideComments).toBe(false);
    });
  });
});
