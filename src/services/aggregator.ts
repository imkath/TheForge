/**
 * Multi-Source Aggregator
 *
 * Combines data from all free sources to find Micro-SaaS opportunities
 * Sources: Reddit, Hacker News, DEV.to, ProductHunt (optional), Serper (optional)
 */

import {
  searchPainPoints as searchRedditPainPoints,
  searchRedditQuestions,
  type RedditPost,
} from './sources/reddit';
import {
  searchHN,
  searchAskHN,
  searchHNComments,
  searchShowHN,
  type HNItem,
} from './sources/hackernews';
import {
  searchPainPointArticles,
  type DevToArticle,
} from './sources/devto';
import {
  getTodaysPosts as getPHPosts,
  analyzeCompetitors as analyzePHCompetitors,
  isProductHuntConfigured,
  type ProductHuntPost,
} from './sources/producthunt';
import {
  aggregatePainPoints as serperAggregate,
  searchLeadUserSignals,
  canUseSerper,
  getSerperUsageStats,
  type SerperOrganicResult,
} from './sources/serper';
import {
  searchFeatureRequests,
  searchBugReports,
  type GitHubIssue,
} from './sources/github';
import {
  searchStackOverflow,
  searchHighDemandQuestions,
  type StackOverflowQuestion,
} from './sources/stackoverflow';
// NOTE: IndieHackers disabled due to CORS - their Algolia API blocks browser requests
// import { searchIHPainPoints, searchIHIdeas, type IndieHackersPost } from './sources/indiehackers';
// NOTE: Lobsters disabled due to CORS - no Access-Control-Allow-Origin header
// import { searchLobstersPainPoints, getShowLobsters, type LobstersStory } from './sources/lobsters';
import {
  searchG2MarketGaps,
  type G2Review,
} from './sources/g2';
import {
  searchCapterraFeatureGaps,
  type CapterraReview,
} from './sources/capterra';
import {
  searchWantedAlternatives,
  type AlternativeToResult,
} from './sources/alternativeto';
import {
  searchQuoraPainPoints,
  type QuoraQuestion,
} from './sources/quora';
import {
  searchMediumPainPoints,
  searchMediumBuiltBecause,
  type MediumArticle,
} from './sources/medium';
import {
  searchHashnodePainPoints,
  searchHashnodeProjects,
  type HashnodePost,
} from './sources/hashnode';
import {
  searchBetaListSaaS,
  searchBetaListImportOpportunities,
  type BetaListStartup,
} from './sources/betalist';
import {
  searchOasisSaaSIdeas,
  searchOasisByVertical,
  type OasisIdea,
} from './sources/oasisofideas';
import {
  searchIHPainPoints,
  searchIHIdeas,
  type IndieHackersPost,
} from './sources/indiehackers';
import {
  searchLobstersPainPoints,
  getShowLobsters,
  type LobstersStory,
} from './sources/lobsters';
import type { Vertical } from '@/types';

// Unified evidence structure
export interface EvidenceItem {
  id: string;
  source: 'reddit' | 'hackernews' | 'devto' | 'producthunt' | 'serper' | 'github' | 'stackoverflow' | 'indiehackers' | 'lobsters' | 'g2' | 'capterra' | 'alternativeto' | 'quora' | 'medium' | 'hashnode' | 'betalist' | 'oasisofideas';
  title: string;
  content: string;
  url: string;
  score: number; // Engagement score (upvotes, reactions, etc.)
  timestamp: number;
  author?: string;
  tags?: string[];
  isImportOpportunity?: boolean; // Flag for Spanish market potential
}

export interface AggregatedData {
  painPoints: EvidenceItem[];
  leadUserSignals: EvidenceItem[];
  competitors: EvidenceItem[];
  trendingTopics: EvidenceItem[];
  sourcesUsed: string[];
  totalItems: number;
}

/**
 * Convert Reddit post to unified evidence
 */
