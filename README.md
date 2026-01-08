# The Forge

Motor de Detección de Oportunidades Micro-SaaS que analiza fricciones reales de usuarios en múltiples fuentes para sintetizar ideas de negocio validables.

## Qué hace

The Forge agrega datos de Reddit, Hacker News, DEV.to, GitHub Issues, Stack Overflow, IndieHackers, y más para encontrar:

- **Puntos de dolor reales** - Quejas, frustraciones y fricciones de usuarios
- **Señales de usuarios líderes** - Personas construyendo soluciones propias (Excel, scripts, Zapier)
- **Oportunidades de importación** - SaaS exitosos en inglés que pueden localizarse para LATAM/España

Usa Gemini AI para sintetizar ideas con el framework Jobs To Be Done (JTBD).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (glassmorphism)
- Firebase (Auth + Firestore)
- Zustand
- Google Gemini 2.0 Flash

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

```env
# Requeridas
VITE_GEMINI_API_KEY=tu_gemini_api_key
VITE_FIREBASE_API_KEY=tu_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id

# Opcionales (mejoran los resultados)
VITE_OPENAI_API_KEY=fallback_cuando_gemini_quota_exceeded
VITE_SERPER_API_KEY=habilita_g2_capterra_quora_medium
VITE_PRODUCTHUNT_TOKEN=analisis_competidores
```

## Verticales Disponibles

**Tecnología:** Developer Tools, APIs, DevOps, Bases de Datos

**Negocios:** CRM, RRHH, Project Management, Soporte al Cliente

**Marketing:** Automatización, Redes Sociales, SEO, Analytics

**E-commerce:** Operaciones, Logística, Dropshipping

**Finanzas:** Freelancers, Contabilidad, Gastos

**Servicios:** Restaurantes, Salones de Belleza, Gimnasios, Veterinarias, Limpieza, Talleres Mecánicos

**Creativos:** Fotografía, Eventos, Video, Podcasts

**Educación:** Tutorías, Autoescuelas

**Importación:** Ideas validadas en mercados ingleses para localizar en LATAM/España

## Arquitectura

```
src/
├── components/     # UI components (glassmorphism)
├── config/         # Verticales y configuración
├── hooks/          # Zustand store
├── services/
│   ├── sources/    # Adaptadores por fuente (Reddit, HN, etc.)
│   ├── utils/      # CORS proxy con fallbacks
│   ├── aggregator.ts  # Agregación multi-fuente
│   ├── gemini.ts      # AI con anti-ideas genéricas
│   └── scoring.ts     # Sistema de puntuación
├── types/          # TypeScript types
└── views/          # Forge, Vault, Validation
```

## Flujo de Datos

1. Usuario selecciona una vertical
2. `aggregateOpportunityData()` busca en 10+ fuentes
3. Evidencia se formatea y envía a Gemini
4. Gemini sintetiza ideas diversas (tipos diferentes, usuarios diferentes)
5. Ideas se puntúan y muestran

Para verticales de **importación**, se usa Gemini con Search Grounding para encontrar SaaS reales que localizar.

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview build
npm run lint     # ESLint
```

## Características

- **Anti-ideas genéricas** - Rechaza "GitCleaner", "ArrayOptimizer", etc.
- **Diversidad forzada** - Cada idea es de un tipo diferente
- **CORS proxy con fallbacks** - corsproxy.io → allorigins → codetabs
- **Cancelación de búsqueda** - AbortController para detener hunts
- **Perspectivas variadas** - Indie dev, nichos, B2B, LATAM, etc.

## Licencia

MIT
