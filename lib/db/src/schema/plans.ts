import { pgTable, text, serial, timestamp, jsonb, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  teamName: text("team_name").notNull(),
  plannerName: text("planner_name").notNull(),
  planName: text("plan_name").notNull().default(""),
  color: text("color").notNull().default("#00d4ff"),
  km: real("km").notNull().default(0),
  isNewSites: boolean("is_new_sites").notNull().default(false),
  hqSiteId: text("hq_site_id"),
  dayGroups: jsonb("day_groups").notNull().default([]),
  siteIds: text("site_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
