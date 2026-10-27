# Studio Workspace Redesign Implementation Plan

**Goal:** Turn the home screen into a responsive card studio with a clear content → appearance → share flow and an honest visual share confirmation.

**Architecture:** Keep profile, vault, template, and publication behavior in their current modules. Add a controlled three-step editor shell, a compact task navigation rail, and render the existing share projection through the existing card experience component.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing CSS modules/global styles.

**Spec:** `docs/superpowers/specs/2026-10-26-studio-workspace-redesign.md`

## Global Constraints

- Visitors can create, view, save, and reciprocate a base card without an account.
- Contacts remain local and encrypted; public fields are opt-in and explicitly confirmed.
- A public link can be forwarded; do not claim recipient-only encryption or automatic cloud sync.
- Support 360/390 mobile, 768 tablet, and 1440 desktop widths; honor keyboard focus and reduced motion.
- Do not imply that a real account or login service exists.

## Review Focus

- Unsaved contact fields must survive switching editor steps by keeping step panels mounted.
- Share rendering must include only projected identity, modules, and assets; unchecked contacts stay absent.
- Existing template, module, and layout selections must continue to determine the final share card.
- Mobile task navigation and fixed actions must not cover inputs or the share confirmation.
- Missing name and save failures must leave the user on an actionable step with status feedback.

### Task 1: Home studio and three-step editor

**Files:** Modify `src/app/page.tsx`, `src/modules/card/editor.tsx`, and `src/modules/card/styles.css`.

- Add responsive studio navigation for create, AI preparation, activity, saved cards, and received cards.
- Add controlled Content, Appearance, and Share steps; keep panels mounted and hide inactive panels accessibly.
- Place logo/contact editing and modules in Content; template and motion controls in Appearance; share selection in Share.
- Keep the live card visible on desktop and make the mobile preview a separate view with persistent bottom navigation.

### Task 2: Human-readable public share confirmation

**Files:** Modify `src/modules/sharing/preview.tsx` and `src/modules/card/styles.css`.

- Replace the raw JSON dump with `CardExperience` rendered from the sanitized `ShareProjection`.
- Show a concise list of fields selected for sharing and preserve distinct final action confirmations.
- Keep publication, image, vCard, file, and OS share behavior unchanged.
