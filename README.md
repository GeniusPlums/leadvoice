# VoiceLead - AI-Powered Lead Capture SaaS

An AI-powered SaaS platform designed to transform lead capture for sales professionals through advanced voice recognition and intelligent data extraction. The application provides a comprehensive solution for networking event lead management, leveraging conversational voice input and smart information processing.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Technical Implementation](#technical-implementation)
  - [Voice Recognition](#voice-recognition)
  - [AI-Powered Analysis](#ai-powered-analysis)
  - [Database Schema](#database-schema)
  - [Frontend Components](#frontend-components)
  - [Backend Services](#backend-services)
- [API Reference](#api-reference)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)

## Overview

VoiceLead is designed for sales professionals who need to efficiently capture and manage leads during networking events. Instead of manually typing information or collecting business cards, users can simply record their conversations or summarize their meetings using voice, and the AI system extracts all relevant contact details and insights automatically.

## Architecture

The application follows a modern full-stack JavaScript architecture:

- **Frontend**: React with Shadcn UI components, Tailwind CSS, React Query
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: OpenAI API integration for speech analysis and lead quality assessment

## Key Features

1. **Voice-to-Lead Conversion**: Record conversations or monologues about leads and automatically extract structured data
2. **Real-time Speech Recognition**: Browser-based speech-to-text conversion using the Web Speech API
3. **AI-Powered Information Extraction**: Intelligent parsing of unstructured speech to extract names, companies, contact details, etc.
4. **Lead Quality Analysis**: AI assessment of lead quality, intent, and follow-up priority
5. **Comprehensive Lead Management**: Dashboard for organizing, filtering, and assigning leads
6. **Offline Support**: Fallback mechanisms when AI services or internet connection is unavailable
7. **Data Export**: Export lead data to CSV format

## Technical Implementation

### Voice Recognition

The application uses the Web Speech API (SpeechRecognition interface) to capture voice input directly in the browser. This provides a native, zero-dependency solution for real-time speech-to-text conversion.

```javascript
// Initialization of speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognitionRef.current = new SpeechRecognition();
  recognitionRef.current.continuous = true;
  recognitionRef.current.interimResults = true;
  recognitionRef.current.lang = 'en-US';
  
  // Configure event handlers...
}
```

The system supports two main recording modes:

1. **Short Voice Recordings**: Quick voice notes about a lead with real-time feedback
2. **Monologue Recording**: Extended recordings for detailed lead information after a meeting

### AI-Powered Analysis

The application uses OpenAI's GPT-4o API to analyze speech text and extract structured lead information. The system is designed with multiple layers of fallback mechanisms:

1. **Primary AI Analysis**: OpenAI GPT-4o for advanced natural language understanding
2. **Regex-Based Fallback**: When AI services are unavailable, the application falls back to regex pattern matching to extract basic information

#### Speech Analysis Implementation

```javascript
// From server/openai.ts
export async function analyzeLeadData(speechText: string) {
  try {
    const prompt = `
      You are a specialized lead extraction assistant for sales professionals. 
      Analyze this speech text and extract all lead information.
      
      SPEECH TEXT: "${speechText}"
      
      Extract information including name, company, title, contact info, etc.
      Return a clean JSON object with these standardized fields:
      {
        "firstName": "...",
        "lastName": "...",
        // Other fields
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing lead data with OpenAI:', error);
    throw error;
  }
}
```

#### Lead Quality Analysis

The system also performs AI-powered assessment of lead quality and provides actionable insights:

```javascript
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

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing lead quality with OpenAI:', error);
    throw error;
  }
}
```

### Database Schema

The application uses PostgreSQL with Drizzle ORM for data persistence. The database schema consists of four main tables:

1. **Leads**: Stores lead information including contact details and status
2. **Tags**: Categorization tags for leads
3. **LeadTags**: Junction table for many-to-many relationship between leads and tags
4. **SalesTeam**: Sales team members who can be assigned to leads

```typescript
// Lead table schema
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  status: text("status").notNull().default("New"),
  assignedTo: uuid("assigned_to").references(() => salesTeam.id),
  eventName: text("event_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships are defined using Drizzle ORM's relations function
export const leadsRelations = relations(leads, ({ one, many }) => ({
  salesPerson: one(salesTeam, {
    fields: [leads.assignedTo],
    references: [salesTeam.id],
  }),
  tags: many(leadTags),
}));
```

### Frontend Components

The frontend is built with React and uses the following key components:

1. **VoiceRecorder**: Handles short voice recordings for quick lead capture
2. **MonologueRecorder**: Manages longer conversational recordings with extended AI analysis
3. **LeadForm**: Form for displaying and editing lead information
4. **LeadTable**: Displays leads with filtering and sorting capabilities
5. **LeadAnalysis**: Shows AI-powered insights about lead quality and recommended actions
6. **Dashboard**: Main interface for lead management

#### Voice Recording Components

The voice recording components use React hooks to manage the Web Speech API:

```jsx
const VoiceRecorder = ({ onSpeechResult, onTagsDetected }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const recognitionRef = useRef(null);
  
  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      // Configure settings and event handlers
    }
  }, []);
  
  // Recording controls and AI analysis implementation
  // ...
};
```

### Backend Services

The backend provides RESTful API endpoints for:

1. **Lead Management**: CRUD operations for leads
2. **AI Analysis**: Endpoints for speech analysis and lead quality assessment
3. **Data Export**: Functionality to export leads to CSV

#### API Routes

The main API routes are defined in `server/routes.ts`:

```typescript
export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);
  const apiPrefix = '/api';
  
  // Lead management endpoints
  app.get(`${apiPrefix}/leads`, async (req, res) => { /* ... */ });
  app.post(`${apiPrefix}/leads`, async (req, res) => { /* ... */ });
  app.get(`${apiPrefix}/leads/:id`, async (req, res) => { /* ... */ });
  app.put(`${apiPrefix}/leads/:id`, async (req, res) => { /* ... */ });
  app.delete(`${apiPrefix}/leads/:id`, async (req, res) => { /* ... */ });
  
  // AI analysis endpoints
  app.post(`${apiPrefix}/ai/analyze-speech`, async (req, res) => { /* ... */ });
  app.post(`${apiPrefix}/ai/analyze-monologue`, async (req, res) => { /* ... */ });
  app.post(`${apiPrefix}/ai/analyze-quality`, async (req, res) => { /* ... */ });
  
  // Export functionality
  app.get(`${apiPrefix}/export/leads`, async (req, res) => { /* ... */ });
  
  return server;
}
```

## API Reference

### AI Analysis Endpoints

#### `POST /api/ai/analyze-speech`

Analyzes speech text to extract lead information.

**Request Body:**
```json
{
  "speechText": "I met with John Smith from Acme Inc. He's the CTO and is interested in our enterprise solution. His email is john@acme.com."
}
```

**Response:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "title": "CTO",
  "company": "Acme Inc",
  "email": "john@acme.com",
  "phone": "",
  "notes": "Interested in our enterprise solution",
  "tags": ["Enterprise"]
}
```

