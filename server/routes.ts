import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { json2csv } from "json-2-csv";
import { z } from "zod";
import { leadInsertSchema, leadSelectSchema } from "@shared/schema";
import { analyzeLeadData, analyzeLeadQuality } from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiPrefix = '/api';

  // Get leads with pagination and filters
  app.get(`${apiPrefix}/leads`, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const searchQuery = req.query.search as string || '';
      const statusFilter = req.query.status as string || 'all';
      
      const { leads, totalItems, totalPages, startItem, endItem } = await storage.getLeads({
        page,
        limit,
        searchQuery,
        statusFilter
      });
      
      res.json({ leads, totalItems, totalPages, startItem, endItem });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ message: 'Failed to fetch leads' });
    }
  });

  // Get recent leads
  app.get(`${apiPrefix}/leads/recent`, async (req, res) => {
    try {
      const recentLeads = await storage.getRecentLeads(5);
      res.json(recentLeads);
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      res.status(500).json({ message: 'Failed to fetch recent leads' });
    }
  });

  // Get lead statistics
  app.get(`${apiPrefix}/leads/stats`, async (req, res) => {
    try {
      const stats = await storage.getLeadStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      res.status(500).json({ message: 'Failed to fetch lead statistics' });
    }
  });

  // Export leads as CSV
  app.get(`${apiPrefix}/leads/export`, async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      
      // Convert to CSV
      const csv = await json2csv(allLeads, {});
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      
      res.send(csv);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ message: 'Failed to export leads' });
    }
  });

  // Get specific lead by ID
  app.get(`${apiPrefix}/leads/:id`, async (req, res) => {
    try {
      const leadId = req.params.id;
      const lead = await storage.getLeadById(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ message: 'Failed to fetch lead' });
    }
  });

  // Create new lead
  app.post(`${apiPrefix}/leads`, async (req, res) => {
    try {
      // Validate the request body using the schema
      const validatedData = leadInsertSchema.parse(req.body);
      
      // Create the lead
      const newLead = await storage.createLead(validatedData);
      
      res.status(201).json(newLead);
    } catch (error) {
      console.error('Error creating lead:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid lead data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create lead' });
    }
  });

  // Update lead
  app.put(`${apiPrefix}/leads/:id`, async (req, res) => {
    try {
      const leadId = req.params.id;
      
      // Make sure lead exists
      const existingLead = await storage.getLeadById(leadId);
      if (!existingLead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      
      // Validate the request body using the schema
      const validatedData = leadInsertSchema.partial().parse(req.body);
      
      // Update the lead
      const updatedLead = await storage.updateLead(leadId, validatedData);
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid lead data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update lead' });
    }
  });

  // Assign lead to sales person
  app.patch(`${apiPrefix}/leads/:id/assign`, async (req, res) => {
    try {
      const leadId = req.params.id;
      const { assignedTo } = req.body;
      
      // Make sure lead exists
      const existingLead = await storage.getLeadById(leadId);
      if (!existingLead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      
      // Handle unassignment case (value will be "unassigned")
      const salesPersonId = assignedTo === 'unassigned' ? null : assignedTo;
      
      // Update the lead's assignment
      const updatedLead = await storage.assignLead(leadId, salesPersonId);
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Error assigning lead:', error);
      res.status(500).json({ message: 'Failed to assign lead' });
    }
  });

  // Delete lead
  app.delete(`${apiPrefix}/leads/:id`, async (req, res) => {
    try {
      const leadId = req.params.id;
      
      // Make sure lead exists
      const existingLead = await storage.getLeadById(leadId);
      if (!existingLead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      
      // Delete the lead
      await storage.deleteLead(leadId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ message: 'Failed to delete lead' });
    }
  });

  // Get sales team members
  app.get(`${apiPrefix}/sales-team`, async (req, res) => {
    try {
      const salesTeam = await storage.getSalesTeam();
      res.json(salesTeam);
    } catch (error) {
      console.error('Error fetching sales team:', error);
      res.status(500).json({ message: 'Failed to fetch sales team' });
    }
  });

  // Analyze speech text with AI
  app.post(`${apiPrefix}/ai/analyze-speech`, async (req, res) => {
    try {
      const { speechText } = req.body;

      if (!speechText || typeof speechText !== 'string') {
        return res.status(400).json({
          message: 'Missing or invalid speechText in request body',
        });
      }

      const analysisResult = await analyzeLeadData(speechText);
      res.json(analysisResult);
    } catch (error) {
      console.error('Error analyzing speech with AI:', error);
      res.status(500).json({
        message: 'Failed to analyze speech with AI',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Analyze lead quality with AI
  app.post(`${apiPrefix}/ai/analyze-quality`, async (req, res) => {
    try {
      const leadData = req.body;

      if (!leadData || typeof leadData !== 'object') {
        return res.status(400).json({
          message: 'Missing or invalid lead data in request body',
        });
      }

      try {
        const analysisResult = await analyzeLeadQuality(leadData);
        return res.json(analysisResult);
      } catch (aiError) {
        console.warn('AI quality analysis failed, using fallback:', aiError);
        
        // Calculate a basic score based on completeness
        let score = 0;
        const fields = [
          { name: 'firstName', weight: 15 },
          { name: 'lastName', weight: 15 },
          { name: 'email', weight: 20 },
          { name: 'phone', weight: 20 },
          { name: 'title', weight: 10 },
          { name: 'company', weight: 10 },
          { name: 'notes', weight: 5 }
        ];
        
        fields.forEach(field => {
          if (leadData[field.name]) {
            score += field.weight;
          }
        });
        
        // Add points for tags
        if (leadData.tags && Array.isArray(leadData.tags) && leadData.tags.length > 0) {
          score += Math.min(leadData.tags.length * 5, 10); // Max 10 points for tags
        }
        
        // Determine basic intent
        let intent = 'Unknown';
        let priority = 'Standard follow-up recommended';
        const notes = (leadData.notes || '').toLowerCase();
        const tags = Array.isArray(leadData.tags) ? leadData.tags : [];
        
        if (notes.includes('demo') || notes.includes('presentation') || tags.includes('Demo Needed')) {
          intent = 'Demo Request';
          priority = 'High priority follow-up recommended';
        } else if (tags.includes('Hot Lead') || notes.includes('urgent') || notes.includes('priority')) {
          intent = 'Urgent Inquiry';
          priority = 'Immediate follow-up required';
        } else if (notes.includes('follow up') || notes.includes('follow-up') || tags.includes('Follow-up')) {
          intent = 'Follow-up Needed';
          priority = 'Schedule follow-up call';
        } else if (notes.includes('information') || notes.includes('info') || notes.includes('details')) {
          intent = 'Information Request';
          priority = 'Send product information';
        }
        
        const fallbackResult = {
          score: score,
          intent: intent,
          priority: priority,
          insights: 'Analysis based on basic information completeness. AI-enhanced insights unavailable due to API limits.',
          _fallback: true
        };
        
        return res.json(fallbackResult);
      }
    } catch (error) {
      console.error('Error analyzing lead quality:', error);
      res.status(500).json({
        message: 'Failed to analyze lead quality',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
