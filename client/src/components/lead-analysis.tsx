import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LeadAnalysisProps {
  leadData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    company?: string;
    notes?: string;
    tags?: string[];
  };
}

const LeadAnalysis = ({ leadData }: LeadAnalysisProps) => {
  // State for AI-processed analysis
  const [leadQuality, setLeadQuality] = useState<number>(0);
  const [intent, setIntent] = useState<string>('Analyzing...');
  const [priority, setPriority] = useState<string>('Calculating lead quality...');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [insights, setInsights] = useState<string>('');
  const { toast } = useToast();
  
  // Use Gemini AI to analyze lead quality when leadData changes
  useEffect(() => {
    // Only analyze if we have minimum required information
    if (!leadData.firstName || !leadData.lastName) {
      // Calculate a basic score without AI if we don't have enough data
      const basicScore = calculateBasicScore();
      setLeadQuality(basicScore);
      setIntent('Incomplete Data');
      setPriority('Add more information to analyze');
      return;
    }
    
    // Don't analyze empty data
    const hasContent = Object.values(leadData).some(val => 
      (typeof val === 'string' && val.trim().length > 0) || 
      (Array.isArray(val) && val.length > 0));
      
    if (!hasContent) return;
    
    const analyzeWithAI = async () => {
      try {
        setIsAnalyzing(true);
        const response = await fetch('/api/ai/analyze-quality', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(leadData),
        });
        
        if (!response.ok) {
          throw new Error(`AI analysis failed with status: ${response.status}`);
        }
        
        const analysisResult = await response.json();
        console.log('AI Lead Quality Analysis:', analysisResult);
        
        // Update state with AI-generated insights
        if (analysisResult.score) setLeadQuality(Number(analysisResult.score));
        if (analysisResult.intent) setIntent(analysisResult.intent);
        if (analysisResult.priority) setPriority(analysisResult.priority);
        if (analysisResult.insights) setInsights(analysisResult.insights);
        
      } catch (error) {
        console.error('Error analyzing lead with AI:', error);
        // Fallback to basic scoring
        const basicScore = calculateBasicScore();
        setLeadQuality(basicScore);
        
        // Fallback to basic intent detection
        const basicIntent = detectBasicIntent();
        setIntent(basicIntent.intent);
        setPriority(basicIntent.priority);
        
        toast({
          title: "AI Analysis Unavailable",
          description: "Using basic analysis instead. Check console for details.",
          variant: "destructive"
        });
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    // Call AI analysis
    analyzeWithAI();
    
  }, [leadData, toast]);
  
  // Basic score calculation as fallback
  const calculateBasicScore = () => {
    const fields = [
      { name: 'firstName', weight: 15 },
      { name: 'lastName', weight: 15 },
      { name: 'email', weight: 20 },
      { name: 'phone', weight: 20 },
      { name: 'title', weight: 10 },
      { name: 'company', weight: 10 },
      { name: 'notes', weight: 5 }
    ];
    
    let score = 0;
    fields.forEach(field => {
      if (leadData[field.name as keyof typeof leadData]) {
        score += field.weight;
      }
    });
    
    // Add points for tags
    if (leadData.tags && leadData.tags.length > 0) {
      score += Math.min(leadData.tags.length * 5, 10); // Max 10 points for tags
    }
    
    return score;
  };
  
  // Basic intent detection as fallback
  const detectBasicIntent = () => {
    const notes = leadData.notes?.toLowerCase() || '';
    const tags = leadData.tags || [];
    
    if (notes.includes('demo') || notes.includes('presentation') || tags.includes('Demo Needed')) {
      return { intent: 'Demo Request', priority: 'High priority follow-up recommended' };
    }
    
    if (tags.includes('Hot Lead') || notes.includes('urgent') || notes.includes('priority')) {
      return { intent: 'Urgent Inquiry', priority: 'Immediate follow-up required' };
    }
    
    if (notes.includes('follow up') || notes.includes('follow-up') || tags.includes('Follow-up')) {
      return { intent: 'Follow-up Needed', priority: 'Schedule follow-up call' };
    }
    
    if (notes.includes('information') || notes.includes('info') || notes.includes('details')) {
      return { intent: 'Information Request', priority: 'Send product information' };
    }
    
    return { intent: 'General Inquiry', priority: 'Standard follow-up recommended' };
  };
  
  // Simulate finding similar leads
  const findSimilarLeads = () => {
    if (!leadData.company) return 0;
    
    // In a real app, this would query the database
    // Here we're just simulating based on tags
    if (leadData.tags?.includes('Tech Summit')) {
      return 2;
    }
    
    if (leadData.title?.includes('Manager') || leadData.title?.includes('Director')) {
      return 1;
    }
    
    return 0;
  };
  
  const similarLeadsCount = findSimilarLeads();
  const similarLeadsText = similarLeadsCount > 0 
    ? `${similarLeadsCount} similar ${similarLeadsCount === 1 ? 'lead' : 'leads'} ${leadData.tags?.includes('Tech Summit') ? 'from Tech Summit' : 'in database'}`
    : 'No similar leads found';

  // Determine lead quality color
  const getQualityColor = () => {
    if (leadQuality >= 75) return 'bg-green-500';
    if (leadQuality >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <CardTitle className="text-lg">Analysis</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-neutral-700">Lead Quality</h4>
          <div className="mt-1 w-full h-4 bg-gray-200 rounded">
            <Progress 
              className={`h-4 ${getQualityColor()}`} 
              value={leadQuality} 
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={leadQuality}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">Based on completeness of information and tags</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-neutral-700">Detected Intent</h4>
          <div className="mt-1 text-sm">
            {isAnalyzing ? (
              <div className="flex items-center">
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                <span className="text-gray-500">Analyzing with AI...</span>
              </div>
            ) : (
              <>
                <span className="font-medium text-green-600">{intent}</span> • 
                <span className="text-neutral-600 ml-1">{priority}</span>
              </>
            )}
          </div>
        </div>
        
        {insights && (
          <div>
            <h4 className="text-sm font-medium text-neutral-700">AI Insights</h4>
            <div className="mt-1 text-sm text-neutral-600 p-2 bg-blue-50 rounded">
              {insights}
            </div>
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium text-neutral-700">Similar Leads</h4>
          <div className="mt-1 text-sm text-neutral-600">
            {similarLeadsText}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadAnalysis;
