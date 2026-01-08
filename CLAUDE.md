# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Forge is a Micro-SaaS Opportunity Detector that autonomously scans the web for "user friction" (complaints, workarounds, inefficient workflows) to synthesize business ideas using the Jobs To Be Done (JTBD) framework and Eric von Hippel's Lead User theory.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server
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
Uses Zustand store in [src/hooks/useForgeStore.ts](src/hooks/useForgeStore.ts) with:
- Anonymous Firebase auth
- Real-time Firestore sync via `onSnapshot`
- Hunting state, current/saved ideas, scoring weights

### UI Views
- **ForgeView** - Opportunity hunting by vertical
- **VaultView** - Saved ideas with persistence
- **ValidationView** - UVP and interview script generation

### Key Types ([src/types/index.ts](src/types/index.ts))
- `MicroSaaSIdea` - Core idea with JTBD, friction severity, lead user indicators
- `Vertical` - Search configuration with keywords, platforms, lead user patterns
- `ScoringWeights` - Adjustable weights for scoring model

### Data Sources
Sources are in [src/services/sources/](src/services/sources/). Each converts platform-specific data to `EvidenceItem`:
- Free APIs: Reddit (via CORS proxy), HN Algolia, DEV.to, GitHub, Stack Overflow, IndieHackers, Lobsters, Hashnode
- Optional (API key): ProductHunt, Serper (enables G2, Capterra, AlternativeTo, Quora, Medium)

## Environment Setup

Required variables (see [.env.example](.env.example)):
- `VITE_FIREBASE_*` - Firebase configuration
- `VITE_GEMINI_API_KEY` - Primary AI provider

Optional for enhanced data:
- `VITE_OPENAI_API_KEY` - Fallback when Gemini quota exceeded
- `VITE_SERPER_API_KEY` - Enables Google Search across review sites
- `VITE_PRODUCTHUNT_API_KEY` - Competitor analysis

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS with glassmorphism design
- Firebase (Auth + Firestore)
- Zustand for state
- Framer Motion for animations
- Lucide React for icons
