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

No Three.js, GSAP, Rive, smooth-scroll library or marketing analytics vendor was added. CSS renders the living field and topological core.

## Public environment

```text
VITE_WEBSUMMIT_API_URL=https://websummit-leads.example.up.railway.app
```

No database URL or provider secret is allowed in a `VITE_` variable.

## Analytics contract

The feature dispatches `sentinela:analytics` `CustomEvent` messages. A future vendor adapter can subscribe without changing interaction components.

## Accessibility and degradation

- Native semantics and keyboard navigation.
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
