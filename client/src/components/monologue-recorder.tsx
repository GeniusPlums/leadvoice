import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MonologueRecorderProps {
  onExtractedData?: (data: any) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface ExtractedLead {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  summary: string;
}

const MonologueRecorder = ({ onExtractedData }: MonologueRecorderProps) => {
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [monologue, setMonologue] = useState("");
  const [extractedLead, setExtractedLead] = useState<ExtractedLead | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the monologue with whatever we have so far
        const fullText = monologue + finalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
        setMonologue(fullText);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionEvent) => {
        console.error("Speech recognition error", event.error);
        setStatus("Error: " + event.error);
        toast({
          title: "Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
        });
        stopRecording();
      };

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    } else {
      setStatus("Speech recognition not supported");
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
    }
  }, [monologue, toast]);

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setStatus("Recording your monologue... keep talking");
        // Don't clear any existing monologue
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast({
          title: "Failed to Start",
          description: "Could not start recording. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setStatus("Ready");
    }
  };

  const analyzeMonologue = async () => {
    if (!monologue.trim()) {
      toast({
        title: "No Speech Recorded",
        description: "Please record your monologue before analyzing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatus("Analyzing your monologue...");

      // Send the complete monologue to the server for analysis
      const response = await fetch('/api/ai/analyze-monologue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ monologue })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Monologue analysis result:', result);

      // Set extracted lead data
      setExtractedLead(result);

      // Notify parent component if needed
      if (onExtractedData) {
        onExtractedData(result);
      }

      toast({
        title: "Analysis Complete",
        description: "Your monologue has been analyzed and lead information extracted.",
      });
    } catch (error) {
      console.error("Error analyzing monologue:", error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your monologue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStatus("Ready");
    }
  };

  const clearAll = () => {
    setMonologue("");
    setExtractedLead(null);
  };

  return (
    <Card className="w-full">
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lead Monologue Recorder</CardTitle>
          <span className={`text-sm ${isRecording ? 'text-red-500' : isProcessing ? 'text-blue-500' : 'text-neutral-500'}`}>
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {!extractedLead ? (
          <>
            <div className="flex justify-center mt-2 mb-6">
              <button 
                className={`relative h-24 w-24 flex items-center justify-center rounded-full bg-red-50 border-4 ${isRecording ? 'border-red-500 recording-pulse' : isProcessing ? 'border-blue-500 processing-pulse' : 'border-red-100'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing..." : "Start recording"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                ) : (
                  <Mic className={`h-12 w-12 ${isRecording ? 'text-red-500' : 'text-red-400'}`} />
                )}
              </button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-neutral-600 mb-2">Your Monologue:</p>
              <div 
                className="border border-gray-200 rounded-md p-3 h-48 overflow-y-auto bg-gray-50 text-neutral-800" 
                aria-live="polite"
              >
                {monologue ? (
                  monologue
                ) : (
                  <p className="text-gray-400 italic">Start speaking to record your monologue. Talk about the lead you met, including their name, company, and any other details.</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={clearAll}
                disabled={isRecording || isProcessing || !monologue}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button 
                onClick={analyzeMonologue}
                disabled={isRecording || isProcessing || !monologue}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Analyze Lead
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Lead Information Extracted</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-base">{extractedLead.firstName} {extractedLead.lastName}</p>
                </div>
                {extractedLead.title && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Title</p>
                    <p className="text-base">{extractedLead.title}</p>
                  </div>
                )}
                {extractedLead.company && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Company</p>
                    <p className="text-base">{extractedLead.company}</p>
                  </div>
                )}
                {extractedLead.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-base">{extractedLead.email}</p>
                  </div>
                )}
                {extractedLead.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Phone</p>
                    <p className="text-base">{extractedLead.phone}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600">Summary</p>
                <p className="text-base">{extractedLead.summary}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={clearAll}
              >
                Record New Lead
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonologueRecorder;