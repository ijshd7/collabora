/**
 * Tests for content/shared/storage.js
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  chrome.storage.local._data = {};
  delete window.Collabora;
  loadScript('content/shared/storage.js');
});

describe('Collabora.storage.getFeatureSettings', () => {
  it('merges global and site-specific settings with site overriding', async () => {
    chrome.storage.local._data = {
      global: { 'distraction-blocker': { level: 'moderate', enabled: false } },
      sites: { 'example.com': { 'distraction-blocker': { level: 'aggressive', enabled: true } } }
    };
    const settings = await Collabora.storage.getFeatureSettings('distraction-blocker', 'example.com');
    expect(settings).toEqual({ level: 'aggressive', enabled: true });
  });

  it('returns global only when no site override', async () => {
    chrome.storage.local._data = {
      global: { 'distraction-blocker': { level: 'gentle' } }
    };
    const settings = await Collabora.storage.getFeatureSettings('distraction-blocker', 'example.com');
    expect(settings).toEqual({ level: 'gentle' });
  });

  it('returns empty object when nothing stored', async () => {
    const settings = await Collabora.storage.getFeatureSettings('unknown-feature', 'example.com');
    expect(settings).toEqual({});
  });
});

describe('Collabora.storage.setFeatureSettings', () => {
  it('writes site-specific settings', async () => {
    await Collabora.storage.setFeatureSettings('distraction-blocker', 'example.com', { level: 'aggressive' });
    expect(chrome.storage.local._data.sites['example.com']['distraction-blocker']).toEqual({ level: 'aggressive' });
  });

  it('merges with existing site settings', async () => {
    chrome.storage.local._data = {
      sites: { 'example.com': { 'distraction-blocker': { level: 'moderate' } } }
    };
    await Collabora.storage.setFeatureSettings('distraction-blocker', 'example.com', { enabled: true });
    expect(chrome.storage.local._data.sites['example.com']['distraction-blocker']).toEqual({
      level: 'moderate',
      enabled: true
    });
  });
});

describe('Collabora.storage.getAllForSite', () => {
  it('merges all features from global and site', async () => {
    chrome.storage.local._data = {
      global: { 'feature-a': { x: 1 }, 'feature-b': { y: 2 } },
      sites: { 'example.com': { 'feature-a': { x: 10 } } }
    };
    const all = await Collabora.storage.getAllForSite('example.com');
    expect(all['feature-a']).toEqual({ x: 10 });
    expect(all['feature-b']).toEqual({ y: 2 });
  });
});

describe('Collabora.storage.resetSite', () => {
  it('removes site-specific settings', async () => {
    chrome.storage.local._data = {
      sites: { 'example.com': { 'distraction-blocker': {} } }
    };
    await Collabora.storage.resetSite('example.com');
    expect(chrome.storage.local._data.sites['example.com']).toBeUndefined();
  });
});

describe('Collabora.storage.getGlobalSettings and setGlobalSettings', () => {
  it('gets and sets global settings', async () => {
    await Collabora.storage.setGlobalSettings('distraction-blocker', { level: 'moderate' });
    const settings = await Collabora.storage.getGlobalSettings('distraction-blocker');
    expect(settings).toEqual({ level: 'moderate' });
  });
});

describe('Collabora.storage.onChanged', () => {
  it('registers listener that fires for local area', () => {
    const callback = jest.fn();
    Collabora.storage.onChanged(callback);
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
    const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    listener({ global: {} }, 'local');
    expect(callback).toHaveBeenCalledWith({ global: {} });
  });
});
