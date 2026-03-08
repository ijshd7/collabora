/**
 * Tests for content/shared/feature-manager.js
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  document.body.innerHTML = '<body></body>';
  document.body.removeAttribute('data-collabora-mock-feature');
  chrome.storage.local._data = {};
  delete window.Collabora;
  loadScript('content/shared/site-key.js');
  loadScript('content/shared/storage.js');
  loadScript('content/shared/feature-manager.js');
});

describe('Collabora.features', () => {
  const mockFeature = {
    defaults: { enabled: false, level: 'moderate' },
    enable: jest.fn(),
    disable: jest.fn(),
    update: jest.fn()
  };

  beforeEach(() => {
    mockFeature.enable.mockClear();
    mockFeature.disable.mockClear();
    mockFeature.update.mockClear();
  });

  describe('register and getRegistered', () => {
    it('registers a feature and returns registered IDs', () => {
      Collabora.features.register('mock-feature', mockFeature);
      expect(Collabora.features.getRegistered()).toContain('mock-feature');
    });
  });

  describe('enable and disable', () => {
    it('calls feature enable with merged settings and sets body attribute', () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.enable('mock-feature', { level: 'aggressive' });
      expect(mockFeature.enable).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'aggressive', enabled: false })
      );
      expect(document.body.getAttribute('data-collabora-mock-feature')).toBe('active');
    });

    it('calls disable and removes body attribute', () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.enable('mock-feature', {});
      Collabora.features.disable('mock-feature');
      expect(mockFeature.disable).toHaveBeenCalled();
      expect(document.body.getAttribute('data-collabora-mock-feature')).toBeNull();
    });

    it('does nothing for unregistered feature', () => {
      Collabora.features.enable('nonexistent', {});
      expect(mockFeature.enable).not.toHaveBeenCalled();
    });

    it('isActive reflects state', () => {
      Collabora.features.register('mock-feature', mockFeature);
      expect(Collabora.features.isActive('mock-feature')).toBe(false);
      Collabora.features.enable('mock-feature', {});
      expect(Collabora.features.isActive('mock-feature')).toBe(true);
      Collabora.features.disable('mock-feature');
      expect(Collabora.features.isActive('mock-feature')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('disables when active and updates storage', async () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.enable('mock-feature', { enabled: true });
      Collabora.features.toggle('mock-feature', 'example.com');
      expect(mockFeature.disable).toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 0));
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('enables when inactive using storage settings', async () => {
      chrome.storage.local._data = {
        global: {},
        sites: { example: { 'mock-feature': { level: 'gentle' } } }
      };
      Collabora.getSiteKey = () => 'example';
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.toggle('mock-feature', 'example');
      await new Promise((r) => setTimeout(r, 50));
      expect(mockFeature.enable).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('calls feature update when active', () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.enable('mock-feature', {});
      Collabora.features.update('mock-feature', { level: 'aggressive' });
      expect(mockFeature.update).toHaveBeenCalledWith({ level: 'aggressive' });
    });

    it('does nothing when feature inactive', () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.update('mock-feature', { level: 'aggressive' });
      expect(mockFeature.update).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('returns state for all registered features', () => {
      Collabora.features.register('mock-feature', mockFeature);
      Collabora.features.enable('mock-feature', {});
      const state = Collabora.features.getState();
      expect(state['mock-feature']).toEqual({
        active: true,
        defaults: { enabled: false, level: 'moderate' }
      });
    });
  });

  describe('initAll', () => {
    it('enables features with enabled: true from storage', async () => {
      Collabora.getSiteKey = () => 'example.com';
      chrome.storage.local._data = {
        global: {},
        sites: {
          'example.com': {
            'mock-feature': { enabled: true, level: 'gentle' }
          }
        }
      };
      Collabora.features.register('mock-feature', mockFeature);
      await Collabora.features.initAll();
      expect(mockFeature.enable).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, level: 'gentle' })
      );
    });
  });
});
