/**
 * Tests for content/features/link-dimmer
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  document.body.innerHTML = '<body></body>';
  document.body.removeAttribute('data-collabora-link-dimmer');
  document.body.removeAttribute('data-collabora-ld-level');
  chrome.storage.local._data = {};
  delete window.Collabora;
  loadScript('content/shared/site-key.js');
  loadScript('content/shared/storage.js');
  loadScript('content/shared/dom-helpers.js');
  loadScript('content/shared/feature-manager.js');
  loadScript('content/features/link-dimmer/link-dimmer.js');
});

afterEach(() => {
  if (window.Collabora && Collabora.features.isActive('link-dimmer')) {
    Collabora.features.disable('link-dimmer');
  }
});

describe('link-dimmer', () => {
  describe('defaults', () => {
    it('has correct default settings', () => {
      const state = Collabora.features.getState();
      expect(state['link-dimmer'].defaults).toEqual({
        enabled: false,
        dimLevel: 'moderate',
        confirmNavigation: false
      });
    });
  });

  describe('enable', () => {
    it('sets data-collabora-link-dimmer and data-collabora-ld-level on body', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'moderate' });
      expect(document.body.getAttribute('data-collabora-link-dimmer')).toBe('active');
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('moderate');
      Collabora.features.disable('link-dimmer');
    });

    it('sets data-collabora-ld-level for subtle', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'subtle' });
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('subtle');
      Collabora.features.disable('link-dimmer');
    });

    it('sets data-collabora-ld-level for moderate', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'moderate' });
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('moderate');
      Collabora.features.disable('link-dimmer');
    });

    it('sets data-collabora-ld-level for heavy', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'heavy' });
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('heavy');
      Collabora.features.disable('link-dimmer');
    });
  });

  describe('disable', () => {
    it('removes data-collabora-link-dimmer and data-collabora-ld-level', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'heavy' });
      Collabora.features.disable('link-dimmer');
      expect(document.body.getAttribute('data-collabora-link-dimmer')).toBeNull();
      expect(document.body.getAttribute('data-collabora-ld-level')).toBeNull();
    });

    it('removes any visible tooltip', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();
      expect(document.querySelector('.collabora-ld-tooltip')).not.toBeNull();

      Collabora.features.disable('link-dimmer');
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();
    });
  });

  describe('update', () => {
    it('changes dimLevel attribute when setting changes', () => {
      Collabora.features.enable('link-dimmer', { dimLevel: 'subtle' });
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('subtle');

      Collabora.features.update('link-dimmer', { dimLevel: 'heavy' });
      expect(document.body.getAttribute('data-collabora-ld-level')).toBe('heavy');

      Collabora.features.disable('link-dimmer');
    });
  });

  describe('confirmNavigation', () => {
    it('calls preventDefault and creates tooltip when clicking a link', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(document.querySelector('.collabora-ld-tooltip')).not.toBeNull();
      expect(document.querySelector('.collabora-ld-tooltip__message').textContent).toBe('Leave page?');

      Collabora.features.disable('link-dimmer');
    });

    it('Cancel button removes the tooltip', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();

      const cancelBtn = document.querySelector('.collabora-ld-tooltip__btn:not(.collabora-ld-tooltip__btn--primary)');
      expect(cancelBtn).not.toBeNull();
      expect(cancelBtn.textContent).toBe('Cancel');
      cancelBtn.click();

      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();
      Collabora.features.disable('link-dimmer');
    });

    it('Continue button removes the tooltip', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();

      const continueBtn = document.querySelector('.collabora-ld-tooltip__btn--primary');
      expect(continueBtn).not.toBeNull();
      expect(continueBtn.textContent).toBe('Continue');

      const originalLocation = window.location.href;
      delete window.location;
      window.location = { href: originalLocation };

      continueBtn.click();

      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();
      Collabora.features.disable('link-dimmer');
    });

    it('does not intercept links with data-collabora attribute', () => {
      document.body.innerHTML = '<a href="https://example.com" data-collabora="true">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      Collabora.features.disable('link-dimmer');
    });

    it('does not intercept same-page anchor links', () => {
      document.body.innerHTML = '<a href="#section">Anchor</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      Collabora.features.disable('link-dimmer');
    });

    it('only one tooltip visible at a time', () => {
      document.body.innerHTML = '<a href="https://example.com">Link1</a> <a href="https://wikipedia.org">Link2</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const links = document.querySelectorAll('a');

      links[0].click();
      expect(document.querySelectorAll('.collabora-ld-tooltip').length).toBe(1);

      links[1].click();
      expect(document.querySelectorAll('.collabora-ld-tooltip').length).toBe(1);

      Collabora.features.disable('link-dimmer');
    });

    it('does not attach click handler when confirmNavigation is false', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: false });
      const link = document.querySelector('a');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      Collabora.features.disable('link-dimmer');
    });

    it('removes click handler on disable', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      Collabora.features.disable('link-dimmer');

      const link = document.querySelector('a');
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('escape key', () => {
    it('dismisses tooltip when Escape is pressed', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();
      expect(document.querySelector('.collabora-ld-tooltip')).not.toBeNull();

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      Collabora.features.disable('link-dimmer');
    });

    it('does nothing when Escape is pressed and no tooltip is visible', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });

      // No tooltip shown yet — Escape should not throw
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      Collabora.features.disable('link-dimmer');
    });
  });

  describe('aria attributes', () => {
    it('tooltip has role="dialog" and aria-label', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();

      const tooltip = document.querySelector('.collabora-ld-tooltip');
      expect(tooltip.getAttribute('role')).toBe('dialog');
      expect(tooltip.getAttribute('aria-label')).toBe('Confirm navigation');

      Collabora.features.disable('link-dimmer');
    });
  });

  describe('update confirmNavigation', () => {
    it('attaches handler when confirmNavigation changes from false to true', () => {
      Collabora.features.enable('link-dimmer', { confirmNavigation: false });
      Collabora.features.update('link-dimmer', { confirmNavigation: true });

      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      const link = document.querySelector('a');
      link.click();

      expect(document.querySelector('.collabora-ld-tooltip')).not.toBeNull();
      Collabora.features.disable('link-dimmer');
    });

    it('detaches handler and removes tooltip when confirmNavigation changes from true to false', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      Collabora.features.enable('link-dimmer', { confirmNavigation: true });
      const link = document.querySelector('a');
      link.click();
      expect(document.querySelector('.collabora-ld-tooltip')).not.toBeNull();

      Collabora.features.update('link-dimmer', { confirmNavigation: false });
      expect(document.querySelector('.collabora-ld-tooltip')).toBeNull();

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      link.dispatchEvent(clickEvent);
      expect(preventDefaultSpy).not.toHaveBeenCalled();

      Collabora.features.disable('link-dimmer');
    });
  });
});
