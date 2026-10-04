# Learning Events API Contract

Forest Spelling Adventure is a fully independent client. It never performs AI
analysis, mastery calculation, or recommendation logic itself — it only
captures structured learner interactions and delivers them to the separate
**AI Learning Engine** over this HTTP contract.

## Endpoint

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
