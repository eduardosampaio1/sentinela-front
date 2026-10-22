# Portfolio home — review in homol

Owner direction: evolve the main Sentinela home from the Web Summit visual language, represent all products, publish to homol before production approval.

## Scope

- `PublicExperiencePage` renders the new home for the official variant. Existing public locale preference and product authentication boundaries remain in place.
- Three direct products: AI Observability by Sentinela, AI Control by Sentinela, Brand Radar by Sentinela. AI Assessment is an offer; Sentinela Review is contextual investigation.
- Portuguese and English copy, chapter navigation, contextual product contact links, account registration and accessible comparison buttons.
- SVG diagrams are labeled as illustrative, with no fabricated customer metrics. The AI Control demo reuses the existing remote/fallback provider and exposes its evidence trace and illustrative state.
- Marketing exception explicitly authorized: Archivo Black / Manrope / IBM Plex Mono, mineral paper, mint, chartreuse and contrasting chapters. Product design tokens are unchanged.
- Home metadata is emitted in initial server HTML; event metadata remains separate.

## Contact and capture boundaries

Product and assessment contact buttons open the existing public contact email `hello@sentinela.ai` with the relevant subject. These are email links, not database lead capture. Account creation continues at `/register`.

The Web Summit lead form, API, offer and source attribution are unchanged. This release does not reuse event source labels for home contacts and does not extend the event-only free offer to the home.

## Deploy boundary

Branch `feat/home-websummit-20261022`, based on main `437de80`. Upload the reviewed snapshot only to project `79b1c0a1-13a6-4bd4-b377-548ffcb0db72`, environment homol `b058ee56-068b-4d8d-9dd2-338c2e5085b0`, front service `3d551307-087c-4d34-ac5f-1470dea14f2d` (global name front-prod; public homol domain front-homol-homol.up.railway.app). Do not push main/develop or change the production environment before owner approval.

Before promoting, incorporate this branch into the chosen source branch. A future homol source redeploy of unchanged main would otherwise restore the old home.
