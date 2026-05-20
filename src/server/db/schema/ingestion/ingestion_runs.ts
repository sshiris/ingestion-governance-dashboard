import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { runStageEnum, runStatusEnum } from "./enums";

export const ingestion_runs = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runNo: integer("run_no").notNull(),
    status: runStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    errorMessage: text("error_message"),
    stage: runStageEnum("stage").notNull().default("FETCHING_RAW"),
    stageUpdateAt: timestamp("stage_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      runNoUnique: uniqueIndex("run_no_unique").on(table.runNo),
      statusIndex: index("status_index").on(table.status),
      stageIndex: index("stage_index").on(table.stage),
      createdAtIndex: index("created_at_index").on(table.createdAt),
    };
  },
);
