# Portfolio home — review in homol

Owner direction: evolve the main Sentinela home from the Web Summit visual language, represent all products, publish to homol before production approval.

## Scope

- `PublicExperiencePage` renders the new home for the official variant. Existing public locale preference and product authentication boundaries remain in place.
- Three direct products: AI Observability, AI Control, Brand Radar. The owner explicitly requested removing the attribution suffix on Sentinela’s own home; this is a local naming exception, not a global Brand OS change. AI Assessment is an offer; Sentinela Review is contextual investigation.
- Portuguese and English copy, chapter navigation, contextual product contact links, account registration and accessible comparison buttons.
- SVG diagrams are labeled as illustrative, with no fabricated customer metrics. The AI Control demo reuses the existing remote/fallback provider and exposes its evidence trace and illustrative state.
- Marketing exception explicitly authorized: Archivo Black / Manrope / IBM Plex Mono, mineral paper and contrasting chapters. Owner's review restored Signal Purple `#7C3AED` as the accent; primary actions use white text. Product design tokens are unchanged.
- AI Control illustrates the request passing through a policy check and the authorized route. Brand Radar illustrates scanning and discovering signals. Animations pause offscreen and become static with reduced motion. They do not represent live customer telemetry.
- Transparent purple canonical mark and versioned SVG/ICO favicon assets replace the framed legacy favicon, avoiding its long-lived browser cache.
- Home metadata is emitted in initial server HTML; event metadata remains separate.

## Contact and capture boundaries

Product and assessment buttons open a native accessible dialog. Work email and at least one product are required; Name and Company are optional. “All products” selects the three products. Product-specific CTAs preselect their product. PT/EN copy includes the privacy notice at submission, with no Role field or consent checkbox. Account creation continues at `/register`.

The form posts to `/api/website/leads` on the existing public API origin (`VITE_WEBSUMMIT_API_URL`). API feature branch: `feat/website-leads-20261022`, based on the deployed event-offer branch `2175d64`. Deploy API before front, homol only. Migration `003_website_leads.sql` creates `website_leads` in the existing homol PostgreSQL database, separately from event leads. It stores email/name/company, selected product identifiers, locale, source `sentinela_home`, consent, attribution and confirmation status.

Confirmation reuses the configured Resend sender **Sentinela <no-reply@sentinelahq.com>**, verified in homol. `WEBSITE_PUBLIC_URL` points to the homol frontend. Confirmation HTML escapes visitor input. PostgreSQL stores pending mail before sending; background dispatch plus a periodic 60-second worker retry transient failures. A per-request provider idempotency key and PostgreSQL row locks prevent duplicate sends. Retry stops before the provider’s 24-hour key expiry; `needs_review` identifies exhausted requests. `sent` means the provider accepted the message, not a read receipt or proof of inbox placement.

Client retries reuse the request UUID for unchanged data. Reusing it with different data returns 409. An unavailable database returns an error and preserves form inputs; the UI only claims registration after an API success. Validation, origin checks, honeypot and rate limits protect capture. Export requires the existing admin Bearer token at `GET /api/website/leads/export.csv`, with formula injection protection and no-store headers. In Railway, view leads in homol → Postgres-VZVD → Data → `website_leads`. Keep tokens server-side.

The Web Summit lead form, API, offer and source attribution are unchanged. This release does not reuse event source labels for home contacts and does not extend the event-only free offer to the home.

## Deploy boundary

Branch `feat/home-websummit-20261022`, based on main `437de80`. Upload the reviewed snapshot only to project `79b1c0a1-13a6-4bd4-b377-548ffcb0db72`, environment homol `b058ee56-068b-4d8d-9dd2-338c2e5085b0`, front service `3d551307-087c-4d34-ac5f-1470dea14f2d` (global name front-prod; public homol domain front-homol-homol.up.railway.app). Do not push main/develop or change the production environment before owner approval.

Before promoting, incorporate this branch into the chosen source branch. A future homol source redeploy of unchanged main would otherwise restore the old home.
