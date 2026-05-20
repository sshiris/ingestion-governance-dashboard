import { pgEnum } from "drizzle-orm/pg-core";

// execution status
export const runStatusEnum = pgEnum("ingestion_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "partial_failure",
]);

//governance stage(UI-facing lifecycle)
export const runStageEnum = pgEnum("ingestion_run_stage", [
  "FETCHING_RAW",
  "RAW_REVIEW",
  "CHUNKING",
  "CHUNK_REVIEW",
  "EMBEDDING",
  "EMBEDDED",
  "FAILED",
]);

// raw doc review status
export const rawDocumentStatusEnum = pgEnum("ingestion_raw_document_status", [
  "PENDING_REVIEW",
  "APPROVED_RAW",
  "REJECTED",
]);
//chunk revew status
export const chunkStatusEnum = pgEnum("ingestion_chunk_status", [
  "PENDING_REVIEW",
  "APPROVED_CHUNK",
  "REJECTED",
]);

//TypeScript types derived from DB enums
export type RunStatus = (typeof runStatusEnum.enumValues)[number];
export type RunStage = (typeof runStageEnum.enumValues)[number];
export type RawDocumentStatus =
  (typeof rawDocumentStatusEnum.enumValues)[number];
export type ChunkStatus = (typeof chunkStatusEnum.enumValues)[number];
