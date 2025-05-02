import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { PlusIcon } from "lucide-react";
import VoiceRecorder from "@/components/voice-recorder";
import LeadForm from "@/components/lead-form";
import RecentLeads from "@/components/recent-leads";
import LeadAnalysis from "@/components/lead-analysis";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LeadFormData {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  tags: string[];
  status: string;
}

const LeadCapture = () => {
  const isMobile = useMobile();
  const [speechText, setSpeechText] = useState("");
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState<LeadFormData>({
    firstName: "",
    lastName: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    tags: [],
    status: "New"
  });
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);

  const handleSpeechResult = (text: string) => {
    setSpeechText(text);
  };

  const handleTagsDetected = (tags: string[]) => {
    setDetectedTags(tags);
  };

  const handleFormChange = (data: LeadFormData) => {
    setFormData(data);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
      <div className="md:flex md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-800">Lead Capture</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Speak into your microphone to capture lead information
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <Button onClick={() => setNewLeadDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>
      
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        {/* Left Column: Voice Recorder and Recent Leads */}
        <div className="md:col-span-2 space-y-6">
          <VoiceRecorder onSpeechResult={handleSpeechResult} onTagsDetected={handleTagsDetected} />
          <RecentLeads />
        </div>
        
        {/* Right Column: Lead Form and Analysis */}
        <div className="md:col-span-2 space-y-6">
          <LeadForm 
            speechText={speechText} 
            detectedTags={detectedTags} 
            onFormChange={handleFormChange} 
          />
          <LeadAnalysis leadData={formData} />
        </div>
      </div>

      {/* New Lead Dialog for mobile */}
      {isMobile && (
        <Dialog open={newLeadDialogOpen} onOpenChange={setNewLeadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LeadCapture;
