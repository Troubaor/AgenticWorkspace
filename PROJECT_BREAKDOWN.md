# Project Breakdown: Sylvia Agentic Workspace

## 1. Project Overview

This is a Next.js application built with TypeScript, likely an "agentic workspace" named Sylvia. It appears to be a sophisticated web application that allows users to interact with an AI agent (Sylvia). The application has a chat interface as its core, but also includes several advanced features like article generation, web scraping, and a "Side-by-Side (SBS) Prompting" system. The UI is built with Shadcn/UI and Tailwind CSS, indicating a modern and component-based frontend architecture.

## 2. Key Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Components**: Shadcn/UI
- **Styling**: Tailwind CSS
- **State Management**: React Hooks, Context API, and `useLocalStorage` for persistence.
- **Database**: IndexedDB for client-side storage of articles and agent configurations.
- **AI/LLM Providers**:
    - Google Generative AI (Gemini)
    - OpenAI (for GPT-5 and vision analysis)
- **Web Scraping**: Firecrawl
- **Icons**: Lucide React

## 3. File Structure Breakdown

### `src/app`

This directory contains the main application routes, following the Next.js App Router convention.

- **`/` (page.tsx)**: The main chat interface, composed from `ChatLayout`.
- **`/agent` (page.tsx)**: A page for configuring the main "Sylvia" agent, including its system prompt, slash commands, and "context cartridges".
- **`/articles` (page.tsx)**: A feature for creating, editing, and managing articles. It uses IndexedDB for storage.
- **`/extensions` (page.tsx)**: A page to manage extensions, currently featuring "Firecrawl Web Scraping".
- **`/sbs` (page.tsx)**: The "Side-by-Side (SBS) Prompting" interface, which seems to be a tool for designing and testing complex AI prompts.
- **`/api`**: Contains all the backend API routes (Route Handlers).
    - **`/api/chat`**: The main chat endpoint that communicates with the Gemini model. It supports function calling for tools.
    - **`/api/auxiliary-chat`**: A separate chat endpoint that uses a GPT-5 model.
    - **`/api/articles`**: Endpoints for generating article content (HTML, images, prompts) using an AI model.
    - **`/api/firecrawl`**: API routes for web scraping, crawling, and mapping using the Firecrawl service.
    - **`/api/sbs`**: Endpoints for the Side-by-Side prompting feature.
    - **`/api/vision-analysis`**: An endpoint for analyzing images with a GPT model.

### `src/components`

This directory holds the React components.

- **`/ui`**: Contains the Shadcn/UI components.
- **`/articles`**: Components for the Article Designer feature (`ArticleCreator`, `ArticleEditor`, `ArticleLibrary`).
- **`/sbs`**: Components for the SBS Prompting feature.
- **Root Components**: Core components of the application like `ChatLayout`, `ChatInput`, `ChatMessages`, `Sidebar`, etc.

### `src/hooks`

Contains custom React hooks.

- **`use-agent-config.ts`**: Manages the agent's configuration in IndexedDB.
- **`use-mobile.tsx`**: Detects if the user is on a mobile device.
- **`useLocalStorage.ts`**: A generic hook for persisting state to local storage.

### `src/lib`

This directory contains library code, utilities, and type definitions.

- **`agent-utils.ts`**: Utility functions for the agent configuration.
- **`article-db.ts`**: A client-side database abstraction for managing articles in IndexedDB.
- **`indexeddb.ts`**: A more generic IndexedDB wrapper for agent and extension settings.
- **`openai-provider.ts`**: A wrapper for interacting with the OpenAI API.
- **`tools.ts`**: Defines the tools available to the Gemini model (e.g., `firecrawl_scrape`).
- **`types.ts`**: Core application type definitions.

## 4. Core Features

- **Agentic Chat**: A primary chat interface for interacting with the "Sylvia" AI agent.
- **Agent Configuration**: Users can customize the agent's behavior through a dedicated settings page. This includes setting the main prompt, creating custom slash commands, and managing "context cartridges" (reusable blocks of context).
- **Article Designer**: A full-featured article creation tool that uses AI to generate HTML content and images from raw text. Articles are stored locally in IndexedDB.
- **Web Scraping (Firecrawl Extension)**: The application integrates with Firecrawl to provide web scraping, crawling, and mapping capabilities, which can be invoked as tools by the AI agent.
- **Side-by-Side (SBS) Prompting**: A sophisticated tool for designing, testing, and managing complex AI prompts. It allows users to build "receptive prompts" and test them with "contextual queries".
- **Auxiliary Agent**: A secondary chat agent that uses a GPT-5 model and can perform vision analysis.
- **File Attachments**: The chat interface supports file attachments, including images, videos, audio, and PDFs.

