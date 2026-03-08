/**
 * Collabora — Background Service Worker
 * Relays messages between popup and content scripts.
 * Handles keyboard shortcut commands.
 */

// Set default global settings on install
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(['global'], function (data) {
    if (!data.global) {
      chrome.storage.local.set({
        global: {
          'motion-reducer': { enabled: false },
          'distraction-blocker': { enabled: false },
          'font-adjuster': { enabled: false },
          'reading-ruler': { enabled: false },
          'progress-indicator': { enabled: false },
          'focus-reader': { enabled: false },
          'focus-timer': { enabled: false },
          'link-dimmer': { enabled: false },
          'color-contrast': { enabled: false }
        }
      });
    }
  });
});

// Relay messages from popup to content script
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  // If from popup (no tab), forward to active tab's content script
  if (!sender.tab) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true; // async
  }
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(function (command) {
  var featureMap = {
    'toggle-motion-reducer': 'motion-reducer',
    'toggle-distraction-blocker': 'distraction-blocker',
    'toggle-font-adjuster': 'font-adjuster',
    'toggle-reading-ruler': 'reading-ruler',
    'toggle-focus-reader': 'focus-reader',
    'toggle-focus-timer': 'focus-timer',
    'toggle-link-dimmer': 'link-dimmer'
  };

  var featureId = featureMap[command];
  if (!featureId) return;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'TOGGLE_FEATURE',
        featureId: featureId
      });
    }
  });
});
