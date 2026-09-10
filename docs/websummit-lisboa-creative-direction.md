# Web Summit Lisboa 2026: creative direction

## Design read

An international event experience for business and technology leaders. It should feel spatial, cinematic and precise, with the restraint of a product interface and the presence of a living system.

Design dials:

- Design variance: 9/10
- Motion intensity: 8/10
- Visual density: 3/10

## What the references contributed

The references were inspected with SkillUI Ultra Mode using ten-page crawls and seven-point scroll captures. The generated artifacts remain local under `design-references/` and are intentionally excluded from version control.

### Lusion: Devin AI

Absorb:

- fascination before explanation;
- one dominant visual event at a time;
- complex technology translated through progressive disclosure;
- large spatial pauses that make interaction feel consequential.

Do not copy its dark frame, product imagery, project layout, typography or specific WebGL scenes.

### Lusion: Atlas Motion

Absorb:

- motion that communicates mechanical intent;
- objects reacting to state and environment;
- confident pacing and physical continuity.

Do not copy industrial imagery, joint mechanics, layout or transitions.

### Lusion: Synthetic Human

Absorb:

- procedural movement that never feels fully dormant;
- structures acquiring behavior through transformation;
- depth created by layers rather than decoration.

Do not copy human forms, purple palette, characters or campaign assets.

### Lusion: Zero Tech

Absorb:

- a visual object that persists across chapters;
- scroll as a continuous change of state;
- particles used to express information flow.

Do not copy its particle tunnel, blue field, scene geometry or scroll choreography.

### Linear

Absorb:

- typographic discipline;
- low visual noise;
- clear hierarchy and compact interaction feedback;
- consistent spacing and restrained surfaces.

Do not copy its product UI, violet accent, black palette, layouts or type assets.

## Chosen visual language

The Lisboa experience uses a mineral-light canvas instead of the current black and blue field.

- Background: cool pearl and soft mineral gray.
- Primary ink: graphite.
- Accent: electric chartreuse, used only when Sentinela is acting.
- Surfaces: mostly flat, with thin graphite boundaries and controlled translucency.
- Radius rule: 18px surfaces, pill actions, rounded inputs.
- Depth: opacity, scale and refraction. No generic outer glow.

The page has one light theme. Dark sections and mid-page theme switching are intentionally avoided.

## Typography

The experience uses `Arial`/system sans as an immediate, zero-network display and body foundation, with `ui-monospace` for operational evidence. The expressive quality comes from scale, weight, tracking and composition rather than a remote font dependency. This avoids layout shift and protects the QR-code experience on event Wi-Fi.

## Living-system concept

The visual memory is a decision membrane.

- Idle: one quiet displacement line. Sentinela has not awakened.
- Receiving: a request enters as a compact pulse.
- Understanding: the pulse fans into a structured field.
- Evaluating: particles test multiple routes.
- Deciding: the field converges around one viable path.
- Controlling: irrelevant context compresses and risky routes close.
- Responding: a clean signal exits the field.
- Resting: the structure loosens without disappearing.

The implementation uses Canvas 2D. It produces the required procedural behavior with a smaller runtime and broader device support than a Three.js scene. The canvas is isolated, lazy-mounted only after interaction and backed by a static CSS composition when unavailable or when reduced motion is requested.

## Narrative structure

1. A minimal prompt-first hero.
2. The awakened system and its decision evidence.
3. The tension: every AI request is already a business decision.
4. One control layer, shown across past evidence and present execution.
5. One request, two realities, explicitly marked as an illustrative simulation.
6. A continuous path from observation to control.
7. A Lisbon conversation and lead capture.

The page avoids a generic feature grid. Quality, cost, risk and control are woven into the persistent field and the comparison scene.

## Motion strategy

- State-driven animation for the interactive demo.
- Pointer influence at low amplitude using refs and CSS variables, never React render state.
- Intersection Observer and Motion for chapter reveals.
- Native scrolling with no scroll hijacking.
- Transform and opacity only for DOM animation.
- A refined reduced-motion mode using static state changes and fades.

Every effect has a semantic role: convergence means decision, compression means context reduction, divergence means route choice, interruption means control, and emission means response.

## Dependencies

- `motion` already exists and remains the DOM animation layer.
- SkillUI was installed as a global design-inspection tool and leaves no production or repository dependency.
- The repository's existing `@playwright/test` dependency remains the visual-validation foundation.
- No 3D runtime was added. Canvas 2D is sufficient and avoids event-route bundle weight.

## Product and service boundaries

- `WebSummitLisboaPage` only composes scenes.
- `experience/` owns the provider contract, resilient remote adapter and local illustrative fallback.
- `hooks/useExperienceMachine` owns state progression, cancellation and stale-run fencing.
- `LivingSystem` owns the procedural canvas and receives state as data.
- `analytics/` emits vendor-neutral browser events without prompt contents.
- `LeadCaptureDialog` calls the existing isolated Web Summit lead API with source
  `websummit_lisboa_2026`.
- The existing `/websummit` feature is not imported or modified by this experience.

The lead service accepts both event sources. Its second migration scopes deduplication by normalized
email plus source, so one contact can intentionally join both event lists without producing duplicates
inside either list. Public prompt text is not sent to the lead endpoint or persisted in PostgreSQL.

## Performance risks and controls

- Continuous canvas work: capped device pixel ratio, reduced particle count on mobile, pause outside the viewport and stop in reduced-motion mode.
- Event Wi-Fi: headline and input render before the visual engine; no remote font or video dependency.
- Main bundle contamination: the route has a dedicated dynamic import and scoped styles.
- Mobile heat and battery: lower node count and frame-rate adaptation.
- API latency: the visual state machine advances independently and the existing fallback provider preserves the demo.

## UX heuristic baseline

Initial target: 10/10.

- Site, proposition and primary action are visible immediately.
- The hero asks for one action and explains privacy beside it.
- System status is expressed in text as well as motion.
- Results expose operational evidence without revealing chain-of-thought.
- Failure preserves the prompt and offers a direct retry.
- Trace is absent before interaction and linked to the execution afterward.
- Lead input is preserved on API failure and consent is explicit.
- Keyboard, focus, touch and reduced-motion paths remain first-class.
