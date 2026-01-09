import { config, FRICTION_KEYWORDS } from '@/config';
import type {
  MicroSaaSIdea,
  GeminiSearchResponse,
  Vertical,
  FrictionSeverity,
  LeadUserIndicator,
} from '@/types';
import { aggregateOpportunityData, type EvidenceItem } from './aggregator';

const GEMINI_URL = `${config.gemini.endpoint}/${config.gemini.model}:generateContent`;

interface GeminiRequestBody {
  contents: { parts: { text: string }[] }[];
  tools?: { google_search: object }[];
  generationConfig?: {
    responseMimeType?: string;
    temperature?: number;
  };
}

// Check if OpenAI is configured
function hasOpenAI(): boolean {
  return !!config.openai.apiKey;
}

// OpenAI API call (fallback when Gemini quota exceeded)
async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch(config.openai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'Eres un analista experto de oportunidades Micro-SaaS. Siempre responde en JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.95,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Core AI call - tries Gemini first, falls back to OpenAI if quota exceeded
async function callAI(prompt: string, useSearch = false): Promise<string> {
  // Try Gemini first (primary provider)
  console.log('🤖 [AI] Intentando con Gemini (gemini-2.0-flash)...');
  const startTime = Date.now();

  const body: GeminiRequestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.95,
    },
  };

  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${config.gemini.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || 'Gemini API error';

      if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️ [Gemini] Cuota excedida, intentando con OpenAI...');

        // Fallback to OpenAI if available
        if (hasOpenAI()) {
          console.log('🤖 [AI] Cambiando a OpenAI (gpt-4o-mini)...');
          const openaiStart = Date.now();
          const result = await callOpenAI(prompt);
          console.log(`✅ [AI] OpenAI respondió en ${Date.now() - openaiStart}ms`);
          return result;
        }

        throw new Error('QUOTA_EXCEEDED');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`✅ [AI] Gemini respondió en ${Date.now() - startTime}ms`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    // If Gemini fails for any reason and OpenAI is available, try it
    if (error instanceof Error && error.message !== 'QUOTA_EXCEEDED' && hasOpenAI()) {
      console.warn(`⚠️ [Gemini] Error: ${error.message}. Intentando con OpenAI...`);
      const openaiStart = Date.now();
      const result = await callOpenAI(prompt);
      console.log(`✅ [AI] OpenAI respondió en ${Date.now() - openaiStart}ms`);
      return result;
    }
    throw error;
  }
}

// Legacy function for backward compatibility
async function callGemini(prompt: string, useSearch = true): Promise<string> {
  return callAI(prompt, useSearch);
}

/**
 * Format evidence items for the prompt
 */
function formatEvidenceForPrompt(items: EvidenceItem[], maxItems = 15): string {
  return items
    .slice(0, maxItems)
    .map(
      (item, i) =>
        `${i + 1}. [${item.source.toUpperCase()}] "${item.title}"\n   Content: ${item.content.slice(0, 200)}...\n   URL: ${item.url}\n   Score: ${item.score}`
    )
    .join('\n\n');
}

/**
 * Get vertical-specific context and examples for better idea relevance
 */
