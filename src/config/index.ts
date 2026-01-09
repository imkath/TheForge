import type { Vertical, ScoringWeights } from '@/types';

// Environment Configuration
export const config = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  api: {
    // Cloudflare Worker API proxy URL
    // In production, this will be the deployed worker URL
    // In development, use the local wrangler dev server
    baseUrl: import.meta.env.VITE_API_URL || 'https://theforge-api.kathcastillosanchez.workers.dev',
  },
  app: {
    id: import.meta.env.VITE_APP_ID || 'microsaas-forge-v1',
    name: 'The Forge',
    version: '1.0.0',
  },
} as const;

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_GEMINI_API_KEY',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// Pre-configured Verticals - 30+ Categories across industries
export const VERTICALS: Vertical[] = [
  // ============================================
  // 🚀 DEVELOPER & TECH TOOLS
  // ============================================
  {
    id: 'developer-tools',
    name: 'Herramientas para Desarrolladores',
    searchKeywords: [
      'vscode extension alternative annoying',
      'git workflow nightmare developers',
      'code review tool missing',
      'linting setup exhausting config',
      'monorepo management chaos',
      'debugging tool wish existed',
    ],
    platforms: ['reddit', 'hackernews', 'devto'],
    leadUserPatterns: [
      'wrote a script to',
      'vscode extension needed',
      'cli tool missing',
      'built internal tool',
    ],
  },
  {
    id: 'api-management',
    name: 'Desarrollo y Gestión de APIs',
    searchKeywords: [
      'openapi swagger documentation outdated',
      'postman collection sync nightmare',
      'graphql testing tool missing',
      'webhook retry mechanism manual',
      'api rate limiting tracking hard',
      'mock server setup exhausting',
    ],
    platforms: ['reddit', 'hackernews', 'devto'],
    leadUserPatterns: [
      'postman workaround',
      'custom api testing',
      'webhook logger script',
    ],
  },
  {
    id: 'devops-automation',
    name: 'DevOps e Infraestructura',
    searchKeywords: [
      'github actions workflow complex',
      'docker compose management pain',
      'k8s helm chart nightmare',
      'terraform state file headache',
      'aws cost monitoring surprise bill',
      'serverless cold start problem',
    ],
    platforms: ['reddit', 'hackernews', 'devto'],
    leadUserPatterns: [
      'ansible playbook custom',
      'terraform workaround',
      'built deployment script',
    ],
  },
  {
    id: 'database-tools',
    name: 'Bases de Datos y Gestión de Datos',
    searchKeywords: [
      'prisma migration headache rollback',
      'postgresql query slow explain analyze',
      'mongodb schema validation missing',
      'redis cache invalidation nightmare',
      'supabase realtime limitations workaround',
      'database seed data management chaos',
    ],
    platforms: ['reddit', 'hackernews', 'dba.stackexchange'],
    leadUserPatterns: [
      'migration script custom',
      'backup automation script',
      'database monitoring homegrown',
    ],
  },

  // ============================================
  // 💼 BUSINESS & SAAS
  // ============================================
  {
    id: 'crm-sales',
    name: 'CRM y Automatización de Ventas',
    searchKeywords: [
      'hubspot alternative small business',
      'pipedrive limitation missing',
      'sales email automation clunky',
      'linkedin outreach tool needed',
      'lead enrichment expensive alternative',
      'cold email deliverability nightmare',
    ],
    platforms: ['reddit', 'g2', 'hackernews'],
    leadUserPatterns: [
      'salesforce workaround',
      'hubspot limitation',
      'sales spreadsheet tracking',
    ],
  },
  {
    id: 'hr-recruiting',
    name: 'RRHH y Reclutamiento',
    searchKeywords: [
      'greenhouse ats expensive alternative',
      'lever recruiting limitation workaround',
      'candidate sourcing linkedin headache',
      'interview scheduling back forth',
      'employee referral tracking manual',
      'onboarding checklist automation missing',
    ],
    platforms: ['reddit', 'g2', 'hackernews'],
    leadUserPatterns: [
      'ATS workaround',
      'recruiting spreadsheet',
      'onboarding checklist manual',
    ],
  },
  {
    id: 'project-management',
    name: 'Gestión de Proyectos',
    searchKeywords: [
      'linear alternative indie team',
      'clickup overwhelming features simple',
      'monday.com expensive small team',
      'notion database slow limitation',
      'basecamp missing gantt chart',
      'trello power-ups expensive limitation',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'jira workaround',
      'asana missing feature',
      'notion project template',
    ],
  },
  {
    id: 'customer-support',
    name: 'Soporte al Cliente',
    searchKeywords: [
      'intercom expensive small startup',
      'freshdesk limitation workaround needed',
      'help scout alternative cheaper',
      'zendesk overkill small business',
      'live chat widget lightweight',
      'knowledge base software simple',
    ],
    platforms: ['reddit', 'g2', 'hackernews'],
    leadUserPatterns: [
      'zendesk workaround',
      'intercom limitation',
      'support automation script',
    ],
  },

  // ============================================
  // 📈 MARKETING & GROWTH
  // ============================================
  {
    id: 'marketing-automation',
    name: 'Automatización de Marketing',
    searchKeywords: [
      'convertkit alternative indie',
      'mailerlite limitation workaround',
      'email drip sequence builder simple',
      'landing page ab testing cheap',
      'lead magnet delivery automation',
      'webinar funnel tool simple',
    ],
    platforms: ['reddit', 'hackernews', 'indiehackers'],
    leadUserPatterns: [
      'mailchimp workaround',
      'marketing spreadsheet',
      'campaign automation script',
    ],
  },
  {
    id: 'social-media-management',
    name: 'Gestión de Redes Sociales',
    searchKeywords: [
      'buffer alternative cheaper indie',
      'later app limitation scheduling',
      'tiktok scheduling tool missing',
      'twitter thread scheduler simple',
      'linkedin carousel creator automation',
      'instagram reels scheduler workaround',
    ],
    platforms: ['reddit', 'twitter', 'producthunt'],
    leadUserPatterns: [
      'buffer limitation',
      'hootsuite workaround',
      'social media spreadsheet',
    ],
  },
  {
    id: 'seo-content',
    name: 'SEO y Contenido',
    searchKeywords: [
      'ahrefs expensive alternative indie',
      'semrush overkill small site cheap',
      'surfer seo alternative affordable',
      'rank tracker keywords cheap tool',
      'topical authority content planner',
      'programmatic seo tool builder',
      'internal linking optimizer plugin',
      'gsc keyword clustering analysis',
    ],
    platforms: ['reddit', 'hackernews', 'indiehackers'],
    leadUserPatterns: [
      'ahrefs workaround',
      'semrush limitation',
      'seo spreadsheet tracking',
      'python seo script',
      'google search console api',
      'screaming frog alternative',
    ],
  },
  {
    id: 'analytics-reporting',
    name: 'Analíticas y Reportes',
    searchKeywords: [
      'plausible alternative simpler privacy',
      'mixpanel expensive startup alternative',
      'amplitude overkill small indie',
      'posthog self-host limitation',
      'client reporting dashboard white-label',
      'google analytics confusing alternative',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'google analytics workaround',
      'custom dashboard built',
      'reporting automation script',
    ],
  },

  // ============================================
  // 🛒 E-COMMERCE & RETAIL
  // ============================================
  {
    id: 'ecommerce-operations',
    name: 'Operaciones E-commerce',
    searchKeywords: [
      'shopify inventory sync multiple stores',
      'woocommerce order management messy',
      'product variants bulk edit painful',
      'sku management spreadsheet nightmare',
      'etsy ebay amazon sync tool',
      'low stock alert automation missing',
    ],
    platforms: ['reddit', 'shopify', 'hackernews'],
    leadUserPatterns: [
      'shopify app missing',
      'inventory spreadsheet',
      'order automation script',
    ],
  },
  {
    id: 'ecommerce-logistics',
    name: 'Logística y Devoluciones E-commerce',
    searchKeywords: [
      'easyship shipstation alternative cheaper',
      'return portal branded small store',
      '3pl integration headache warehouse',
      'shipping rate calculator display',
      'tracking page branded customer',
      'fulfillment by merchant fbm tool',
    ],
    platforms: ['reddit', 'trustpilot', 'hackernews'],
    leadUserPatterns: [
      'excel macro inventory',
      'shopify app missing',
      'built custom solution',
    ],
  },
  {
    id: 'dropshipping-tools',
    name: 'Dropshipping y Proveedores',
    searchKeywords: [
      'cjdropshipping automation aliexpress',
      'supplier vetting verification tool',
      'profit margin calculator dropship',
      'product research winning products',
      'aliexpress image download tool',
      'dsers spocket alternative cheaper',
    ],
    platforms: ['reddit', 'hackernews', 'ecommerce forums'],
    leadUserPatterns: [
      'oberlo workaround',
      'supplier tracking spreadsheet',
      'price monitoring script',
    ],
  },

  // ============================================
  // 💰 FINANCE & ACCOUNTING
  // ============================================
  {
    id: 'fintech-freelancers',
    name: 'Fintech para Freelancers',
    searchKeywords: [
      'wave freshbooks alternative cheaper',
      'freelancer quarterly tax estimate',
      'stripe paypal income tracking',
      'contractor invoice payment terms',
      '1099 expense tracking deductions',
      'client retainer billing recurring',
    ],
    platforms: ['reddit', 'hackernews', 'indiehackers'],
    leadUserPatterns: [
      'spreadsheet tax tracking',
      'notion invoicing template',
      'airtable freelance',
    ],
  },
  {
    id: 'bookkeeping-automation',
    name: 'Contabilidad y Finanzas',
    searchKeywords: [
      'quickbooks online overkill alternative',
      'xero bank feed syncing issues',
      'bank reconciliation automation tool',
      'receipt ocr categorization automatic',
      'stripe quickbooks sync nightmare',
      'multi-currency bookkeeping headache',
    ],
    platforms: ['reddit', 'hackernews', 'g2'],
    leadUserPatterns: [
      'quickbooks workaround',
      'xero limitation',
      'accounting spreadsheet',
    ],
  },
  {
    id: 'expense-management',
    name: 'Gastos y Presupuestos',
    searchKeywords: [
      'brex ramp alternative startup',
      'receipt scanning app accurate ocr',
      'team expense approval workflow',
      'corporate card tracking reconciliation',
      'mileage tracker automatic log',
      'per diem expense calculator tool',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'expensify workaround',
      'expense spreadsheet template',
      'budget tracking manual',
    ],
  },

  // ============================================
  // ⚖️ LEGAL & COMPLIANCE
  // ============================================
  {
    id: 'legal-compliance',
    name: 'Legal y Compliance',
    searchKeywords: [
      'gdpr cookie consent banner tool',
      'soc2 compliance checklist automation',
      'privacy policy generator accurate',
      'terms of service template saas',
      'dpa data processing agreement tool',
      'hipaa compliance startup checklist',
    ],
    platforms: ['reddit', 'g2', 'hackernews'],
    leadUserPatterns: [
      'word macro contract',
      'docusign workaround',
      'manual compliance tracking',
    ],
  },
  {
    id: 'contract-management',
    name: 'Gestión de Contratos',
    searchKeywords: [
      'docusign alternative cheaper indie',
      'pandadoc pricing expensive startup',
      'contract renewal reminder automation',
      'nda template generator customizable',
      'esignature api simple integration',
      'client agreement tracking spreadsheet',
    ],
    platforms: ['reddit', 'hackernews', 'g2'],
    leadUserPatterns: [
      'contract spreadsheet tracking',
      'docusign limitation',
      'pandadoc workaround',
    ],
  },

  // ============================================
  // 🏥 HEALTHCARE & WELLNESS
  // ============================================
  {
    id: 'healthcare-practice',
    name: 'Gestión de Consultorios Médicos',
    searchKeywords: [
      'calendly alternative hipaa compliant',
      'patient intake forms digital',
      'appointment reminder sms automation',
      'medical practice waitlist management',
      'ehr integration small practice',
      'telehealth simple solution solo',
    ],
    platforms: ['reddit', 'hackernews', 'healthcare forums'],
    leadUserPatterns: [
      'patient scheduling workaround',
      'billing spreadsheet',
      'EHR integration script',
    ],
  },
  {
    id: 'fitness-wellness',
    name: 'Fitness y Bienestar',
    searchKeywords: [
      'trainerize alternative indie coach',
      'personal training client progress',
      'nutrition coaching app simple',
      'workout builder app trainer',
      'gym member check-in system',
      'fitness challenge creator tool',
    ],
    platforms: ['reddit', 'producthunt', 'hackernews'],
    leadUserPatterns: [
      'fitness app limitation',
      'workout spreadsheet',
      'client tracking manual',
    ],
  },
  {
    id: 'mental-health-tools',
    name: 'Salud Mental y Terapia',
    searchKeywords: [
      'simplepractice alternative cheaper therapist',
      'therapy notes template progress',
      'client portal therapy private',
      'mood tracking journal app',
      'therapist matching platform indie',
      'mental health check-in automated',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'therapy notes template',
      'patient tracking manual',
      'telehealth workaround',
    ],
  },

  // ============================================
  // 🏠 REAL ESTATE & PROPERTY
  // ============================================
  {
    id: 'real-estate-agents',
    name: 'Corredores de Propiedades',
    searchKeywords: [
      'follow up boss alternative cheaper',
      'real estate lead nurturing automation',
      'property showing scheduler calendar',
      'mls listing syndication tool',
      'open house sign-in digital',
      'real estate drip campaign email',
    ],
    platforms: ['reddit', 'hackernews', 'real estate forums'],
    leadUserPatterns: [
      'real estate CRM workaround',
      'listing spreadsheet',
      'lead tracking manual',
    ],
  },
  {
    id: 'property-management',
    name: 'Administración de Propiedades',
    searchKeywords: [
      'buildium appfolio alternative indie',
      'rent collection automated reminder',
      'maintenance request portal simple',
      'tenant screening tool affordable',
      'lease renewal tracking automation',
      'landlord expense tracking software',
    ],
    platforms: ['reddit', 'hackernews', 'biggerpockets'],
    leadUserPatterns: [
      'property spreadsheet',
      'rent tracking manual',
      'tenant portal workaround',
    ],
  },

  // ============================================
  // 🎨 CREATIVE & DESIGN
  // ============================================
  {
    id: 'design-tools',
    name: 'Diseño y Herramientas Creativas',
    searchKeywords: [
      'figma plugin asset export',
      'design token sync code',
      'brand kit management team',
      'mockup generator automated',
      'design feedback annotation tool',
      'color palette generator ai',
    ],
    platforms: ['reddit', 'dribbble', 'producthunt'],
    leadUserPatterns: [
      'figma plugin needed',
      'design system workaround',
      'asset library manual',
    ],
  },
  {
    id: 'video-production',
    name: 'Producción y Edición de Video',
    searchKeywords: [
      'descript alternative cheaper',
      'video subtitle generator accurate',
      'b-roll stock footage finder',
      'youtube thumbnail ab testing',
      'video repurposing clips tool',
      'frame.io alternative affordable',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'premiere workaround',
      'video asset management manual',
      'editing automation script',
    ],
  },
  {
    id: 'podcast-audio',
    name: 'Podcasts y Audio',
    searchKeywords: [
      'riverside descript alternative',
      'podcast show notes generator',
      'audio cleanup noise removal',
      'podcast audiogram creator clips',
      'rss feed analytics podcast',
      'guest booking scheduler podcast',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'podcast hosting workaround',
      'episode spreadsheet',
      'transcription manual',
    ],
  },

  // ============================================
  // 🏭 OPERATIONS & LOGISTICS
  // ============================================
  {
    id: 'supply-chain',
    name: 'Cadena de Suministro',
    searchKeywords: [
      'purchase order approval workflow',
      'vendor onboarding checklist tool',
      'supplier lead time tracking',
      'reorder point calculator automation',
      'inventory forecasting small business',
      'raw materials cost tracking',
    ],
    platforms: ['reddit', 'hackernews', 'logistics forums'],
    leadUserPatterns: [
      'supply chain spreadsheet',
      'vendor tracking manual',
      'procurement automation',
    ],
  },
  {
    id: 'field-service',
    name: 'Servicios en Terreno',
    searchKeywords: [
      'servicetitan alternative affordable',
      'technician scheduling dispatch app',
      'work order mobile completion',
      'route optimization field service',
      'customer signature capture field',
      'job costing field service tracking',
    ],
    platforms: ['reddit', 'hackernews', 'g2'],
    leadUserPatterns: [
      'field service workaround',
      'work order spreadsheet',
      'dispatch tracking manual',
    ],
  },

  // ============================================
  // 🌐 AGENCIES & CONSULTING
  // ============================================
  {
    id: 'marketing-agencies',
    name: 'Agencias de Marketing',
    searchKeywords: [
      'agency management tool spp alternative',
      'white label reporting dashboard clients',
      'client seo report automation',
      'agency retainer tracking billing',
      'multi-client social media posting',
      'agency project profitability tracking',
    ],
    platforms: ['reddit', 'hackernews', 'indiehackers'],
    leadUserPatterns: [
      'client report automation',
      'agency spreadsheet',
      'multi-client workaround',
    ],
  },
  {
    id: 'consulting-firms',
    name: 'Consultoría y Servicios Profesionales',
    searchKeywords: [
      'consultant proposal template generator',
      'hourly billing tracker consultant',
      'client deliverable tracking portal',
      'sow statement work template',
      'consulting pipeline crm simple',
      'knowledge base consultant internal',
    ],
    platforms: ['reddit', 'hackernews', 'consulting forums'],
    leadUserPatterns: [
      'consulting spreadsheet',
      'proposal template manual',
      'time tracking workaround',
    ],
  },
  {
    id: 'web-dev-agencies',
    name: 'Agencias de Desarrollo Web',
    searchKeywords: [
      'client website feedback annotation',
      'staging site client review',
      'website care plan management',
      'wordpress maintenance dashboard',
      'client onboarding questionnaire dev',
      'project handoff documentation tool',
    ],
    platforms: ['reddit', 'hackernews', 'devto'],
    leadUserPatterns: [
      'client feedback workaround',
      'staging automation script',
      'project tracking manual',
    ],
  },

  // ============================================
  // 🎮 GAMING & ENTERTAINMENT
  // ============================================
  {
    id: 'game-development',
    name: 'Desarrollo de Videojuegos',
    searchKeywords: [
      'unity asset store alternative',
      'game localization tool indie',
      'playtesting feedback collection',
      'game analytics indie developer',
      'steam wishlist marketing tool',
      'game community discord management',
    ],
    platforms: ['reddit', 'hackernews', 'gamedev forums'],
    leadUserPatterns: [
      'unity workaround',
      'game dev spreadsheet',
      'asset management manual',
    ],
  },
  {
    id: 'streaming-content',
    name: 'Streaming y Creadores de Contenido',
    searchKeywords: [
      'streamlabs obs overlay builder',
      'twitch chat bot custom commands',
      'stream schedule social posting',
      'youtube sponsorship calculator',
      'creator media kit generator',
      'patron tier management tool',
    ],
    platforms: ['reddit', 'hackernews', 'twitch forums'],
    leadUserPatterns: [
      'streamlabs workaround',
      'content calendar spreadsheet',
      'analytics tracking manual',
    ],
  },

  // ============================================
  // 🔬 RESEARCH & ACADEMIA
  // ============================================
  {
    id: 'research-academia',
    name: 'Investigación y Academia',
    searchKeywords: [
      'zotero mendeley alternative simple',
      'literature review organization tool',
      'research paper notes obsidian',
      'grant deadline tracking academic',
      'research collaboration platform team',
      'phd thesis writing progress tracker',
    ],
    platforms: ['reddit', 'hackernews', 'academia forums'],
    leadUserPatterns: [
      'zotero workaround',
      'research spreadsheet',
      'citation management manual',
    ],
  },
  {
    id: 'data-science',
    name: 'Data Science y Machine Learning',
    searchKeywords: [
      'wandb alternative cheaper mlflow',
      'jupyter notebook versioning git',
      'feature store simple small team',
      'model monitoring production simple',
      'data labeling tool affordable',
      'llm prompt management versioning',
    ],
    platforms: ['reddit', 'hackernews', 'kaggle'],
    leadUserPatterns: [
      'mlflow workaround',
      'experiment tracking script',
      'data pipeline custom',
    ],
  },

  // ============================================
  // 🌱 SUSTAINABILITY & NON-PROFIT
  // ============================================
  {
    id: 'non-profit-tools',
    name: 'ONGs y Sin Fines de Lucro',
    searchKeywords: [
      'bloomerang alternative cheaper nonprofit',
      'volunteer scheduling coordination tool',
      'donation receipt automated email',
      'grant application tracking deadline',
      'impact metrics dashboard nonprofit',
      'recurring donation management platform',
    ],
    platforms: ['reddit', 'hackernews', 'nonprofit forums'],
    leadUserPatterns: [
      'donor spreadsheet',
      'volunteer tracking manual',
      'fundraising workaround',
    ],
  },

  // ============================================
  // 🍽️ RESTAURANTES Y FOOD SERVICE
  // ============================================
  {
    id: 'restaurant-management',
    name: 'Gestión de Restaurantes',
    searchKeywords: [
      'restaurant pos system small cafe',
      'table reservation booking nightmare',
      'kitchen display system orders',
      'menu qr code ordering contactless',
      'food cost calculator recipe costing',
      'waitlist management walk-in customers',
    ],
    platforms: ['reddit', 'g2', 'trustpilot'],
    leadUserPatterns: [
      'restaurant spreadsheet inventory',
      'manual reservation book',
      'whatsapp orders chaos',
      'paper tickets kitchen',
    ],
  },
  {
    id: 'food-delivery-dark-kitchen',
    name: 'Delivery y Dark Kitchens',
    searchKeywords: [
      'ghost kitchen management software',
      'multi-platform delivery aggregator',
      'rappi ubereats didifood integration',
      'delivery driver dispatch route',
      'food prep timing optimization',
      'packaging inventory tracking restaurant',
    ],
    platforms: ['reddit', 'hackernews', 'restaurant forums'],
    leadUserPatterns: [
      'delivery app spreadsheet',
      'uber eats rappi manual',
      'kitchen timing chaos',
    ],
  },

  // ============================================
  // 💇 BELLEZA Y SERVICIOS PERSONALES
  // ============================================
  {
    id: 'salon-spa',
    name: 'Salones de Belleza y Spa',
    searchKeywords: [
      'salon booking appointment software cheap',
      'hair stylist client management app',
      'spa scheduling multiple services',
      'beauty salon pos inventory products',
      'nail technician booking independent',
      'barbershop waitlist walk-in clients',
    ],
    platforms: ['reddit', 'g2', 'facebook groups'],
    leadUserPatterns: [
      'salon whatsapp booking',
      'client cards paper',
      'appointment book manual',
      'product inventory spreadsheet',
    ],
  },
  {
    id: 'personal-services',
    name: 'Servicios Personales (Masajes, Estética)',
    searchKeywords: [
      'massage therapist booking independent',
      'esthetician client intake forms',
      'mobile beauty services scheduling',
      'home service provider route planning',
      'client before after photos storage',
      'service provider tips payment',
    ],
    platforms: ['reddit', 'facebook groups', 'yelp'],
    leadUserPatterns: [
      'client photos phone gallery',
      'booking via instagram dm',
      'cash tips tracking',
    ],
  },

  // ============================================
  // 🏋️ GIMNASIOS Y FITNESS
  // ============================================
  {
    id: 'gym-studio',
    name: 'Gimnasios y Estudios Fitness',
    searchKeywords: [
      'gym membership management small studio',
      'class booking yoga pilates schedule',
      'personal trainer client tracking',
      'gym access control qr code',
      'fitness studio payment recurring',
      'crossfit box member wod tracking',
    ],
    platforms: ['reddit', 'facebook groups', 'g2'],
    leadUserPatterns: [
      'gym member spreadsheet',
      'class signup paper list',
      'trainer client whatsapp',
      'membership payment manual',
    ],
  },
  {
    id: 'sports-clubs',
    name: 'Clubes Deportivos y Academias',
    searchKeywords: [
      'sports club member management',
      'soccer academy player registration',
      'tennis court booking reservation',
      'swim school class scheduling',
      'martial arts dojo student tracking',
      'sports team parent communication',
    ],
    platforms: ['reddit', 'facebook groups', 'sports forums'],
    leadUserPatterns: [
      'player roster spreadsheet',
      'court reservation paper',
      'parent group whatsapp',
      'attendance manual tracking',
    ],
  },

  // ============================================
  // 🏫 EDUCACIÓN Y TUTORÍAS
  // ============================================
  {
    id: 'tutoring-academies',
    name: 'Tutorías y Academias',
    searchKeywords: [
      'tutoring scheduling software independent',
      'online tutor payment booking',
      'language school student management',
      'music lesson scheduling teacher',
      'test prep academy tracking progress',
      'homework help tutor matching',
    ],
    platforms: ['reddit', 'facebook groups', 'education forums'],
    leadUserPatterns: [
      'student spreadsheet grades',
      'lesson booking whatsapp',
      'payment tracking manual',
      'progress notes paper',
    ],
  },
  {
    id: 'driving-schools',
    name: 'Autoescuelas',
    searchKeywords: [
      'driving school scheduling software',
      'instructor calendar management',
      'student progress tracking driving',
      'vehicle maintenance log fleet',
      'theory test practice platform',
      'driving lesson booking cancellation',
    ],
    platforms: ['reddit', 'local forums', 'facebook groups'],
    leadUserPatterns: [
      'instructor schedule paper',
      'student hours tracking manual',
      'vehicle log book handwritten',
    ],
  },

  // ============================================
  // 🐕 MASCOTAS Y VETERINARIA
  // ============================================
  {
    id: 'pet-services',
    name: 'Servicios para Mascotas',
    searchKeywords: [
      'dog walking booking scheduling app',
      'pet grooming salon management',
      'pet sitting booking calendar',
      'dog daycare check-in tracking',
      'pet boarding reservation software',
      'mobile pet grooming route planning',
    ],
    platforms: ['reddit', 'facebook groups', 'yelp'],
    leadUserPatterns: [
      'pet client spreadsheet',
      'grooming appointment book',
      'dog walking route manual',
      'boarding calendar paper',
    ],
  },
  {
    id: 'veterinary-clinics',
    name: 'Clínicas Veterinarias',
    searchKeywords: [
      'veterinary practice management small',
      'pet medical records software',
      'vet appointment reminder sms',
      'vaccination schedule tracking pets',
      'veterinary inventory medications',
      'pet owner portal results sharing',
    ],
    platforms: ['reddit', 'veterinary forums', 'g2'],
    leadUserPatterns: [
      'pet records paper files',
      'vaccination reminders manual',
      'inventory tracking spreadsheet',
    ],
  },

  // ============================================
  // 🏠 SERVICIOS PARA EL HOGAR
  // ============================================
  {
    id: 'cleaning-services',
    name: 'Servicios de Limpieza',
    searchKeywords: [
      'cleaning business scheduling software',
      'maid service booking management',
      'house cleaning quote calculator',
      'cleaning crew dispatch routing',
      'janitorial service client portal',
      'residential cleaning recurring booking',
    ],
    platforms: ['reddit', 'facebook groups', 'thumbtack'],
    leadUserPatterns: [
      'cleaning schedule spreadsheet',
      'client list paper',
      'route planning manual',
      'quote calculator excel',
    ],
  },
  {
    id: 'home-repair',
    name: 'Reparaciones y Mantenimiento del Hogar',
    searchKeywords: [
      'handyman scheduling quoting software',
      'plumber electrician job management',
      'hvac service technician dispatch',
      'appliance repair ticket tracking',
      'home service invoice on-site',
      'contractor job costing small',
    ],
    platforms: ['reddit', 'thumbtack', 'facebook groups'],
    leadUserPatterns: [
      'job tracking spreadsheet',
      'invoice paper carbon copy',
      'parts inventory manual',
      'scheduling calendar handwritten',
    ],
  },
  {
    id: 'landscaping-gardening',
    name: 'Jardinería y Paisajismo',
    searchKeywords: [
      'lawn care scheduling routing software',
      'landscaping quote proposal generator',
      'gardening service client management',
      'irrigation maintenance tracking',
      'seasonal service recurring billing',
      'crew time tracking landscaping',
    ],
    platforms: ['reddit', 'facebook groups', 'lawn care forums'],
    leadUserPatterns: [
      'route spreadsheet daily',
      'quote paper manual',
      'crew hours tracking',
      'billing excel monthly',
    ],
  },

  // ============================================
  // 🚗 AUTOMOTRIZ
  // ============================================
  {
    id: 'auto-repair',
    name: 'Talleres Mecánicos',
    searchKeywords: [
      'auto repair shop management software',
      'mechanic work order system',
      'car service appointment booking',
      'parts inventory automotive',
      'vehicle history customer records',
      'repair estimate quote generator',
    ],
    platforms: ['reddit', 'automotive forums', 'facebook groups'],
    leadUserPatterns: [
      'repair orders paper',
      'parts inventory spreadsheet',
      'customer vehicle history manual',
      'estimate calculator excel',
    ],
  },
  {
    id: 'car-wash-detailing',
    name: 'Lavado de Autos y Detailing',
    searchKeywords: [
      'car wash pos membership software',
      'auto detailing booking scheduling',
      'mobile detailing route planning',
      'car wash loyalty program',
      'detailing service package pricing',
      'fleet wash scheduling business',
    ],
    platforms: ['reddit', 'auto detailing forums', 'facebook groups'],
    leadUserPatterns: [
      'membership tracking spreadsheet',
      'appointment book paper',
      'loyalty punch cards',
      'route planning manual',
    ],
  },

  // ============================================
  // 📸 FOTOGRAFÍA Y EVENTOS
  // ============================================
  {
    id: 'photography-events',
    name: 'Fotografía y Videografía',
    searchKeywords: [
      'photographer client management crm',
      'wedding photography contract booking',
      'photo gallery delivery client',
      'photography pricing package quote',
      'event photographer scheduling',
      'photo editing workflow management',
    ],
    platforms: ['reddit', 'photography forums', 'facebook groups'],
    leadUserPatterns: [
      'client spreadsheet bookings',
      'contract template word',
      'gallery sharing wetransfer',
      'invoice manual creation',
    ],
  },
  {
    id: 'event-planning',
    name: 'Organización de Eventos',
    searchKeywords: [
      'event planner client management',
      'wedding planning timeline checklist',
      'vendor coordination communication',
      'event budget tracking software',
      'guest list rsvp management',
      'event day timeline scheduling',
    ],
    platforms: ['reddit', 'event planning forums', 'facebook groups'],
    leadUserPatterns: [
      'vendor spreadsheet contacts',
      'timeline excel template',
      'budget tracking manual',
      'guest list google sheets',
    ],
  },

  // ============================================
  // 🏪 RETAIL Y TIENDAS FÍSICAS
  // ============================================
  {
    id: 'retail-small-shops',
    name: 'Tiendas y Comercios Pequeños',
    searchKeywords: [
      'small retail pos inventory simple',
      'boutique store management software',
      'gift shop point of sale',
      'consignment store tracking software',
      'small store inventory counting',
      'retail customer loyalty program',
    ],
    platforms: ['reddit', 'retail forums', 'facebook groups'],
    leadUserPatterns: [
      'inventory spreadsheet manual',
      'sales tracking notebook',
      'loyalty punch cards paper',
      'reorder tracking excel',
    ],
  },
  {
    id: 'farmers-markets',
    name: 'Mercados y Productores Locales',
    searchKeywords: [
      'farmers market vendor pos mobile',
      'farm stand inventory tracking',
      'csa subscription box management',
      'produce pricing calculator seasonal',
      'market vendor booth scheduling',
      'farm to table order management',
    ],
    platforms: ['reddit', 'farming forums', 'facebook groups'],
    leadUserPatterns: [
      'harvest tracking spreadsheet',
      'csa member list manual',
      'market sales paper log',
      'pricing calculator excel',
    ],
  },

  // ============================================
  // 🌍 LOCALIZED / LATAM
  // ============================================
  {
    id: 'latam-startups',
    name: 'Herramientas para Startups LATAM',
    searchKeywords: [
      'factura electronica mexico cfdi',
      'boleta chile sii integracion',
      'mercado pago stripe alternative',
      'contabilidad pymes argentina software',
      'nomina empleados colombia herramienta',
      'cobro recurrente latam plataforma',
    ],
    platforms: ['reddit', 'twitter', 'hackernews'],
    leadUserPatterns: [
      'facturación script',
      'pagos workaround latam',
      'spreadsheet negocio',
    ],
  },

  // ============================================
  // 🚀 IMPORTACIÓN DE IDEAS (Inspirado en EmprendeFlix)
  // Ideas validadas en mercados ingleses para importar a LATAM/España
  // NOTA: Estas verticales usan Search Grounding de Gemini
  // ============================================
  {
    id: 'import-opportunities',
    name: '🌎 Ideas para Importar (EN→ES)',
    searchKeywords: [
      // Nichos específicos con potencial de localización
      'invoicing software small business MRR launched',
      'appointment booking saas professionals revenue',
      'property management landlord indie maker',
      'accounting software freelancers launched paying',
      'hr onboarding tool small team launched',
      'legal document automation small firm indie',
    ],
    platforms: ['betalist', 'indiehackers', 'producthunt', 'oasisofideas'],
    leadUserPatterns: [
      'need spanish version',
      'latam market',
      'mexico regulations',
      'spain compliance',
      'no support for',
    ],
  },
  {
    id: 'import-saas-tools',
    name: '🛠️ SaaS Tools para Localizar',
    searchKeywords: [
      // Herramientas para profesionales específicos
      'scheduling tool therapists counselors launched',
      'client portal accountants bookkeepers indie',
      'proposal software freelancers agencies paying',
      'booking system beauty salon spa launched',
      'practice management doctors dentists indie',
      'real estate crm agents brokers launched',
    ],
    platforms: ['betalist', 'producthunt', 'hackernews'],
    leadUserPatterns: [
      'no spanish localization',
      'US only features',
      'needs local payment',
      'regulations missing',
    ],
  },
  {
    id: 'import-fintech-latam',
    name: '💰 Fintech Ideas para LATAM',
    searchKeywords: [
      // Fintech con regulaciones locales necesarias
      'invoicing cfdi mexico facturacion electronica',
      'payroll software small business latam',
      'expense management autonomos espana',
      'billing subscription peso argentino colombiano',
      'receipt scanning tax deduction freelancer',
      'bank reconciliation quickbooks alternative small',
    ],
    platforms: ['betalist', 'indiehackers', 'hackernews'],
    leadUserPatterns: [
      'mercado pago integration',
      'cfdi compliance',
      'sat mexico',
      'sii chile',
      'afip argentina',
    ],
  },
  {
    id: 'import-creator-tools',
    name: '🎨 Herramientas para Creadores',
    searchKeywords: [
      // Herramientas de monetización para creadores hispanos
      'newsletter monetization spanish creators',
      'digital products platform spanish market',
      'online course creator spanish speaking',
      'membership community spanish audience',
      'coaching platform spanish coaches',
      'content creator tools latin america',
    ],
    platforms: ['betalist', 'producthunt', 'indiehackers'],
    leadUserPatterns: [
      'spanish speaking audience',
      'latam creators',
      'spanish content',
      'local payment methods',
    ],
  },

  // ============================================
  // 📦 PRODUCTOS DIGITALES
  // ============================================
  {
    id: 'digital-products',
    name: 'Productos Digitales',
    searchKeywords: [
      'lemon squeezy gumroad alternative',
      'digital product delivery automation',
      'license key generator software',
      'drm protection digital products',
      'bundle discount digital download',
      'upsell checkout digital products',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'gumroad workaround',
      'sell templates manually',
      'PDF automation',
      'digital product spreadsheet',
    ],
  },
  {
    id: 'templates-resources',
    name: 'Plantillas y Recursos Descargables',
    searchKeywords: [
      'notion template selling platform indie',
      'figma ui kit marketplace creator',
      'airtable template store builder',
      'excel template shop ecommerce',
      'canva template licensing selling',
      'framer template marketplace indie',
    ],
    platforms: ['reddit', 'hackernews', 'producthunt'],
    leadUserPatterns: [
      'template business workaround',
      'selling resources manually',
      'notion template store',
    ],
  },
  {
    id: 'info-products',
    name: 'Infoproductos y Guías (PDFs, Ebooks)',
    searchKeywords: [
      'ebook landing page converter',
      'pdf workbook generator interactive',
      'lead magnet delivery automation',
      'kindle direct publishing alternative',
      'notion ebook template selling',
      'paid newsletter archive ebook',
    ],
    platforms: ['reddit', 'hackernews', 'indiehackers'],
    leadUserPatterns: [
      'PDF automation script',
      'ebook delivery manual',
      'guide template workaround',
    ],
  },
];

