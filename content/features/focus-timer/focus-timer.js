/**
 * Collabora — Focus Timer / Pomodoro
 * Session timer with in-page countdown badge and gentle break notifications.
 */
(function () {
  'use strict';

  var badge = null;
  var notification = null;
  var intervalId = null;
  var endTime = 0;
  var remainingMs = 0;
  var sessionCount = 0;
  var mode = 'idle'; // 'focus', 'break', 'paused', 'idle'
  var pausedMode = null;

  var focusDuration = 25;
  var breakDuration = 5;
  var autoStartBreak = false;

  function formatTime(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function tick() {
    var now = Date.now();
    remainingMs = endTime - now;

    if (remainingMs <= 0) {
      remainingMs = 0;
      clearInterval(intervalId);
      intervalId = null;
      onTimerComplete();
      return;
    }

    updateBadge();
  }

  function onTimerComplete() {
    if (mode === 'focus') {
      sessionCount++;
      updateBadge();

      if (autoStartBreak) {
        startBreak();
      } else {
        showNotification(
          'Session complete \u2014 consider a short break',
          [
            { label: 'Start Break', action: startBreak },
            { label: 'Dismiss', action: dismissNotification }
          ]
        );
      }
    } else if (mode === 'break') {
      mode = 'idle';
      showNotification(
        'Break over \u2014 ready to focus?',
        [
          { label: 'Start Session', action: startSession },
          { label: 'Dismiss', action: dismissNotification }
        ]
      );
    }
  }

  function startSession() {
    dismissNotification();
    mode = 'focus';
    remainingMs = focusDuration * 60 * 1000;
    endTime = Date.now() + remainingMs;
    updateBadge();
    clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
  }

  function startBreak() {
    dismissNotification();
    mode = 'break';
    remainingMs = breakDuration * 60 * 1000;
    endTime = Date.now() + remainingMs;
    updateBadge();
    clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
  }

  function pauseTimer() {
    if (mode !== 'focus' && mode !== 'break') return;
    remainingMs = endTime - Date.now();
    clearInterval(intervalId);
    intervalId = null;
    pausedMode = mode;
    mode = 'paused';
    updateBadge();
  }

  function resumeTimer() {
    if (mode !== 'paused' || !pausedMode) return;
    mode = pausedMode;
    pausedMode = null;
    endTime = Date.now() + remainingMs;
    intervalId = setInterval(tick, 1000);
    updateBadge();
  }

  function stopTimer() {
    clearInterval(intervalId);
    intervalId = null;
    remainingMs = 0;
    endTime = 0;
    mode = 'idle';
    pausedMode = null;
    dismissNotification();
    updateBadge();
  }

  // --- Badge ---

  function createBadge() {
    badge = Collabora.dom.create('div', {
      className: 'collabora-timer-badge',
      'data-collabora': 'true'
    });

    var timeDisplay = Collabora.dom.create('span', {
      className: 'collabora-timer-badge__time',
      textContent: formatTime(focusDuration * 60 * 1000)
    });

    var dots = Collabora.dom.create('span', {
      className: 'collabora-timer-badge__dots'
    });

    var controls = Collabora.dom.create('span', {
      className: 'collabora-timer-badge__controls'
    });

    var startBtn = Collabora.dom.create('button', {
      className: 'collabora-timer-badge__btn collabora-timer-badge__btn--start',
      textContent: 'Start',
      onClick: function () { startSession(); }
    });

    var pauseBtn = Collabora.dom.create('button', {
      className: 'collabora-timer-badge__btn collabora-timer-badge__btn--pause',
      textContent: 'Pause',
      onClick: function () {
        if (mode === 'paused') {
          resumeTimer();
        } else {
          pauseTimer();
        }
      }
    });

    var stopBtn = Collabora.dom.create('button', {
      className: 'collabora-timer-badge__btn collabora-timer-badge__btn--stop',
      textContent: 'Stop',
      onClick: function () { stopTimer(); }
    });

    controls.appendChild(startBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(stopBtn);

    badge.appendChild(timeDisplay);
    badge.appendChild(dots);
    badge.appendChild(controls);
    document.body.appendChild(badge);

    updateBadge();
  }

  function removeBadge() {
    if (badge) {
      badge.remove();
      badge = null;
    }
  }

  function updateBadge() {
    if (!badge) return;

    var timeEl = badge.querySelector('.collabora-timer-badge__time');
    var dotsEl = badge.querySelector('.collabora-timer-badge__dots');
    var startBtn = badge.querySelector('.collabora-timer-badge__btn--start');
    var pauseBtn = badge.querySelector('.collabora-timer-badge__btn--pause');
    var stopBtn = badge.querySelector('.collabora-timer-badge__btn--stop');

    if (timeEl) {
      if (mode === 'idle') {
        timeEl.textContent = formatTime(focusDuration * 60 * 1000);
      } else {
        timeEl.textContent = formatTime(remainingMs);
      }
    }

    if (dotsEl) {
      while (dotsEl.firstChild) { dotsEl.removeChild(dotsEl.firstChild); }
      for (var i = 0; i < sessionCount; i++) {
        var dot = document.createElement('span');
        dot.className = 'collabora-timer-badge__dot';
        dotsEl.appendChild(dot);
      }
    }

    if (startBtn) {
      startBtn.style.display = mode === 'idle' ? '' : 'none';
    }
    if (pauseBtn) {
      pauseBtn.style.display = (mode === 'focus' || mode === 'break' || mode === 'paused') ? '' : 'none';
      pauseBtn.textContent = mode === 'paused' ? 'Resume' : 'Pause';
    }
    if (stopBtn) {
      stopBtn.style.display = mode === 'idle' ? 'none' : '';
    }

    badge.setAttribute('data-collabora-timer-mode', mode);
  }

  // --- Notification overlay ---

  function showNotification(message, buttons) {
    dismissNotification();

    var backdrop = Collabora.dom.create('div', {
      className: 'collabora-timer-notification',
      'data-collabora': 'true',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-label': message
    });

    var card = Collabora.dom.create('div', {
      className: 'collabora-timer-notification__card'
    });

    var msg = Collabora.dom.create('p', {
      className: 'collabora-timer-notification__message',
      textContent: message
    });

    var btnRow = Collabora.dom.create('div', {
      className: 'collabora-timer-notification__buttons'
    });

    buttons.forEach(function (b, i) {
      var btn = Collabora.dom.create('button', {
        className: 'collabora-timer-notification__btn' + (i === 0 ? ' collabora-timer-notification__btn--primary' : ''),
        textContent: b.label,
        onClick: b.action
      });
      btnRow.appendChild(btn);
    });

    card.appendChild(msg);
    card.appendChild(btnRow);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    notification = backdrop;

    document.addEventListener('keydown', handleNotificationEscape);
  }

  function handleNotificationEscape(e) {
    if (e.key === 'Escape' && notification) {
      dismissNotification();
    }
  }

  function dismissNotification() {
    if (notification) {
      notification.remove();
      notification = null;
    }
    document.removeEventListener('keydown', handleNotificationEscape);
  }

  // --- Feature registration ---

  Collabora.features.register('focus-timer', {
    defaults: { enabled: false, focusDuration: 25, breakDuration: 5, autoStartBreak: false },

    enable: function (settings) {
      focusDuration = settings.focusDuration || 25;
      breakDuration = settings.breakDuration || 5;
      autoStartBreak = !!settings.autoStartBreak;
      sessionCount = 0;
      mode = 'idle';
      pausedMode = null;

      createBadge();
    },

    disable: function () {
      stopTimer();
      removeBadge();
      sessionCount = 0;
    },

    update: function (settings) {
      if (settings.focusDuration !== undefined) {
        focusDuration = settings.focusDuration;
      }
      if (settings.breakDuration !== undefined) {
        breakDuration = settings.breakDuration;
      }
      if (settings.autoStartBreak !== undefined) {
        autoStartBreak = !!settings.autoStartBreak;
      }
      if (mode === 'idle') {
        updateBadge();
      }
    }
  });
})();
