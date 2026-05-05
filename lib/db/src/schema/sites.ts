import { pgTable, text, serial, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sitesTable = pgTable("sites", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  gov: text("gov").notNull().default(""),
  dist: text("dist").notNull().default(""),
  subdist: text("subdist").notNull().default(""),
  key: text("key").notNull().default(""),
  pwrclass: text("pwrclass").notNull().default(""),
  vendor: text("vendor").notNull().default(""),
  cat: text("cat").notNull().default(""),
  owner: text("owner").notNull().default(""),
  tl: text("tl").notNull().default("No"),
  mw: text("mw").notNull().default("No"),
  fiber: text("fiber").notNull().default("No"),
  dwdm: text("dwdm").notNull().default("No"),
  olt: text("olt").notNull().default("No"),
  ipran: text("ipran").notNull().default("No"),
  fttm: text("fttm").notNull().default("No"),
  epa: text("epa").notNull().default("No"),
  freecool: text("freecool").notNull().default("No"),
  gen: text("gen").notNull().default("No"),
  sharing: text("sharing").notNull().default("No"),
  ibs: text("ibs").notNull().default("No"),
  extra: jsonb("extra").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSiteSchema = createInsertSchema(sitesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sitesTable.$inferSelect;