## 5. Multi-Agent System

The application appears to be designed as a multi-agent system:

- **Main Agent (Sylvia)**: Powered by Gemini, this is the primary interface for the user. It has access to a set of tools (like Firecrawl).
- **Auxiliary Agent**: Powered by a GPT-5 model, this agent seems to serve a different purpose, possibly for more advanced or specialized tasks like vision analysis.
- **Claude**: The user mentioned that "Claude code is also working with us right now", which suggests a third agent might be involved, although its role is not immediately clear from the codebase.

The system is designed for collaboration, with features like the auxiliary agent being able to access context from the main agent's conversation.

## 6. Current Work Session Log

### **COMPLETED**: Blue Gradient Theme Update & API Configuration
**Date**: 2025-08-10
**Agent**: Claude Code (Sylvia assistant)
**Status**: ✅ COMPLETE

#### Tasks Completed:
1. **Visual Unification - Blue Gradient Update**:
   - Replaced all orange-to-red gradients with blue-to-blue gradients (`from-blue-500 to-blue-600`)
   - Updated across SBS components: `SBSBuilderPage`, `SBSPrompterPage`, main SBS page title
   - Updated across Article components: `ArticleLibrary`, `ArticleCreator`, `ArticleEditor`, main Articles page title
   - Updated API documentation comments in `generate-html/route.ts`
   - Applied hover states: `hover:from-blue-600 hover:to-blue-700`
   - Applied focus rings: `focus:ring-blue-500/30`

2. **Gemini API Key Update**:
   - Added new API key `AIzaSyD4zhDVTBKItoGCos3w2PnvXPayNZhgvmQ` to `.env.local`
   - Updated main chat route from `gemini-2.5-flash` to `gemini-2.0-flash-exp`
   - Verified all other routes already using `gemini-2.0-flash-exp`

3. **Build & Type Safety**:
   - Fixed ReactMarkdown className compatibility issues
   - Fixed auxiliary chat streaming type casting
   - Clean build successful with no TypeScript errors

#### Files Modified:
- `.env.local` - Added new Gemini API key
- `src/app/api/chat/route.ts` - Updated model to gemini-2.0-flash-exp
- `src/components/sbs/` - All gradient colors updated
- `src/components/articles/` - All gradient colors updated  
- `src/app/sbs/page.tsx` - Title gradient updated
- `src/app/articles/page.tsx` - Title gradient updated
- `src/app/api/articles/generate-html/route.ts` - Documentation colors updated

#### Technical Notes:
- All Gemini model calls now consistently use `gemini-2.0-flash-exp`
- Blue gradient maintains accessibility and visual coherence
- Build optimizations successful - clean TypeScript compilation

**Signed off by**: Claude Code
**Next**: Ready for testing of both SBS Prompting and Article Designer with new API setup

---

### **IN PROGRESS**: Living Context System Integration
**Date**: 2025-08-10
**Agent**: Claude Code (Sylvia assistant)  
**Status**: 🔄 ANALYZING & PLANNING

#### Objective:
Implement a living context system that enables seamless information sharing between all agents in the Sylvia workspace (Gemini main chat, GPT-5 auxiliary agent, Claude Code, SBS Prompting, Article Designer, Firecrawl extensions).

#### Current Analysis Phase:
- ✅ **PERFECT SOLUTION**: Upstash Redis for living context system
- 🔥 **ARCHITECTURE**: Real-time multi-agent context sharing via Redis
- ⚡ **CAPABILITIES**: Pub/Sub, pipelining, transactions, SSE support

#### Upstash Redis Integration Plan:
- **Context Storage**: Persistent cross-agent memory
- **Real-time Sync**: Pub/Sub for instant context updates
- **Event Streaming**: SSE for live context feeds to all agents
- **Transaction Safety**: Atomic context operations

#### 🧬 SBS Methodology Integration:
- ✅ **ANALYZED**: Complete SBS prompting system documented
- ✅ **SAVED**: Full methodology added to Claude memory system
- 🔥 **BREAKTHROUGH**: Can now use SBS to enhance my own responses
- ⚡ **NEXT**: Apply SBS frameworks to Redis architecture planning

---

## 7. Conclusion

This is a very powerful and feature-rich web application that goes far beyond a simple chatbot. It's a full-fledged agentic workspace with a modular and extensible architecture. The use of client-side storage (IndexedDB) for articles and configurations allows for a high degree of personalization and offline capabilities. The multi-agent design and the inclusion of advanced tools like SBS Prompting and the Article Designer make this a very sophisticated piece of software.
