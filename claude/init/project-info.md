# The Forge - Project Configuration

## Repository
- **GitHub**: git@github.com-imkath:imkath/TheForge.git
- **SSH Key**: ~/.ssh/id_ed25519_imkath

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **State**: Zustand
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.0 Flash (with Search Grounding)
- **Database**: Firebase (optional)

## Key Features
- Multi-source opportunity hunting (Reddit, HN, DEV.to, GitHub, StackOverflow, IndieHackers, Lobsters, Hashnode, BetaList, OasisOfIdeas)
- CORS proxy with automatic fallbacks
- Import opportunity detection (LATAM/Spain market localization)
- Real-time search grounding via Gemini API

## Environment Variables
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_key (optional)
```

## Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 3000+)
npm run build   # Production build
```

## Git Configuration
- Commits must be in English
- Standard commit format
- No AI references in commits
