import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  // Calculate lead quality based on completeness of information
  const calculateLeadQuality = () => {
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
  
  const leadQuality = calculateLeadQuality();
  
  // Determine intent based on notes and tags
  const detectIntent = () => {
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
  
  const { intent, priority } = detectIntent();
  
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
            <span className="font-medium text-green-600">{intent}</span> • 
            <span className="text-neutral-600 ml-1">{priority}</span>
          </div>
        </div>
        
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
