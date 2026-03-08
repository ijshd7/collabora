/**
 * Jest setup — mocks Chrome extension APIs and initializes test environment.
 */
const chrome = {
  storage: {
    local: {
      _data: {},
      get: jest.fn(function (keys, callback) {
        if (typeof keys === 'function') {
          callback = keys;
          keys = null;
        }
        const result = {};
        const keysToGet = keys || Object.keys(this._data);
        (Array.isArray(keysToGet) ? keysToGet : [keysToGet]).forEach((key) => {
          if (this._data[key] !== undefined) {
            result[key] = this._data[key];
          }
        });
        callback(result);
      }),
      set: jest.fn(function (items, callback) {
        Object.assign(chrome.storage.local._data, items);
        if (typeof callback === 'function') callback();
      }),
      clear: jest.fn(function () {
        chrome.storage.local._data = {};
      })
    },
    onChanged: { addListener: jest.fn() }
  },
  runtime: {
    sendMessage: jest.fn(function (msg, callback) {
      if (typeof callback === 'function') callback({});
    }),
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() }
  },
  tabs: {
    query: jest.fn(function (queryInfo, callback) {
      callback([{ id: 1 }]);
    }),
    sendMessage: jest.fn(function (tabId, msg, callback) {
      if (typeof callback === 'function') callback({});
    })
  },
  commands: {
    onCommand: { addListener: jest.fn() }
  }
};

// Store listeners for service worker tests
chrome._listeners = {
  onInstalled: null,
  onMessage: null,
  onCommand: null
};
chrome.runtime.onInstalled.addListener.mockImplementation(function (fn) {
  chrome._listeners.onInstalled = fn;
});
chrome.runtime.onMessage.addListener.mockImplementation(function (fn) {
  chrome._listeners.onMessage = fn;
});
chrome.commands.onCommand.addListener.mockImplementation(function (fn) {
  chrome._listeners.onCommand = fn;
});

global.chrome = chrome;

// Reset storage between tests
beforeEach(() => {
  chrome.storage.local._data = {};
  chrome.storage.local.get.mockClear();
  chrome.storage.local.set.mockClear();
});