function getVerticalContext(vertical: Vertical): {
  domain: string;
  targetUsers: string[];
  validExamples: string[];
  invalidExamples: string[];
  mustInclude: string[];
} {
  const verticalId = vertical.id.toLowerCase();
  const verticalName = vertical.name.toLowerCase();

  // Research & Academia
  if (verticalId.includes('research') || verticalId.includes('academia') || verticalName.includes('investigación') || verticalName.includes('academia')) {
    return {
      domain: 'investigación académica, universidades, laboratorios y publicaciones científicas',
      targetUsers: ['investigadores', 'profesores universitarios', 'doctorandos', 'postdocs', 'directores de laboratorio', 'bibliotecarios académicos'],
      validExamples: [
        'CitaSync - Sincronizador de referencias entre Zotero y Mendeley',
        'GrantTracker - Seguimiento de deadlines de becas y grants para investigadores',
        'LabNotebook - Cuaderno de laboratorio digital con versionado',
        'PeerReview Hub - Gestión de revisiones de papers para editores académicos',
        'ThesisProgress - Tracker de avance de tesis doctoral con milestones',
      ],
      invalidExamples: [
        'GitCleaner - Herramienta de limpieza de repos (NO es académico)',
        'ArrayOptimizer - Optimizador de código JavaScript (NO es académico)',
        'APIMonitor - Monitor de endpoints (NO es académico)',
      ],
      mustInclude: ['universidad', 'investigador', 'paper', 'tesis', 'laboratorio', 'académico', 'científico', 'publicación', 'beca', 'grant', 'doctorado'],
    };
  }

  // Developer Tools
  if (verticalId.includes('developer') || verticalId.includes('devops') || verticalId.includes('api') || verticalId.includes('database')) {
    return {
      domain: 'desarrollo de software, DevOps, APIs y bases de datos',
      targetUsers: ['desarrolladores', 'ingenieros de software', 'DevOps engineers', 'tech leads', 'CTOs de startups'],
      validExamples: [
        'EnvSync - Sincronización de variables de entorno entre equipos',
        'PRReview Bot - Bot de revisión de PRs con checklist automatizado',
        'DBMigrate - Visualizador de migraciones de base de datos',
        'APIDoc Generator - Generador de documentación OpenAPI desde código',
      ],
      invalidExamples: [
        'RecetaApp - App de recetas de cocina (NO es dev tools)',
        'GymTracker - Seguimiento de ejercicios (NO es dev tools)',
      ],
      mustInclude: ['código', 'desarrollador', 'API', 'deploy', 'git', 'CI/CD', 'base de datos', 'debugging', 'testing'],
    };
  }

  // Restaurant & Food
  if (verticalId.includes('restaurant') || verticalId.includes('food') || verticalId.includes('kitchen')) {
    return {
      domain: 'restaurantes, cafeterías, dark kitchens y servicio de alimentos',
      targetUsers: ['dueños de restaurantes', 'gerentes de cocina', 'chefs', 'meseros', 'operadores de delivery'],
      validExamples: [
        'MesaFácil - Reservaciones para restaurantes pequeños sin comisiones',
        'CocinaSync - Sincronización de pedidos entre cocina y meseros',
        'CosteoReceta - Calculadora de costos por platillo con ingredientes',
        'MenuQR - Menú digital con pedidos y pagos integrados',
      ],
      invalidExamples: [
        'CodeFormatter - Formateador de código (NO es restaurantes)',
        'InvoiceGen - Facturación genérica (NO es específico de restaurantes)',
      ],
      mustInclude: ['restaurante', 'cocina', 'menú', 'platillo', 'reservación', 'mesero', 'delivery', 'comida', 'chef'],
    };
  }

  // Salon & Beauty
  if (verticalId.includes('salon') || verticalId.includes('beauty') || verticalId.includes('spa') || verticalName.includes('belleza')) {
    return {
      domain: 'salones de belleza, spas, estéticas y servicios personales de cuidado',
      targetUsers: ['dueños de salones', 'estilistas', 'manicuristas', 'esteticistas', 'masajistas'],
      validExamples: [
        'CitaSalon - Agenda de citas para estilistas independientes',
        'ClientesBelleza - CRM para salones con historial de servicios',
        'ComisionesSalon - Cálculo de comisiones por estilista',
        'InventarioSalon - Control de productos de belleza y tintes',
      ],
      invalidExamples: [
        'GitManager - Gestor de repositorios (NO es salones)',
        'TaskBoard - Tablero de tareas genérico (NO es específico)',
      ],
      mustInclude: ['salón', 'belleza', 'estilista', 'cita', 'corte', 'tinte', 'manicure', 'spa', 'cliente'],
    };
  }

  // Gym & Fitness
  if (verticalId.includes('gym') || verticalId.includes('fitness') || verticalId.includes('sports')) {
    return {
      domain: 'gimnasios, estudios fitness, entrenadores personales y clubes deportivos',
      targetUsers: ['dueños de gimnasios', 'entrenadores personales', 'instructores de yoga/pilates', 'administradores de clubes'],
      validExamples: [
        'GymCheck - Control de acceso y membresías para gyms pequeños',
        'WODTracker - Seguimiento de entrenamientos para boxes de CrossFit',
        'ClasesFit - Reservación de clases grupales con capacidad limitada',
        'EntrenadorPro - Gestión de clientes para personal trainers',
      ],
      invalidExamples: [
        'APITester - Pruebas de APIs (NO es fitness)',
        'DataAnalyzer - Análisis de datos genérico (NO es específico)',
      ],
      mustInclude: ['gimnasio', 'entrenador', 'fitness', 'membresía', 'clase', 'ejercicio', 'workout', 'gym'],
    };
  }

  // Healthcare & Medical
  if (verticalId.includes('healthcare') || verticalId.includes('medical') || verticalId.includes('veterinary') || verticalName.includes('médico') || verticalName.includes('veterinaria')) {
    return {
      domain: 'consultorios médicos, clínicas, veterinarias y servicios de salud',
      targetUsers: ['médicos', 'dentistas', 'veterinarios', 'enfermeras', 'administradores de clínicas'],
      validExamples: [
        'CitaMédica - Agenda de citas con recordatorios SMS para consultorios',
        'HistorialPet - Expediente médico digital para veterinarias',
        'RecetaDigital - Generador de recetas médicas electrónicas',
        'TurnoClínica - Gestión de turnos y sala de espera',
      ],
      invalidExamples: [
        'CodeReview - Revisión de código (NO es salud)',
        'ProjectManager - Gestión de proyectos genérica (NO es específico)',
      ],
      mustInclude: ['paciente', 'cita', 'médico', 'clínica', 'consultorio', 'receta', 'diagnóstico', 'tratamiento'],
    };
  }

  // Real Estate
  if (verticalId.includes('real-estate') || verticalId.includes('property')) {
    return {
      domain: 'corredores de propiedades, administración de inmuebles y bienes raíces',
      targetUsers: ['corredores inmobiliarios', 'administradores de propiedades', 'propietarios', 'arrendadores'],
      validExamples: [
        'PropiedadCRM - CRM para corredores inmobiliarios independientes',
        'RentaFácil - Cobro de rentas con recordatorios automáticos',
        'ShowingPro - Coordinación de visitas a propiedades',
        'ContratoRenta - Generador de contratos de arrendamiento',
      ],
      invalidExamples: [
        'LogViewer - Visualizador de logs (NO es inmobiliario)',
        'TeamChat - Chat de equipos genérico (NO es específico)',
      ],
      mustInclude: ['propiedad', 'inmueble', 'renta', 'arrendamiento', 'corredor', 'inquilino', 'propietario'],
    };
  }

  // E-commerce
  if (verticalId.includes('ecommerce') || verticalId.includes('dropshipping') || verticalId.includes('retail')) {
    return {
      domain: 'tiendas en línea, e-commerce, dropshipping y retail',
      targetUsers: ['dueños de tiendas online', 'vendedores de marketplace', 'dropshippers', 'comerciantes'],
      validExamples: [
        'StockSync - Sincronización de inventario multi-tienda',
        'PrecioSpy - Monitor de precios de competencia en marketplaces',
        'ReviewBoost - Gestión de reseñas de productos',
        'EnvíoTrack - Tracking de envíos con notificaciones al cliente',
      ],
      invalidExamples: [
        'TerminalTool - Herramienta de terminal (NO es ecommerce)',
        'DocGenerator - Generador de documentos genérico (NO es específico)',
      ],
      mustInclude: ['tienda', 'producto', 'inventario', 'pedido', 'envío', 'cliente', 'venta', 'marketplace'],
    };
  }

  // Marketing & Social Media
  if (verticalId.includes('marketing') || verticalId.includes('social') || verticalId.includes('seo')) {
    return {
      domain: 'marketing digital, redes sociales, SEO y crecimiento',
      targetUsers: ['marketers', 'community managers', 'especialistas SEO', 'growth hackers', 'creadores de contenido'],
      validExamples: [
        'PostScheduler - Programador de posts para múltiples redes',
        'SEOAudit - Auditor SEO simplificado para pequeños sitios',
        'HashtagFinder - Sugeridor de hashtags por nicho',
        'InfluencerMatch - Conexión con micro-influencers por vertical',
      ],
      invalidExamples: [
        'DatabaseTool - Herramienta de base de datos (NO es marketing)',
        'ServerMonitor - Monitor de servidores (NO es específico)',
      ],
      mustInclude: ['contenido', 'redes sociales', 'SEO', 'campaña', 'audiencia', 'engagement', 'marketing'],
    };
  }

  // Fintech & Accounting
  if (verticalId.includes('fintech') || verticalId.includes('bookkeeping') || verticalId.includes('expense') || verticalName.includes('contabilidad')) {
    return {
      domain: 'fintech, contabilidad, facturación y gestión financiera',
      targetUsers: ['freelancers', 'contadores', 'dueños de PYMES', 'autónomos', 'administradores'],
      validExamples: [
        'FacturaMX - Facturación CFDI para freelancers mexicanos',
        'GastoTrack - Seguimiento de gastos con categorización automática',
        'CobrosRecurrentes - Gestión de suscripciones y cobros',
        'ImpuestosFácil - Calculadora de impuestos trimestrales',
      ],
      invalidExamples: [
        'GitHelper - Ayudante de Git (NO es fintech)',
        'DesignTool - Herramienta de diseño (NO es específico)',
      ],
      mustInclude: ['factura', 'impuesto', 'gasto', 'ingreso', 'contabilidad', 'cobro', 'pago', 'financiero'],
    };
  }

  // Default - generic business vertical
  return {
    domain: `el sector de ${vertical.name}`,
    targetUsers: ['profesionales del sector', 'dueños de negocios pequeños', 'freelancers especializados'],
    validExamples: [
      `Herramientas específicas para ${vertical.name}`,
      'Soluciones que abordan problemas reales del sector',
    ],
    invalidExamples: [
      'Herramientas genéricas de desarrollo de software',
      'Apps de productividad personal sin relación al vertical',
    ],
    mustInclude: vertical.searchKeywords.slice(0, 5).map(k => k.split(' ')[0]),
  };
}

