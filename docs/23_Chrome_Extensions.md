# 23 · Chrome Extensions

**Why browser extensions exist:** websites only show what their owners want. Extensions let you **add features to pages you don't control**: block ads, manage passwords, translate, compare prices, read reviews honestly. They run inside the browser with controlled access to pages and browser APIs.

**Why you built one:** Smart Shopping Agent sits **next to the product page** on Amazon.in and Flipkart and gives a neutral second opinion: reads hundreds of reviews into a verdict, answers questions from what reviewers said, finds the same product on the other store to compare prices, flags unusual review patterns, and tracks prices with drop alerts. An extension was the right form because it works **in the shopper's own browser session** (pages they can already see, including signed-in review pages) **without server-side scraping**, and keeps their data local.

---

## Start here: Chrome extensions in plain words

**What:** small programs that **add features to the Chrome browser** and to the web pages you visit, written with normal web technology (HTML, CSS, JavaScript/TypeScript).
**Analogy:** **apps for your browser**, like phone apps but living inside Chrome. Some sit on the toolbar, some open a side panel, some quietly read or change pages (an ad blocker, a password manager, your shopping assistant).

### The pieces of an extension and how they talk
```
 ┌─────────────────────────── Chrome ───────────────────────────────────────────┐
 │  Web page (amazon.in)                     Extension (isolated from the page) │
 │  ┌───────────────────────────┐            ┌────────────────────────────────┐ │
 │  │ page's own HTML/JS        │            │ manifest.json (identity +      │ │
 │  │                           │            │ permissions)                   │ │
 │  │  CONTENT SCRIPT ◄─────────┼─messages──►│ SERVICE WORKER (background:    │ │
 │  │  (reads the DOM: title,   │            │ alarms, notifications, wakes   │ │
 │  │   price, reviews)         │            │ on events, sleeps when idle)   │ │
 │  └───────────────────────────┘            │      │ needs a DOM? → OFFSCREEN  │ │
 │                                           │      │ document (hidden page)    │ │
 │  SIDE PANEL / POPUP (React UI) ◄─messages─┤      ▼                           │ │
 │                                           │ chrome.storage (data on device)  │ │
 │                                           └──────────────┬─────────────────┘ │
 └──────────────────────────────────────────────────────────┼───────────────────┘
                                                            ▼ HTTPS (install token)
                                               Your backend (FastAPI on Render) ──► OpenAI
```

- **manifest.json** = the extension's ID card: its name, version, files and **permissions** ("may read amazon.in pages").
- **Content script** = a helper injected into the web page; it can **read and change the page**.
- **Service worker** = the background brain; handles events, schedules jobs, but has **no page/DOM** and sleeps when idle.
- **Side panel / popup** = the extension's own UI.
- **Messaging** = how these parts talk to each other.
- **chrome.storage** = the extension's private storage on the user's computer.

## Course map (everything in this file)
```
Basics: what extensions are · types (toolbar/popup, side panel, content-modifying, DevTools) · your first extension (load unpacked)
Manifest: MV3 fields · permissions & host permissions · optional permissions · CSP · web_accessible_resources
Components: service worker (lifecycle, events, alarms) · content scripts (isolated world, injection, run_at) · popup/side panel/options
  · offscreen documents · DevTools pages
Communication & data: messaging (one-off, ports, external) · chrome.storage (local/sync/session) · fetching from backends
APIs: tabs · scripting · alarms · notifications · contextMenus · commands · declarativeNetRequest · identity · i18n
Engineering: TypeScript/React/Vite setup · testing (unit, E2E with Playwright/Puppeteer) · debugging · scraping robustness
Shipping: Chrome Web Store (account, listing, privacy, review, policies) · updates & versioning · analytics · security
```

### Your first extension in 3 files (hello world)
```json
// manifest.json
{ "manifest_version": 3, "name": "Hello", "version": "1.0",
  "action": { "default_popup": "popup.html" },
  "permissions": ["storage"] }
```
```html
<!-- popup.html -->
<!doctype html><html><body><button id="b">Count</button><span id="n">0</span><script src="popup.js"></script></body></html>
```
```js
// popup.js
const n = document.getElementById("n");
chrome.storage.local.get({ count: 0 }).then(({ count }) => (n.textContent = count));
document.getElementById("b").addEventListener("click", async () => {
  const { count } = await chrome.storage.local.get({ count: 0 });
  await chrome.storage.local.set({ count: count + 1 });
  n.textContent = count + 1;
});
```

Load it at `chrome://extensions` → Developer mode → **Load unpacked** → pick the folder → click the toolbar icon.

### Content script injection options

