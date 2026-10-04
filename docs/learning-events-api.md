# Learning Events API Contract

Forest Spelling Adventure is a fully independent client. It never performs AI
analysis, mastery calculation, or recommendation logic itself — it only
captures structured learner interactions and delivers them to the separate
**AI Learning Engine** over this HTTP contract, and later asks that same
engine for a parent-friendly progress summary (see
[Progress Summary API](#progress-summary-api) below).

## Event ingestion endpoint

```
POST /api/v1/events
Content-Type: application/json
```

The base URL is configured via `VITE_LEARNING_ENGINE_URL` (see `.env.example`)
and is never hardcoded in the game. Sync can be disabled entirely with
`VITE_LEARNING_SYNC_ENABLED=false`.

In production, the request is sent over HTTPS.

## Request body

A single `LearningEvent`:

```json
{
  "eventId": "01JXYZ...",
  "learnerId": "9b4d...",
  "applicationId": "forest-spelling-adventure",
  "eventType": "answer_submitted",
  "activity": {
    "levelId": "level-2",
    "puzzleId": "level-2-puzzle-3",
    "skillId": "short-vowels",
    "targetWord": "cat",
    "difficulty": "easy"
  },
  "interaction": {
    "selectedAnswer": "cit",
    "correct": false,
    "responseTimeMs": 4210,
    "attemptNumber": 1
  },
  "metadata": {
    "foilType": "V"
  },
  "timestamp": "2026-10-04T14:30:00.000Z"
}
```

### Required fields

| Field | Type | Notes |
|---|---|---|
| `eventId` | string | Client-generated, globally unique. See Idempotency below. |
| `learnerId` | string | Anonymous UUID, stable per device/browser. Never personal data. |
| `applicationId` | string | Always `"forest-spelling-adventure"` for this client. |
| `eventType` | string | Only `"answer_submitted"` is emitted today. |
| `activity` | object | `levelId`, `puzzleId`, `skillId`, `targetWord` are always present. |
| `interaction` | object | `correct` and `attemptNumber` are always present. |
| `timestamp` | string | ISO-8601, when the interaction occurred. |

### Optional fields

| Field | Location | Present when |
|---|---|---|
| `activity.difficulty` | activity | Only if the content model supplies a difficulty tier. |
| `interaction.selectedAnswer` | interaction | Always sent in practice, but treat as optional. |
| `interaction.responseTimeMs` | interaction | Omitted if client-side timing was unavailable. |
| `metadata.foilType` | metadata | Present only for incorrect answers; the `metadata` object itself is omitted for correct answers. |

## Response

| Status | Meaning |
|---|---|
| `200` / `201` | Event accepted and durably stored. The client deletes it from its local queue. |
| Anything else, or no response (network failure) | The client keeps the event queued and retries later with backoff. |

## Idempotency

`eventId` is the event's idempotency key. The same interaction is retried
with the **same** `eventId` whenever an upload's outcome is uncertain
(timeout, dropped response, app restart mid-retry). The server must treat
repeated submissions of the same `eventId` as the same logical event —
typically an upsert keyed on `eventId`, or a dedup check before insert.

The client never regenerates `eventId` for a retry.

## Delivery semantics

- Individual events are sent one at a time today. A future `POST
  /api/v1/events/batch` accepting `{ "events": [...] }` is anticipated but
  not required for this version.
- Delivery is best-effort and asynchronous relative to gameplay — events may
  arrive seconds, minutes, or (after an offline session) hours after the
  interaction occurred. `timestamp` is the source of truth for *when* the
  interaction happened, not server receipt time.
- Events may arrive out of order relative to when they were created.

## Security

- No API keys, credentials, or secrets are embedded in the client — it is a
  public PWA, and anything shipped in it must be treated as public.
- The endpoint should assume all clients are untrusted and validate/sanitize
  accordingly.

---

## Progress Summary API

Powers the game's "Child's Progress" screen. The game only ever requests and
renders this response — all analysis (deterministic statistics, mastery,
trends, and the LLM-generated summary) happens inside the AI Learning Engine.

### Endpoint

```
GET /api/v1/learners/:learnerId/progress
```

Example: `GET /api/v1/learners/9b4d.../progress`

Same base URL as event ingestion (`VITE_LEARNING_ENGINE_URL`). The game never
sends a learner ID it didn't already generate for itself — there is no
separate login or lookup step.

### Response body

```json
{
  "learnerId": "abc123",
  "generatedAt": "2026-10-04T16:30:00Z",
  "overall": {
    "mastery": 0.78,
    "trend": "improving",
    "summary": "Your child is making steady progress with spelling and phonics."
  },
  "skills": [
    { "id": "initial-consonants", "name": "Initial Sounds", "mastery": 0.89, "trend": "strong" },
    { "id": "short-vowels", "name": "Short Vowels", "mastery": 0.67, "trend": "improving" }
  ],
  "strengths": ["Initial consonant sounds", "Final consonant sounds"],
  "practiceAreas": [
    {
      "skillId": "short-vowels",
      "title": "Short Vowel Sounds",
      "description": "Short vowel sounds are currently more challenging.",
      "suggestion": "Practice words with short /a/ and /i/ sounds."
    }
  ],
  "encouragement": "Keep encouraging your child. Regular short practice sessions can help build confidence."
}
```

The client validates this body against a Zod schema (`src/progress/types.ts`)
before rendering anything. A response that fails validation is treated the
same as a server error — the client never renders partially-malformed data.

| Field | Required | Notes |
|---|---|---|
| `learnerId`, `generatedAt` | yes | |
| `overall.mastery` | yes | `0.0`–`1.0`; the client renders it as a percentage. |
| `overall.trend` | yes | One of `"improving"`, `"stable"`, `"needs-practice"`. |
| `overall.summary` | yes | Parent-facing sentence, plain text. |
| `skills[]` | yes (may be empty) | An empty array is treated by the client as "not enough activity yet" and shown as a friendly empty state rather than an empty skills panel. |
| `strengths[]` | yes (may be empty) | Hidden entirely in the UI when empty. |
| `practiceAreas[]` | yes (may be empty) | Hidden entirely in the UI when empty. |
| `encouragement` | yes | |

### Response status

| Status | Client behavior |
|---|---|
| `200` | Body parsed and validated; on success it's cached locally and rendered. |
| Any other status, a request timeout (90s — generous because the engine's analysis step is a local LLM call that can legitimately take up to a minute or more on CPU-only hardware), a network failure, or a body that fails validation | Treated uniformly as "couldn't load right now" — the client falls back to the last cached summary if one exists, otherwise shows a friendly retry prompt. Never surfaces the HTTP status, a stack trace, or any internal error detail to the parent. |

### Content and safety requirements

The engine — not the game — is responsible for keeping generated text inside
these bounds, since the LLM step happens entirely on that side:

- Describe **observable learning behavior only** ("finding short vowel
  sounds more challenging"), never a diagnosis, disability, intelligence
  claim, or comparison to other children.
- Use parent-friendly language — no internal terms like `foilType`,
  `mastery coefficient`, or `L1 transfer` should ever appear in `summary`,
  `strengths`, `practiceAreas`, or `encouragement`.
- `trend` and skill-level `trend` values should reflect real, deterministic
  analysis of the learner's event history — the LLM should describe that
  analysis, not invent it.

### Privacy

The response must only ever contain data belonging to the requested
`learnerId`. The game never sends and the engine should never require a
name, email, or other personal identifier — the anonymous `learnerId` is the
only identity in play.
