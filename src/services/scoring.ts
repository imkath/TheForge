import { DEFAULT_SCORING_WEIGHTS } from '@/config';
import type { MicroSaaSIdea, ScoringWeights, ScoringResult, FrictionSeverity } from '@/types';

/**
 * Multi-criteria Scoring System
 *
 * Based on info.txt section 4: "Validación de Scoring"
 * Implements a weighted decision model to adjust scores based on:
 * - Developer profile (solo dev vs team)
 * - Friction severity
 * - Lead user presence
 */

// Score modifiers based on friction severity
const FRICTION_MULTIPLIERS: Record<FrictionSeverity, number> = {
  critical_pain: 1.3,
  workflow_gap: 1.0,
  minor_bug: 0.7,
};

// Lead user sophistication bonus
const LEAD_USER_BONUS: Record<number, number> = {
  1: 5,  // Manual process
  2: 10, // Zapier/no-code
  3: 15, // Excel/Sheets macro
  4: 20, // Custom script
  5: 25, // Advanced automation
};

// Import opportunity bonus (inspired by EmprendeFlix video)
const IMPORT_OPPORTUNITY_BONUS = 15; // Ideas validated in English markets

// Revenue verification bonus (ideas with proven revenue)
const REVENUE_VERIFIED_BONUS = 20; // Stripe-verified or confirmed MRR

// MRR tier bonuses (higher MRR = more validated idea)
const MRR_TIER_BONUS: Record<string, number> = {
  'starter': 5,    // $0 - $1k MRR
  'growing': 10,   // $1k - $10k MRR
  'established': 15, // $10k - $50k MRR
  'scale': 20,     // $50k+ MRR
};

