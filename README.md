# AI Ingestion Governance Dashboard

A standalone portfolio demo of a governed AI data ingestion workflow. The app shows how raw source material can be reviewed, chunked, reviewed again, and promoted into a demo embedding stage with explicit lifecycle controls.

## What This Demonstrates

- Ingestion run lifecycle tracking
- Raw document approval and rejection gates
- Chunk approval and rejection gates
- Stage/status transition enforcement
- Audit fields for reviewer, review time, and rejection reason
- Drizzle ORM schema for PostgreSQL
- Demo-safe chunk and embedding adapters instead of proprietary AI integrations

## Execution Status (Status Enum)

| Status          | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| pending         | The run is paused and waiting for the next trigger or human gate.           |
| running         | The run is actively executing an automated process.                         |
| completed       | The entire ingestion pipeline has finished successfully.                    |
| failed          | The run terminated due to an unrecoverable error.                           |
| partial_failure | Reserved for future use; not part of the current primary lifecycle.         |

## Ingestion Lifecycle Stages

| Stage        | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| FETCHING_RAW | System is fetching external legal data from configured sources.                        |
| RAW_REVIEW   | Raw documents have been fetched and stored; administrator must approve or reject them. |
| CHUNKING     | Approved raw documents are ready for or actively undergoing chunk generation.          |
| CHUNK_REVIEW | Generated chunks are available; administrator must approve or reject them.             |
| EMBEDDING    | Approved chunks are ready for or actively undergoing embedding generation.             |
| EMBEDDED     | Embedding process completed successfully; data is ready for retrieval/search.          |
| FAILED       | The ingestion run entered a failure state due to a processing error.                   |

## Transition table

- CREATED → FETCHING_RAW — Run is triggered
- FETCHING_RAW → RAW_REVIEW — Raw data successfully fetched
- RAW_REVIEW → CHUNKING — All raw documents reviewed (no pending) and at least one approved; run waits for chunking trigger
  - COUNT(raw_docs WHERE status = PENDING_REVIEW) = 0
  - AND COUNT(raw_docs WHERE status = APPROVED_RAW) > 0
- CHUNKING → CHUNK_REVIEW — Chunk generation completed
- CHUNK_REVIEW → EMBEDDING — All chunks reviewed and at least one approved; run waits for embedding trigger
  - COUNT(chunks WHERE status = PENDING_REVIEW) = 0
  - AND COUNT(chunks WHERE status = APPROVED_CHUNK) > 0
- EMBEDDING → EMBEDDED — Embedding process completed successfully
- (Any stage) → FAILED — Fatal error occurred

## Enforcement rules

- To leave RAW_REVIEW and enter CHUNKING, every raw document in the run must be finalized (either APPROVED_RAW or REJECTED). No PENDING_REVIEW allowed.
- To leave CHUNK_REVIEW and enter EMBEDDING: every chunk in scope must be finalized (either APPROVED_CHUNK or REJECTED_CHUNK). No PENDING_REVIEW allowed
- Rejected documents or chunks cannot proceed to the next stage
- Embedding only occurs when approval conditions are satisfied
- Duplicate ingestion must be prevented using database constraints and text hash validation

## Ingestion Lifecycle

| Stage        | Status    | Meaning                                           |
| ------------ | --------- | ------------------------------------------------- |
| FETCHING_RAW | running   | AI/source fetch is running                        |
| RAW_REVIEW   | pending   | Waiting for human raw document review             |
| CHUNKING     | pending   | Raw review complete; waiting to start chunking    |
| CHUNKING     | running   | AI chunk generation is running                    |
| CHUNK_REVIEW | pending   | Waiting for human chunk review                    |
| EMBEDDING    | pending   | Chunk review complete; waiting to start embedding |
| EMBEDDING    | running   | AI embedding generation is running                |
| EMBEDDED     | completed | Ingestion finished successfully                   |
| FAILED       | failed    | Fatal error occurred                              |


## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env.local
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Run migrations:

```bash
npx drizzle-kit migrate
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000` and launch the dashboard from the home page.

## Demo Flow

1. Open `/ingestion`.
2. Create a run.
3. Open the run and seed demo raw documents.
4. Approve or reject raw documents.
5. Generate demo chunks.
6. Approve or reject chunks.
7. Generate demo embeddings.

## Notes

This repository is intentionally separated from the original production codebase. It excludes authentication, billing, private business logic, secrets, proprietary AI integrations, and company-specific data.
