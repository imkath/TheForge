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
  const perspectives = [
    'desde la perspectiva de un desarrollador indie',
    'enfocándote en nichos poco explorados',
    'priorizando problemas con alta urgencia',
    'buscando oportunidades de automatización',
    'identificando fricciones en flujos de trabajo',
    'desde el ángulo de herramientas B2B',
    'enfocándote en productividad personal',
    'buscando problemas recurrentes',
  ];
  const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

  const prompt = `
Eres un analista experto de oportunidades Micro-SaaS usando el framework Jobs To Be Done (JTBD).
IMPORTANTE: Responde TODO en español.
SEED DE CREATIVIDAD: ${creativitySeed} (usa esto para variar tu análisis)
PERSPECTIVA: Analiza ${randomPerspective}.

VERTICAL: ${vertical.name}

He recopilado quejas y discusiones REALES de usuarios de Reddit, Hacker News, DEV.to y otras fuentes.
Tu trabajo es ANALIZAR esta evidencia y sintetizar oportunidades de Micro-SaaS.

=== PUNTOS DE DOLOR REALES ENCONTRADOS ===
${painPointsText || 'No se encontraron puntos de dolor'}

=== SEÑALES DE USUARIOS LÍDERES (personas construyendo soluciones propias) ===
${leadUsersText || 'No se encontraron señales de usuarios líderes'}

=== COMPETIDORES/SOLUCIONES EXISTENTES ===
${competitorsText || 'No se encontraron competidores'}

=== TU MISIÓN ===
Basándote SOLO en la evidencia anterior:
1. Identifica patrones recurrentes de fricción
2. Sintetiza 3-5 ideas de Micro-SaaS que aborden estos problemas REALES
3. Cada idea DEBE referenciar evidencia específica de los datos anteriores
4. NO inventes problemas - usa solo lo que está en la evidencia

⚠️ REGLAS ANTI-IDEAS GENÉRICAS (MUY IMPORTANTE):
- RECHAZA ideas genéricas de herramientas de desarrollo como: "GitCleaner", "CodeFormatter", "ArrayOptimizer", "JSONValidator", "LogAnalyzer"
- RECHAZA ideas que ya existen ampliamente: "Yet another todo app", "Generic dashboard builder", "Simple form builder"
- RECHAZA ideas sin nicho específico: debe haber un USUARIO CONCRETO con un PROBLEMA CONCRETO
- Cada idea debe mencionar: ¿Quién específicamente pagaría? ¿Por qué las soluciones actuales no sirven?
- El título debe ser ESPECÍFICO al problema, no genérico. Mal: "DataSync". Bien: "SyncFacturas - Sincronización CFDI multi-SAT"

FORMATO DE SALIDA (JSON estricto, TODO EN ESPAÑOL):
{
  "vertical": "${vertical.name}",
  "ideas": [
    {
      "title": "Nombre de producto específico al problema (NO genérico)",
      "problem": "Descripción detallada del problema con contexto específico: quién lo sufre, en qué situación, qué pierden (tiempo/dinero)",
      "jtbd": "Cuando [situación específica con contexto], quiero [motivación concreta], para poder [resultado medible], pero [barrera actual específica]",
      "evidence_source": "Lista de fuentes específicas (URLs o plataformas) que apoyan esta idea",
      "potential_score": 1-100,
      "tech_stack_suggestion": "Tech recomendado para MVP (sé específico: React, Supabase, etc.)",
      "friction_type": "minor_bug | workflow_gap | critical_pain",
      "lead_user_signals": ["Indicadores específicos de la evidencia de que existen usuarios sofisticados"],
      "target_customer": "Descripción específica del cliente ideal (ej: 'Contadores independientes en México con 20-50 clientes')"
    }
  ]
}

CRITERIOS DE PUNTUACIÓN:
- 80-100: Múltiples fuentes confirman el dolor, usuarios líderes construyendo soluciones, cliente objetivo claro dispuesto a pagar
- 60-79: 2-3 fuentes confirman, gap de flujo de trabajo identificado, nicho identificable
- 40-59: Una sola fuente, queja recurrente, potencial de pago poco claro
- Menos de 40: Evidencia débil, idea genérica, o mercado saturado

IMPORTANTE: Prefiere devolver 2 ideas excelentes y específicas que 5 ideas genéricas.
Si la evidencia solo soporta ideas genéricas, devuelve un array vacío.
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

  // Specific verticals for import categories
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

⚠️ REGLAS CRÍTICAS - ANTI-IDEAS GENÉRICAS:
1. PROHIBIDO devolver ideas genéricas de programación: "GitCleaner", "CodeFormatter", "ArrayOptimizer", "JSONValidator", "LogAnalyzer", "DebugHelper"
2. PROHIBIDO ideas sin mercado hispanohablante claro: debe haber un NICHO ESPECÍFICO en LATAM o España
3. PROHIBIDO productos que ya tienen competencia fuerte en español
4. CADA idea debe mencionar un PRODUCTO REAL o categoría específica de productos que existe en inglés

CRITERIOS DE PRODUCTOS A BUSCAR:
1. SaaS con tracción comprobada: MRR reportado, usuarios pagando, reseñas en G2/Capterra
2. Productos que NO tienen versión en español o están mal localizados
3. Nichos donde la regulación local importa: facturación, nómina, contabilidad, legal, inmobiliario
4. Herramientas para profesionales específicos: contadores, abogados, agentes inmobiliarios, coaches

EJEMPLOS BUENOS (específicos):
- "SimplePractice" (USA) → oportunidad para psicólogos en México sin gestión de citas HIPAA-like
- "Gusto" (payroll USA) → nómina para PYMES en Colombia con prestaciones sociales
- "Honeybook" (creativos USA) → CRM para fotógrafos/videógrafos en España con facturación

EJEMPLOS MALOS (rechazar):
- "DataSync" - muy genérico
- "TaskManager Pro" - saturado
- "API Logger" - sin mercado hispano claro
- Cualquier herramienta de desarrollo sin contexto de localización

FORMATO DE SALIDA (JSON estricto, TODO EN ESPAÑOL):
{
  "vertical": "${vertical.name}",
  "ideas": [
    {
      "title": "Nombre específico al nicho hispano (ej: 'FacturaMX - Facturación CFDI para Freelancers')",
      "problem": "Producto ORIGINAL (nombre real si existe) + por qué el mercado hispano lo necesita localizado + qué regulación/contexto falta",
      "jtbd": "Cuando [profesional específico en país específico] necesita [acción concreta], quiere [herramienta tipo X], pero [barrera de localización específica]",
      "evidence_source": "URL real donde encontraste el producto (ProductHunt, IndieHackers, sitio web)",
      "potential_score": 65-90,
      "tech_stack_suggestion": "Tech para MVP con integraciones locales (ej: React + API SAT México)",
      "friction_type": "workflow_gap",
      "lead_user_signals": ["Señales de demanda: búsquedas en español, comentarios pidiendo localización, etc."],
      "original_product": "Nombre exacto del producto en inglés",
      "localization_opportunity": "Específico: qué regulaciones (CFDI, SII, AFIP), qué pasarelas de pago (Mercado Pago, SPEI), qué idioma/UX",
      "target_market": "País o región específica + profesión + tamaño de empresa"
    }
  ]
}

Busca en internet productos REALES. Si no encuentras productos reales que cumplan los criterios, devuelve un array vacío.
Prefiere 2-3 ideas excelentes y específicas que 5 ideas genéricas.
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

Return 3-5 high-quality ideas based on your search findings.
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
