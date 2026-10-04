# Forest Spelling Adventure 🦊

A playful, offline-first spelling and phonics game for early readers, starring Fern the fox. Learners listen to a word, pick its correct spelling from four choices, and work their way through phonics-themed levels and puzzles — earning stars as they go.

Live concepts: **Level → Puzzle → Question**, a research-informed bank of spelling "foils" (deliberately wrong answers that target specific phonics mistakes), bundled audio for offline/WebView playback, and an installable PWA that also ships inside a native Android wrapper.

---

## Table of contents

- [How the game works](#how-the-game-works)
- [The star rating system](#the-star-rating-system)
- [Content model](#content-model)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Content & audio pipeline](#content--audio-pipeline)
- [Testing](#testing)
- [Deployment](#deployment)
- [What this architecture already gives you](#what-this-architecture-already-gives-you)
- [Future enhancements: multi-language support](#future-enhancements-multi-language-support)
- [Other future enhancements](#other-future-enhancements)

---

## How the game works

The game is a single-page app with no routing library — a screen enum (`GameState.screen`) drives which component renders. The flow is:

```
Welcome  →  Home (level select)  →  Puzzle select  →  Question  →  Puzzle Complete ──┐
                                        ▲                              │               │
                                        └────── Puzzle Map ────────────┘  (more puzzles)
                                                                        │
                                                                Level Complete (last puzzle)
```

1. **Welcome** — title screen with Fern the mascot; tapping **Play** goes to the home screen.
2. **Home (level select)** — every level is shown as a card with a number badge, its skill name (e.g. *"CVC, short vowels"*), word count, and a lock/available/completed state. A level unlocks once every puzzle in the previous level is completed.
3. **Puzzle select** — each level is split into up to 5 puzzles (fewer for shorter levels), sized as evenly as possible across the level's words. Puzzles unlock sequentially: puzzle *N* unlocks once puzzle *N‑1* is completed. Completed puzzles show a checkmark and their star rating.
4. **Question screen** — for each word, the word is **spoken aloud** (via bundled audio, see below) and the learner picks the correct spelling from **4 choices**: the correct spelling plus 3 "foils" (deliberately wrong spellings, see [Content model](#content-model)).
   - A correct pick shows confetti, a short "Correct!" panel, and advances to the next word.
   - A wrong pick shakes/greys out that button (it's disabled so it can't be re-picked), shows a short, encouraging phonics hint (e.g. *"Listen to the middle sound"*), and lets the learner try again — the question doesn't advance until they get it right.
   - The target word's audio can be replayed at any time.
5. **Puzzle Complete** — a lighter celebration screen between puzzles, showing the star rating just earned and a "Next Puzzle" button.
6. **Level Complete** — shown instead of Puzzle Complete after the level's *last* puzzle, with bigger confetti and a link to the next level.

Progress (which puzzles are completed) and star ratings are saved to `localStorage` and reloaded automatically, so closing the app and coming back picks up right where the learner left off.

## The star rating system

Each puzzle clear earns **1–3 stars**, based on how many wrong answers (mistakes) the learner made across that puzzle's words — not just whether they eventually got it right:

| Mistakes in the puzzle | Stars earned |
|---|---|
| 0 (flawless) | ⭐⭐⭐ (3) |
| 1–3 | ⭐⭐ (2) |
| 4+ | ⭐ (1) |

- A "mistake" is counted once per wrong answer *submitted* (a disabled, already-tried wrong button can't be clicked again, so it can't double-count).
- Completing a puzzle always earns **at least 1 star** — there's no 0-star outcome, since the goal is encouragement, not punishment.
- If a puzzle is replayed, the **best** star result is kept (a worse replay never lowers a previously-earned rating).
- The pure scoring logic lives in `starsForMistakes()` in `src/game/engine.ts`, fully unit-tested and decoupled from React/UI.
- Star badges appear:
  - On each **level card**, as an aggregate *"earned / max"* count (e.g. `6/15`) — the sum of that level's puzzle stars out of `puzzleCount × 3`.
  - On each **completed puzzle node**, as its own `earned/3` badge.
  - On the **Puzzle Complete** and **Level Complete** screens, as a row of filled/empty star icons for the puzzle just finished.

Star data is stored separately from completion data (`spelling-game:puzzle-stars` vs. `spelling-game:puzzle-progress` in `localStorage`) via `src/game/persistence.ts`, so the lock/unlock logic (which only cares about *completion*) stays untangled from the scoring logic (which cares about *performance*).

## Content model

All game content — levels, words, and wrong-answer choices — is authored in a spreadsheet (`data_source.xlsx`) with three sheets:

- **`WordList`** — one row per question: `level, item, sequence, skill, target word, foil 1 + type, foil 2 + type, foil 3 + type`.
- **`LevelGuide`** — one row per level: `level, skill label, word count`.
- **`FoilCodebook`** — maps each foil "type" code (e.g. `V`, `IC`, `PH`) to a human-readable name.

A **foil** isn't a random wrong word — it's a deliberately-chosen misspelling that targets a *specific* phonics confusion, tagged with a type code so the game can give a relevant hint. For example, for the target word **"sat"**:

| Foil | Type | Meaning |
|---|---|---|
| `sit` | `V` | Vowel substitution |
| `sap` | `FC` | Final-consonant substitution |
| `hat` | `IC` | Initial-consonant substitution |

The codebook already includes types like `L1-RL` ("L1 transfer: /r/-/l/ confusion"), `L1-TH`, `L1-VD`, `L1-PRO`, `L1-EPN`, and `L1-VOW` — spelling mistakes typical of learners whose first language isn't English. This foil-typing system is a big part of what makes the [multi-language roadmap](#future-enhancements-multi-language-support) below realistic rather than hypothetical: the content model was already designed with second-language spelling patterns in mind.

The spreadsheet is converted once (and re-run whenever it changes) into `src/data/content.generated.json` via `npm run gen:content`. The app never reads the spreadsheet directly — only the generated JSON, which is validated and normalized again at runtime in `src/data/loadContent.ts` (malformed rows are dropped rather than crashing the app).

Currently shipped: **10 levels, 200 words**, progressing from CVC short vowels through consonant blends, digraphs, silent‑e, vowel teams, r-controlled vowels, irregular/high-frequency words, suffixes, multisyllable words, and advanced patterns like `-tion`/`ough`.

## Architecture

**Stack:** React 19 + TypeScript, built with Vite, styled with CSS Modules (no CSS framework), tested with Vitest + Testing Library, linted with Oxlint, deployed to Cloudflare Pages via Wrangler.

**State management** is a single `useReducer` (`src/game/gameState.ts` + `src/game/useGameEngine.ts`) — no external state library. All game transitions (selecting a level, answering a question, advancing, completing a puzzle) are pure reducer cases, which is what makes them straightforward to unit test in isolation from React.

**Separation of concerns**, roughly in layers:

- `src/game/engine.ts` — pure, side-effect-free game rules: shuffling choices, checking answers, puzzle/level lock logic, star scoring, hint lookup. No React, no storage, no I/O. Fully unit tested (`engine.test.ts`).
- `src/game/gameState.ts` — the reducer: how game *state* changes in response to *actions*. Also pure and unit tested (`gameState.test.ts`).
- `src/game/persistence.ts` — the only code that talks to `localStorage` (with an in-memory fallback for private browsing / restricted WebViews). Swappable behind a small interface (`ProgressStore`).
- `src/game/audio.ts` / `src/game/soundEffects.ts` — audio playback abstractions. Components never touch `Audio`/`speechSynthesis`/`AudioContext` directly, only `wordAudioPlayer.playWord()` and `soundEffectPlayer.playClick()`. This is what lets the underlying playback strategy change (see below) without touching any screen component.
- `src/data/loadContent.ts` — loads, validates, and derives queryable views (levels, puzzles, questions) over the generated content JSON. Cached once per session.
- `src/components/*` — presentational screens and widgets, each with its own CSS Module. Components receive data and callbacks as props; none of them know about `localStorage`, the reducer, or each other's internals.
- `src/pwa/*` — offline-readiness and update-prompt plumbing (see below).

**Audio strategy** (`audio.ts`): the game doesn't rely on the browser's Web Speech API in production, because Android's embedded WebView often can't actually speak through it even when `window.speechSynthesis` appears to exist. Instead, `npm run gen:audio` pre-generates one MP3 per unique word (via Microsoft Edge's free neural "Read Aloud" voices) into `public/audio/words/`, and the game plays those bundled files — falling back to `speechSynthesis`, and finally to silence, only if a file is missing or playback fails. The same files are precached by the service worker for full offline play.

**Offline-first PWA**: `vite-plugin-pwa` (Workbox) precaches every built asset — JS, CSS, audio, icons — so the entire game (all 200 words, all levels) works offline after the first visit. `src/pwa/useAppReady.ts` holds the loading screen until either an existing service worker already controls the page, a fresh one finishes precaching, or a 6-second fallback elapses (so the game never hangs forever on an unsupported browser). `UpdatePrompt.tsx` surfaces a "new version available" banner using `vite-plugin-pwa`'s `useRegisterSW()` hook.

**Android wrapper awareness**: `src/pwa/notifyAndroidCacheStatus.ts` calls an optional `window.Android.cachedStatus()` JS bridge, letting a native Android shell know once the web content is fully cached — present only when the PWA is loaded inside that wrapper, a no-op everywhere else.

## Project structure

```
data_source.xlsx                  # Source of truth for all content (spreadsheet)
scripts/
  convert-xlsx-to-json.cjs        # Spreadsheet → src/data/content.generated.json
  generate-word-audio.cjs         # Generates one MP3 per unique word
  generate-icons.cjs              # Generates PWA icon sizes
src/
  data/
    content.generated.json        # Generated — do not hand-edit
    types.ts                      # Question / Foil / LevelInfo / GameContent types
    loadContent.ts                # Validate, normalize, query content
  game/
    engine.ts                     # Pure game rules (shuffle, scoring, lock logic, stars)
    gameState.ts                  # Reducer: GameState + GameAction
    useGameEngine.ts               # Wires the reducer to persistence + audio side effects
    persistence.ts                # localStorage-backed progress & star stores
    audio.ts                      # Spoken-word playback (file → speech → silent fallback)
    soundEffects.ts                # UI click sound (Web Audio API)
  components/                     # One screen/widget + its .module.css per file
  pwa/                             # Offline readiness, update prompt, Android bridge
  styles/theme.css                 # Design tokens (colors, fonts, shared keyframes)
```

## Getting started

```bash
npm install
npm run dev        # start the dev server (PWA features partially simulated, see vite.config.ts)
npm run build       # type-check + production build
npm run preview     # preview the production build locally
npm run test        # run the test suite once
npm run test:watch  # run tests in watch mode
npm run lint         # Oxlint
```

## Content & audio pipeline

```bash
npm run gen:content   # data_source.xlsx → src/data/content.generated.json
npm run gen:audio      # generate missing MP3s for any new target words
```

Both scripts are re-runnable and additive: editing the spreadsheet and re-running `gen:content` regenerates the JSON from scratch, while `gen:audio` only generates audio for words that don't already have an MP3 (pass `--force` to regenerate everything). This means adding a new level or word is purely a content change — no app code needs to change.

## Testing

Vitest + Testing Library, run against `jsdom`. Tests are organized next to the code they cover (`*.test.ts`) and focus on the parts of the codebase that are pure/deterministic and highest value to protect: the game engine's rules, the reducer's state transitions, and content loading/validation.

## Deployment

```bash
npm run deploy   # build, then wrangler pages deploy → Cloudflare Pages
```

The build output (`dist/`) is a fully static, installable PWA — it can also be deployed to any static host, or wrapped in a native shell (as it already is for Android, via the `window.Android` bridge mentioned above).

## What this architecture already gives you

Because game rules, state transitions, content, persistence, and audio are each isolated behind small interfaces, this codebase is set up to support a fair amount of growth without a rewrite:

- **New content without new code** — add rows to the spreadsheet, re-run two scripts, done. Levels, puzzle counts, and word counts are all derived from data, not hard-coded.
- **New scoring rules without touching UI** — `starsForMistakes()` is one pure function; changing the thresholds (or the whole formula — e.g. factoring in hints used, or time) only touches `engine.ts` and its tests.
- **New playback strategies without touching screens** — swap what `wordAudioPlayer` does internally (a different TTS vendor, a CDN instead of bundled files, a different fallback order) and every screen that calls `wordAudioPlayer.playWord()` is unaffected.
- **New storage backend without touching gameplay** — `ProgressStore` is a 4-method interface; swapping `localStorage` for, say, a backend sync API or `IndexedDB` means implementing that interface once in `persistence.ts`.
- **Decoupled testing** — because `engine.ts` and `gameState.ts` have zero React/DOM dependencies, the game's actual rules can be exhaustively tested fast, without rendering anything.

## Future enhancements: multiple languages

The content model was already designed with more than monolingual English in mind — the `FoilCodebook` includes several **L1-transfer** foil types (`L1-RL`, `L1-VD`, `L1-PRO`, `L1-EPN`, `L1-TH`, `L1-VOW`) that model spelling mistakes specific to learners whose first language isn't English. Extending this into genuine multi-language support would mean:

**Content**
- Add a `language` (and optionally `targetLanguageOfLearner`, e.g. "Spanish speakers learning English") dimension to the spreadsheet and `GameContent` schema, so `content.generated.json` can hold multiple word banks side by side, or be generated per-language (`content.en.json`, `content.es.json`, …).
- `getGameContent()` in `loadContent.ts` would take a language parameter (or read it from a selected-language store) instead of loading one static import — still cached per language.
- Keep foil-type codes as the shared vocabulary across languages (a `V` vowel-substitution foil means the same *kind* of mistake whether the target word is English or Spanish), so hint copy and pedagogy stay consistent even as the word lists change.

**Audio**
- `scripts/generate-word-audio.cjs` already isolates *all* TTS concerns in one file — switching or adding voices per language is a matter of mapping `language → voice name` (`msedge-tts` ships many `xx-XX-VoiceNameNeural` voices) and generating into `public/audio/<lang>/words/`.
- `audio.ts`'s `FileAudioPlayer` would read from a language-scoped path instead of a flat one; the fallback chain (file → `speechSynthesis` with the right `lang` tag → silence) still works as-is, since `SpeechSynthesisAudioPlayer` already accepts a `lang` option.

**UI**
- Introduce an i18n layer for UI strings (currently hard-coded English copy like "Not quite!", "Listen and choose the correct spelling.") — a lightweight `t('key')` lookup would suffice given the app's small surface of static strings; the component structure (props in, no embedded copy logic) makes this a mechanical extraction, not a redesign.
- A language picker on the Welcome screen, persisted alongside existing progress in `localStorage`.
- RTL layout support (for Arabic, Hebrew, etc.) mostly falls out of using logical CSS properties in the existing CSS Modules rather than manual direction handling, if that's ever on the roadmap.

**Net effect**: because levels/puzzles/questions/foils/audio are already data, not code, "add a language" should look much more like "author a new spreadsheet + run two scripts + add a locale file" than a structural rewrite.

## Other future enhancements

A few other directions this architecture makes straightforward:

- **Adaptive difficulty** — `engine.ts` already tracks per-puzzle mistakes; that signal could drive which foil *types* show up more often for a struggling learner (e.g. more vowel-substitution practice if that's their pattern).
- **Parent/teacher dashboard** — star and completion data already exist in a structured shape (`PuzzleProgress`, `PuzzleStars`); exporting or syncing that to a backend would enable progress reports without changing how gameplay tracks it.
- **More question types** — the `Question`/`AnswerChoice` model could extend beyond 4-choice spelling to fill-in-the-blank or word-building, reusing the same engine/reducer/persistence layers.
- **Cloud sync / multi-device progress** — swapping the `ProgressStore` implementation (see above) is the main lift; the reducer and UI wouldn't need to change.
- **Leaderboards or shareable results** — the star-rating system already produces a clean, comparable score per puzzle/level that could be surfaced socially.
