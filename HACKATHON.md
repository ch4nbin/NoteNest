# NoteNest - HackPrinceton Submission

## Overview
NoteNest is an AI-powered social note-taking platform that revolutionizes how students learn together. Using real-time AI assistance, students can transform lectures, videos, and articles into comprehensive study notes while collaborating with classmates.

## Prize Track Alignment

### Amazon - Best Practical AI Innovation
**Implementation:**
- Real-time AI note generation using Grok that autonomously analyzes content
- Intelligent Q&A system that understands context and provides helpful answers
- Automatic note organization with AI-generated titles and tags
- AI-powered note compilation that synthesizes multiple perspectives

**Autonomous Behavior:**
- AI continuously processes content and generates structured notes without manual intervention
- Context-aware responses adapt to the specific subject matter
- Automatic identification of key concepts and main ideas

### xAI - Best Use of Grok for Real-Time Data/Signal Analysis
**Implementation:**
- Grok analyzes URLs in real-time to extract key learning points
- Processes video transcripts, articles, and online lectures on-the-fly
- Real-time pattern recognition in student engagement data
- Live Q&A with immediate context-aware responses

**Real-Time Features:**
- Streaming note generation as content is consumed
- Instant question answering during study sessions
- Predictive analytics that identify learning patterns as they emerge

### X - Most Impactful Use of the X API
**Implementation:**
- One-click sharing of study achievements to X
- Social proof integration for note sharing
- Community building through X engagement
- Study group discovery via X connections

**Impact:**
- Encourages knowledge sharing across broader student communities
- Creates viral study sessions and collaborative learning moments
- Amplifies educational content reach

### ElevenLabs - Best Use of ElevenLabs
**Implementation:**
- Text-to-speech conversion for all notes
- Audio playback for accessibility and multitasking
- Natural-sounding voice synthesis for long-form study material

**Use Cases:**
- Listen to notes while commuting
- Accessibility for visually impaired students
- Audio review sessions

### Sierra - Best Use of Open Source Software
**Implementation:**
- Built on open-source Next.js framework
- Uses open-source Supabase for database
- Leverages open-source UI components (shadcn/ui)
- Open-source authentication libraries

### Chestnut Forty - Best Predictive Intelligence
**Implementation:**
- Analyzes note engagement patterns (views, time spent, questions asked)
- Predicts weak subject areas based on interaction data
- AI-generated personalized study recommendations
- Confidence scoring for prediction accuracy

**Predictive Features:**
- Identifies topics needing more review
- Suggests optimal study sequences
- Forecasts exam readiness

### Photon - Exploring Hybrid Intelligence (REQUIRED: iMessage Kit)
**Implementation:**
- iMessage integration for AI-powered study group chats
- AI agents that participate naturally in conversations
- Context-aware note sharing via iMessage
- Collaborative learning in native messaging environment

**Hybrid Intelligence:**
- AI seamlessly joins student conversations
- Understands social context and tone
- Bridges human discussion with AI assistance

## Technical Stack

### Core Technologies
- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** TailwindCSS v4 with pastel blue theme
- **Database:** Supabase (PostgreSQL with RLS)
- **Authentication:** Supabase Auth
- **AI:** Grok (xAI) for note generation and analysis

### Integrations
- **Voice:** ElevenLabs text-to-speech
- **Social:** X (Twitter) API for sharing
- **Messaging:** iMessage Kit for chat integration
- **Analytics:** Custom predictive intelligence system

### Key Features
1. **Real-Time AI Note Taking**
   - Paste any URL (YouTube, articles, lectures)
   - AI generates structured notes automatically
   - Live Q&A during learning sessions

2. **Social Learning**
   - Connect with classmates
   - Share public notes
   - View friends' learning progress

3. **Note Compilation**
   - Combine multiple notes with AI
   - Synthesize different perspectives
   - Create comprehensive study guides

4. **Predictive Analytics**
   - Track engagement patterns
   - Identify weak areas
   - Personalized recommendations

5. **Accessibility**
   - Audio playback of all notes
   - Clean, readable design
   - Keyboard navigation support

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- Environment variables (see below)

### Environment Variables
\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# AI
GROK_XAI_API_KEY=your_grok_api_key

# Optional Integrations
ELEVENLABS_API_KEY=your_elevenlabs_key
\`\`\`

### Installation
\`\`\`bash
# Clone repository
git clone [your-repo-url]
cd NoteNest

# Install dependencies
npm install

# Run database migrations
# Scripts are in the /scripts folder
# Execute them in order via Supabase dashboard or v0

# Start development server
npm run dev
\`\`\`

## Database Schema
- **profiles:** User information and settings
- **notes:** Individual study notes with tags and privacy settings
- **compiled_notes:** AI-generated combined notes
- **friendships:** Social connections between users
- **qna_history:** Question-answer pairs from study sessions
- **note_analytics:** Engagement tracking data
- **learning_insights:** Predictive analysis results

## Demo Flow

1. **Sign Up:** Create account with email/password
2. **Add Friends:** Search for classmates by username
3. **Create Note:** Paste a lecture URL or article
4. **AI Generation:** Watch as notes are generated in real-time
5. **Ask Questions:** Use Q&A tab for clarification
6. **Share & Compile:** Connect with friends and combine notes
7. **Audio Playback:** Listen to notes on-the-go
8. **Insights:** View predicted weak areas

## Why NoteNest Wins

**Amazon Track:** Most practical AI application - directly addresses real student needs
**Grok Track:** Best real-time analysis - immediate processing of educational content
**X API Track:** Most viral potential - social learning encourages organic sharing
**ElevenLabs:** Natural integration - audio enhances accessibility
**Sierra:** Fully open-source foundation - community-driven development
**Chestnut Forty:** Advanced prediction - ML-powered study optimization
**Photon:** True hybrid intelligence - AI that lives in your conversations

## Team
Built with passion at HackPrinceton 2025

## Links
- Live Demo: [your-deployment-url]
- GitHub: [your-github-url]
- Video Demo: [your-video-url]
