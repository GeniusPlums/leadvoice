import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Extract information from speech text
export async function analyzeLeadData(speechText: string) {
  try {
    const prompt = `
    Extract lead information from this conversational speech where a salesperson is describing someone they met. The speech is natural and unstructured.
    
    For example, if the person says "I met this sales woman called Harshita Chawla from Masters Union", you should extract:
    - firstName: "Harshita"
    - lastName: "Chawla"
    - company: "Masters Union"
    
    Speech text: "${speechText}"
    
    Extract information carefully, looking for context clues like "I met", "spoke with", "from [company]", etc.
    If information is not explicitly found, leave the field empty.
    
    Return a JSON object with these fields:
    - firstName: The person's first name
    - lastName: The person's last name
    - title: Their job title (if mentioned)
    - company: Their company name
    - email: Their email address
    - phone: Their phone number
    - notes: Include the full original speech text and any additional context
    - tags: An array of relevant tags from this list: ["Hot Lead", "Demo Needed", "Tech Summit", "Follow-up", "Enterprise"]. 
      Only include tags if there is clear evidence in the text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing lead data with OpenAI:', error);
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing lead quality with OpenAI:', error);
    throw error;
  }
}