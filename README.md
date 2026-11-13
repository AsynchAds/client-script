# AsynchAds Client Script (`content.js`)

The lightweight, zero-cookie client-side script used to render contextual sponsorships on publisher websites. 

We keep our client script open-source so developers, open-source maintainers, and security teams can inspect every line of code before adding it to their sites.

## Security & Privacy Guarantees

* **Zero Cookies & No Fingerprinting:** Does not set tracking cookies or collect personal user data. Frequency capping uses a simple local campaign counter in `localStorage` (`_a_freq`).
* **XSS-Safe DOM Rendering:** Builds all ad containers strictly using `document.createElement` and `textContent`—never `innerHTML`.
* **Strict HTTPS Enforcement:** Validates all destination URLs, tracking beacons, and image assets to ensure they use `https://` before rendering.
* **Lightweight & Non-Blocking:** Loads asynchronously (`async`) with zero external dependencies (~5KB unminified) so it never blocks page rendering or hurts Core Web Vitals.
* **True Viewability:** Uses the native browser `IntersectionObserver` API to record an impression only when the ad container enters the viewport.

## Quick Integration

Add a container element where you want the sponsorship to appear, followed by the async script tag:

```html
<div id="AA-container" data-pub-id="YOUR_PUBLISHER_ID" data-format="card"></div>
<script src="https://asynchads.com" async></script>
```

### Supported Formats (`data-format`)
* `card` — Standard sidebar or footer card with image, title, and description.
* `inline` — Compact single-row text and icon placement for documentation or blog posts.
* `banner` — Responsive banner layout with mobile and desktop image support.

## Architecture Overview

1. **Hydration:** On `DOMContentLoaded` (or immediately if the DOM is ready), the script locates `#AA-container` and injects the base stylesheet (`styles.css`).
2. **Contextual Fetch:** Requests an active campaign from `https://asynchads.com` using only the `pub_id`, `format`, and locally excluded campaign IDs.
3. **Telemetry:** Uses `navigator.sendBeacon` (with a `fetch` `keepalive` fallback) to record verified views and clicks without slowing down outbound navigation.

## License

MIT License — free to inspect, audit, and use with your AsynchAds publisher account.
