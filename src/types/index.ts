// Core Domain Types

export interface MicroSaaSIdea {
  id?: string;
  title: string;
  problem: string;
  jtbd: string; // Jobs To Be Done
  vertical: string;
  evidenceSource: string;
  potentialScore: number;
  techStackSuggestion: string;
  timestamp?: number;

  // Extended fields from info.txt requirements
  frictionSeverity?: FrictionSeverity;
  leadUserIndicators?: LeadUserIndicator[];
  validationStatus?: ValidationStatus;
  uvp?: string; // Unique Value Proposition
  interviewScript?: string;

  // Import opportunity fields (inspired by EmprendeFlix video)
  isImportOpportunity?: boolean; // Flag for Spanish market potential
  revenueVerified?: boolean; // Has Stripe/verified revenue data
  estimatedMRR?: number; // Monthly recurring revenue if known
  sourceMarket?: 'us' | 'uk' | 'global'; // Original market
}

export type FrictionSeverity = 'minor_bug' | 'workflow_gap' | 'critical_pain';

export interface LeadUserIndicator {
  type: 'custom_script' | 'excel_macro' | 'zapier_integration' | 'manual_process';
  description: string;
  sophisticationLevel: 1 | 2 | 3 | 4 | 5;
}

export type ValidationStatus = 'unvalidated' | 'interviewing' | 'validated' | 'invalidated';

// Scoring System (Multi-criteria decision model from info.txt)
export interface ScoringWeights {
  accessibility: number;      // Technical accessibility for solo dev
  paymentPotential: number;   // Willingness to pay indicator
  marketSize: number;         // Estimated market size
  competitionLevel: number;   // Existing solutions analysis
  implementationSpeed: number; // Time to MVP
}

export interface ScoringResult {
  totalScore: number;
  breakdown: {
    accessibility: number;
    paymentPotential: number;
    marketSize: number;
    competitionLevel: number;
    implementationSpeed: number;
  };
  confidence: number;
}

// Vertical Configuration
export interface Vertical {
  id: string;
  name: string;
  searchKeywords: string[];
  platforms: SearchPlatform[];
  leadUserPatterns: string[];
}

export type SearchPlatform =
  | 'reddit'
  | 'twitter'
  | 'g2'
  | 'trustpilot'
  | 'hackernews'
  | 'producthunt'
  | 'devto'
  | 'indiehackers'
  | 'stackoverflow'
  | 'github'
  | 'lobsters'
  | 'hashnode'
  | 'quora'
  | 'medium'
  | 'capterra'
  | 'alternativeto'
  | 'shopify'
  | 'dribbble'
  | 'kaggle'
  | 'biggerpockets'
  | 'dba.stackexchange'
  | 'ecommerce forums'
  | 'healthcare forums'
  | 'real estate forums'
  | 'logistics forums'
  | 'consulting forums'
  | 'gamedev forums'
  | 'twitch forums'
  | 'academia forums'
  | 'nonprofit forums'
  // New platforms for idea import
  | 'betalist'
  | 'oasisofideas';

// User & Auth
export interface ForgeUser {
  uid: string;
  isAnonymous: boolean;
  createdAt?: number;
}

// Hunting Session
export interface HuntingSession {
  id: string;
  startedAt: number;
  completedAt?: number;
  verticals: string[];
  ideasFound: number;
  status: 'running' | 'completed' | 'failed';
}

// Validation Module Types (from info.txt section 4)
export interface ValidationExperiment {
  ideaId: string;
  uvp: string;
  interviewScript: InterviewQuestion[];
  targetResponses: number;
  currentResponses: number;
  startedAt: number;
  deadline: number; // 48 hours target
}

export interface InterviewQuestion {
  question: string;
  type: 'open' | 'scale' | 'yes_no';
  purpose: string;
}

// API Response Types
export interface GeminiSearchResponse {
  vertical: string;
  ideas: GeminiIdeaResult[];
}

export interface GeminiIdeaResult {
  title: string;
  problem: string;
  jtbd: string;
  evidence_source: string;
  potential_score: number;
  tech_stack_suggestion: string;
  friction_type?: string;
  lead_user_signals?: string[];
}

// Store Types
export interface ForgeState {
  user: ForgeUser | null;
  currentIdeas: MicroSaaSIdea[];
  savedIdeas: MicroSaaSIdea[];
  isHunting: boolean;
  currentVertical: string | null;
  selectedVerticalId: string;
  minScoreFilter: number;
  status: string;
  error: string | null;
  view: 'forge' | 'vault' | 'validation';
  scoringWeights: ScoringWeights;
}