function redditToEvidence(post: RedditPost): EvidenceItem {
  return {
    id: `reddit-${post.permalink}`,
    source: 'reddit',
    title: post.title,
    content: post.selftext.slice(0, 500),
    url: post.permalink,
    score: post.score + post.numComments * 2,
    timestamp: post.createdUtc * 1000,
    author: post.author,
    tags: [post.subreddit],
  };
}

/**
 * Convert HN item to unified evidence
 */
function hnToEvidence(item: HNItem): EvidenceItem {
  return {
    id: `hn-${item.objectID}`,
    source: 'hackernews',
    title: item.title || 'Comment',
    content: item.storyText || item.commentText || item.title || '',
    url: item.permalink,
    score: item.points + item.numComments * 2,
    timestamp: item.createdAtTimestamp * 1000,
    author: item.author,
    tags: item.tags,
  };
}

/**
 * Convert DEV.to article to unified evidence
 */
function devtoToEvidence(article: DevToArticle): EvidenceItem {
  return {
    id: `devto-${article.id}`,
    source: 'devto',
    title: article.title,
    content: article.description,
    url: article.url,
    score: article.publicReactionsCount + article.commentsCount * 2,
    timestamp: new Date(article.publishedAt).getTime(),
    author: article.user.username,
    tags: article.tags,
  };
}

/**
 * Convert ProductHunt post to unified evidence
 */
function phToEvidence(post: ProductHuntPost): EvidenceItem {
  return {
    id: `ph-${post.id}`,
    source: 'producthunt',
    title: post.name,
    content: `${post.tagline} - ${post.description}`,
    url: post.url,
    score: post.votesCount + post.commentsCount * 3,
    timestamp: new Date(post.createdAt).getTime(),
    tags: post.topics,
  };
}

/**
 * Convert Serper result to unified evidence
 */
function serperToEvidence(result: SerperOrganicResult, sourceType: string): EvidenceItem {
  return {
    id: `serper-${result.link}`,
    source: 'serper',
    title: result.title,
    content: result.snippet,
    url: result.link,
    score: (11 - result.position) * 10, // Higher position = higher score
    timestamp: result.date ? new Date(result.date).getTime() : Date.now(),
    tags: [sourceType],
  };
}

/**
 * Convert GitHub issue to unified evidence
 */
function githubToEvidence(issue: GitHubIssue): EvidenceItem {
  return {
    id: `github-${issue.id}`,
    source: 'github',
    title: issue.title,
    content: issue.body,
    url: issue.url,
    score: issue.reactions * 3 + issue.comments * 2,
    timestamp: new Date(issue.createdAt).getTime(),
    author: issue.user,
    tags: issue.labels,
  };
}

/**
 * Convert Stack Overflow question to unified evidence
 */
function stackoverflowToEvidence(question: StackOverflowQuestion): EvidenceItem {
  return {
    id: `so-${question.id}`,
    source: 'stackoverflow',
    title: question.title,
    content: question.body,
    url: question.url,
    score: question.score * 2 + Math.log10(question.viewCount + 1) * 10,
    timestamp: new Date(question.createdAt).getTime(),
    tags: question.tags,
  };
}

/**
 * Convert IndieHackers post to unified evidence
 */
function indiehackersToEvidence(post: IndieHackersPost): EvidenceItem {
  return {
    id: `ih-${post.id}`,
    source: 'indiehackers',
    title: post.title,
    content: post.content,
    url: post.url,
    score: post.votes * 2 + post.comments * 3,
    timestamp: post.createdAt ? new Date(post.createdAt).getTime() : Date.now(),
    author: post.author,
    tags: ['indiehackers'],
  };
}

/**
 * Convert Lobsters story to unified evidence
 */
function lobstersToEvidence(story: LobstersStory): EvidenceItem {
  return {
    id: `lobsters-${story.id}`,
    source: 'lobsters',
    title: story.title,
    content: story.description,
    url: story.commentsUrl || story.url,
    score: story.score + story.commentCount * 2,
    timestamp: new Date(story.createdAt).getTime(),
    author: story.submitter,
    tags: story.tags,
  };
}