- **Static** (declared in `content_scripts` with `matches` and `run_at`: `document_start`, `document_end` or `document_idle`).
- **Programmatic** (`chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] })`) when the user clicks something, which needs the `scripting` permission + host access (or `activeTab`).
- **`activeTab`** grants temporary access to the current tab after a user gesture, with no scary install warning.
- **Main world vs isolated world:** content scripts run in an isolated JS world by default; `world: "MAIN"` runs in the page's own world (needed to read page variables; less safe).

## 1. Manifest V3 (MV3)
Every extension has a `manifest.json`. **MV3** is the current platform (Chrome phased out MV2). The main changes from MV2:

- The background page is replaced by a **service worker** (event-driven, **terminates when idle**, no DOM).
- **No remotely hosted code** (all JS must ship in the package and pass review): security.
- `webRequest` blocking → `declarativeNetRequest` (rule-based) for content blocking.
- Promise-based APIs; stricter Content Security Policy.

```json
{
  "manifest_version": 3,
  "name": "Smart Shopping Agent",
  "version": "0.6.1",
  "minimum_chrome_version": "116",
  "permissions": ["sidePanel", "scripting", "storage", "alarms", "notifications", "offscreen"],
  "host_permissions": [
    "https://www.amazon.in/*",
    "https://www.flipkart.com/*",
    "https://smart-shopping-agent-api.onrender.com/*"
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_title": "Open Smart Shopping Agent" },
  "side_panel": { "default_path": "sidepanel.html" },
  "content_scripts": [{
    "matches": ["https://www.amazon.in/*", "https://www.flipkart.com/*"],
    "js": ["content.js"], "run_at": "document_idle"
  }]
}
```

*(This is your real v0.6.1 manifest, minus icons and the description. Know why each permission is there: `sidePanel` for the UI, `scripting` to inject into tabs, `storage` for price history and the watchlist, `alarms` for scheduled price checks, `notifications` for price-drop alerts, `offscreen` for HTML parsing, plus host permissions for the two stores and your backend.)*

## 2. The components and where each runs

