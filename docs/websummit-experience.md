# Sentinela public experience and Web Summit Lisbon 2026

## Frontend boundary

The official public route `/` and the event route `/websummit` share one implementation in
`src/features/public-experience`. Both direct entries use a lightweight branch in `src/main.tsx`, so
product providers, authentication and the dashboard router are not downloaded before the public
experience can paint. Normal product routes retain their existing provider and router bootstrap.

`PublicExperiencePage` receives an explicit variant:

- `official`: permanent Sentinela narrative, product registration CTA and sign-in access.
- `websummit`: the same product truth with the Lisbon-specific lead conversion.

This keeps the event campaign available without allowing it to become a second, drifting landing page.

```text
components/   visual and semantic composition
experience/   provider contracts, scenarios and fallback
hooks/        state machine, pointer field, metadata and UTM parsing
api/          lead transport and validation
analytics/    vendor-neutral event contract
content/      PT-BR and English product copy
styles/       public-experience-scoped tokens, core, layout and responsive states
```

## Dependency

- `motion`: state transitions, trace reveals and viewport entry choreography. It is isolated in the public experience chunk and does not increase the initial authenticated product route bundle.

No Three.js, GSAP, Rive, smooth-scroll library or marketing analytics vendor was added. The centerpiece is an event-only semantic SVG and CSS decision field. It communicates the product contract directly and avoids a continuous JavaScript rendering loop.

## Visual direction

The public narrative uses only the **Sentinela** name. Internal product names are deliberately absent from this first-contact experience.

The visual centerpiece appears only after the visitor receives an answer. The initial hero stays focused on the Ask interaction; the completed response then reveals how a request entered Sentinela, how four decision signals converged (`intent`, `risk`, `context`, `cost`) and which controlled route left the system. A short playback moves through understand, decide, control and respond. Signal receipts use the decision's actual risk, context strategy and route instead of repeating generic labels. The field then settles into a slow semantic sweep with information packets, preserving ambient life without competing with the initial action:

```text
ready -> listening -> understanding -> deciding -> responding -> complete
```

The page-level parallax system adds four independent depth planes: distant ambient matter, narrative typography, interface content and the decision field. Pointer values are smoothed outside React's render cycle; scroll depth is driven by Motion values. Mobile keeps scroll-based depth but removes the 3D pointer tilt and shortens the visual stage so the prompt remains visible in the first viewport. Reduced-motion users receive the same decision model as a composed static frame.

Desktop narrative sections use a capped spatial rhythm rather than stacking full-viewport scenes. The hero remains a deliberate stage, while the reveal, system, economics, comparison and final CTA use content-led heights and bounded vertical padding. This preserves cinematic whitespace without creating empty scroll zones on 1280 px to 1920 px displays.

The narrative follows the pitch deck's customer-service positioning without reproducing slide copy. It first lets the visitor experience a controlled decision, then names the tension between lower operating cost and higher customer expectations. Sentinela is introduced as the steering system between the customer-service stack and its models. The operating loop is expressed as observe, decide, control and improve; the economic scene then explains bypass, context reduction and model routing before the permanent product CTA or the Lisbon meeting request.

## Language contract

English is the initial language for `/websummit`. The official route follows a previously saved choice,
then the browser language. Visitors can switch between `PT-BR` and `EN` in the public header. The
selection updates copy, demo responses, validation, accessibility labels and page metadata without
changing routes. The preference is stored only in local browser storage.

Public claims distinguish cost from token consumption. The current proof point is an early deployment result of approximately 40% lower token consumption within 60 days. It is not presented as guaranteed cost savings, and the page states that results depend on workload, providers, policies and deployment configuration.

## Public environment

```text
VITE_WEBSUMMIT_API_URL=https://websummit-leads.example.up.railway.app
```

No database URL or provider secret is allowed in a `VITE_` variable.

## Analytics contract

The feature dispatches `sentinela:analytics` `CustomEvent` messages. Official interactions use the
`sentinela_public_*` namespace; the event variant preserves the `websummit_*` namespace. A future
vendor adapter can subscribe without changing interaction components.

## Accessibility and degradation

- Native semantics and keyboard navigation.
- Prompt composer expands with multiline input up to 176 px, then preserves the layout with internal scrolling.
- Native dialog with Escape handling and focus management.
- Range input supports pointer, touch and keyboard.
- `prefers-reduced-motion` keeps a composed static system.
- API failures preserve user input and the prompt experience falls back locally.
- The decision trace reveals automatically after the response, preserving the full explanatory payoff without requiring a second user action.

## Performance baseline

Production-preview Lighthouse on 2026-09-01:

- Performance: 96
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- FCP: 1.5 s
- LCP: 2.3 s
- CLS: 0
- TBT: 150 ms

The 2026-09-01 living-field revision kept the Web Summit route isolated and added no dependency. The subsequent spatial-parallax revision produced a 54.33 kB gzip JavaScript chunk plus 5.25 kB gzip event CSS. The post-answer decision reveal remains dependency-free. Its production bundle is 55.33 kB gzip JavaScript plus 7.55 kB gzip event CSS.
