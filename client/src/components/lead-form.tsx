import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, formatPhoneNumber, isValidEmail } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { isOffline, generateOfflineId } from "@/lib/utils";

interface Tag {
  name: string;
  color: { bg: string; text: string };
}

interface LeadFormProps {
  initialData?: {
    firstName: string;
    lastName: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    notes: string;
    tags: string[];
    status: string;
  };
  speechText?: string;
  detectedTags?: string[];
  onFormChange?: (data: any) => void;
}

const LeadForm = ({ initialData, speechText, detectedTags = [], onFormChange }: LeadFormProps) => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);

  // Define form with react-hook-form
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: "",
      lastName: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      notes: "",
      status: "New"
    }
  });

  // Watch form fields for changes
  const formValues = watch();

  // Fetch sales team members for assignment
  const { data: salesTeam } = useQuery({
    queryKey: ['/api/sales-team'],
    enabled: !isOffline(), // Only fetch when online
  });

  // Attempt to parse speech text into form fields when it changes
  useEffect(() => {
    if (!speechText) return;

    // Try to extract information from the speech text
    // Note: This is a simple pattern matching approach, in a real app
    // you would use a more sophisticated NLP approach

    // Look for name patterns
    const nameMatch = speechText.match(/(?:(?:this is|i am|name is|name's)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([A-Z][a-z]+)/i);
    if (nameMatch && nameMatch.length >= 3) {
      setValue('firstName', nameMatch[1]);
      setValue('lastName', nameMatch[2]);
    }

    // Look for title and company patterns
    const titleCompanyMatch = speechText.match(/(?:(?:I am|I'm|position is|title is|work as)(?:\s+a|\s+the)?\s+)([^,.]+ at ([^,.]+))/i);
    if (titleCompanyMatch && titleCompanyMatch.length >= 3) {
      const fullMatch = titleCompanyMatch[1];
      const companyMatch = titleCompanyMatch[2];
      
      if (companyMatch) {
        setValue('company', companyMatch.trim());
        
        // Remove company from the full match to get title
        const title = fullMatch.replace(` at ${companyMatch}`, '').trim();
        setValue('title', title);
      }
    }

    // Look for email pattern
    const emailMatch = speechText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      setValue('email', emailMatch[0]);
    }

    // Look for phone pattern (various formats)
    const phoneMatch = speechText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      setValue('phone', formatPhoneNumber(phoneMatch[0]));
    }

    // Use the rest as notes if no specific pattern was found
    if (!formValues.notes) {
      setValue('notes', speechText);
    }

  }, [speechText, setValue, formValues.notes]);

  // Add detected tags when they change
  useEffect(() => {
    if (detectedTags.length > 0) {
      const newTags = detectedTags.map(tag => ({
        name: tag,
        color: getTagColor(tag)
      }));

      // Add only tags that don't already exist
      setTags(prevTags => {
        const existingTagNames = prevTags.map(t => t.name);
        const filteredNewTags = newTags.filter(t => !existingTagNames.includes(t.name));
        return [...prevTags, ...filteredNewTags];
      });
    }
  }, [detectedTags]);
  
  // Listen for AI analysis results from VoiceRecorder
  useEffect(() => {
    const handleAiAnalysis = (event: CustomEvent<any>) => {
      const analysisResult = event.detail;
      console.log('AI Analysis received:', analysisResult);
      
      // Check if we're dealing with a fallback or AI result
      const isFallbackResult = analysisResult._fallback === true;
      
      // Process conversational speech more thoroughly
      if (analysisResult.notes && (!analysisResult.firstName || !analysisResult.lastName)) {
        // Advanced name parsing for conversational speech
        const speechText = analysisResult.notes;
        
        // Try to extract names with different patterns specific to conversational speech
        const namePatterns = [
          // "called as Harshita Chawla" - very specific to the example
          /called\s+(?:as\s+)?([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
          // "I met this sales woman called Harshita Chawla from..."
          /(?:met|with|spoke to|talked to|contacted)(?:.*?)(?:called|named|by the name of|whose name is)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
          // "Harshita Chawla from Masters Union mentioned..."
          /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:from|at|with|of|comes from)\s+([A-Za-z\s&]+)/i,
          // Standard name extraction as fallback
          /([A-Z][a-z]+)\s+([A-Z][a-z]+)/i
        ];
        
        // Try each pattern until we find a match
        for (const pattern of namePatterns) {
          const match = speechText.match(pattern);
          if (match && match.length >= 3) {
            analysisResult.firstName = match[1]; 
            analysisResult.lastName = match[2];
            console.log('Name match found:', match[1], match[2]);
            break;
          }
        }
        
        // Try to extract company if not already present
        if (!analysisResult.company) {
          const companyPatterns = [
            // "organization called Masters Union" - very specific to example
            /(?:organization|organisation|company|business|firm)\s+called\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+and|\.|,|\s\w+\s|$)/i,
            // "comes from the organization called Masters Union"
            /(?:from|at|with|works at|works for|representing|employed by|employed at|comes from)\s+(?:the\s+)?(?:organization|organisation|company|business|firm)?\s+(?:called\s+)?([A-Z][A-Za-z0-9\s&.]+?)(?:\s+and|\.|,|\s\w+\s|$)/i,
            // "from Masters Union"
            /(?:from|at|with|works at|works for|representing|employed by|employed at)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\.|,|\s\w+\s|$)/i,
            // "Masters Union representative"
            /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:representative|rep|delegate|employee|staff)/i
          ];
          
          for (const pattern of companyPatterns) {
            const match = speechText.match(pattern);
            if (match && match[1]) {
              analysisResult.company = match[1].trim();
              console.log('Company match found:', match[1]);
              break;
            }
          }
        }
      }
      
      // Fix for when first name might be set incorrectly to "met this"
      if (analysisResult.firstName === 'met this' || analysisResult.firstName === 'I met this' || analysisResult.firstName === 'so I met this') {
        // Try to extract from notes again with the most specific pattern
        const noteText = analysisResult.notes || '';
        const nameMatch = noteText.match(/called\s+(?:as\s+)?([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
        if (nameMatch && nameMatch.length >= 3) {
          console.log('Found name in fallback regex:', nameMatch[1], nameMatch[2]);
          analysisResult.firstName = nameMatch[1];
          analysisResult.lastName = nameMatch[2];
        }
      }
      
      // Set form values from processed analysis result
      if (analysisResult.firstName) setValue('firstName', analysisResult.firstName);
      if (analysisResult.lastName) setValue('lastName', analysisResult.lastName);
      if (analysisResult.title) setValue('title', analysisResult.title);
      if (analysisResult.company) setValue('company', analysisResult.company);
      if (analysisResult.email) setValue('email', analysisResult.email);
      if (analysisResult.phone) setValue('phone', analysisResult.phone);
      if (analysisResult.notes) setValue('notes', analysisResult.notes);
    };
    
    // Add event listener for custom AI analysis event
    document.addEventListener('ai-analysis', handleAiAnalysis as EventListener);
    
    return () => {
      document.removeEventListener('ai-analysis', handleAiAnalysis as EventListener);
    };
  }, [setValue]);

  // Notify parent component of form changes
  useEffect(() => {
    if (onFormChange) {
      onFormChange({ ...formValues, tags: tags.map(t => t.name) });
    }
  }, [formValues, tags, onFormChange]);

  const getTagColor = (tagName: string) => {
    const tagColors: Record<string, { bg: string, text: string }> = {
      "Hot Lead": { bg: "bg-red-100", text: "text-red-800" },
      "Demo Needed": { bg: "bg-blue-100", text: "text-blue-800" },
      "Tech Summit": { bg: "bg-green-100", text: "text-green-800" },
      "Follow-up": { bg: "bg-yellow-100", text: "text-yellow-800" },
      "Enterprise": { bg: "bg-blue-100", text: "text-blue-800" }
    };

    return tagColors[tagName] || { bg: "bg-gray-100", text: "text-gray-800" };
  };

  const addTag = (tagName: string) => {
    if (!tagName.trim()) return;
    
    const newTag = {
      name: tagName,
      color: getTagColor(tagName)
    };

    setTags(prev => [...prev, newTag]);
  };

  const removeTag = (tagName: string) => {
    setTags(prev => prev.filter(tag => tag.name !== tagName));
  };

  const onSubmit = async (data: any) => {
    // Validate email
    if (data.email && !isValidEmail(data.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Format phone number
    if (data.phone) {
      data.phone = formatPhoneNumber(data.phone);
    }

    // Add tags to the form data
    const formData = {
      ...data,
      tags: tags.map(tag => tag.name)
    };

    try {
      if (isOffline()) {
        // Store in localStorage for offline mode
        const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
        const leadWithId = {
          ...formData,
          id: generateOfflineId(),
          createdAt: new Date().toISOString(),
          syncStatus: 'pending'
        };
        
        localStorage.setItem('offlineLeads', JSON.stringify([...offlineLeads, leadWithId]));
        
        toast({
          title: "Saved Offline",
          description: "Lead saved locally. Will sync when back online.",
        });
      } else {
        // Send to server
        await apiRequest('POST', '/api/leads', formData);
        
        toast({
          title: "Lead Saved",
          description: "The lead has been successfully saved.",
        });
      }

      // Reset form or keep values as needed
      // In a real app, you might redirect or clear the form
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Error",
        description: "Failed to save the lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <CardTitle className="text-lg">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form id="lead-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <Label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">First Name</Label>
              <Input 
                type="text" 
                id="firstName" 
                {...register('firstName', { required: "First name is required" })}
                className={cn(
                  "mt-1",
                  errors.firstName && "border-red-500"
                )}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-500">{errors.firstName.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">Last Name</Label>
              <Input 
                type="text" 
                id="lastName" 
                {...register('lastName', { required: "Last name is required" })}
                className={cn(
                  "mt-1",
                  errors.lastName && "border-red-500"
                )}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-500">{errors.lastName.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="title" className="block text-sm font-medium text-neutral-700">Title</Label>
              <Input 
                type="text" 
                id="title" 
                {...register('title')}
                className="mt-1"
              />
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="company" className="block text-sm font-medium text-neutral-700">Company</Label>
              <Input 
                type="text" 
                id="company" 
                {...register('company')}
                className="mt-1"
              />
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email</Label>
              <Input 
                type="email" 
                id="email" 
                {...register('email', { 
                  pattern: {
                    value: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
                    message: "Please enter a valid email address"
                  }
                })}
                className={cn(
                  "mt-1",
                  errors.email && "border-red-500"
                )}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="phone" className="block text-sm font-medium text-neutral-700">Phone</Label>
              <Input 
                type="tel" 
                id="phone" 
                {...register('phone')}
                className="mt-1"
                onChange={(e) => {
                  register('phone').onChange(e);
                  // Format as user types
                  const formatted = formatPhoneNumber(e.target.value);
                  if (formatted !== e.target.value) {
                    setValue('phone', formatted);
                  }
                }}
              />
            </div>
            
            <div className="sm:col-span-2">
              <Label htmlFor="notes" className="block text-sm font-medium text-neutral-700">Notes</Label>
              <Textarea 
                id="notes" 
                rows={3} 
                {...register('notes')}
                className="mt-1"
              />
            </div>
            
            <div className="sm:col-span-2">
              <Label htmlFor="tags" className="block text-sm font-medium text-neutral-700">Tags</Label>
              <div className="mt-1 flex flex-wrap gap-2" id="tags-container">
                {tags.map((tag) => (
                  <span 
                    key={tag.name}
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${tag.color.bg} ${tag.color.text}`}
                  >
                    {tag.name}
                    <button 
                      type="button" 
                      className={`ml-1 ${tag.color.text.replace('text-', 'text-')} hover:opacity-80`} 
                      aria-label={`Remove ${tag.name} tag`}
                      onClick={() => removeTag(tag.name)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Add tag..."
                    className="text-xs py-1 px-2 h-6"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <Label htmlFor="status" className="block text-sm font-medium text-neutral-700">Status</Label>
              <Select 
                defaultValue={formValues.status} 
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-5 flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              className="mr-3"
              onClick={() => {
                // Reset form
                setValue('firstName', '');
                setValue('lastName', '');
                setValue('title', '');
                setValue('company', '');
                setValue('email', '');
                setValue('phone', '');
                setValue('notes', '');
                setValue('status', 'New');
                setTags([]);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeadForm;