export function calculateScore(
  idea: MicroSaaSIdea,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoringResult {
  // Base score from AI assessment
  const baseScore = idea.potentialScore || 50;

  // Calculate individual dimension scores
  const breakdown = {
    accessibility: calculateAccessibility(idea),
    paymentPotential: calculatePaymentPotential(idea),
    marketSize: calculateMarketSize(idea),
    competitionLevel: calculateCompetitionLevel(idea),
    implementationSpeed: calculateImplementationSpeed(idea),
  };

  // Apply weights
  const weightedScore =
    breakdown.accessibility * weights.accessibility +
    breakdown.paymentPotential * weights.paymentPotential +
    breakdown.marketSize * weights.marketSize +
    breakdown.competitionLevel * weights.competitionLevel +
    breakdown.implementationSpeed * weights.implementationSpeed;

  // Apply friction severity multiplier
  const frictionMultiplier = idea.frictionSeverity
    ? FRICTION_MULTIPLIERS[idea.frictionSeverity]
    : 1.0;

  // Apply lead user bonus
  const leadUserBonus = idea.leadUserIndicators?.reduce((sum, indicator) => {
    return sum + (LEAD_USER_BONUS[indicator.sophisticationLevel] || 0);
  }, 0) || 0;

  // Apply import opportunity bonus (ideas from English markets to localize)
  const importBonus = idea.isImportOpportunity ? IMPORT_OPPORTUNITY_BONUS : 0;

  // Apply revenue verified bonus
  const revenueBonus = idea.revenueVerified ? REVENUE_VERIFIED_BONUS : 0;

  // Apply MRR tier bonus
  const mrrBonus = calculateMRRBonus(idea.estimatedMRR);

  // Combine scores
  const totalScore = Math.min(
    100,
    Math.round(
      (baseScore * 0.4 + weightedScore * 0.6) * frictionMultiplier +
      leadUserBonus +
      importBonus +
      revenueBonus +
      mrrBonus
    )
  );

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(idea);

  return {
    totalScore,
    breakdown,
    confidence,
  };
}

// Accessibility: Can a solo developer build this?
function calculateAccessibility(idea: MicroSaaSIdea): number {
  const techStack = idea.techStackSuggestion?.toLowerCase() || '';
  let score = 50;

  // Bonus for standard web tech
  if (techStack.includes('react') || techStack.includes('vue') || techStack.includes('next')) {
    score += 15;
  }

  // Bonus for common databases
  if (techStack.includes('postgres') || techStack.includes('firebase') || techStack.includes('supabase')) {
    score += 10;
  }

  // Penalty for complex tech
  if (techStack.includes('machine learning') || techStack.includes('ai model')) {
    score -= 15;
  }

  // Penalty for hardware/IoT
  if (techStack.includes('iot') || techStack.includes('hardware') || techStack.includes('embedded')) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

// Payment Potential: Will users pay?
function calculatePaymentPotential(idea: MicroSaaSIdea): number {
  let score = 50;

  // Higher score for B2B verticals
  const vertical = idea.vertical?.toLowerCase() || '';
  if (vertical.includes('enterprise') || vertical.includes('business') || vertical.includes('agency')) {
    score += 20;
  }

  // Check for pain indicators in problem description
  const problem = idea.problem?.toLowerCase() || '';
  const highPaymentSignals = ['money', 'cost', 'expensive', 'hours', 'time', 'revenue', 'clients'];
  const matchedSignals = highPaymentSignals.filter(s => problem.includes(s));
  score += matchedSignals.length * 5;

  // Lead user presence indicates willingness to invest
  if (idea.leadUserIndicators && idea.leadUserIndicators.length > 0) {
    score += idea.leadUserIndicators.length * 8;
  }

  return Math.max(0, Math.min(100, score));
}

// Market Size: How big is the potential market?
function calculateMarketSize(idea: MicroSaaSIdea): number {
  let score = 50;

  // Niche markets are actually better for Micro-SaaS (less competition)
  const vertical = idea.vertical?.toLowerCase() || '';
  const nicheIndicators = ['niche', 'specific', 'specialized', 'freelancer', 'small business'];
  if (nicheIndicators.some(n => vertical.includes(n))) {
    score += 15; // Counter-intuitive: niches are good for bootstrappers
  }

  // Very broad markets are harder to penetrate
  const broadIndicators = ['enterprise', 'global', 'all industries'];
  if (broadIndicators.some(b => vertical.includes(b))) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// Competition Level: How crowded is the space?
function calculateCompetitionLevel(idea: MicroSaaSIdea): number {
  // Note: Higher score = LESS competition (better)
  let score = 50;

  // If lead users built custom solutions, existing tools are inadequate
  if (idea.leadUserIndicators && idea.leadUserIndicators.length > 0) {
    score += 15;
  }

  // Critical pain with workarounds suggests market gap
  if (idea.frictionSeverity === 'critical_pain') {
    score += 10;
  }

  // Check for saturated market signals in problem description
  const problem = idea.problem?.toLowerCase() || '';
  const saturationSignals = ['like competitors', 'similar to', 'another tool'];
  if (saturationSignals.some(s => problem.includes(s))) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

// Implementation Speed: How fast can we ship MVP?
function calculateImplementationSpeed(idea: MicroSaaSIdea): number {
  const techStack = idea.techStackSuggestion?.toLowerCase() || '';
  let score = 50;

  // Bonus for rapid development stacks
  const fastStacks = ['no-code', 'low-code', 'supabase', 'firebase', 'vercel', 'nextjs'];
  if (fastStacks.some(s => techStack.includes(s))) {
    score += 20;
  }

  // Bonus for API-first approaches
  if (techStack.includes('api') || techStack.includes('integration')) {
    score += 10;
  }

  // Penalty for complex requirements
  const complexIndicators = ['real-time', 'video', 'complex', 'ml', 'blockchain'];
  if (complexIndicators.some(c => techStack.includes(c))) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

// Confidence: How reliable is our assessment?
function calculateConfidence(idea: MicroSaaSIdea): number {
  let confidence = 0.5; // Base 50%

  // Has evidence source?
  if (idea.evidenceSource && idea.evidenceSource.length > 10) {
    confidence += 0.15;
  }

  // Has lead user indicators?
  if (idea.leadUserIndicators && idea.leadUserIndicators.length > 0) {
    confidence += 0.1;
  }

  // Has friction severity classified?
  if (idea.frictionSeverity) {
    confidence += 0.1;
  }

  // Has JTBD properly formatted?
  if (idea.jtbd && idea.jtbd.includes('want to') && idea.jtbd.includes('so I can')) {
    confidence += 0.15;
  }

  // NEW: Revenue verification increases confidence significantly
  if (idea.revenueVerified) {
    confidence += 0.2;
  }

  // NEW: Known MRR adds confidence
  if (idea.estimatedMRR && idea.estimatedMRR > 0) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

// Adjust weights based on developer profile
export function getWeightsForProfile(
  profile: 'solo_dev' | 'small_team' | 'agency'
): ScoringWeights {
  switch (profile) {
    case 'solo_dev':
      return {
        accessibility: 0.35,
        paymentPotential: 0.25,
        marketSize: 0.10,
        competitionLevel: 0.15,
        implementationSpeed: 0.15,
      };
    case 'small_team':
      return {
        accessibility: 0.20,
        paymentPotential: 0.30,
        marketSize: 0.20,
        competitionLevel: 0.15,
        implementationSpeed: 0.15,
      };
    case 'agency':
      return {
        accessibility: 0.10,
        paymentPotential: 0.35,
        marketSize: 0.25,
        competitionLevel: 0.20,
        implementationSpeed: 0.10,
      };
  }
}

/**
 * Calculate bonus based on estimated MRR
 * Higher MRR indicates more validated business model
 */
function calculateMRRBonus(mrr?: number): number {
  if (!mrr || mrr <= 0) return 0;

  if (mrr >= 50000) return MRR_TIER_BONUS['scale'];
  if (mrr >= 10000) return MRR_TIER_BONUS['established'];
  if (mrr >= 1000) return MRR_TIER_BONUS['growing'];
  return MRR_TIER_BONUS['starter'];
}

/**
 * Determine if an idea is an import opportunity based on various signals
 */
export function detectImportOpportunity(idea: MicroSaaSIdea): boolean {
  const text = `${idea.title} ${idea.problem} ${idea.jtbd}`.toLowerCase();

  // Check if it's clearly targeting English-speaking markets only
  const englishOnlySignals = [
    'us only',
    'usa only',
    'uk only',
    'english only',
    'us market',
    'north america',
  ];

  // Check if there's NO Spanish market presence
  const spanishMarketSignals = [
    'español',
    'spanish',
    'latam',
    'latinoamerica',
    'mexico',
    'argentina',
    'colombia',
    'españa',
    'spain',
  ];

  const hasEnglishOnlySignal = englishOnlySignals.some(s => text.includes(s));
  const hasSpanishMarketSignal = spanishMarketSignals.some(s => text.includes(s));

  // It's an import opportunity if:
  // 1. There's an explicit English-only signal, OR
  // 2. There's no Spanish market presence (and the source is from English platforms)
  return hasEnglishOnlySignal || !hasSpanishMarketSignal;
}

/**
 * Get MRR tier label for display
 */
export function getMRRTierLabel(mrr?: number): string | null {
  if (!mrr || mrr <= 0) return null;

  if (mrr >= 50000) return '🚀 $50k+ MRR';
  if (mrr >= 10000) return '📈 $10k+ MRR';
  if (mrr >= 1000) return '💰 $1k+ MRR';
  return '🌱 Early Revenue';
}
