export { authService, vaultService, sessionService, initializeFirebase } from './firebase';
export { huntOpportunities, huntWithGeminiGrounding, generateValidationKit, analyzeTechnicalViability } from './gemini';
export { calculateScore, getWeightsForProfile, getMRRTierLabel, detectImportOpportunity } from './scoring';
export { aggregateOpportunityData, quickSearch, getSourceStatus } from './aggregator';
export * from './sources';
