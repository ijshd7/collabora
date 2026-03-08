/**
 * Tests for background/service-worker.js
 */
const path = require('path');
const fs = require('fs');

beforeEach(() => {
  chrome.storage.local._data = {};
});

describe('service-worker', () => {
  beforeAll(() => {
    const scriptPath = path.resolve(__dirname, '../../background/service-worker.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    const fn = new Function('chrome', content);
    fn(global.chrome);
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
  });

  describe('onInstalled', () => {
    it('sets default global settings when none exist', (done) => {
      expect(chrome._listeners.onInstalled).toBeTruthy();
      chrome._listeners.onInstalled();
      setTimeout(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            global: expect.objectContaining({
              'motion-reducer': { enabled: false },
              'distraction-blocker': { enabled: false },
              'font-adjuster': { enabled: false }
            })
          })
        );
        done();
      }, 10);
    });

    it('does not overwrite existing global settings', (done) => {
      chrome.storage.local._data = { global: { 'motion-reducer': { enabled: true } } };
      chrome._listeners.onInstalled();
      setTimeout(() => {
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('onMessage relay', () => {
    it('forwards message to active tab when sender has no tab', (done) => {
      const sendResponse = jest.fn();
      chrome._listeners.onMessage({ type: 'GET_STATE' }, {}, sendResponse);
      setTimeout(() => {
        expect(chrome.tabs.query).toHaveBeenCalledWith(
          { active: true, currentWindow: true },
          expect.any(Function)
        );
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
          1,
          { type: 'GET_STATE' },
          expect.any(Function)
        );
        expect(sendResponse).toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('onCommand', () => {
    it('sends TOGGLE_FEATURE for known commands', (done) => {
      chrome.tabs.sendMessage.mockClear();
      chrome._listeners.onCommand('toggle-distraction-blocker');
      setTimeout(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
          1,
          { type: 'TOGGLE_FEATURE', featureId: 'distraction-blocker' }
        );
        done();
      }, 10);
    });

    it('maps toggle-distraction-blocker to distraction-blocker', (done) => {
      chrome._listeners.onCommand('toggle-distraction-blocker');
      setTimeout(() => {
        const call = chrome.tabs.sendMessage.mock.calls.find(
          (c) => c[1] && c[1].featureId === 'distraction-blocker'
        );
        expect(call).toBeTruthy();
        done();
      }, 10);
    });
  });
});
