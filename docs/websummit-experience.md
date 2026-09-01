# Sentinela Web Summit Lisbon 2026

## Frontend boundary

The public route `/websummit` is lazy-loaded and entirely contained in `src/features/websummit`.
Direct event visits use a lightweight branch in `src/main.tsx`, so product providers, authentication
and the dashboard router are not downloaded before the event experience can paint. Normal product
routes retain their existing provider and router bootstrap.

```text
components/   visual and semantic composition
experience/   provider contracts, scenarios and fallback
hooks/        state machine, pointer field, metadata and UTM parsing
api/          lead transport and validation
analytics/    vendor-neutral event contract
content/      English copy
styles/       event-scoped tokens, core, layout and responsive states
```

## Dependency

- `motion`: state transitions, trace reveals and viewport entry choreography. It is isolated in the lazy Web Summit chunk and does not increase the initial product route bundle.

No Three.js, GSAP, Rive, smooth-scroll library or marketing analytics vendor was added. A small event-only Canvas 2D renderer draws the living decision field without touching React state on animation frames. CSS provides the material surface and the reduced-motion fallback.

## Visual direction

The public event narrative uses only the **Sentinela** name. Internal product names are deliberately absent from this first-contact experience.

The visual centerpiece is a field that changes its coherence, energy, speed and spread with the real experience state:

```text
ready -> listening -> understanding -> deciding -> responding -> complete
```

Pointer movement bends the field with a low-amplitude response. The page-level parallax system adds four independent depth planes: distant ambient matter, narrative typography, interface content and the living field. Pointer values are smoothed outside React's render cycle; scroll depth is driven by Motion values. Mobile keeps scroll-based depth but removes the 3D pointer tilt, uses fewer canvas loops and segments, caps device pixel ratio and shortens the visual stage so the prompt remains visible in the first viewport. Reduced-motion users receive a composed static frame with all parallax removed.

## Public environment

```text
VITE_WEBSUMMIT_API_URL=https://websummit-leads.example.up.railway.app
```

No database URL or provider secret is allowed in a `VITE_` variable.

## Analytics contract

The feature dispatches `sentinela:analytics` `CustomEvent` messages. A future vendor adapter can subscribe without changing interaction components.

## Accessibility and degradation

- Native semantics and keyboard navigation.
- Prompt composer expands with multiline input up to 176 px, then preserves the layout with internal scrolling.
- Native dialog with Escape handling and focus management.
- Range input supports pointer, touch and keyboard.
- `prefers-reduced-motion` keeps a composed static system.
- API failures preserve user input and the prompt experience falls back locally.

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

The 2026-09-01 living-field revision kept the Web Summit route isolated and added no dependency. The subsequent spatial-parallax revision produced a 54.33 kB gzip JavaScript chunk plus 5.25 kB gzip event CSS. Local production-preview validation covered 1440 x 900 desktop and 390 x 844 mobile, verified independently moving depth planes, found no horizontal overflow and kept the prompt visible in the first mobile viewport.