// Default Scoring Weights (adjustable per user profile)
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  accessibility: 0.25,        // Can a solo dev build this?
  paymentPotential: 0.30,     // Will people pay?
  marketSize: 0.15,           // How big is the market?
  competitionLevel: 0.15,     // How crowded?
  implementationSpeed: 0.15,  // Time to MVP
};

// Lead User Detection Keywords (from Eric von Hippel theory)
export const LEAD_USER_SIGNALS = [
  // Custom scripts
  'python script', 'node script', 'bash script', 'automation script',
  // Spreadsheet solutions
  'excel macro', 'google sheets formula', 'airtable automation',
  'spreadsheet template', 'notion database',
  // Integration workarounds
  'zapier workaround', 'make.com', 'n8n automation', 'integromat',
  // Manual processes
  'manually tracking', 'copy paste', 'export import',
  // Explicit signals
  'built my own', 'custom solution', 'homegrown tool',
  'wish there was', 'would pay for', 'need a tool',
];

// Friction Severity Classification
export const FRICTION_KEYWORDS = {
  minor_bug: [
    'bug', 'glitch', 'sometimes fails', 'minor issue', 'annoyance',
  ],
  workflow_gap: [
    'no way to', 'missing feature', 'have to manually', 'workaround',
    'wish I could', 'takes too long', 'repetitive task',
  ],
  critical_pain: [
    'nightmare', 'impossible', 'losing money', 'losing customers',
    'hours every day', 'critical problem', 'desperate for',
  ],
};
