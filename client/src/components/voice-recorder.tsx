import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { analyzeContextualTags } from "@/lib/utils";

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
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
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

      recognitionRef.current.onerror = (event) => {
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

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setStatus("Processing...");
      
      // Process the text for tags
      if (speechText) {
        const tags = analyzeContextualTags(speechText);
        onTagsDetected(tags);
      }
      
      // Set status back to ready after a short delay
      setTimeout(() => {
        setStatus("Ready");
      }, 1000);
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
            className={`relative h-24 w-24 flex items-center justify-center rounded-full bg-red-50 border-4 ${isRecording ? 'border-red-500 recording-pulse' : 'border-red-100'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            onClick={toggleRecording}
          >
            <Mic className={`h-12 w-12 ${isRecording ? 'text-red-500' : 'text-red-400'}`} />
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
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!speechText.trim()}
          >
            Save Lead
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
