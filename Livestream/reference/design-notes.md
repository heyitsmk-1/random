# Design notes: YouPass style + UX principles

Summary of the two design skills the owner shared on 2026-10-21 (`youpass-design.skill`, `ux-principles.skill`).
**All Livestream visuals (decks, mock-ups, the real product) follow these.** The skill files themselves are not stored in this repo.

## YouPass brand (youpass-design)

- **Personality:** gentle (nhẹ nhàng), motivational (truyền động lực), cute/friendly (dễ thương). Warm and human, never cold or corporate.
- **Colours:**
  - Primary **orange `#FF6D3A`** (hover `#CC3A07`, tints `#FFF0EB`, `#FFC5B0`, `#FFA789`): CTAs, active states, progress.
  - Secondary **green `#13A62E`** (tint `#E5F6E9`): success, completion, achievements.
  - Text `#1D1D1F` primary, `#8A8A8E` secondary. On dark: `#F5F5F7` / `#C4C4C7`.
  - Backgrounds: white `#FFFFFF`, or **warm `#FFFAF6` / `#FFF8F2` / `#FBEFE4`**. Greys `#F4F4F4`, `#F2F2F7`, `#E5E5EA`.
  - Tertiary for status/categories: red `#FF3B30`/`#FFEBEA` (errors only), blue `#007AFF`/`#E5F2FF`, purple `#5856D6`/`#EEEEFB`, yellow `#FFD80E`/`#FFFBE7`, cyan `#00C7BE`/`#E5F9F9`.
  - Pastels for tags/badges: blue `#5A88E5`/`#DEE7FA`, yellow `#FFA41B`/`#FFEDD1`, purple `#565FCC`/`#DDDFF5`, green `#37C181`/`#D7F3E6`.
- **Font:** ~~Nunito~~ **Montserrat** for Livestream (owner's choice, 2026-10-21; Nunito may not be installed when presenting). Weights 400/600/700, fallback Arial. Hierarchy by weight.
- **Shapes:** never sharp corners. Containers = generous rounding; **interactive elements = pill shape (signature)**; tags/chips = subtle rounding. Thin borders (1–2px, default `#E5E5EA`, focus orange).
- **Shadows:** soft only (e.g. `0 4px 12px rgba(29,29,31,.08)`).
- **Spacing:** generous, never cramped. Touch targets ≥ 44px.
- **Feedback states:** success green `#E5F6E9` "Chính xác!"; partial orange `#FFF0EB` "Gần đúng rồi!"; error soft red `#FFEBEA`, gentle tone.
- **Microcopy:** warm, encouraging Vietnamese. Emoji-friendly.
- **Logo:** text fallback = "You" in orange + "pass" in `#1D1D1F`, bold.

## UX principles (ux-principles) most relevant to Livestream

| Principle | How it applies here |
|---|---|
| **User control and freedom** (Nielsen #3) | The teacher can launch, skip, repeat, extend or close any activity. Never locked into a script. |
| **Visibility of system status** (#1) | Live counts ("842/1,284 đã trả lời"), the confusion meter, what's on stream right now. |
| **Recognition over recall** (#6) | Chips and tap answers instead of typing. |
| **Hick's Law** | Show the *suggested* next activity big, the rest smaller. Few choices per screen. |
| **Fitts's Law** | Big tap targets for students; big Launch button for the teacher. |
| **Doherty threshold** | Taps respond in < 400 ms. |
| **Peak-End Rule** | Invest in the end of class: celebration + recap page. |
| **5 states per screen** | Waiting, active, submitted, result, closed (plus error/offline). |
| **Aesthetic-usability effect** | Looking good is part of being easy to use. |
