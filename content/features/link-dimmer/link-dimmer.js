/**
 * Collabora — Link Dimmer
 * Visually mutes hyperlinks and optionally prompts before navigation.
 */
(function () {
  'use strict';

  var tooltip = null;
  var clickHandlerAttached = false;

  var dimLevel = 'moderate';
  var confirmNavigation = false;

  function isInterceptableLink(link) {
    if (!link || link.tagName !== 'A') return false;
    if (link.hasAttribute('data-collabora')) return false;

    var href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#') return false;
    if (href.charAt(0) === '#') return false;
    if (href.toLowerCase().indexOf('javascript:') === 0) return false;

    return true;
  }

  function findLink(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.tagName === 'A') return node;
      node = node.parentElement;
    }
    return null;
  }

  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
    document.removeEventListener('keydown', handleEscapeKey);
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape' && tooltip) {
      removeTooltip();
    }
  }

  function showConfirmTooltip(link, e) {
    removeTooltip();

    tooltip = Collabora.dom.create('div', {
      className: 'collabora-ld-tooltip',
      'data-collabora': 'true',
      role: 'dialog',
      'aria-label': 'Confirm navigation'
    });

    var msg = Collabora.dom.create('p', {
      className: 'collabora-ld-tooltip__message',
      textContent: 'Leave page?'
    });

    var btnRow = Collabora.dom.create('div', {
      className: 'collabora-ld-tooltip__buttons'
    });

    var continueBtn = Collabora.dom.create('button', {
      className: 'collabora-ld-tooltip__btn collabora-ld-tooltip__btn--primary',
      textContent: 'Continue',
      onClick: function () {
        var href = link.href;
        var target = link.getAttribute('target');
        removeTooltip();
        if (target === '_blank') {
          window.open(href, '_blank');
        } else {
          window.location.href = href;
        }
      }
    });

    var cancelBtn = Collabora.dom.create('button', {
      className: 'collabora-ld-tooltip__btn',
      textContent: 'Cancel',
      onClick: removeTooltip
    });

    btnRow.appendChild(continueBtn);
    btnRow.appendChild(cancelBtn);
    tooltip.appendChild(msg);
    tooltip.appendChild(btnRow);
    document.body.appendChild(tooltip);

    document.addEventListener('keydown', handleEscapeKey);

    var rect = link.getBoundingClientRect();
    var scrollX = window.scrollX || document.documentElement.scrollLeft;
    var scrollY = window.scrollY || document.documentElement.scrollTop;

    tooltip.style.position = 'absolute';
    tooltip.style.left = (rect.left + scrollX) + 'px';
    tooltip.style.top = (rect.bottom + scrollY + 4) + 'px';

    // Adjust if tooltip overflows viewport
    requestAnimationFrame(function () {
      if (!tooltip) return;
      var tipRect = tooltip.getBoundingClientRect();

      if (tipRect.right > window.innerWidth) {
        tooltip.style.left = Math.max(0, window.innerWidth - tipRect.width + scrollX - 8) + 'px';
      }
      if (tipRect.bottom > window.innerHeight) {
        tooltip.style.top = (rect.top + scrollY - tipRect.height - 4) + 'px';
      }
    });
  }

  function handleLinkClick(e) {
    var link = findLink(e.target);
    if (!link || !isInterceptableLink(link)) return;

    e.preventDefault();
    e.stopPropagation();
    showConfirmTooltip(link, e);
  }

  function attachClickHandler() {
    if (clickHandlerAttached) return;
    document.addEventListener('click', handleLinkClick, true);
    clickHandlerAttached = true;
  }

  function detachClickHandler() {
    if (!clickHandlerAttached) return;
    document.removeEventListener('click', handleLinkClick, true);
    clickHandlerAttached = false;
  }

  Collabora.features.register('link-dimmer', {
    defaults: { enabled: false, dimLevel: 'moderate', confirmNavigation: false },

    enable: function (settings) {
      dimLevel = settings.dimLevel || 'moderate';
      confirmNavigation = !!settings.confirmNavigation;

      document.body.setAttribute('data-collabora-ld-level', dimLevel);

      if (confirmNavigation) {
        attachClickHandler();
      }
    },

    disable: function () {
      document.body.removeAttribute('data-collabora-ld-level');
      detachClickHandler();
      removeTooltip();
    },

    update: function (settings) {
      if (settings.dimLevel !== undefined) {
        dimLevel = settings.dimLevel;
        document.body.setAttribute('data-collabora-ld-level', dimLevel);
      }
      if (settings.confirmNavigation !== undefined) {
        confirmNavigation = !!settings.confirmNavigation;
        if (confirmNavigation) {
          attachClickHandler();
        } else {
          detachClickHandler();
          removeTooltip();
        }
      }
    }
  });
})();
