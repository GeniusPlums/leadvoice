import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { PlusIcon } from "lucide-react";
import RecentLeads from "@/components/recent-leads";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MonologueRecorder from "@/components/monologue-recorder";
import { useToast } from "@/hooks/use-toast";

interface LeadData {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  summary: string;
}

const LeadCapture = () => {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [extractedData, setExtractedData] = useState<LeadData | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);

  const handleExtractedData = (data: LeadData) => {
    setExtractedData(data);
    
    // Auto-save the lead to the database using the extracted information
    if (data && data.firstName && data.lastName) {
      saveLeadToDatabase(data);
    }
  };
  
  const saveLeadToDatabase = async (data: LeadData) => {
    try {
      // Create a properly formatted lead object from the extracted data
      const leadData = {
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title || "",
        company: data.company || "",
        email: data.email || "",
        phone: data.phone || "",
        notes: data.summary || "",
        status: "New",
        tags: [] as string[]
      };
      
      // Add automatic tags based on the summary
      if (data.summary) {
        const summary = data.summary.toLowerCase();
        if (summary.includes('urgent') || summary.includes('important')) {
          leadData.tags.push('Hot Lead');
        }
        if (summary.includes('demo') || summary.includes('presentation')) {
          leadData.tags.push('Demo Needed');
        }
        if (summary.includes('follow') || summary.includes('later')) {
          leadData.tags.push('Follow-up');
        }
      }
      
      // Send to backend API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save lead: ${response.statusText}`);
      }
      
      // Add success notification
      toast({
        title: "Lead Saved Successfully",
        description: `${data.firstName} ${data.lastName} from ${data.company || 'Unknown Company'} has been added to your leads.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error saving lead:', error);
      
      // Add error notification
      toast({
        title: "Error Saving Lead",
        description: "There was a problem saving this lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
      <div className="md:flex md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-800">Lead Capture</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Record your complete monologue about a lead, then let AI extract all the details
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <Button onClick={() => setNewLeadDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>
      
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Main Column: Monologue Recorder */}
        <div className="md:col-span-1 space-y-6">
          <MonologueRecorder onExtractedData={handleExtractedData} />
        </div>
        
        {/* Second Column: Recent Leads */}
        <div className="md:col-span-1 space-y-6">
          <RecentLeads />
        </div>
      </div>

      {/* New Lead Dialog for mobile */}
      {isMobile && (
        <Dialog open={newLeadDialogOpen} onOpenChange={setNewLeadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <MonologueRecorder onExtractedData={handleExtractedData} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LeadCapture;