| Component | Runs in | Can do | Can't do |
|---|---|---|---|
| **Content script** | The web page, in an **isolated world** (shares the DOM, not the page's JS variables) | Read/modify the page DOM, extract product data and reviews | Most `chrome.*` APIs; can't see the page's JS variables directly (inject a script or read embedded JSON) |
| **Service worker** (background) | Extension process, event-driven | `chrome.alarms`, `chrome.storage`, network fetches, notifications, messaging hub | **No DOM** (no `DOMParser`); can be killed any time, so no long-lived in-memory state |
| **Side panel / popup / options pages** | Extension pages (normal HTML/JS, e.g. React) | UI, `chrome.*` APIs, calls to your backend | Direct page DOM access (ask the content script) |
| **Offscreen document** | A hidden extension page | DOM APIs (`DOMParser`) for the service worker | UI |

**Your architecture:**

```
Amazon/Flipkart page
  └─ content script (amazon.ts / flipkart.ts / common.ts): extract title, price, model number, ratings, reviews (paginated)
        │ chrome.runtime messaging
        ▼
  Side panel (React: App.tsx, PriceCard.tsx; api.ts → all backend calls with the install token)
        │ HTTPS
        ▼
  FastAPI backend on Render → OpenAI (analysis, chat streaming, match verification)
  
  Service worker (background.ts): chrome.alarms → periodic price checks for watched products
        → offscreen document parses the fetched HTML (service workers have no DOM)
        → chrome.storage.local (price history + watchlist stay on the user's device) → notifications on price drops
  
  Cross-site compare (compare/): build ≤2 search queries → fetch the other store's search results → rule pre-filter
        (brand aliases, model codes, spec conflicts) → AI verify (titles + model only) → model-code veto → result
```

## 3. Messaging

- One-off: `chrome.runtime.sendMessage` (to the extension) / `chrome.tabs.sendMessage(tabId, …)` (to a tab's content script); reply via `sendResponse` or a returned Promise.
- Long-lived: `chrome.runtime.connect` ports (streams of messages).
- Always validate messages (content scripts run in a hostile page environment).

## 4. Storage

| API | Scope | Notes |
|---|---|---|
| `chrome.storage.local` | This device | Larger quota (larger still with the `unlimitedStorage` permission); **your price history and watchlist** |
| `chrome.storage.sync` | Synced across the user's Chrome profile | Small quota; settings |
| `chrome.storage.session` | In memory, cleared on browser restart | Service-worker state between wake-ups |

`localStorage` isn't available in service workers. Use `chrome.storage`.

## 5. Service worker lifecycle gotchas

- It **sleeps after about 30 s idle**. Never rely on global variables: persist state in `chrome.storage`.
- Use **`chrome.alarms`** for periodic work, not `setInterval` (timers die with the worker).
- Register event listeners at the **top level** synchronously so Chrome can wake the worker for them.

## 6. Permissions and privacy (the store review cares)

- **Least privilege:** request only the host permissions you need (just the two store domains). Broad host permissions trigger a warning on install, and the store review flags them ("this extension can read and change your data on…"), which is informational but affects user trust.
- **Optional permissions** requested at runtime when a feature needs them.
- **Privacy policy** required when handling user data. Declare data use in the dashboard's privacy tab. **Your policy:** price history and watchlist stay in `chrome.storage.local`; only product data/review text needed for analysis goes to the backend; canonical product URLs; personal lines stripped from fallback page text; no selling of data.
- **Content Security Policy:** no `eval`, no remote scripts in MV3.

## 7. Scraping robustness (real lessons from your build)

- Sites change layouts often, and class names may be **obfuscated** (Flipkart). Prefer **structured data**: JSON-LD (`<script type="application/ld+json">`), embedded app state (`window.__INITIAL_STATE__` on Flipkart, read via the page's HTML), then DOM fallbacks.
- **Single-page apps change in place:** data can be stale or late after navigation. Your fix: trust JSON-LD only if its SKU matches the product ID, wait up to 3 s, then fall back to the first non-struck-through ₹ price after the `<h1>` (ads sit above it).
- **Amazon specifics:** review pagination ignores `?pageNumber=`, so use the "Show more" AJAX endpoint with a `nextPageToken` + anti-CSRF token. The price element is often blank in one place, so read alternative copies; never read the struck-through MRP. Star-breakdown labels differ when signed in vs signed out.
- **Bot checks:** if Amazon shows a robot check, **surface it** to the user ("open amazon.in in a tab, then Rescan") instead of silently returning zero results (a bug you found during recall testing).
- **Dedupe reviews by the site's review ID**, not by text, so identical copy-pasted reviews still count for the trust check.
- **Unicode:** truncate without splitting emoji surrogate pairs, or the backend rejects the JSON.
- Keep extraction logic **unit-tested with saved HTML fixtures** + an **end-to-end recall test** on live pages (26/26).

## 8. Building, testing, publishing

- **Build tooling:** TypeScript + Vite + React (your setup); `npm run build` → `dist/` → **Load unpacked** in `chrome://extensions` (Developer mode) for local testing.
- **Tests:** vitest unit tests (61), jsdom for DOM parsing (needed polyfills like `NodeFilter` and `innerText` in the recall harness).
- **Publishing:** a developer account (one-time fee) → upload the zip → store listing (description, screenshots, category) → privacy tab (data use, permission justifications) → **review** (hours to days; longer with broad permissions) → published.
- **Updates:** bump `version` in the manifest → build → upload the new zip → submit → review → **auto-update** reaches users. *(Your releases: v0.5.1 published 18 Nov 2026; v0.5.2, v0.6.0, v0.6.1 followed: matching robustness, ~300 reviews, a "Report it" button.)*
- **Backend config per build:** `VITE_BACKEND_URL` at build time (the local vs Render backend).

## 9. Security considerations

- Content scripts run alongside **untrusted pages**: never `innerHTML` untrusted strings into your UI (XSS); sanitise.
- **Scraped text is untrusted for the LLM too** (prompt injection; file 21).
- Don't embed secrets in the extension (anyone can unzip it). Your design: the extension gets a **per-install HMAC token** from the backend; the **OpenAI key stays on the server**.
- Validate every message and response.

## 10. Mobile?
Chrome on Android/iOS doesn't support extensions. Options: a mobile app with a share-sheet ("share product link to app"), a PWA, a Telegram/WhatsApp bot that takes a product link, or browsers that do support extensions on Android. *(You discussed this; it's a good "how would you extend it" answer.)*

## 11. Extension code, piece by piece (TypeScript)

**Content script: extract data from the page and answer messages:**

```ts
// content.ts
type Product = { title: string; price: number | null; model?: string };

function readJsonLd(): any | null {
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { const data = JSON.parse(s.textContent || ''); if (data['@type'] === 'Product') return data; } catch {}
  }
  return null;
}
function extractProduct(): Product {
  const ld = readJsonLd();
  const title = ld?.name ?? document.querySelector('h1')?.textContent?.trim() ?? '';
  const price = ld?.offers?.price ? Number(ld.offers.price) : null;
  return { title, price };
}
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PRODUCT') sendResponse(extractProduct());
  return true;                              // keep the channel open if responding asynchronously
});
```

**Side panel: ask the active tab's content script, then call the backend:**

```ts
// sidepanel/api.ts (simplified)
async function getProductFromTab(): Promise<Product> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.tabs.sendMessage(tab.id!, { type: 'GET_PRODUCT' });
}
async function apiFetch(path: string, body: unknown) {
  const { token } = await chrome.storage.local.get('token');
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) { await registerInstall(); return apiFetch(path, body); }  // re-register, retry once
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}
```

**Service worker: open the side panel, schedule price checks, notify:**

```ts
// background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('price-check', { delayInMinutes: 1, periodInMinutes: 360 });   // (your real code uses a configured interval)
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'price-check') return;
  const { watchlist = [] } = await chrome.storage.local.get('watchlist');
  for (const item of watchlist) {
    const html = await (await fetch(item.url)).text();
    const price = await parseInOffscreen(html);                          // the service worker has no DOM
    if (price !== null && price < item.lastPrice) {
      chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon128.png',
        title: 'Price drop', message: `${item.title}: ₹${price}` });
    }
  }
});

async function parseInOffscreen(html: string): Promise<number | null> {
  const existing = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  if (existing.length === 0) {                                          // only one offscreen document may exist
    await chrome.offscreen.createDocument({ url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER], justification: 'Parse product HTML for price checks' });
  }
  return chrome.runtime.sendMessage({ type: 'PARSE_PRICE', html });
}
```

**Offscreen document: parse HTML with DOMParser:**

```ts
// offscreen.ts
chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg.type !== 'PARSE_PRICE') return;
  const doc = new DOMParser().parseFromString(msg.html, 'text/html');
  sendResponse(extractPriceFrom(doc));
});
```

## 12. Other extension surfaces and manifest fields

- **Popup** (`action.default_popup`): a small UI when you click the toolbar icon (closes when it loses focus).
- **Options page** (`options_page` / `options_ui`): settings.
- **DevTools pages** (`devtools_page`): add panels to Chrome DevTools.
- **Context menus** (`chrome.contextMenus`), **keyboard shortcuts** (`commands`), **omnibox** keyword.
- **`web_accessible_resources`:** files the web page itself is allowed to load from your extension (keep this minimal: it can be used for fingerprinting).
- **`chrome.scripting.executeScript`:** inject scripts on demand (requires the `scripting` permission + host access) instead of always-on content scripts.
- **`declarativeNetRequest`:** rule-based request blocking/modification (ad blockers in MV3).
- **i18n:** `_locales/<lang>/messages.json` + `chrome.i18n.getMessage`.
- **`externally_connectable`:** let specific websites message your extension.

## 13. Debugging and testing

- `chrome://extensions` → Developer mode → **Inspect views: service worker** (its console and network), "Errors" button, the reload icon after rebuilding.
- Content-script logs appear in the **web page's** DevTools console (select the extension's context in the console dropdown).
- The side panel/popup: right-click → Inspect.
- **Unit tests** (vitest + jsdom) for parsers with saved HTML fixtures; **end-to-end tests** with Puppeteer/Playwright launching Chrome with the unpacked extension loaded; your **recall harness** runs the real pipeline against live pages.
- Common errors: "Could not establish connection. Receiving end does not exist" (the content script isn't injected on that tab yet, e.g. the page was open before install → reload the tab or inject with `chrome.scripting`), "Extension context invalidated" (the extension was reloaded while the page's old content script was still running).

## 14. Chrome Web Store policies to know
Single purpose (one clear purpose per extension), minimum permissions, a privacy policy + accurate data disclosures, no remotely hosted code, no deceptive behaviour, user data handled per the **Limited Use** policy (only for the extension's user-facing features). Rejections usually cite overbroad permissions, missing justifications or an unclear purpose.

## Interview Q&A

**Q: What's the difference between a content script and a service worker?** The page context with DOM access vs the background event handler with extension APIs and no DOM.
**Q: Why an offscreen document?** MV3 service workers have no DOM; parsing fetched HTML for background price checks needs `DOMParser`.
**Q: How do you keep state in MV3 when the worker sleeps?** `chrome.storage` + alarms; no reliance on globals.
**Q: How do you handle sites changing their HTML?** Structured data first, layered fallbacks, fixture tests, live recall tests, monitoring, fast updates.
**Q: How do you protect your API key?** It never ships in the extension; per-install tokens + server-side limits and budgets.
**Q: Why an extension rather than a website?** It works on the page the user is already viewing, in their session, with no server-side scraping, and personal data stays local.

## Quick revision

- MV3: service worker (sleeps, no DOM), content scripts (isolated world), side panel/popup, offscreen documents, no remote code.
- Messaging, `chrome.storage` (local/sync/session), `chrome.alarms`.
- Least-privilege host permissions; privacy policy; review process; version bump → upload → review → auto-update.
- Scraping lessons: JSON-LD/`__INITIAL_STATE__` first, SPA staleness, Amazon pagination token, robot-check surfacing, dedupe by review ID, emoji-safe truncation.
- Security: no secrets in the extension, sanitise DOM, untrusted text for the LLM.
