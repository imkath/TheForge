# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Forge is a Micro-SaaS Opportunity Detector that autonomously scans the web for "user friction" (complaints, workarounds, inefficient workflows) to synthesize business ideas using the Jobs To Be Done (JTBD) framework and Eric von Hippel's Lead User theory.

## Commands

```bash
npm run dev          # Start Vite dev server (auto-selects port)
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build
npm run lint         # ESLint with zero warnings policy
```

## Architecture

### Core Data Flow
1. **Aggregator** ([src/services/aggregator.ts](src/services/aggregator.ts)) - Collects evidence from 15+ free APIs (Reddit, HN, DEV.to, GitHub Issues, Stack Overflow, IndieHackers, Lobsters, etc.)
2. **Gemini Service** ([src/services/gemini.ts](src/services/gemini.ts)) - Analyzes aggregated evidence using Gemini 2.0 Flash (with OpenAI fallback on quota exceeded)
3. **Scoring** ([src/services/scoring.ts](src/services/scoring.ts)) - Multi-criteria scoring: accessibility, payment potential, market size, competition, implementation speed
4. **Vault** - Firebase Firestore persistence at `/artifacts/{appId}/users/{userId}/`

### State Management
Zustand store in [src/hooks/useForgeStore.ts](src/hooks/useForgeStore.ts):
- AbortController pattern for cancellable hunts (`currentHuntController`, `currentHuntId`)
- Anonymous Firebase auth with real-time Firestore sync via `onSnapshot`

### Hunt Flow
- **Regular verticals**: `huntOpportunities()` → `aggregateOpportunityData()` fetches from sources → Gemini analyzes evidence WITHOUT search grounding
- **Import verticals** (detected by `isImportVertical()`): Uses Gemini WITH Search Grounding to find real SaaS products to localize for LATAM/Spain

### CORS Proxy System
[src/services/utils/corsProxy.ts](src/services/utils/corsProxy.ts) provides automatic fallback:
1. corsproxy.io (primary)
2. allorigins.win
3. codetabs
4. proxy.cors.sh

Key functions: `fetchWithCorsProxy`, `fetchJsonWithCorsProxy`, `fetchHtmlWithCorsProxy`, `postWithCorsProxy`

### Source Adapters Pattern
Each source in [src/services/sources/](src/services/sources/) follows:
- Export typed interfaces for posts/items
- Export search functions returning `{ items, source, query, totalCount }`
- Use CORS proxy functions when needed
- Fail silently with empty arrays (logged to console.debug)

### UI Views
- **ForgeView** - Opportunity hunting by vertical (30+ categories in [src/config/index.ts](src/config/index.ts))
- **VaultView** - Saved ideas with Firebase persistence
- **ValidationView** - UVP and interview script generation via AI

### Key Types ([src/types/index.ts](src/types/index.ts))
- `MicroSaaSIdea` - Core idea with JTBD, friction severity, lead user indicators
- `Vertical` - Search configuration with keywords, platforms, lead user patterns
- `EvidenceItem` - Unified format for aggregated data from all sources
- `FrictionSeverity` - 'minor_bug' | 'workflow_gap' | 'critical_pain'

## Environment Variables

Required:
- `VITE_GEMINI_API_KEY` - Primary AI provider
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

Optional:
- `VITE_OPENAI_API_KEY` - Fallback when Gemini quota exceeded
- `VITE_SERPER_API_KEY` - Enables G2, Capterra, AlternativeTo, Quora, Medium
- `VITE_PRODUCTHUNT_TOKEN` - Competitor analysis

## Git Configuration

- Repository: `git@github.com-imkath:imkath/TheForge.git`
- SSH key: `~/.ssh/id_ed25519_imkath`

### Commit Rules
- All commits MUST be in English
- Use standard commit format (imperative mood): "Add feature", "Fix bug", "Update docs"
- NO AI/Claude references in commit messages
- Examples:
  - `Add CORS proxy fallback system`
  - `Fix import opportunities search flow`
  - `Update aggregator with new sources`

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS with glassmorphism design
- Firebase (Auth + Firestore)
- Zustand for state
- Framer Motion for animations
- Path alias: `@/` maps to `src/`
