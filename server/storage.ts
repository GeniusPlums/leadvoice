import { db } from "@db";
import { leads, salesTeam, leadTags, tags as tagsTable } from "@shared/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { leadInsertSchema } from "@shared/schema";

// Storage interface for all database operations
export const storage = {
  // Lead operations
  async getLeads({ page = 1, limit = 10, searchQuery = '', statusFilter = 'all' }) {
    try {
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Start building the query
      let queryBuilder = db.select()
        .from(leads)
        .leftJoin(salesTeam, eq(leads.assignedTo, salesTeam.id));
      
      // Apply search filter if provided
      if (searchQuery) {
        queryBuilder = queryBuilder.where(
          or(
            like(leads.firstName, `%${searchQuery}%`),
            like(leads.lastName, `%${searchQuery}%`),
            like(leads.company, `%${searchQuery}%`),
            like(leads.email, `%${searchQuery}%`)
          )
        );
      }
      
      // Apply status filter if provided and not 'all'
      if (statusFilter && statusFilter !== 'all') {
        queryBuilder = queryBuilder.where(eq(leads.status, statusFilter));
      }
      
      // Get total count first for pagination (using count())
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .execute();
      
      const totalItems = countResult[0]?.count || 0;
      
      // Apply sorting, limit and offset
      const result = await queryBuilder
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      
      // Fetch tags for each lead
      const leadsWithTags = await Promise.all(
        result.map(async (row) => {
          const leadId = row.leads.id;
          const tagsResult = await db.select({
            name: tagsTable.name
          })
          .from(leadTags)
          .innerJoin(tagsTable, eq(leadTags.tagId, tagsTable.id))
          .where(eq(leadTags.leadId, leadId))
          .execute();
          
          const tags = tagsResult.map(tag => tag.name);
          
          return {
            ...row.leads,
            tags,
            assignedToName: row.sales_team?.name || null
          };
        })
      );
      
      // Calculate pagination details
      const totalPages = Math.ceil(totalItems / limit);
      const startItem = Math.min(offset + 1, totalItems);
      const endItem = Math.min(offset + limit, totalItems);
      
      return {
        leads: leadsWithTags,
        totalItems,
        totalPages,
        startItem,
        endItem
      };
    } catch (error) {
      console.error('Error in getLeads:', error);
      throw error;
    }
  },
  
  async getRecentLeads(limit = 5) {
    try {
      const result = await db.select()
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .execute();
      
      // Fetch tags for each lead
      const leadsWithTags = await Promise.all(
        result.map(async (lead) => {
          const tagsResult = await db.select({
            name: tagsTable.name
          })
          .from(leadTags)
          .innerJoin(tagsTable, eq(leadTags.tagId, tagsTable.id))
          .where(eq(leadTags.leadId, lead.id))
          .execute();
          
          const tags = tagsResult.map(tag => tag.name);
          
          return {
            ...lead,
            tags
          };
        })
      );
      
      return leadsWithTags;
    } catch (error) {
      console.error('Error in getRecentLeads:', error);
      throw error;
    }
  },
  
  async getAllLeads() {
    try {
      const result = await db.select()
        .from(leads)
        .leftJoin(salesTeam, eq(leads.assignedTo, salesTeam.id))
        .orderBy(desc(leads.createdAt))
        .execute();
      
      // Fetch tags for each lead
      const leadsWithTags = await Promise.all(
        result.map(async (row) => {
          const leadId = row.leads.id;
          const tagsResult = await db.select({
            name: tagsTable.name
          })
          .from(leadTags)
          .innerJoin(tagsTable, eq(leadTags.tagId, tagsTable.id))
          .where(eq(leadTags.leadId, leadId))
          .execute();
          
          const tags = tagsResult.map(tag => tag.name);
          
          return {
            ...row.leads,
            tags,
            assignedToName: row.sales_team?.name || null
          };
        })
      );
      
      return leadsWithTags;
    } catch (error) {
      console.error('Error in getAllLeads:', error);
      throw error;
    }
  },
  
  async getLeadById(id: string) {
    try {
      const result = await db.select()
        .from(leads)
        .where(eq(leads.id, id))
        .leftJoin(salesTeam, eq(leads.assignedTo, salesTeam.id))
        .execute();
      
      if (result.length === 0) {
        return null;
      }
      
      const lead = result[0];
      
      // Fetch tags for the lead
      const tagsResult = await db.select({
        name: tagsTable.name
      })
      .from(leadTags)
      .innerJoin(tagsTable, eq(leadTags.tagId, tagsTable.id))
      .where(eq(leadTags.leadId, id))
      .execute();
      
      const tags = tagsResult.map(tag => tag.name);
      
      return {
        ...lead.leads,
        tags,
        assignedToName: lead.sales_team?.name || null
      };
    } catch (error) {
      console.error('Error in getLeadById:', error);
      throw error;
    }
  },
  
  async createLead(leadData: z.infer<typeof leadInsertSchema>) {
    try {
      // Extract tags from the lead data
      const { tags: leadTags, ...leadFields } = leadData;
      
      // Insert the lead
      const [newLead] = await db.insert(leads)
        .values(leadFields)
        .returning();
      
      // Handle tags if they exist
      if (leadTags && leadTags.length > 0) {
        await this.addTagsToLead(newLead.id, leadTags);
      }
      
      // Return the created lead with tags
      return {
        ...newLead,
        tags: leadTags || []
      };
    } catch (error) {
      console.error('Error in createLead:', error);
      throw error;
    }
  },
  
  async updateLead(id: string, leadData: Partial<z.infer<typeof leadInsertSchema>>) {
    try {
      // Extract tags from the lead data
      const { tags: newTags, ...leadFields } = leadData;
      
      // Update the lead
      const [updatedLead] = await db.update(leads)
        .set(leadFields)
        .where(eq(leads.id, id))
        .returning();
      
      // Handle tags if they exist
      if (newTags) {
        // First remove existing tags
        await db.delete(leadTags)
          .where(eq(leadTags.leadId, id))
          .execute();
        
        // Then add the new tags
        await this.addTagsToLead(id, newTags);
      }
      
      // Fetch the updated lead with tags
      return this.getLeadById(id);
    } catch (error) {
      console.error('Error in updateLead:', error);
      throw error;
    }
  },
  
  async assignLead(id: string, salesPersonId: string | null) {
    try {
      // Update the lead's assignedTo field
      const [updatedLead] = await db.update(leads)
        .set({ 
          assignedTo: salesPersonId,
          status: salesPersonId ? 'Assigned' : 'New' // Update status based on assignment
        })
        .where(eq(leads.id, id))
        .returning();
      
      // Fetch the updated lead with all details
      return this.getLeadById(id);
    } catch (error) {
      console.error('Error in assignLead:', error);
      throw error;
    }
  },
  
  async deleteLead(id: string) {
    try {
      // First delete associated tags
      await db.delete(leadTags)
        .where(eq(leadTags.leadId, id))
        .execute();
      
      // Then delete the lead
      await db.delete(leads)
        .where(eq(leads.id, id))
        .execute();
      
      return true;
    } catch (error) {
      console.error('Error in deleteLead:', error);
      throw error;
    }
  },
  
  async getLeadStatistics() {
    try {
      // Get total leads count
      const totalLeadsResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .execute();
      
      // Get contacted leads count
      const contactedLeadsResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.status, 'Contacted'))
        .execute();
      
      // Get pending (assigned) leads count
      const pendingLeadsResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.status, 'Assigned'))
        .execute();
      
      // Get hot leads count (leads with "Hot Lead" tag)
      // First get the tag ID for "Hot Lead"
      const hotTagResult = await db.select()
        .from(tagsTable)
        .where(eq(tagsTable.name, 'Hot Lead'))
        .execute();
      
      let hotLeadsCount = 0;
      
      if (hotTagResult.length > 0) {
        const hotTagId = hotTagResult[0].id;
        
        const hotLeadsResult = await db.select({ count: sql<number>`count(distinct ${leadTags.leadId})` })
          .from(leadTags)
          .where(eq(leadTags.tagId, hotTagId))
          .execute();
        
        hotLeadsCount = hotLeadsResult[0]?.count || 0;
      }
      
      // Calculate change percentages (mock for now)
      // In a real app, you would compare to previous period
      return {
        totalLeads: {
          count: totalLeadsResult[0]?.count || 0,
          change: 12 // Percentage increase from previous period
        },
        contactedLeads: {
          count: contactedLeadsResult[0]?.count || 0,
          change: 8
        },
        pendingLeads: {
          count: pendingLeadsResult[0]?.count || 0,
          change: -5 // Negative means decrease
        },
        hotLeads: {
          count: hotLeadsCount,
          change: 14
        }
      };
    } catch (error) {
      console.error('Error in getLeadStatistics:', error);
      throw error;
    }
  },
  
  // Sales team operations
  async getSalesTeam() {
    try {
      return await db.select()
        .from(salesTeam)
        .execute();
    } catch (error) {
      console.error('Error in getSalesTeam:', error);
      throw error;
    }
  },
  
  // Helper methods
  async addTagsToLead(leadId: string, tagNames: string[]) {
    try {
      for (const tagName of tagNames) {
        // Check if tag exists
        let tagId;
        const existingTag = await db.select()
          .from(tagsTable)
          .where(eq(tagsTable.name, tagName))
          .execute();
        
        if (existingTag.length > 0) {
          tagId = existingTag[0].id;
        } else {
          // Create the tag if it doesn't exist
          const [newTag] = await db.insert(tagsTable)
            .values({ name: tagName })
            .returning();
          
          tagId = newTag.id;
        }
        
        // Add the tag to the lead
        await db.insert(leadTags)
          .values({ leadId, tagId })
          .onConflictDoNothing()
          .execute();
      }
    } catch (error) {
      console.error('Error in addTagsToLead:', error);
      throw error;
    }
  }
};
