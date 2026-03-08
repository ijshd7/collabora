/**
 * Tests for content/features/focus-timer
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Date, 'now').mockReturnValue(1000000);

  document.body.innerHTML = '<body></body>';
  document.body.removeAttribute('data-collabora-focus-timer');
  chrome.storage.local._data = {};
  delete window.Collabora;
  loadScript('content/shared/site-key.js');
  loadScript('content/shared/storage.js');
  loadScript('content/shared/dom-helpers.js');
  loadScript('content/shared/feature-manager.js');
  loadScript('content/features/focus-timer/focus-timer.js');
});

afterEach(() => {
  if (window.Collabora && Collabora.features.isActive('focus-timer')) {
    Collabora.features.disable('focus-timer');
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('focus-timer', () => {
  describe('defaults', () => {
    it('has correct default settings', () => {
      const state = Collabora.features.getState();
      expect(state['focus-timer'].defaults).toEqual({
        enabled: false,
        focusDuration: 25,
        breakDuration: 5,
        autoStartBreak: false
      });
    });
  });

  describe('enable', () => {
    it('creates the badge element', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25, breakDuration: 5 });
      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge).not.toBeNull();
      expect(badge.getAttribute('data-collabora')).toBe('true');
    });

    it('sets data-collabora-focus-timer attribute on body', () => {
      Collabora.features.enable('focus-timer', {});
      expect(document.body.getAttribute('data-collabora-focus-timer')).toBe('active');
    });

    it('displays default focus duration in badge', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25 });
      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('25:00');
    });

    it('shows the Start button in idle mode', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      expect(startBtn).not.toBeNull();
      expect(startBtn.style.display).not.toBe('none');
    });

    it('hides Pause and Stop buttons in idle mode', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25 });
      const pauseBtn = document.querySelector('.collabora-timer-badge__btn--pause');
      const stopBtn = document.querySelector('.collabora-timer-badge__btn--stop');
      expect(pauseBtn.style.display).toBe('none');
      expect(stopBtn.style.display).toBe('none');
    });
  });

  describe('disable', () => {
    it('removes badge and notification', () => {
      Collabora.features.enable('focus-timer', {});
      Collabora.features.disable('focus-timer');
      expect(document.querySelector('.collabora-timer-badge')).toBeNull();
      expect(document.querySelector('.collabora-timer-notification')).toBeNull();
    });

    it('removes data-collabora-focus-timer attribute', () => {
      Collabora.features.enable('focus-timer', {});
      Collabora.features.disable('focus-timer');
      expect(document.body.getAttribute('data-collabora-focus-timer')).toBeNull();
    });

    it('clears running interval', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      Collabora.features.disable('focus-timer');
      expect(document.querySelector('.collabora-timer-badge')).toBeNull();
    });
  });

  describe('timer countdown', () => {
    it('counts down when Start is clicked', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      // Advance 10 seconds
      Date.now.mockReturnValue(1000000 + 10000);
      jest.advanceTimersByTime(1000);

      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('00:50');
    });

    it('hides Start and shows Pause/Stop during countdown', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      expect(startBtn.style.display).toBe('none');
      const pauseBtn = document.querySelector('.collabora-timer-badge__btn--pause');
      const stopBtn = document.querySelector('.collabora-timer-badge__btn--stop');
      expect(pauseBtn.style.display).not.toBe('none');
      expect(stopBtn.style.display).not.toBe('none');
    });

    it('shows notification when timer reaches zero', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      // Advance past 1 minute
      Date.now.mockReturnValue(1000000 + 61000);
      jest.advanceTimersByTime(61000);

      const notif = document.querySelector('.collabora-timer-notification');
      expect(notif).not.toBeNull();

      const message = notif.querySelector('.collabora-timer-notification__message');
      expect(message.textContent).toContain('Session complete');
    });

    it('increments session count when focus session completes', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      Date.now.mockReturnValue(1000000 + 61000);
      jest.advanceTimersByTime(61000);

      const dots = document.querySelectorAll('.collabora-timer-badge__dot');
      expect(dots.length).toBe(1);
    });
  });

  describe('notification actions', () => {
    function completeSession() {
      Collabora.features.enable('focus-timer', { focusDuration: 1, breakDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();
      Date.now.mockReturnValue(1000000 + 61000);
      jest.advanceTimersByTime(61000);
    }

    it('Dismiss button removes the notification', () => {
      completeSession();
      const buttons = document.querySelectorAll('.collabora-timer-notification__btn');
      const dismissBtn = Array.from(buttons).find(b => b.textContent === 'Dismiss');
      expect(dismissBtn).not.toBeUndefined();
      dismissBtn.click();

      expect(document.querySelector('.collabora-timer-notification')).toBeNull();
    });

    it('Start Break button starts break countdown', () => {
      completeSession();
      const buttons = document.querySelectorAll('.collabora-timer-notification__btn');
      const breakBtn = Array.from(buttons).find(b => b.textContent === 'Start Break');
      expect(breakBtn).not.toBeUndefined();

      Date.now.mockReturnValue(1000000 + 62000);
      breakBtn.click();

      expect(document.querySelector('.collabora-timer-notification')).toBeNull();

      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge.getAttribute('data-collabora-timer-mode')).toBe('break');
    });

    it('break end shows second notification', () => {
      completeSession();
      const buttons = document.querySelectorAll('.collabora-timer-notification__btn');
      const breakBtn = Array.from(buttons).find(b => b.textContent === 'Start Break');

      Date.now.mockReturnValue(1000000 + 62000);
      breakBtn.click();

      // Advance past 1 minute break
      Date.now.mockReturnValue(1000000 + 62000 + 61000);
      jest.advanceTimersByTime(61000);

      const notif = document.querySelector('.collabora-timer-notification');
      expect(notif).not.toBeNull();
      const message = notif.querySelector('.collabora-timer-notification__message');
      expect(message.textContent).toContain('Break over');
    });
  });

  describe('pause and resume', () => {
    it('pauses the countdown', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      // Advance 10 seconds
      Date.now.mockReturnValue(1000000 + 10000);
      jest.advanceTimersByTime(1000);

      const pauseBtn = document.querySelector('.collabora-timer-badge__btn--pause');
      pauseBtn.click();

      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge.getAttribute('data-collabora-timer-mode')).toBe('paused');
      expect(pauseBtn.textContent).toBe('Resume');
    });

    it('resumes the countdown after pause', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      // Advance 10 seconds then pause
      Date.now.mockReturnValue(1000000 + 10000);
      jest.advanceTimersByTime(1000);

      const pauseBtn = document.querySelector('.collabora-timer-badge__btn--pause');
      pauseBtn.click();

      // Resume after 5 seconds of paused time
      Date.now.mockReturnValue(1000000 + 15000);
      pauseBtn.click();

      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge.getAttribute('data-collabora-timer-mode')).toBe('focus');
      expect(pauseBtn.textContent).toBe('Pause');

      // The remaining time should still be ~50 seconds, not affected by paused time
      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('00:50');
    });
  });

  describe('stop', () => {
    it('resets the timer to idle', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1 });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      const stopBtn = document.querySelector('.collabora-timer-badge__btn--stop');
      stopBtn.click();

      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge.getAttribute('data-collabora-timer-mode')).toBe('idle');
      expect(startBtn.style.display).not.toBe('none');
    });
  });

  describe('update', () => {
    it('updates focusDuration while idle', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25 });
      Collabora.features.update('focus-timer', { focusDuration: 45 });

      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('45:00');
    });

    it('updates breakDuration setting', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25, breakDuration: 5 });
      Collabora.features.update('focus-timer', { breakDuration: 10 });

      const state = Collabora.features.getState();
      expect(state['focus-timer']).toBeDefined();
    });

    it('updates autoStartBreak setting', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 25, autoStartBreak: false });
      Collabora.features.update('focus-timer', { autoStartBreak: true });

      const state = Collabora.features.getState();
      expect(state['focus-timer']).toBeDefined();
    });
  });

  describe('autoStartBreak', () => {
    it('automatically starts break when focus session completes', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 1, breakDuration: 1, autoStartBreak: true });
      const startBtn = document.querySelector('.collabora-timer-badge__btn--start');
      startBtn.click();

      Date.now.mockReturnValue(1000000 + 61000);
      jest.advanceTimersByTime(61000);

      // Should not show notification, should go straight to break
      expect(document.querySelector('.collabora-timer-notification')).toBeNull();

      const badge = document.querySelector('.collabora-timer-badge');
      expect(badge.getAttribute('data-collabora-timer-mode')).toBe('break');
    });
  });

  describe('formatTime display', () => {
    it('displays two-digit minutes and seconds', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 5 });
      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('05:00');
    });

    it('displays double-digit minutes correctly', () => {
      Collabora.features.enable('focus-timer', { focusDuration: 45 });
      const time = document.querySelector('.collabora-timer-badge__time');
      expect(time.textContent).toBe('45:00');
    });
  });
});