#### `POST /api/ai/analyze-monologue`

Analyzes a longer monologue to extract comprehensive lead information.

**Request Body:**
```json
{
  "monologue": "Today I had a great conversation with Sarah Johnson from XYZ Marketing..."
}
```

**Response:**
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "title": "Marketing Director",
  "company": "XYZ Marketing",
  "email": "sarah@xyz.com",
  "phone": "",
  "summary": "Interested in a demo next week for her marketing team. Has a budget of $50K."
}
```

#### `POST /api/ai/analyze-quality`

Analyzes a lead's quality and provides actionable insights.

**Request Body:**
```json
{
  "firstName": "Michael",
  "lastName": "Williams",
  "title": "CEO",
  "company": "Innovate Tech",
  "email": "michael@innovatetech.com",
  "phone": "(555) 123-4567",
  "notes": "Looking for an enterprise solution for his 500-person company.",
  "tags": ["Enterprise", "Hot Lead"]
}
```

**Response:**
```json
{
  "score": 92,
  "intent": "Purchasing Decision",
  "priority": "High Priority - Follow up within 24 hours",
  "insights": "This is a high-value enterprise lead with clear buying signals. The complete contact information and specific need make this a hot lead that should be prioritized for immediate follow-up."
}
```

## Installation and Setup

### Prerequisites

- Node.js v16+
- PostgreSQL database
- OpenAI API key

### Installation Steps

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see below)
4. Initialize the database: `npm run db:push`
5. Seed the database: `npm run db:seed`
6. Start the development server: `npm run dev`

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: API key for OpenAI services

Additional optional variables:

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

---

Built with ❤️ for sales professionals who hate manual data entry.
