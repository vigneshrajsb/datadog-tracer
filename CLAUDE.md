# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Datadog APM Tracer is a Chrome/Chromium browser extension (Manifest V3) that injects Datadog APM trace headers into network requests. It helps developers debug end-to-end application flows by creating and retaining traces from local browser sessions without worrying about retention filters.

## Commands

```bash
pnpm install          # Install dependencies
pnpm prettier         # Format all files with Prettier
pnpm zip              # Package extension for distribution
```

**Testing the extension locally:**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this repository directory

No automated test framework is currently configured.

## Architecture

This is a vanilla JavaScript Chrome Extension with the following structure:

- **background.js** - Service worker that manages declarativeNetRequest rules to inject Datadog headers (`x-datadog-trace-id`, `x-datadog-parent-id`, `x-datadog-origin`, `x-datadog-sampling-priority`). Handles tab grouping and badge state.

- **popup/** - Extension popup UI (popup.html, popup.js, popup.css). Controls enable/disable toggle, generates trace IDs, displays Datadog APM links, validates domain matching.

- **options/** - Settings page (options.html, options.js, options.css). Configures multiple domains to trace (one per line in textarea).

- **scripts/content.js** - Content script placeholder (currently minimal).

**Data Flow:**

1. User configures target domains in options page → stored as `{ tracerSettings: { domains: [...] } }` in `chrome.storage.local`
2. User enables tracing via popup → validates tab URL matches any configured domain, generates trace ID, sends message to background service worker
3. Background service worker creates one declarativeNetRequest rule per domain (fixed sequential IDs: 1, 2, 3...) using `||domain` urlFilter pattern
4. Extension creates a "Tracing" tab group (green) for traced tabs
5. When traced tab is closed, rules and storage are automatically cleaned up

**Key Chrome APIs used:** `chrome.storage.local`, `chrome.declarativeNetRequest`, `chrome.runtime.sendMessage`, `chrome.tabGroups`, `chrome.tabs.onRemoved`

**Storage Format:**
- `tracerSettings`: `{ domains: ["example.com", "api.example.com"] }`
- `tracer`: `{ tabId, traceId, ruleIds: [1, 2, 3] }` (active tracing session)
