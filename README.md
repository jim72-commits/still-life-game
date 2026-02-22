# Still Life

A Phaser 3 narrative puzzle game: arrange four action cards into the correct sequence for each quiet room.

## How to play

**Quick start (Windows):**
- Double-click `Play Still Life.bat` to launch the game in your default browser
- For a custom icon: Right-click the .bat file → Create Shortcut → Right-click shortcut → Properties → Change Icon → Browse to `still_life_icon.ico`

**Direct access:**
- Open `index.html` in a modern browser

**For development (local server recommended):**
```bash
# Python
python -m http.server 8000

# Node
npx serve .
```
Then visit `http://localhost:8000`.

## File structure (authoritative)

```
still-life/
├── Play Still Life.bat       Launcher (Windows) - opens index.html in browser
├── still_life_icon.ico       Game icon (256x256, multi-resolution)
├── index.html                Boot + HTML loading screen + scene routing
├── ending.html               Standalone ending cutscene (no Phaser dependency)
├── README.md
└── js/
    ├── Analytics.js          GA4 wrapper (fails silently if gtag missing)
    ├── SoundManager.js       Web Audio synth + mute + Safari compatibility
    ├── LevelData.js          Chapter + level definitions (30 rooms)
    ├── CardManager.js        Drag/drop + slot management + hint helpers
    ├── MenuScene.js          Main menu + reset + level select overlay
    ├── PrologueScene.js      First-time prologue (skippable)
    ├── GameScene.js          Gameplay scene + transitions + act breaks
    ├── UIScene.js            HUD overlay (Submit / Hint + overlays)
    ├── SummaryScene.js       Case-file summary + share + rating
    ├── EndingScene.js        Redirects to `ending.html`
    └── CompletionScene.js    Post-credits “Return to Menu”
```

## Scene flow

Typical first playthrough:

```
MenuScene → PrologueScene → GameScene (+ UIScene) → … → SummaryScene → EndingScene → ending.html → CompletionScene → MenuScene
```

Notes:
- `UIScene` runs in parallel with `GameScene` as an overlay for UI and feedback.
- `EndingScene` intentionally hands off to `ending.html` (pure HTML/CSS/JS).
- `index.html` supports deep-linking back from the ending via `?scene=completion`.

## Level / data format (`js/LevelData.js`)

Levels live under chapters:

```js
{
  id: "chapter1",
  title: "The House",
  levels: [
    {
      id: 1,
      room: "The Kitchen Counter",
      roomDescription: "A short description…",
      cards: [
        { id: "L1C1", text: "Bread was placed on the plate" },
        { id: "L1C2", text: "Ingredients were laid out" },
        { id: "L1C3", text: "Knife was used to cut" },
        { id: "L1C4", text: "Sandwich was made" }
      ],
      correctSequence: ["L1C1","L1C2","L1C3","L1C4"],
      act: 1
    }
  ]
}
```

Rules:
- Each level must have exactly **4 cards** and `correctSequence.length === 4`.
- Card `id`s must be unique within the level.

## Progress + localStorage contract (important)

All chapter-specific keys use the prefix `stilllife_{chapterId}_`.
The constant `CHAPTER_ID` in `Config.js` controls the current chapter (`'ch1'`).
Adding Chapter 2 requires changing only that constant to `'ch2'`.

### Resettable keys (cleared by Reset Progress):

| Key | Type | Description |
|-----|------|-------------|
| `stilllife_ch1_current_level` | int | Next level index to play (0-based). 30 = complete |
| `stilllife_ch1_first_attempts` | int | Levels solved on first try |
| `stilllife_ch1_wrong_total` | int | Total wrong submissions |
| `stilllife_ch1_hints_focus` | int | Focus hints used |
| `stilllife_ch1_hints_clue` | int | Clue hints used |
| `stilllife_ch1_hints_reveal` | int | Reveal hints used (also "1 per chapter" flag) |

### Permanent keys (survive Reset Progress):

| Key | Type | Description |
|-----|------|-------------|
| `stilllife_ch1_completed` | `"true"` | Set once on chapter completion |
| `stilllife_ch1_rating` | string | Investigator rating at time of completion |
| `stilllife_ch1_certificate_date` | string | ISO date of completion (YYYY-MM-DD) |
| `stilllife_ch1_best_first_attempts` | int | Best first-attempt count across playthroughs |

### Global keys (no chapter prefix):

| Key | Type | Description |
|-----|------|-------------|
| `stilllife_muted` | `"true"` / `"false"` | Mute preference |
| `stilllife_prologue_seen` | `"true"` | Prologue played (never cleared by reset) |

## Ending implementation (and timing model)

`ending.html` is standalone and uses:
- **GSAP 3.12.2** for all animation sequencing via `gsap.timeline()`
- **Web Audio API** for the piano motif (runs independently)
- No CSS keyframes for sequencing; CSS is only for initial states and styling

## Mobile & browser limitations

**Touch & gestures:**
- The game uses Phaser's built-in drag-and-drop system, which handles pointer/touch events.
- **Native browser gestures (swipe-back, pull-to-refresh) cannot be fully prevented** due to browser security restrictions.
- On iOS Safari and some Android browsers, swipe-back may occasionally trigger during gameplay.
- Workaround: Use deliberate vertical drags when placing cards to avoid horizontal swipes.

**Audio:**
- Safari requires user interaction before playing audio. The game calls `AudioContext.resume()` on first touch.
- If Web Audio API is unavailable, the game runs in silent mode without errors.

**Viewport:**
- The game uses `user-scalable=yes` to comply with accessibility guidelines.
- Layout is tested at 800×600 reference resolution and scales responsively.
