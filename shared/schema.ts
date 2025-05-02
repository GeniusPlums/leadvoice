import { pgTable, text, uuid, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Sales team members table
export const salesTeam = pgTable("sales_team", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tags table
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leads table
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  status: text("status").notNull().default("New"),
  assignedTo: uuid("assigned_to").references(() => salesTeam.id),
  eventName: text("event_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction table for leads and tags (many-to-many)
export const leadTags = pgTable("lead_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  salesPerson: one(salesTeam, {
    fields: [leads.assignedTo],
    references: [salesTeam.id],
  }),
  tags: many(leadTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  leads: many(leadTags),
}));

export const leadTagsRelations = relations(leadTags, ({ one }) => ({
  lead: one(leads, {
    fields: [leadTags.leadId],
    references: [leads.id],
  }),
  tag: one(tags, {
    fields: [leadTags.tagId],
    references: [tags.id],
  }),
}));

export const salesTeamRelations = relations(salesTeam, ({ many }) => ({
  assignedLeads: many(leads),
}));

// Create Zod schemas
export const salesTeamInsertSchema = createInsertSchema(salesTeam);
export const salesTeamSelectSchema = createSelectSchema(salesTeam);

export const tagsInsertSchema = createInsertSchema(tags);
export const tagsSelectSchema = createSelectSchema(tags);

export const leadsBaseSchema = createInsertSchema(leads);

// Custom lead schema that includes tags
export const leadInsertSchema = leadsBaseSchema.extend({
  tags: z.array(z.string()).optional(),
});

export const leadSelectSchema = createSelectSchema(leads).extend({
  tags: z.array(z.string()).optional(),
});

export const leadTagsInsertSchema = createInsertSchema(leadTags);
export const leadTagsSelectSchema = createSelectSchema(leadTags);

// Export types
export type SalesTeamInsert = z.infer<typeof salesTeamInsertSchema>;
export type SalesTeam = z.infer<typeof salesTeamSelectSchema>;

export type TagInsert = z.infer<typeof tagsInsertSchema>;
export type Tag = z.infer<typeof tagsSelectSchema>;

export type LeadInsert = z.infer<typeof leadInsertSchema>;
export type Lead = z.infer<typeof leadSelectSchema>;

export type LeadTagInsert = z.infer<typeof leadTagsInsertSchema>;
export type LeadTag = z.infer<typeof leadTagsSelectSchema>;