/**
 * Convert Hashnode post to unified evidence
 */
function hashnodeToEvidence(post: HashnodePost): EvidenceItem {
  return {
    id: `hashnode-${post.id}`,
    source: 'hashnode',
    title: post.title,
    content: post.brief,
    url: post.url,
    score: post.reactions * 2 + post.responseCount * 3,
    timestamp: post.dateAdded ? new Date(post.dateAdded).getTime() : Date.now(),
    author: post.author,
    tags: post.tags,
  };
}

/**
 * Convert BetaList startup to unified evidence
 */
function betalistToEvidence(startup: BetaListStartup): EvidenceItem {
  return {
    id: `betalist-${startup.id}`,
    source: 'betalist',
    title: startup.name,
    content: `${startup.tagline} - ${startup.description}`,
    url: startup.url,
    score: 60, // BetaList doesn't have engagement metrics
    timestamp: startup.submittedAt ? new Date(startup.submittedAt).getTime() : Date.now(),
    tags: [startup.category],
    isImportOpportunity: startup.isImportOpportunity,
  };
}

/**
 * Convert Oasis idea to unified evidence
 */
function oasisToEvidence(idea: OasisIdea): EvidenceItem {
  return {
    id: `oasis-${idea.id}`,
    source: 'oasisofideas',
    title: idea.title,
    content: idea.description,
    url: idea.url,
    score: idea.votes * 3 + 20, // Weight votes heavily for ideas
    timestamp: idea.submittedAt ? new Date(idea.submittedAt).getTime() : Date.now(),
    tags: [idea.category, idea.status],
  };
}

/**
 * Convert G2 review to unified evidence
 */
function g2ToEvidence(review: G2Review): EvidenceItem {
  return {
    id: `g2-${review.id}`,
    source: 'g2',
    title: review.title,
    content: review.cons || review.content,
    url: review.url,
    score: 50, // G2 doesn't provide engagement metrics via search
    timestamp: review.date ? new Date(review.date).getTime() : Date.now(),
    tags: [review.category],
  };
}

/**
 * Convert Capterra review to unified evidence
 */
function capterraToEvidence(review: CapterraReview): EvidenceItem {
  return {
    id: `capterra-${review.id}`,
    source: 'capterra',
    title: review.title,
    content: review.content,
    url: review.url,
    score: 50,
    timestamp: review.date ? new Date(review.date).getTime() : Date.now(),
    tags: [review.category],
  };
}

/**
 * Convert AlternativeTo result to unified evidence
 */
function alternativetoToEvidence(result: AlternativeToResult): EvidenceItem {
  return {
    id: `altto-${result.id}`,
    source: 'alternativeto',
    title: result.title,
    content: result.description,
    url: result.url,
    score: 60, // Market signal is valuable
    timestamp: Date.now(),
    tags: [result.softwareName],
  };
}

/**
 * Convert Quora question to unified evidence
 */
function quoraToEvidence(question: QuoraQuestion): EvidenceItem {
  return {
    id: `quora-${question.id}`,
    source: 'quora',
    title: question.title,
    content: question.content,
    url: question.url,
    score: 55, // Questions indicate demand
    timestamp: Date.now(),
    tags: [question.topic],
  };
}

/**
 * Convert Medium article to unified evidence
 */
function mediumToEvidence(article: MediumArticle): EvidenceItem {
  return {
    id: `medium-${article.id}`,
    source: 'medium',
    title: article.title,
    content: article.description,
    url: article.url,
    score: 45,
    timestamp: Date.now(),
    author: article.author,
    tags: [article.topic],
  };
}

/**
 * Main aggregation function - gathers data from all sources
 */
