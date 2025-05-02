import { useState, useEffect, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Add TypeScript interfaces for the Web Speech API
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

// Declare global SpeechRecognition APIs
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceRecorderProps {
  onSpeechResult: (text: string) => void;
  onTagsDetected: (tags: string[]) => void;
}

const VoiceRecorder = ({ onSpeechResult, onTagsDetected }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [speechText, setSpeechText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // Ensure SpeechRecognition is defined with a type assertion
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
      } else {
        setStatus("Speech recognition not supported");
        toast({
          title: "Not Supported",
          description: "Speech recognition is not supported in this browser.",
          variant: "destructive",
        });
        return;
      }
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

        const fullText = finalTranscript || interimTranscript;
        setSpeechText(fullText);
        onSpeechResult(fullText);
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
  }, [onSpeechResult, toast]);

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setStatus("Recording...");
        setSpeechText("");
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

  const [isProcessing, setIsProcessing] = useState(false);

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setStatus("Processing...");
      
      // Process the text with AI
      if (speechText) {
        try {
          setIsProcessing(true);

          // Call the AI endpoint to analyze the speech
          const response = await fetch('/api/ai/analyze-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ speechText })
          });
          
          if (!response.ok) {
            throw new Error(`AI analysis failed with status: ${response.status}`);
          }
          
          // Extract the analysis result
          const analysisResult = await response.json();
          console.log('AI Speech Analysis Result:', analysisResult);
          
          // Send detected tags to parent component
          if (analysisResult.tags && Array.isArray(analysisResult.tags)) {
            onTagsDetected(analysisResult.tags);
          }
          
          // Call the original callback with the plain text
          onSpeechResult(speechText);
          
          // Also provide the structured data from AI
          if (typeof onSpeechResult === 'function') {
            // This lets the form component know there's additional AI-analyzed data
            const event = new CustomEvent('ai-analysis', { detail: analysisResult });
            document.dispatchEvent(event);
          }
          
          toast({
            title: "AI Analysis Complete",
            description: "Lead information extracted successfully.",
          });
        } catch (error) {
          console.error("Error analyzing speech with AI:", error);
          toast({
            title: "Analysis Error",
            description: "Failed to analyze speech with AI. Using basic processing instead.",
            variant: "destructive",
          });
          
          // Fallback to basic tag detection
          const tags = speechText.toLowerCase().includes('urgent') ? ['Hot Lead'] : 
                        speechText.toLowerCase().includes('demo') ? ['Demo Needed'] : [];
          onTagsDetected(tags);
        } finally {
          setIsProcessing(false);
          setStatus("Ready");
        }
      } else {
        setStatus("Ready");
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSave = () => {
    if (speechText.trim()) {
      // The onSpeechResult already sends the data
      // Just stop the recording and set the UI state
      stopRecording();
      toast({
        title: "Lead Information Captured",
        description: "The lead information has been processed.",
      });
    } else {
      toast({
        title: "No Speech Detected",
        description: "Please record some speech before saving.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Voice Recorder</CardTitle>
          <span id="recording-status" className={`text-sm ${isRecording ? 'text-red-500' : 'text-neutral-500'}`}>
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex justify-center mt-2">
          <button 
            id="record-button" 
            className={`relative h-24 w-24 flex items-center justify-center rounded-full bg-red-50 border-4 ${isRecording ? 'border-red-500 recording-pulse' : isProcessing ? 'border-blue-500 processing-pulse' : 'border-red-100'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
            aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing..." : "Start recording"}
            onClick={toggleRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Mic className={`h-12 w-12 ${isRecording ? 'text-red-500' : 'text-red-400'}`} />
            )}
          </button>
        </div>
        
        <div className="mt-8">
          <p className="text-sm text-neutral-600 mb-2">Recognized Speech:</p>
          <div 
            id="speech-output" 
            className="border border-gray-200 rounded-md p-3 h-32 overflow-y-auto bg-gray-50 text-neutral-800" 
            aria-live="polite"
          >
            {speechText ? (
              <p>{speechText}</p>
            ) : (
              <p className="text-neutral-500 italic">Speech will appear here while recording...</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setSpeechText("");
              stopRecording();
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!speechText.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Save Lead'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
