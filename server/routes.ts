import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { json2csv } from "json-2-csv";
import { z } from "zod";
import { leadInsertSchema, leadSelectSchema } from "@shared/schema";
// Import from OpenAI implementation instead of Google Gemini
import { analyzeLeadData, analyzeLeadQuality } from "./openai";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

      try {
        console.log('Analyzing speech text with AI...');
        const analysisResult = await analyzeLeadData(speechText);
        console.log('AI analysis complete:', analysisResult);
        return res.json(analysisResult);
      } catch (aiError) {
        console.warn('AI analysis failed, using fallback:', aiError);
        
        // Advanced conversational fallback
        // Extract information from natural language speech
        const lowercaseText = speechText.toLowerCase();
        
        // Extract names with conversational context
        let firstName = '';
        let lastName = '';
        
        // Pattern for "I met someone named X Y"
        const metNamePattern = /(?:met|with|spoke|talked|called)(?:.*?)(?:named|called|is|was)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
        const metMatch = speechText.match(metNamePattern);
        if (metMatch && metMatch.length >= 3) {
          firstName = metMatch[1];
          lastName = metMatch[2];
        }
        
        // Fallback pattern - just find a name
        if (!firstName && !lastName) {
          const namePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
          const nameMatch = speechText.match(namePattern);
          if (nameMatch && nameMatch.length >= 3) {
            firstName = nameMatch[1];
            lastName = nameMatch[2];
          }
        }
        
        // Extract company with context like "from X" or "at Y"
        let company = '';
        const companyPattern = /(?:from|at|with|works at|works for|representing|employed by|employed at)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\.|,|\s\w+\s|$)/i;
        const companyMatch = speechText.match(companyPattern);
        if (companyMatch && companyMatch[1]) {
          company = companyMatch[1].trim();
        }
        
        // Extract title with context
        let title = '';
        const titlePattern = /(?:works as|is a|is the|job is|position is|role is|title is)\s+(?:a|the)?\s+([^,.]+?)(?:\s+at|\s+for|\s+with|\.|,|$)/i;
        const titleMatch = speechText.match(titlePattern);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
        
        // Basic patterns for contact info
        const emailMatch = speechText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        const phoneMatch = speechText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
        
        // Tag detection from conversation
        const tags = [];
        if (lowercaseText.includes('urgent') || lowercaseText.includes('priority') || 
            lowercaseText.includes('important') || lowercaseText.includes('asap')) {
          tags.push('Hot Lead');
        }
        
        if (lowercaseText.includes('demo') || lowercaseText.includes('presentation')) {
          tags.push('Demo Needed');
        }
        
        if (lowercaseText.includes('follow') || lowercaseText.includes('later')) {
          tags.push('Follow-up');
        }
        
        if (lowercaseText.includes('summit') || lowercaseText.includes('conference')) {
          tags.push('Tech Summit');
        }
        
        if (lowercaseText.includes('enterprise') || lowercaseText.includes('corporate')) {
          tags.push('Enterprise');
        }
        
        const fallbackResult = {
          firstName,
          lastName,
          title,
          company,
          email: emailMatch ? emailMatch[0] : '',
          phone: phoneMatch ? phoneMatch[0] : '',
          notes: speechText,
          tags,
          _fallback: true // Flag to indicate this is a fallback result
        };
        
        console.log('Using speech analysis fallback result:', fallbackResult);
        return res.json(fallbackResult);
      }
    } catch (error) {
      console.error('Error analyzing speech with AI:', error);
      res.status(500).json({
        message: 'Failed to analyze speech with AI',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  // AI-powered monologue analysis for lead extraction
  app.post(`${apiPrefix}/ai/analyze-monologue`, async (req, res) => {
    try {
      const { monologue } = req.body;

      if (!monologue || typeof monologue !== 'string') {
        return res.status(400).json({
          message: 'Missing or invalid monologue in request body',
        });
      }
      
      console.log('Processing full monologue for lead extraction...');
      
      try {
        // Use OpenAI to analyze the complete monologue
        const prompt = `
          You are a specialized lead extraction assistant for sales professionals. 
          Analyze this complete monologue from a sales person and extract ALL lead information.
          
          MONOLOGUE: "${monologue}"
          
          Identify and extract the following details from the monologue:
          1. The lead's first name and last name (required - if not explicitly clear, make an educated guess)
          2. Their job title (if mentioned)
          3. Their company name (required - if not explicitly clear, make an educated guess)
          4. Email address (if mentioned)
          5. Phone number (if mentioned, ensure it's correctly formatted)
          6. A brief summary of key points about this lead (in 1-2 sentences)
          
          Respond with a clean JSON object containing ONLY these fields:
          {
            "firstName": "...",
            "lastName": "...",
            "title": "...",
            "company": "...",
            "email": "...",
            "phone": "...",
            "summary": "Brief summary of important points"            
          }
          
          IMPORTANT: Pay special attention to phrases like "called as [Name]" or "from [Company]" for accurate extraction.
          If a field is genuinely not present in the monologue, return an empty string for that field.
        `;
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }
        
        const extractedData = JSON.parse(content);
        console.log('AI lead extraction complete:', extractedData);
        
        return res.json(extractedData);
      } catch (aiError) {
        console.warn('AI lead extraction failed, using fallback:', aiError);
        
        // Fallback to regex-based extraction
        const extractedData = {
          firstName: '',
          lastName: '',
          title: '',
          company: '',
          email: '',
          phone: '',
          summary: 'AI analysis unavailable. Basic extraction performed.',
          _fallback: true
        };
        
        // Pattern for name after "called as"
        const calledAsPattern = /called\s+(?:as\s+)?([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
        const calledAsMatch = monologue.match(calledAsPattern);
        if (calledAsMatch && calledAsMatch.length >= 3) {
          extractedData.firstName = calledAsMatch[1];
          extractedData.lastName = calledAsMatch[2];
        } else {
          // Try general name pattern
          const namePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
          const nameMatch = monologue.match(namePattern);
          if (nameMatch && nameMatch.length >= 3) {
            extractedData.firstName = nameMatch[1];
            extractedData.lastName = nameMatch[2];
          }
        }
        
        // Company pattern
        const companyPattern = /(?:works at|from|company called)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\.|,|\s\w+\s|$)/i;
        const companyMatch = monologue.match(companyPattern);
        if (companyMatch && companyMatch[1]) {
          extractedData.company = companyMatch[1].trim();
        }
        
        // Title pattern
        const titlePattern = /(?:position|title|works as|is a|is the)\s+(?:a|the)?\s+([^,.]+?)(?:\s+at|\s+in|\s+for|\s+with|\.|,|$)/i;
        const titleMatch = monologue.match(titlePattern);
        if (titleMatch && titleMatch[1]) {
          extractedData.title = titleMatch[1].trim();
        }
        
        // Contact info
        const emailMatch = monologue.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          extractedData.email = emailMatch[0];
        }
        
        const phoneMatch = monologue.match(/(\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4})/);
        if (phoneMatch) {
          extractedData.phone = phoneMatch[0];
        }
        
        console.log('Using fallback lead extraction result:', extractedData);
        return res.json(extractedData);
      }
    } catch (error) {
      console.error('Error analyzing monologue:', error);
      res.status(500).json({
        message: 'Failed to analyze monologue',
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
        console.log('Analyzing lead quality with AI...');
        const analysisResult = await analyzeLeadQuality(leadData);
        console.log('AI quality analysis complete:', analysisResult);
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
        
        console.log('Using quality analysis fallback result:', fallbackResult);
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