export async function aggregateOpportunityData(
  vertical: Vertical,
  options: {
    useSerper?: boolean;
    useProductHunt?: boolean;
    maxItemsPerSource?: number;
    signal?: AbortSignal;
  } = {}
): Promise<AggregatedData> {
  const {
    useSerper = canUseSerper(), // Uses canUseSerper to check both config AND remaining quota
    useProductHunt = isProductHuntConfigured(),
    maxItemsPerSource = 20,
    signal,
  } = options;

  // Check if aborted before starting
  if (signal?.aborted) {
    throw new DOMException('Aggregation aborted', 'AbortError');
  }

  // All sources - now using CORS proxy for browser compatibility
  const sourcesUsed: string[] = [
    'hackernews', 'devto', 'github', 'stackoverflow',
    'indiehackers', 'lobsters', 'hashnode', 'betalist', 'oasisofideas',
  ];
  const painPoints: EvidenceItem[] = [];
  const leadUserSignals: EvidenceItem[] = [];
  const competitors: EvidenceItem[] = [];
  const trendingTopics: EvidenceItem[] = [];

  // Use more keywords for better vertical-specific results
  const primaryKeywords = vertical.searchKeywords.slice(0, 4);
  const secondaryKeywords = vertical.searchKeywords.slice(0, 3);

  // Silent error handler - reduces console noise
  const silentCatch = <T>(defaultValue: T) => () => defaultValue;

  // Parallel fetch from sources that work (APIs sin CORS issues)
  // NOTE: Reddit sometimes works via proxy, sometimes doesn't
  const [
    redditPainPoints,
    redditQuestions,
    hnAskPosts,
    hnComments,
    hnShowPosts,
    devtoPainPoints,
    githubFeatures,
    githubBugs,
    soQuestions,
    soHighDemand,
  ] = await Promise.all([
    // Reddit - use vertical name for specificity (may fail silently due to CORS)
    searchRedditPainPoints(vertical.name).catch(silentCatch([])),
    searchRedditQuestions(primaryKeywords).catch(silentCatch([])),
    // Hacker News - ALWAYS works (native CORS support)
    searchAskHN(primaryKeywords).catch(silentCatch([])),
    searchHNComments(secondaryKeywords).catch(silentCatch([])),
    searchShowHN(vertical.name).catch(silentCatch([])),
    // DEV.to - ALWAYS works (native CORS support)
    searchPainPointArticles(vertical.name).catch(silentCatch([])),
    // GitHub - usually works (may hit rate limit)
    searchFeatureRequests(primaryKeywords).catch(silentCatch([])),
    searchBugReports(secondaryKeywords).catch(silentCatch([])),
    // Stack Overflow - ALWAYS works (native CORS support)
    searchStackOverflow(vertical.name, { pageSize: 15 }).catch(silentCatch({ items: [] })),
    searchHighDemandQuestions(primaryKeywords).catch(silentCatch([])),
  ]);

  // Check if aborted after first batch
  if (signal?.aborted) {
    throw new DOMException('Aggregation aborted', 'AbortError');
  }

  // Process Reddit (via CORS proxy)
  if (redditPainPoints.length > 0) {
    painPoints.push(
      ...redditPainPoints.slice(0, maxItemsPerSource).map(redditToEvidence)
    );
    console.log(`[Aggregator] Reddit pain points: ${redditPainPoints.length}`);
  }
  if (redditQuestions.length > 0) {
    leadUserSignals.push(
      ...redditQuestions.slice(0, maxItemsPerSource).map(redditToEvidence)
    );
  }

  // Process HN
  painPoints.push(
    ...hnAskPosts.slice(0, maxItemsPerSource).map(hnToEvidence)
  );
  painPoints.push(
    ...hnComments.slice(0, maxItemsPerSource).map(hnToEvidence)
  );
  competitors.push(
    ...hnShowPosts.slice(0, maxItemsPerSource).map(hnToEvidence)
  );

  // Process DEV.to
  painPoints.push(
    ...devtoPainPoints.slice(0, maxItemsPerSource).map(devtoToEvidence)
  );

  // Process GitHub
  leadUserSignals.push(
    ...githubFeatures.slice(0, maxItemsPerSource).map(githubToEvidence)
  );
  painPoints.push(
    ...githubBugs.slice(0, maxItemsPerSource).map(githubToEvidence)
  );

  // Process Stack Overflow
  painPoints.push(
    ...soQuestions.items.slice(0, maxItemsPerSource).map(stackoverflowToEvidence)
  );
  leadUserSignals.push(
    ...soHighDemand.slice(0, maxItemsPerSource).map(stackoverflowToEvidence)
  );

  // Second batch: CORS-proxied sources (run in parallel)
  // These sources use CORS proxy - they may take longer but should work
  const [
    ihPainPoints,
    ihIdeas,
    lobstersPainPoints,
    lobstersShow,
    hashnodePainPoints,
    hashnodeProjects,
    betalistSaaS,
    betalistImport,
    oasisSaaS,
    oasisVertical,
  ] = await Promise.all([
    // IndieHackers - founder pain points and ideas
    searchIHPainPoints(primaryKeywords).catch(silentCatch([])),
    searchIHIdeas(vertical.name).catch(silentCatch([])),
    // Lobsters - technical discussions
    searchLobstersPainPoints(primaryKeywords).catch(silentCatch([])),
    getShowLobsters().catch(silentCatch([])),
    // Hashnode - developer blog posts
    searchHashnodePainPoints(primaryKeywords).catch(silentCatch([])),
    searchHashnodeProjects(vertical.name).catch(silentCatch([])),
    // BetaList - early-stage startups (import opportunities)
    searchBetaListSaaS(primaryKeywords).catch(silentCatch([])),
    searchBetaListImportOpportunities(vertical.name).catch(silentCatch([])),
    // Oasis of Ideas - raw business ideas
    searchOasisSaaSIdeas(primaryKeywords).catch(silentCatch([])),
    searchOasisByVertical(vertical.name).catch(silentCatch([])),
  ]);

  // Check if aborted after second batch
  if (signal?.aborted) {
    throw new DOMException('Aggregation aborted', 'AbortError');
  }

  // Process IndieHackers
  if (ihPainPoints.length > 0) {
    painPoints.push(
      ...ihPainPoints.slice(0, maxItemsPerSource).map(indiehackersToEvidence)
    );
    console.log(`[Aggregator] IndieHackers pain points: ${ihPainPoints.length}`);
  }
  if (ihIdeas.length > 0) {
    leadUserSignals.push(
      ...ihIdeas.slice(0, maxItemsPerSource).map(indiehackersToEvidence)
    );
  }

  // Process Lobsters
  if (lobstersPainPoints.length > 0) {
    painPoints.push(
      ...lobstersPainPoints.slice(0, maxItemsPerSource).map(lobstersToEvidence)
    );
  }
  if (lobstersShow.length > 0) {
    competitors.push(
      ...lobstersShow.slice(0, maxItemsPerSource).map(lobstersToEvidence)
    );
  }

  // Process Hashnode
  if (hashnodePainPoints.length > 0) {
    painPoints.push(
      ...hashnodePainPoints.slice(0, maxItemsPerSource).map(hashnodeToEvidence)
    );
  }
  if (hashnodeProjects.length > 0) {
    trendingTopics.push(
      ...hashnodeProjects.slice(0, maxItemsPerSource).map(hashnodeToEvidence)
    );
  }

  // Process BetaList - great for import opportunities
  if (betalistSaaS.length > 0) {
    competitors.push(
      ...betalistSaaS.slice(0, maxItemsPerSource).map(betalistToEvidence)
    );
  }
  if (betalistImport.length > 0) {
    // Mark import opportunities for Spanish market
    const importOpportunities = betalistImport.map(startup => ({
      ...betalistToEvidence(startup),
      isImportOpportunity: true,
    }));
    trendingTopics.push(...importOpportunities.slice(0, maxItemsPerSource));
    console.log(`[Aggregator] BetaList import opportunities: ${betalistImport.length}`);
  }

  // Process Oasis of Ideas - raw business ideas
  if (oasisSaaS.length > 0) {
    leadUserSignals.push(
      ...oasisSaaS.slice(0, maxItemsPerSource).map(oasisToEvidence)
    );
  }
  if (oasisVertical.length > 0) {
    trendingTopics.push(
      ...oasisVertical.slice(0, maxItemsPerSource).map(oasisToEvidence)
    );
    console.log(`[Aggregator] Oasis ideas: ${oasisVertical.length}`);
  }

  // Optional: ProductHunt
  if (useProductHunt) {
    sourcesUsed.push('producthunt');
    try {
      const [phPosts, phAnalysis] = await Promise.all([
        getPHPosts(),
        analyzePHCompetitors(vertical.name),
      ]);

      trendingTopics.push(
        ...phPosts.slice(0, maxItemsPerSource).map(phToEvidence)
      );
      competitors.push(
        ...phAnalysis.competitors.slice(0, maxItemsPerSource).map(phToEvidence)
      );
    } catch (error) {
      console.warn('ProductHunt fetch failed:', error);
    }
  }

  // Optional: Serper-powered sources (Google Search API)
  if (useSerper) {
    sourcesUsed.push('serper', 'g2', 'capterra', 'alternativeto', 'quora', 'medium');
    try {
      const [
        serperPainPoints,
        serperLeadUsers,
        g2Gaps,
        capterraGaps,
        alternatives,
        quoraPainPoints,
        mediumPainPoints,
        mediumBuilt,
      ] = await Promise.all([
        serperAggregate(vertical.name),
        searchLeadUserSignals(vertical.name),
        searchG2MarketGaps(vertical.name).catch(() => []),
        searchCapterraFeatureGaps(vertical.name).catch(() => []),
        searchWantedAlternatives(vertical.name).catch(() => []),
        searchQuoraPainPoints(vertical.searchKeywords.slice(0, 2)).catch(() => []),
        searchMediumPainPoints(vertical.searchKeywords.slice(0, 2)).catch(() => []),
        searchMediumBuiltBecause(vertical.name).catch(() => []),
      ]);

      // Serper direct results
      painPoints.push(
        ...serperPainPoints.reddit.map((r) => serperToEvidence(r, 'reddit-serper'))
      );
      painPoints.push(
        ...serperPainPoints.quora.map((r) => serperToEvidence(r, 'quora'))
      );
      painPoints.push(
        ...serperPainPoints.forums.map((r) => serperToEvidence(r, 'forum'))
      );
      leadUserSignals.push(
        ...serperLeadUsers.map((r) => serperToEvidence(r, 'lead-user'))
      );

      // G2 Reviews - market gaps and complaints
      painPoints.push(
        ...g2Gaps.slice(0, maxItemsPerSource).map(g2ToEvidence)
      );

      // Capterra - feature gaps
      painPoints.push(
        ...capterraGaps.slice(0, maxItemsPerSource).map(capterraToEvidence)
      );

      // AlternativeTo - people looking for alternatives = opportunity!
      competitors.push(
        ...alternatives.slice(0, maxItemsPerSource).map(alternativetoToEvidence)
      );

      // Quora - pain points as questions
      painPoints.push(
        ...quoraPainPoints.slice(0, maxItemsPerSource).map(quoraToEvidence)
      );

      // Medium - pain point articles
      painPoints.push(
        ...mediumPainPoints.slice(0, maxItemsPerSource).map(mediumToEvidence)
      );
      // Medium - "I built this because..." articles (lead user signals)
      leadUserSignals.push(
        ...mediumBuilt.slice(0, maxItemsPerSource).map(mediumToEvidence)
      );
    } catch (error) {
      console.warn('Serper-powered sources fetch failed:', error);
    }
  }

  // Detect lead user signals from pain points content
  const leadUserKeywords = [
    'script',
    'python',
    'macro',
    'excel',
    'sheets',
    'zapier',
    'automation',
    'built my own',
    'custom',
  ];

  for (const item of painPoints) {
    const contentLower = `${item.title} ${item.content}`.toLowerCase();
    if (leadUserKeywords.some((kw) => contentLower.includes(kw))) {
      leadUserSignals.push({ ...item, tags: [...(item.tags || []), 'lead-user'] });
    }
  }

  // Deduplicate all arrays
  const dedupe = (arr: EvidenceItem[]) =>
    Array.from(new Map(arr.map((item) => [item.id, item])).values());

  return {
    painPoints: dedupe(painPoints).sort((a, b) => b.score - a.score),
    leadUserSignals: dedupe(leadUserSignals).sort((a, b) => b.score - a.score),
    competitors: dedupe(competitors).sort((a, b) => b.score - a.score),
    trendingTopics: dedupe(trendingTopics).sort((a, b) => b.score - a.score),
    sourcesUsed,
    totalItems:
      painPoints.length +
      leadUserSignals.length +
      competitors.length +
      trendingTopics.length,
  };
}

