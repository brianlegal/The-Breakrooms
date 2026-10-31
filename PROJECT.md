# Project: Backrooms Wall Breaker 3D — Professional UI/UX Overhaul

## Architecture
- **Rendering Composition**: Three.js WebGL canvas at `z-0` (`App.tsx`), HUD and game alerts at `z-20` (`HUD.tsx`), mobile controls at `z-30` (`TouchControls.tsx`), Pre-game Lobby and Modals at `z-40`/`z-50` (`GameModal.tsx`).
- **Styling Architecture**: Tailwind CSS + custom design system in `src/index.css` implementing tactile 2D volumetric buttons (`.cartoon-btn`), panels (`.cartoon-window`, `.cartoon-card`), and procedural specular textures (`cartoonUiTextures.ts`). Zero 3D CSS transforms (`perspective`, `preserve-3d`) to ensure 100% reliable browser hit-testing.
- **Iconography**: Resolution-independent vector React SVGs in `src/components/CartoonIcons.tsx` with built-in dark borders and 3D offset drops. Strict zero-emoji policy.
- **State Management & Decoupling**: Game progression, uncapped attributes, Rebirth, High Scores, and Skins stored in `src/game/progression.ts`. i18n localization in `src/game/i18n.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| F1 | Golden/Amber Cartoon Design System | Color tokens, 2D depth box-shadows, volumetric buttons, borders, highlights in `index.css` | M1 | Reference Images & R1 | DONE |
| F2 | Vector Iconography Catalog | Cartoon SVG icons for Language, Jackpot, Sound, Upgrades (Speed, Force, Punch Speed, Ball Force) | M1 | R1, Reference Images | DONE |
| F3 | Pre-Game Lobby & Modals Overhaul | Golden/amber UI overhaul for Upgrades, Rebirth, Records, Glove Skins, Budgets in `GameModal.tsx` | M2 | R1, R3 | DONE |
| F4 | Bilingual i18n & Sound Controls | Language switcher button (PT/EN), sound toggle in Lobby, and full localization dictionary | M2 | R3 | DONE |
| F5 | Jackpot / Lucky Wheel Modal | Dedicated rewarded-ad Roulette / Jackpot popup wired to `onClaimAdJackpot` | M2 | R1, R3 | DONE |
| F6 | In-Game HUD Polish & Rule Preservation | Single top-center bar (% walls + timer), no exit indicator, FOV 105 locked, warm amber theme | M3 | R2, R4 | DONE |
| F7 | Hit-Testing & Click Integrity | Verification of 100% button hitboxes, fix badge transform override, zero dead zones | M3 | R4 | DONE |
| F8 | Build & Console Cleanliness | Zero TypeScript errors, `adversarial_verification.js` 280/280 pass, clean syntax | M3 | Acceptance Criteria | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Iconography Foundation | `src/index.css`, `src/components/CartoonIcons.tsx`, `src/game/i18n.ts` | Survey | DONE |
| M2 | Pre-Game Menus, Modals & Jackpot | `src/components/GameModal.tsx`, `src/App.tsx` | M1 | DONE |
| M3 | In-Game HUD, Hit-Testing & Final Verification | `src/components/HUD.tsx`, full test & build verification | M2 | DONE |

## Interface Contracts
### Design Tokens ↔ Component UI
- `.cartoon-btn`, `.cartoon-btn-amber`, `.cartoon-btn-green`, `.cartoon-btn-red`, `.cartoon-btn-blue` provide uniform button styling with `--press-y: 4px` mechanical press.
- `.cartoon-window`, `.cartoon-card` provide golden/amber frames, dark brown borders (`#3A1208`), and specular highlights.
- SVG icons take `className?: string`, default `viewBox="0 0 32 32"`, ensuring seamless responsive sizing.

### Game State ↔ Modals
- `onClaimAdJackpot`: triggers rewarded ad via `portalSDK.requestRewardedAd()` and grants bonus coins.
- `toggleLocale()`: toggles PT/EN in `i18n.ts` and updates all reactive UI text.
- `progression`: reads uncapped attributes via `getStatPercentage()` and performs Rebirth via `performRebirth()`.

## Code Layout
- `src/index.css`: Styling tokens, button classes, card classes, animations.
- `src/components/CartoonIcons.tsx`: Vector SVG icons.
- `src/components/GameModal.tsx`: Lobby menus, upgrade cards, popups (Rebirth, Records, Skins, Jackpot).
- `src/components/HUD.tsx`: In-game top bar (% walls, timer), alerts, sound toggle.
- `src/game/i18n.ts`: Localization dictionary.
- `src/App.tsx`: Root UI composition and state wiring.
