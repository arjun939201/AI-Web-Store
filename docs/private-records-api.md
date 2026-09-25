# Private App Records API Contract

## Purpose

Store each signed-in user's records separately for each generated app. App specifications may be shared/public; record contents are always private to the authenticated account.

## Ownership rule

Every record belongs to exactly one user_id and one app_id. Derive the user from the validated bearer token. Never accept a client-supplied owner ID. For every read, update, or delete, scope the database query by both the authenticated user and the target app. Return 404 for records outside that scope so the API does not disclose their existence.

## Proposed endpoints

All endpoints require Authorization: Bearer <token>.

- GET /api/apps/{slug}/data/{entity} — list only the current user's records for this app/entity.
- POST /api/apps/{slug}/data/{entity} — validate and create one record; return the saved record including its server-generated ID.
- PATCH /api/apps/{slug}/data/{entity}/{record_id} — validate and update an owned record.
- DELETE /api/apps/{slug}/data/{entity}/{record_id} — delete an owned record.

The API must resolve the app by slug and verify that the entity exists in its persisted, validated runtime specification. Entity names are case-sensitive and must match exactly.

## Record payload

A record contains a server-generated ID, entity name, field values, and timestamps. Store values in a JSON column, but validate them against the entity's declared fields before persistence:

- Reject undeclared field keys.
- Enforce required fields and declared types (text, number, boolean, date, select).
- For select fields, accept only declared options.
- Apply reasonable request and field-length limits.
- Do not permit client-provided record IDs, user IDs, app IDs, or timestamps to override server values.

## Seed data and existing browser data

Do not mutate the shared app specification's seed data. Define explicitly whether seeds are display-only or are copied into a user's records on first use; if copied, make initialization idempotent and user-scoped. Do not silently import legacy browser localStorage records because they may have been created while another account was active. Any import should be an explicit user-initiated operation after sign-in.

## Data model

Initial implementation may use an AppRecord table with:

- integer primary key
- foreign key to app
- foreign key to user
- entity name
- JSON payload
- created and updated timestamps

Add indexes for ownership-scoped access (at minimum user/app/entity). Ensure foreign keys and deletion behavior are deliberate. Use a migration for production schema changes rather than assuming create_all() alters existing tables.

## Acceptance tests

1. Anonymous requests to all record endpoints are rejected.
2. User A can create, list, update, and delete their own records.
3. User B cannot list or read User A's records, even when using the same app slug.
4. User B cannot update or delete User A's record by guessing its ID.
5. Unknown apps/entities and invalid field payloads are rejected.
6. Extra keys and forged ownership/timestamp fields are rejected or ignored safely (prefer rejection for extra input).
7. Data persists across refreshes and sessions.
8. Switching accounts never displays another user's records.
9. Seed initialization, if enabled, does not duplicate records on repeated requests.

## Implementation sequence

1. Add model and request/response schemas.
2. Add ownership-scoped service functions and authenticated routes.
3. Add unit/API tests for validation and isolation.
4. Connect the frontend runtime to these endpoints with loading, saving, and error states.
5. Verify with two separate test accounts before deploying.