# Security Policy

## Reporting a Vulnerability

We encourage developers, open-source maintainers, and security researchers to audit `content.js`. 

If you discover a security vulnerability (such as an XSS vector, open redirect, or privacy leak), **please do not open a public GitHub issue**. Instead, report it privately so we can patch it before public disclosure:

- **GitHub:** Open a private report via the **Security** tab (**Report a vulnerability**).
- **Email:** Send details and reproduction steps to `salman@asynchads.com`.

We aim to acknowledge reports within **48 hours** and release a fix as quickly as possible.

## Scope & Security Guarantees

This repository covers the client-side loader (`content.js`). Any changes or reported issues are evaluated against our core client-side rules:
- **Zero `innerHTML`:** All DOM elements must be constructed safely using `document.createElement` and `textContent`.
- **HTTPS-Only:** All external images, destination links, and beacon URLs must enforce `https://`.
- **Zero Tracking Cookies:** No cookies or cross-site fingerprinting identifiers may be introduced.
