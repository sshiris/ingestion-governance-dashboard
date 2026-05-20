CREATE TYPE "public"."ingestion_chunk_status" AS ENUM('PENDING_REVIEW', 'APPROVED_CHUNK', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_raw_document_status" AS ENUM('PENDING_REVIEW', 'APPROVED_RAW', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_stage" AS ENUM('FETCHING_RAW', 'RAW_REVIEW', 'CHUNKING', 'CHUNK_REVIEW', 'EMBEDDING', 'EMBEDDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial_failure');--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_no" integer NOT NULL,
	"status" "ingestion_run_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"stage" "ingestion_run_stage" DEFAULT 'FETCHING_RAW' NOT NULL,
	"stage_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_raw_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"status" "ingestion_raw_document_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"storage_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp DEFAULT now(),
	"reviewed_by" text,
	"reject_reason" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_doc_id" uuid NOT NULL,
	"chunk_id" text,
	"chunk_index" integer,
	"text" text NOT NULL,
	"text_hash" text NOT NULL,
	"category_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "ingestion_chunk_status" DEFAULT 'PENDING_REVIEW',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now(),
	"reviewed_by" text,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"model" text NOT NULL,
	"input_text_hash" text NOT NULL,
	"embedding" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "ingestion_raw_documents" ADD CONSTRAINT "ingestion_raw_documents_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_chunks" ADD CONSTRAINT "ingestion_chunks_raw_doc_id_ingestion_raw_documents_id_fk" FOREIGN KEY ("raw_doc_id") REFERENCES "public"."ingestion_raw_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_embeddings" ADD CONSTRAINT "ingestion_embeddings_chunk_id_ingestion_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."ingestion_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "run_no_unique" ON "ingestion_runs" USING btree ("run_no");--> statement-breakpoint
CREATE INDEX "status_index" ON "ingestion_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stage_index" ON "ingestion_runs" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "created_at_index" ON "ingestion_runs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_raw_documents_source_external_unique" ON "ingestion_raw_documents" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "ingestion_raw_documents_run_id" ON "ingestion_raw_documents" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ingestion_raw_documents_status" ON "ingestion_raw_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingestion_raw_documents_source" ON "ingestion_raw_documents" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_chunks_raw_doc_chunk_index_unique" ON "ingestion_chunks" USING btree ("raw_doc_id","chunk_index");--> statement-breakpoint
CREATE INDEX "ingestion_chunks_raw_doc_index" ON "ingestion_chunks" USING btree ("raw_doc_id");--> statement-breakpoint
CREATE INDEX "ingestion_chunks_status_index" ON "ingestion_chunks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_embeddings_chunk_unique" ON "ingestion_embeddings" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "ingestion_embeddings_active" ON "ingestion_embeddings" USING btree ("is_active");