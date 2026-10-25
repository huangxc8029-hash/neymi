# v1.2 Card and Website Visual Restoration

## Decision

Restore the visual language and interaction model described by the historical v1.2 PRD while preserving the current v1.3 product journeys, privacy rules, six free templates, and AI entry points.

## Card experience

- Keep the horizontal 5:3 canvas, upper-left Neymi identity, and name/company/role grouping. Photo, logo, and QR remain optional.
- Show card modules on the front as irregular, differently sized translucent tiles containing only each module title.
- Selecting a tile opens its content inside the card. Every displayed value has a copy control; a small back control returns to the tile surface. Escape returns to the tile that was opened.
- Keep all user data already projected to a public card as its only source. Public cards cannot inspect local profile or encrypted contact storage.
- Implement three selectable modes: Floating Glass (soft rise/blur/scale), Piano Keys (staggered tile movement), and Orbit Reveal (circular reveal at the chosen tile). Reduced-motion preference disables nonessential movement.
- Keep responsive layouts, keyboard access, visible focus, and status announcements for clipboard actions.

## Website experience

- Give the home composer, preview, assistant link, prepared-card routes, activity preparation, receiving, and handoff screens a shared visual system based on v1.2's dark atmospheric card, translucent glass, and warm metallic accent.
- Preserve content order, route semantics, existing actions, six free templates, privacy messaging, and local-first storage.
- Allow each of the six templates to color the same interaction model; paper/clay/lilac keep readable contrasting glass surfaces.

## Out of scope

- Do not restore v1.2 event-first flow over v1.3's current user journey.
- Do not add authentication, commerce, premium sleeve, tracking, provider credentials, or real integrations.
- Do not alter archived v1.2 product documents or change data/privacy boundaries.

## Acceptance

1. On home, a card has a visible front of unequal module tiles, and selecting one reveals its values within the card.
2. Each value is independently copyable; back button and Escape restore the front and focus.
3. All three motion choices are selectable and are reflected on preview and public card projection.
4. Public page renders only approved projection values and offers the same card interactions.
5. Responsive viewport widths 360/390/768/1440 have no horizontal overflow; reduced motion suppresses motion.
6. Existing six-template, share projection, receive, and assistant journeys remain functional.
