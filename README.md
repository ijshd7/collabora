# Collabora — Reading & Focus Suite

A Chrome extension providing ADHD and cognitive load support. Reduce distractions, improve readability, and maintain focus while reading online.

## Features

- **Motion Reducer** — Pauses GIFs, CSS animations, and auto-playing media to reduce visual noise
- **Distraction Blocker** — Strips ads, sidebars, auto-playing media, and floating elements with three intensity levels (gentle, moderate, aggressive). Optional toggle to hide comment sections.
- **Font Adjuster** — Per-site font family, size, and line-height customization; includes accessibility-friendly fonts like OpenDyslexic and Lexend
- **Reading Ruler** — A focus overlay that dims everything except the line you're reading, helping maintain your place in long text
- **Progress Indicator** — Displays a scroll progress bar and estimated read time for the current page
- **Focus Reader** — Text-to-speech with word-by-word highlighting, powered by the Web Speech API
- **Color Contrast Adjuster** — Applies CSS filter presets (warm, cool/dark, high contrast, or custom) to improve screen readability

## Installation

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `collabora` folder
5. The extension icon appears in your toolbar

## Usage

Click the extension icon to open the popup. Each feature has a toggle switch and optional settings that expand when enabled. Settings are saved per-site automatically.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+M` | Toggle Motion Reducer |
| `Alt+Shift+D` | Toggle Distraction Blocker |
| `Alt+Shift+F` | Toggle Font Adjuster |
| `Alt+Shift+R` | Toggle Reading Ruler |

Focus Reader has no default shortcut; assign one at `chrome://extensions/shortcuts`. All shortcuts can be customized there.

## Architecture

```
collabora/
├── manifest.json              # MV3 manifest
├── background/
│   └── service-worker.js      # Message relay, shortcut handling
├── content/
│   ├── bootstrap.js           # Entry point, message listener
│   ├── shared/                # Storage, feature manager, DOM helpers
│   ├── features/              # One folder per feature (JS + CSS)
│   └── styles/                # Base CSS custom properties
├── popup/                     # Extension popup UI
└── tests/
    ├── manual/                # Manual test page
    └── unit/                  # Jest unit tests
```

All features are independently toggleable and use a shared registration system (`feature-manager.js`). CSS is always loaded but gated behind `body[data-collabora-{feature}="active"]` attributes, so toggling is instant. Per-site preferences are stored in `chrome.storage.local` with global/site-specific merge logic.

## Testing

- **Automated:** Run `npm test` for the Jest unit test suite (site-key, storage, feature-manager, dom-helpers, distraction-blocker, service-worker).
- **Manual:** Open `tests/manual/test-page.html` in the browser with the extension loaded. The page includes test sections for each feature: animated elements, fake ads, comments, long-form text, autoplay media, and color test images.

## License

MIT
