(function () {
  if (window.__asynchads_initialized) return;
  window.__asynchads_initialized = true;

  const firedImpressionIds = new Set();
  const engineOrigin = "https://cdn.asynchads.com";

  function sendTrackingBeacon(url, payload) {
    let trackingUrl;
    let body = payload;
    try {
      trackingUrl = new URL(url);
      if (!body) {
        body = {
          p: trackingUrl.searchParams.get("pub_id"),
          c: trackingUrl.searchParams.get("campaign_id"),
          n: trackingUrl.searchParams.get("nonce"),
          s: trackingUrl.searchParams.get("sig"),
          t: trackingUrl.searchParams.get("ts")
        };
      }
    } catch (error) {
      console.warn("AsynchAds: invalid tracking URL.", error);
      return;
    }

    if (!["/a", "/v", "/api/v1/telemetry/action", "/api/v1/telemetry/view"].includes(trackingUrl.pathname) ||
        !body || !body.p || !body.c || !body.n || !body.s || !body.t) {
      console.warn("AsynchAds: tracking request is missing required parameters.");
      return;
    }

    const endpoint = `${engineOrigin}${trackingUrl.pathname}`;
    const requestBody = new Blob([JSON.stringify(body)], { type: "application/json" });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, requestBody)) return;
    } catch (error) {
      console.warn("AsynchAds: sendBeacon failed; falling back to fetch.", error);
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      keepalive: true,
      referrerPolicy: "strict-origin-when-cross-origin"
    }).catch(error => {
      console.warn("AsynchAds: tracking request failed.", error);
    });
  }

  function getExcludedCampaigns(maxPerDay = 3) {
    try {
      const raw = localStorage.getItem('_a_freq');
      const ledger = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const day = 86400000;

      return Object.keys(ledger).filter(cmpId => {
        return (now - ledger[cmpId].ts < day) && ledger[cmpId].count >= maxPerDay;
      });
    } catch (e) { return []; }
  }

  function recordImpression(campaignId) {
    try {
      if (!campaignId || campaignId === 'house_ad') return;
      const raw = localStorage.getItem('_a_freq');
      const ledger = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const current = ledger[campaignId] || { count: 0, ts: now };

      ledger[campaignId] = { count: current.count + 1, ts: now };
      localStorage.setItem('_a_freq', JSON.stringify(ledger));
    } catch (e) {}
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch (e) {
      return "";
    }
  }

  function hydrateComponent() {
    const selector = "#AA-container:not([data-loaded])";
    document.querySelectorAll(selector).forEach(container => {
      const pubId = container.getAttribute("data-asynch-id") || container.getAttribute("data-pub-id");
      const format = container.getAttribute("data-asynch-format") || container.getAttribute("data-format") || "card";
      if (!pubId) return;

      container.setAttribute("data-loaded", "true");

      if (!document.getElementById("asynchads-css")) {
        const linkElem = document.createElement("link");
        linkElem.id = "asynchads-css";
        linkElem.rel = "stylesheet";
        linkElem.href = `${engineOrigin}/styles.css`;
        linkElem.referrerPolicy = "strict-origin-when-cross-origin";
        document.head.appendChild(linkElem);
      }

      const excluded = getExcludedCampaigns(3);
      const excludeParam = excluded.length ? `&exclude=${encodeURIComponent(excluded.join(','))}` : '';

      fetch(`${engineOrigin}/v1/cdn/render?pub_id=${encodeURIComponent(pubId)}&format=${encodeURIComponent(format)}${excludeParam}`, {
        referrerPolicy: "strict-origin-when-cross-origin"
      })
        .then(res => res.status === 200 ? res.json() : null)
        .then(ad => {
          if (!ad) {
            container.style.display = "none";
            return;
          }

          const campaignUrl = safeHttpUrl(ad.clickUrl);
          const destinationUrl = safeHttpUrl(ad.destinationUrl);
          const imageUrl = safeHttpUrl(ad.image);
          if (!imageUrl || !destinationUrl) {
            container.style.display = "none";
            return;
          }
          const attribution = (className, label) => {
            const linkElem = document.createElement("a");
            linkElem.href = "https://asynchads.com/#advertisers";
            linkElem.target = "_blank";
            linkElem.rel = "noopener";
            linkElem.className = className;

            if (label) {
              linkElem.append(document.createTextNode(label));
            }

            const openingBracket = document.createElement("span");
            openingBracket.className = "brand-bracket";
            openingBracket.textContent = "<";
            const brandName = document.createElement("span");
            brandName.className = "brand-asynch";
            brandName.textContent = "Asynch";
            const closingBracket = document.createElement("span");
            closingBracket.className = "brand-bracket";
            closingBracket.textContent = ">";
            linkElem.append(openingBracket, brandName, closingBracket);

            return linkElem;
          };

          const image = (src, alt, className) => {
            const element = document.createElement("img");
            element.src = safeHttpUrl(src) || imageUrl;
            element.alt = alt || "";
            element.className = className;
            return element;
          };

          const link = className => {
            const element = document.createElement("a");
            element.href = destinationUrl;
            element.target = "_blank";
            element.rel = "noopener sponsored nofollow";
            element.referrerPolicy = "no-referrer";
            element.className = className;

            element.addEventListener("click", () => handleUserInteraction(campaignUrl, ad.clickPayload));

            return element;
          };

          function handleUserInteraction(url, payload) {
            if (url) sendTrackingBeacon(url, payload);
          }

          let rendered;
          if (format === "card") {
            rendered = document.createElement("div");
            rendered.className = "ui-content-card";
            const sponsored = document.createElement("span");
            sponsored.className = "ui-content-sponsored";
            sponsored.textContent = "SPONSORED";
            const campaignLink = link("ui-content-link");
            campaignLink.setAttribute("aria-label", `Sponsored: ${ad.title || "advertisement"}`);
            campaignLink.append(image(ad.image, ad.title, "ui-content-image"));
            const content = document.createElement("div");
            content.className = "ui-content-body";
            const title = document.createElement("span");
            title.className = "ui-content-title";
            title.textContent = ad.title || "";
            const description = document.createElement("p");
            description.className = "ui-content-description";
            description.textContent = ad.description || "";
            content.append(title, description);
            campaignLink.append(content);
            rendered.append(sponsored, campaignLink, attribution("ui-content-attribution", "Ads by "));
          } else if (format === "inline") {
            rendered = document.createElement("div");
            rendered.className = "ui-content-inline";
            const campaignLink = link("ui-content-inline-link");
            const badge = document.createElement("span");
            badge.className = "badge-promoted";
            badge.textContent = "Sponsor";
            const text = document.createElement("span");
            text.className = "ui-content-inline-body";
            const title = document.createElement("span");
            title.className = "ui-content-title ui-content-inline-title";
            title.textContent = ad.title || "";
            const description = document.createElement("span");
            description.className = "ui-content-description";
            description.textContent = ad.description ? ` — ${ad.description}` : "";
            text.append(title, description);
            campaignLink.setAttribute("aria-label", `Sponsored: ${ad.title || "advertisement"}`);
            campaignLink.append(badge, image(ad.image, ad.title, "ui-content-inline-image"), text);
            rendered.append(campaignLink, attribution("ui-content-attribution-sm", ""));
          } else if (format === "banner") {
            rendered = document.createElement("div");
            rendered.className = "ui-content-banner";
            const campaignLink = link("ui-content-graphic-box");
            const picture = document.createElement("picture");
            const source = document.createElement("source");
            source.srcset = safeHttpUrl(ad.mobileImg) || imageUrl;
            source.media = "(max-width: 480px)";
            picture.append(source, image(ad.desktopImg || ad.image, ad.title, "ui-content-graphic"));
            campaignLink.append(picture);
            rendered.append(campaignLink, attribution("ui-content-attribution", "Ads by "));
          } else {
            container.style.display = "none";
            return;
          }
          container.replaceChildren(rendered);

          if (ad.impressionBeacon) {
            const fireImpression = () => logViewMetric(ad);

            if ("IntersectionObserver" in window) {
              const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    fireImpression();
                    observer.disconnect();
                  }
                });
              }, { threshold: 0.01 });

              observer.observe(container);
            } else {
              fireImpression();
            }
          }
        })
        .catch(() => {
          container.style.display = "none";
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateComponent);
  } else {
    hydrateComponent();
  }

  function logViewMetric(ad) {
    const impressionId = ad.impressionId || (ad.impressionPayload && ad.impressionPayload.n) || ad.impressionBeacon;
    if (firedImpressionIds.has(impressionId)) return;
    firedImpressionIds.add(impressionId);
    if (ad.campaignId) recordImpression(ad.campaignId);
    sendTrackingBeacon(ad.impressionBeacon, ad.impressionPayload);
  }

  window.AsynchAdsInit = hydrateComponent;
  window.hydrateComponent = hydrateComponent;
})();