/**
 * Check if a vertical is an "import opportunity" vertical
 */
function isImportVertical(vertical: Vertical): boolean {
  const importVerticalIds = [
    'import-opportunities',
    'import-saas-tools',
    'import-fintech-latam',
    'import-creator-tools',
  ];
  return importVerticalIds.includes(vertical.id) ||
    vertical.name.toLowerCase().includes('importar') ||
    vertical.name.toLowerCase().includes('import');
}

/**
 * Main Opportunity Hunter - NOW WITH REAL DATA from multiple sources
 *
 * Flow:
 * 1. Aggregate real data from Reddit, HN, DEV.to, etc.
 * 2. Feed real evidence to Gemini for analysis
 * 3. Gemini synthesizes ideas from REAL data (no hallucination)
 */
export async function huntOpportunities(vertical: Vertical, signal?: AbortSignal): Promise<MicroSaaSIdea[]> {
  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Hunt aborted', 'AbortError');
  }

  // Check if this is an import vertical - use specialized flow
  if (isImportVertical(vertical)) {
    console.log(`[Forge] Detected import vertical: ${vertical.name}`);
    return huntImportOpportunities(vertical, signal);
  }

  // Step 1: Gather REAL evidence from multiple free sources
  console.log(`[Forge] Aggregating data for ${vertical.name}...`);
  const aggregatedData = await aggregateOpportunityData(vertical, { signal });

  console.log(
    `[Forge] Found ${aggregatedData.totalItems} items from: ${aggregatedData.sourcesUsed.join(', ')}`
  );

  // Step 2: Format evidence for Gemini
  const painPointsText = formatEvidenceForPrompt(aggregatedData.painPoints);
  const leadUsersText = formatEvidenceForPrompt(aggregatedData.leadUserSignals, 10);
  const competitorsText = formatEvidenceForPrompt(aggregatedData.competitors, 10);

  // Step 3: Use Gemini to ANALYZE real data (not to search)
  // Add randomness seed to ensure varied responses each time
  const creativitySeed = Math.random().toString(36).substring(2, 8);

  // Get vertical-specific context for relevance validation
  const verticalContext = getVerticalContext(vertical);

  // Different perspectives to analyze from (like the original)
  const perspectives = [
    'desde la perspectiva de un desarrollador indie que puede construir un MVP en 2-4 semanas',
    'enfocándote en nichos poco explorados donde no hay competencia fuerte',
    'priorizando problemas con alta urgencia donde la gente pagaría HOY',
    'buscando oportunidades de automatización de tareas manuales repetitivas',
    'identificando fricciones en flujos de trabajo entre herramientas existentes',
    'desde el ángulo de herramientas B2B donde hay presupuesto para pagar',
    'enfocándote en productividad personal de profesionales independientes',
    'buscando problemas recurrentes que generan frustración constante',
    'pensando en mercados de LATAM y España que están desatendidos',
    'explorando verticales donde Excel/WhatsApp son la "solución" actual',
  ];
  const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

  // Force diversity by requiring different TYPES of ideas
  const ideaTypes = [
    'automatización de tareas repetitivas',
    'integración entre herramientas existentes',
    'marketplace o plataforma de conexión',
    'herramienta de análisis y reportes',
    'app móvil para trabajo en campo',
    'portal de autoservicio para clientes',
    'sistema de reservas y agenda',
    'calculadora o cotizador especializado',
    'gestión de inventario o recursos',
    'comunicación y notificaciones automáticas',
    'facturación y cobros recurrentes',
    'CRM vertical especializado',
  ];

  // Select 4-5 random types to force diversity
  const shuffled = ideaTypes.sort(() => Math.random() - 0.5);
  const selectedTypes = shuffled.slice(0, 5);

  const prompt = `
Eres un analista experto de oportunidades Micro-SaaS usando el framework Jobs To Be Done (JTBD).
IMPORTANTE: Responde TODO en español.
SEED DE CREATIVIDAD: ${creativitySeed}
PERSPECTIVA: Analiza ${randomPerspective}.

═══════════════════════════════════════════════════════════════════════════════
⚠️⚠️⚠️ REGLA CRÍTICA DE RELEVANCIA - LEE ESTO PRIMERO ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════════════════════

VERTICAL OBJETIVO: ${vertical.name}
DOMINIO: ${verticalContext.domain}

🎯 USUARIOS OBJETIVO (SOLO estos):
${verticalContext.targetUsers.map(u => `• ${u}`).join('\n')}

✅ EJEMPLOS DE IDEAS VÁLIDAS para este vertical:
${verticalContext.validExamples.map(e => `• ${e}`).join('\n')}

❌ EJEMPLOS DE IDEAS INVÁLIDAS (PROHIBIDAS):
${verticalContext.invalidExamples.map(e => `• ${e}`).join('\n')}

🔑 CADA IDEA DEBE mencionar al menos UNO de estos conceptos del dominio:
${verticalContext.mustInclude.join(', ')}

⛔ REGLA DE RECHAZO AUTOMÁTICO:
Si una idea NO está directamente relacionada con "${vertical.name}", DESCÁRTALA.
NO generes ideas de:
- Herramientas genéricas de programación (Git, APIs, código)
- Apps de productividad personal genéricas
- Soluciones que podrían ser de cualquier industria
- Ideas que no mencionen usuarios específicos del vertical

═══════════════════════════════════════════════════════════════════════════════

He recopilado quejas y discusiones REALES de usuarios de Reddit, Hacker News, DEV.to y otras fuentes.
Tu trabajo es ANALIZAR esta evidencia y sintetizar oportunidades de Micro-SaaS ESPECÍFICAS para ${vertical.name}.

=== PUNTOS DE DOLOR REALES ENCONTRADOS ===
${painPointsText || 'No se encontraron puntos de dolor específicos - genera ideas basándote en tu conocimiento del sector'}

=== SEÑALES DE USUARIOS LÍDERES (personas construyendo soluciones propias) ===
${leadUsersText || 'No se encontraron señales de usuarios líderes'}

=== COMPETIDORES/SOLUCIONES EXISTENTES ===
${competitorsText || 'No se encontraron competidores'}

=== TU MISIÓN ===
Basándote en la evidencia anterior Y tu conocimiento del sector "${vertical.name}":
1. Identifica patrones recurrentes de fricción EN ESTE VERTICAL ESPECÍFICO
2. Sintetiza MÍNIMO 4 ideas de Micro-SaaS que aborden problemas de ${verticalContext.targetUsers.slice(0, 3).join(', ')}
3. Cada idea DEBE ser específica para ${vertical.name} - NO ideas genéricas
4. Si la evidencia es débil, usa tu conocimiento del dominio para proponer ideas relevantes

⚠️ REGLA DE DIVERSIDAD OBLIGATORIA:
Cada idea debe ser de un TIPO DIFERENTE. Usa estos tipos como guía:
${selectedTypes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

NO repitas el mismo tipo de solución. Si una idea es "automatización", la siguiente debe ser "marketplace" o "portal", etc.

⚠️ VALIDACIÓN FINAL - Antes de incluir cada idea, pregúntate:
1. ¿Esta idea es ESPECÍFICA para ${vertical.name}? Si no, DESCÁRTALA.
2. ¿El usuario objetivo es uno de: ${verticalContext.targetUsers.slice(0, 3).join(', ')}? Si no, DESCÁRTALA.
3. ¿La idea menciona conceptos del dominio como ${verticalContext.mustInclude.slice(0, 4).join(', ')}? Si no, DESCÁRTALA.
4. ¿Es una herramienta genérica de desarrollo/productividad disfrazada? Si sí, DESCÁRTALA.

FORMATO DE SALIDA (JSON estricto, TODO EN ESPAÑOL):
{
  "vertical": "${vertical.name}",
  "ideas": [
    {
      "title": "Nombre de producto específico al problema (NO genérico)",
      "problem": "Descripción detallada: quién sufre el problema (usar términos del vertical), en qué situación, qué pierden (tiempo/dinero)",
      "jtbd": "Cuando [situación específica del vertical], quiero [motivación], para poder [resultado], pero [barrera actual]",
      "evidence_source": "Fuentes específicas (URLs o plataformas) que apoyan esta idea",
      "potential_score": 1-100,
      "tech_stack_suggestion": "Tech para MVP (React, Supabase, etc.)",
      "friction_type": "minor_bug | workflow_gap | critical_pain",
      "lead_user_signals": ["Indicadores de usuarios sofisticados"],
      "target_customer": "Cliente ideal específico usando términos del vertical (ej: '${verticalContext.targetUsers[0]}')",
      "idea_type": "Tipo de solución (automatización, marketplace, portal, etc.)"
    }
  ]
}

CRITERIOS DE PUNTUACIÓN:
- 80-100: Múltiples fuentes confirman, usuarios líderes construyendo soluciones, cliente claro del vertical
- 60-79: 2-3 fuentes confirman, gap identificado, nicho definible dentro del vertical
- 40-59: Una fuente, queja recurrente en el vertical, potencial de pago poco claro
- Menos de 40: Evidencia débil, idea genérica o fuera del vertical

IMPORTANTE: Devuelve MÍNIMO 4 ideas diversas y específicas para ${vertical.name}. Pueden ser más (5-6) si encuentras suficiente evidencia.
`;

  try {
    // Use Gemini WITHOUT search grounding since we're providing real data
    const responseText = await callGemini(prompt, false);
    const parsed: GeminiSearchResponse = JSON.parse(responseText);

    return parsed.ideas.map((idea) => ({
      title: idea.title,
      problem: idea.problem,
      jtbd: idea.jtbd,
      vertical: parsed.vertical,
      evidenceSource: idea.evidence_source,
      potentialScore: idea.potential_score,
      techStackSuggestion: idea.tech_stack_suggestion,
      frictionSeverity: classifyFrictionSeverity(idea.problem),
      leadUserIndicators: detectLeadUserSignals(idea.lead_user_signals || []),
      validationStatus: 'unvalidated',
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      console.warn(`[Forge] Cuota de Gemini excedida para ${vertical.name}. Intenta más tarde.`);
    } else {
      console.error(`Hunt failed for ${vertical.name}:`, error);
    }
    return [];
  }
}

/**
 * Specialized hunter for IMPORT opportunities
 * Focuses on finding successful SaaS products in English markets
 * that can be localized for LATAM/Spain
 */
async function huntImportOpportunities(vertical: Vertical, signal?: AbortSignal): Promise<MicroSaaSIdea[]> {
  if (signal?.aborted) {
    throw new DOMException('Hunt aborted', 'AbortError');
  }

  // Use Gemini with Search Grounding to find REAL successful SaaS products
  const creativitySeed = Math.random().toString(36).substring(2, 8);

  // Different search queries for variety
  const searchQueries = [
    'site:producthunt.com SaaS launched MRR revenue 2024 2025',
    'site:indiehackers.com making money bootstrapped SaaS',
    'site:betalist.com startup launched beta',
    '"indie hacker" "$10k MRR" OR "$5k MRR" OR "paying customers"',
    'micro saas launched profitable small business tool',
  ];

  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  // Diverse categories of professionals/businesses to explore
  const targetAudiences = [
    'contadores y despachos contables',
    'abogados y bufetes pequeños',
    'agentes inmobiliarios independientes',
    'clínicas y consultorios médicos',
    'salones de belleza y estéticas',
    'gimnasios y estudios fitness',
    'restaurantes y cafeterías',
    'fotógrafos y videógrafos',
    'coaches y consultores',
    'escuelas y academias pequeñas',
    'veterinarias y pet shops',
    'talleres mecánicos',
    'servicios de limpieza',
    'constructoras pequeñas',
    'agencias de marketing',
  ];

  // Select 3-4 random audiences to force diversity
  const shuffledAudiences = targetAudiences.sort(() => Math.random() - 0.5);
  const selectedAudiences = shuffledAudiences.slice(0, 4);

  // Specific niches by import category
  const importNiches: Record<string, string[]> = {
    'import-opportunities': [
      'facturación electrónica CFDI México',
      'contabilidad PYMES España regulaciones',
      'nómina empleados Colombia legislación',
      'gestión de propiedades alquiler LATAM',
      'CRM inmobiliario mercado hispano',
    ],
    'import-saas-tools': [
      'scheduling booking profesionales independientes',
      'client portal agencies español',
      'proposal software freelancers',
      'invoice generator autónomos España',
      'appointment booking salones belleza',
    ],
    'import-fintech-latam': [
      'expense tracking autónomos España',
      'invoicing freelancers LATAM',
      'subscription billing peso mexicano',
      'payment links Mercado Pago integración',
      'financial dashboard pequeñas empresas',
    ],
    'import-creator-tools': [
      'newsletter monetization español',
      'digital products español',
      'online course creators hispanos',
      'membership comunidades español',
      'tip jar propinas creadores',
    ],
  };

  const nicheFocus = importNiches[vertical.id] || importNiches['import-opportunities'];
  const randomNiche = nicheFocus[Math.floor(Math.random() * nicheFocus.length)];

  const prompt = `
Eres un experto en identificar oportunidades de IMPORTACIÓN de Micro-SaaS.
Tu misión es encontrar productos SaaS REALES que están teniendo éxito en mercados de habla inglesa (USA, UK, etc.)
y que podrían ser adaptados/localizados para el mercado hispanohablante (LATAM, España).

SEED DE VARIEDAD: ${creativitySeed}
BÚSQUEDA SUGERIDA: ${randomQuery}
NICHO ESPECÍFICO A EXPLORAR: ${randomNiche}
CATEGORÍA: ${vertical.name}

⚠️ REGLA DE DIVERSIDAD OBLIGATORIA:
Cada idea debe ser para un TIPO DE NEGOCIO/PROFESIONAL DIFERENTE.
Explora estas audiencias:
${selectedAudiences.map((a, i) => `${i + 1}. ${a}`).join('\n')}

NO repitas el mismo tipo de usuario. Si una idea es para "contadores", la siguiente debe ser para "salones de belleza" o "gimnasios", etc.

⚠️ REGLAS ANTI-IDEAS GENÉRICAS:
1. PROHIBIDO ideas genéricas de programación: "GitCleaner", "CodeFormatter", "ArrayOptimizer"
2. PROHIBIDO ideas sin mercado hispanohablante claro
3. PROHIBIDO productos que ya tienen competencia fuerte en español
4. CADA idea debe mencionar un PRODUCTO REAL que existe en inglés

CRITERIOS DE PRODUCTOS A BUSCAR:
1. SaaS con tracción: MRR reportado, usuarios pagando
2. Productos sin versión en español o mal localizados
3. Nichos donde la regulación local importa: facturación, nómina, legal
4. Herramientas para profesionales específicos

EJEMPLOS BUENOS (diversos):
- "SimplePractice" → psicólogos en México
- "Vagaro" → salones de belleza en España
- "Gusto" → nómina PYMES Colombia
- "Mindbody" → gimnasios pequeños LATAM
- "ServiceTitan" → plomeros/electricistas México

FORMATO DE SALIDA (JSON estricto, TODO EN ESPAÑOL):
{
  "vertical": "${vertical.name}",
  "ideas": [
    {
      "title": "Nombre específico (ej: 'AgendaPro - Citas para Salones de Belleza México')",
      "problem": "Producto ORIGINAL + por qué el mercado hispano lo necesita",
      "jtbd": "Cuando [profesional en país] necesita [acción], quiere [herramienta], pero [barrera]",
      "evidence_source": "URL real (ProductHunt, IndieHackers, sitio web)",
      "potential_score": 65-90,
      "tech_stack_suggestion": "Tech con integraciones locales",
      "friction_type": "workflow_gap",
      "lead_user_signals": ["Señales de demanda en español"],
      "original_product": "Nombre del producto en inglés",
      "localization_opportunity": "Regulaciones, pagos, idioma específicos",
      "target_market": "País + profesión + tamaño",
      "business_type": "Tipo de negocio (contadores, salones, gimnasios, etc.)"
    }
  ]
}

Busca en internet productos REALES. Si no encuentras productos reales que cumplan los criterios, devuelve un array vacío.
IMPORTANTE: Devuelve MÍNIMO 4 ideas diversas y específicas. Pueden ser más (5-6) si encuentras buenos productos.
`;

  try {
    // Use Gemini WITH search grounding for import opportunities
    const responseText = await callGemini(prompt, true);

    // Extended type for import-specific response fields
    interface ImportIdeaResult {
      original_product?: string;
      localization_opportunity?: string;
      title: string;
      problem: string;
      jtbd: string;
      evidence_source: string;
      potential_score: number;
      tech_stack_suggestion: string;
      friction_type: string;
      lead_user_signals?: string[];
    }

    const parsed: { vertical: string; ideas: ImportIdeaResult[] } = JSON.parse(responseText);

    return parsed.ideas.map((idea) => ({
      title: idea.title,
      problem: idea.problem + (idea.original_product ? ` (Basado en: ${idea.original_product})` : ''),
      jtbd: idea.jtbd,
      vertical: parsed.vertical,
      evidenceSource: idea.evidence_source,
      potentialScore: idea.potential_score,
      techStackSuggestion: idea.tech_stack_suggestion,
      frictionSeverity: 'workflow_gap' as const,
      leadUserIndicators: detectLeadUserSignals(idea.lead_user_signals || []),
      validationStatus: 'unvalidated' as const,
      isImportOpportunity: true,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      console.warn(`[Forge] Cuota de Gemini excedida para import. Intenta más tarde.`);
    } else {
      console.error(`Import hunt failed:`, error);
    }
    return [];
  }
}

/**
 * Hunt with Gemini's Google Search Grounding (fallback/alternative mode)
 * Use this when you want Gemini to search directly instead of aggregated sources
 */
export async function huntWithGeminiGrounding(vertical: Vertical): Promise<MicroSaaSIdea[]> {
  const prompt = `
You are an elite Micro-SaaS opportunity hunter using the Jobs To Be Done (JTBD) framework.

VERTICAL: ${vertical.name}
SEARCH PLATFORMS: ${vertical.platforms.join(', ')}
LEAD USER PATTERNS TO DETECT: ${vertical.leadUserPatterns.join(', ')}

MISSION:
1. Search for REAL user complaints, friction, and workarounds from the last 6 months
2. Focus on problems currently solved with spreadsheets, manual processes, or cobbled-together tools
3. Identify "lead users" who have built custom solutions (they indicate future market demand)
4. ONLY report findings with verifiable sources - NO hallucinations

OUTPUT FORMAT (strict JSON):
{
  "vertical": "${vertical.name}",
  "ideas": [
    {
      "title": "Concise, memorable product name",
      "problem": "Detailed description of the pain point with specific context",
      "jtbd": "When [situation], I want to [motivation], so I can [expected outcome], but [current barrier]",
      "evidence_source": "Platform and context where this friction was found",
      "potential_score": 1-100,
      "tech_stack_suggestion": "Recommended tech for MVP (be specific)",
      "friction_type": "minor_bug | workflow_gap | critical_pain",
      "lead_user_signals": ["List of indicators that sophisticated users exist"]
    }
  ]
}

Return MINIMUM 4 high-quality ideas based on your search findings. Can be more (5-6) if evidence supports it.
`;

  try {
    const responseText = await callGemini(prompt, true); // WITH search grounding
    const parsed: GeminiSearchResponse = JSON.parse(responseText);

    return parsed.ideas.map((idea) => ({
      title: idea.title,
      problem: idea.problem,
      jtbd: idea.jtbd,
      vertical: parsed.vertical,
      evidenceSource: idea.evidence_source,
      potentialScore: idea.potential_score,
      techStackSuggestion: idea.tech_stack_suggestion,
      frictionSeverity: classifyFrictionSeverity(idea.problem),
      leadUserIndicators: detectLeadUserSignals(idea.lead_user_signals || []),
      validationStatus: 'unvalidated',
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      console.warn(`[Forge] Cuota de Gemini excedida para ${vertical.name}. Intenta más tarde.`);
    } else {
      console.error(`Gemini grounding hunt failed for ${vertical.name}:`, error);
    }
    return [];
  }
}

// Classify friction severity based on language analysis (from info.txt NLP section)
function classifyFrictionSeverity(problemText: string): FrictionSeverity {
  const lowerText = problemText.toLowerCase();

  // Check for critical pain first
  if (FRICTION_KEYWORDS.critical_pain.some(kw => lowerText.includes(kw))) {
    return 'critical_pain';
  }

  // Check for workflow gaps
  if (FRICTION_KEYWORDS.workflow_gap.some(kw => lowerText.includes(kw))) {
    return 'workflow_gap';
  }

  // Default to minor bug
  return 'minor_bug';
}

// Detect lead user signals (Eric von Hippel theory from info.txt)
function detectLeadUserSignals(signals: string[]): LeadUserIndicator[] {
  const indicators: LeadUserIndicator[] = [];

  for (const signal of signals) {
    const lowerSignal = signal.toLowerCase();

    if (lowerSignal.includes('script') || lowerSignal.includes('python') || lowerSignal.includes('node')) {
      indicators.push({
        type: 'custom_script',
        description: signal,
        sophisticationLevel: 4,
      });
    } else if (lowerSignal.includes('excel') || lowerSignal.includes('sheets') || lowerSignal.includes('macro')) {
      indicators.push({
        type: 'excel_macro',
        description: signal,
        sophisticationLevel: 3,
      });
    } else if (lowerSignal.includes('zapier') || lowerSignal.includes('make.com') || lowerSignal.includes('n8n')) {
      indicators.push({
        type: 'zapier_integration',
        description: signal,
        sophisticationLevel: 2,
      });
    } else {
      indicators.push({
        type: 'manual_process',
        description: signal,
        sophisticationLevel: 1,
      });
    }
  }

  return indicators;
}

// Generate UVP and Interview Script (Validation Module from info.txt section 4)
export async function generateValidationKit(idea: MicroSaaSIdea): Promise<{
  uvp: string;
  interviewScript: string;
}> {
  const prompt = `
You are a product validation expert. Generate a validation kit for a Micro-SaaS idea.

IDEA:
- Title: ${idea.title}
- Problem: ${idea.problem}
- JTBD: ${idea.jtbd}
- Vertical: ${idea.vertical}

Generate:

1. UNIQUE VALUE PROPOSITION (UVP):
   - One compelling sentence that explains the unique benefit
   - Format: "[Product] helps [target user] [achieve outcome] by [unique mechanism], unlike [alternative]"

2. INTERVIEW SCRIPT (5 questions for 15-minute validation call):
   - Question 1: Confirm the problem exists
   - Question 2: Understand current workaround
   - Question 3: Quantify the pain (time/money lost)
   - Question 4: Gauge willingness to pay
   - Question 5: Identify decision blockers

OUTPUT FORMAT (JSON):
{
  "uvp": "The unique value proposition sentence",
  "interview_script": "Formatted script with 5 numbered questions and follow-up prompts"
}
`;

  try {
    const responseText = await callGemini(prompt, false);
    const parsed = JSON.parse(responseText);
    return {
      uvp: parsed.uvp,
      interviewScript: parsed.interview_script,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      throw new Error('Cuota de Gemini excedida. Intenta más tarde.');
    }
    console.error('Failed to generate validation kit:', error);
    throw error;
  }
}

// Analyze technical viability (from info.txt "Próximo paso recomendado")
export async function analyzeTechnicalViability(idea: MicroSaaSIdea): Promise<{
  backlog: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  suggestedAPIs: string[];
  warnings: string[];
}> {
  const prompt = `
You are a technical architect. Analyze the viability of building this Micro-SaaS MVP.

IDEA:
- Title: ${idea.title}
- Problem: ${idea.problem}
- Suggested Stack: ${idea.techStackSuggestion}

Generate a technical viability analysis:

1. INITIAL BACKLOG: Break down into 5-10 concrete tasks for MVP
2. COMPLEXITY ASSESSMENT: low (1-2 weeks), medium (3-4 weeks), high (5+ weeks)
3. SUGGESTED APIs/SERVICES: List external services that would accelerate development
4. WARNINGS: Technical risks or challenges to consider

OUTPUT FORMAT (JSON):
{
  "backlog": ["Task 1", "Task 2", ...],
  "estimated_complexity": "low | medium | high",
  "suggested_apis": ["API 1", "API 2", ...],
  "warnings": ["Warning 1", "Warning 2", ...]
}
`;

  try {
    const responseText = await callGemini(prompt, false);
    const parsed = JSON.parse(responseText);
    return {
      backlog: parsed.backlog,
      estimatedComplexity: parsed.estimated_complexity,
      suggestedAPIs: parsed.suggested_apis,
      warnings: parsed.warnings,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
      throw new Error('Cuota de Gemini excedida. Intenta más tarde.');
    }
    console.error('Failed to analyze technical viability:', error);
    throw error;
  }
}
