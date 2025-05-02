import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Missing GOOGLE_GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

// Access the model - using gemini-1.5-pro for broader compatibility
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Extract information from speech text
export async function analyzeLeadData(speechText: string) {
  try {
    const prompt = `
    Extract the following information from this sales lead captured via speech-to-text. 
    If information is not found, leave the field empty.
    
    Speech text: "${speechText}"
    
    Return a JSON object with these fields:
    - firstName: The person's first name
    - lastName: The person's last name
    - title: Their job title
    - company: Their company name
    - email: Their email address
    - phone: Their phone number
    - notes: Any additional information or context
    - tags: An array of relevant tags from this list: ["Hot Lead", "Demo Needed", "Tech Summit", "Follow-up", "Enterprise"]. 
      Only include tags if there is clear evidence in the text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      throw new Error('No valid JSON found in response');
    } catch (jsonError) {
      console.error('Error parsing JSON from AI response:', jsonError);
      throw jsonError;
    }
  } catch (error) {
    console.error('Error analyzing lead data with AI:', error);
    throw error;
  }
}

// Analyze lead quality and provide insights
export async function analyzeLeadQuality(leadData: any) {
  try {
    const prompt = `
    Analyze this sales lead and provide insights. The data is:
    
    ${JSON.stringify(leadData, null, 2)}
    
    Return a JSON object with these fields:
    - score: A quality score from 0-100 based on completeness and value
    - intent: The likely intent (e.g., "Demo Request", "Information Request", etc.)
    - priority: A string with follow-up recommendation
    - insights: A brief analysis of the lead's potential value
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      throw new Error('No valid JSON found in response');
    } catch (jsonError) {
      console.error('Error parsing JSON from AI response:', jsonError);
      throw jsonError;
    }
  } catch (error) {
    console.error('Error analyzing lead quality with AI:', error);
    throw error;
  }
}
