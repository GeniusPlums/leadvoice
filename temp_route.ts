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