/**
 * Quick search across all free sources
 */
export async function quickSearch(query: string): Promise<EvidenceItem[]> {
  const results: EvidenceItem[] = [];

  // Reddit disabled due to CORS restrictions in browser
  const hnResult = await searchHN(query, { hitsPerPage: 20 }).catch(() => ({ items: [] }));

  results.push(...hnResult.items.slice(0, 20).map(hnToEvidence));

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get source status (which APIs are configured/available)
 */
export function getSourceStatus(): {
  source: string;
  configured: boolean;
  available: boolean;
  free: boolean;
  limit?: string;
  usage?: string;
}[] {
  const serperStats = getSerperUsageStats();
  const serperAvailable = canUseSerper() && !serperStats.disabled;

  return [
    // Free APIs (sin autenticación)
    { source: 'Hacker News', configured: true, available: true, free: true, limit: 'Ilimitado' },
    { source: 'DEV.to', configured: true, available: true, free: true, limit: 'Uso justo' },
    { source: 'GitHub Issues', configured: true, available: true, free: true, limit: '10 req/min' },
    { source: 'Stack Overflow', configured: true, available: true, free: true, limit: '300 req/día' },
    { source: 'IndieHackers', configured: true, available: true, free: true, limit: 'Uso justo' },
    { source: 'Lobsters', configured: true, available: true, free: true, limit: 'Uso justo' },
    { source: 'Hashnode', configured: true, available: true, free: true, limit: 'Uso justo' },

    // Reddit via CORS proxy
    { source: 'Reddit', configured: true, available: true, free: true, limit: 'Via proxy CORS' },

    // Requiere API key
    {
      source: 'ProductHunt',
      configured: isProductHuntConfigured(),
      available: isProductHuntConfigured(),
      free: true,
      limit: 'Non-commercial',
    },

    // Serper-powered sources
    {
      source: 'Serper (Google)',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: `${serperStats.remaining}/${serperStats.limit} queries`,
      usage: serperStats.disabled
        ? 'DISABLED - Limit reached'
        : `${serperStats.percentUsed}% used`,
    },
    {
      source: 'G2 Reviews',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: 'Via Serper',
    },
    {
      source: 'Capterra',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: 'Via Serper',
    },
    {
      source: 'AlternativeTo',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: 'Via Serper',
    },
    {
      source: 'Quora',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: 'Via Serper',
    },
    {
      source: 'Medium',
      configured: canUseSerper(),
      available: serperAvailable,
      free: true,
      limit: 'Via Serper',
    },

    // Re-enabled sources via CORS proxy
    { source: 'BetaList', configured: true, available: true, free: true, limit: 'Via proxy CORS' },
    { source: 'Oasis of Ideas', configured: true, available: true, free: true, limit: 'Via proxy CORS' },
  ];
}
