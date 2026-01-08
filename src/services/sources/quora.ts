/**
 * Quora Search via Serper (Free)
 *
 * Quora is a Q&A platform with millions of questions.
 * Great for understanding real user problems and needs.
 *
 * Great for finding:
 * - Questions people have about tools/processes
 * - Pain points expressed as questions
 * - Market demand signals ("How do I..." = demand)
 * - Problems without good solutions
 */

import { canUseSerper } from './serper';

export interface QuoraQuestion {
  id: string;
  title: string;
  content: string;
  url: string;
  answerCount?: number;
  views?: string;
  topic: string;
}

export interface QuoraSearchResult {
  items: QuoraQuestion[];
  source: 'quora';
  query: string;
  totalCount: number;
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

/**
 * Search Quora via Serper
 */
export async function searchQuora(
  query: string,
  options: {
    maxResults?: number;
  } = {}
): Promise<QuoraSearchResult> {
  const { maxResults = 15 } = options;

  if (!canUseSerper()) {
    console.warn('[Quora] Serper API not available');
    return { items: [], source: 'quora', query, totalCount: 0 };
  }

  try {
    const searchQuery = `site:quora.com "${query}"`;

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: maxResults,
      }),
    });

    if (!response.ok) {
      console.warn('[Quora] Serper search failed:', response.status);
      return { items: [], source: 'quora', query, totalCount: 0 };
    }

    const data = await response.json();
    const organic = data.organic || [];

    const items: QuoraQuestion[] = organic
      .filter((r: any) => r.link.includes('quora.com'))
      .map((r: any, index: number) => ({
        id: `quora-${index}-${Date.now()}`,
        title: cleanQuoraTitle(r.title),
        content: r.snippet || '',
        url: r.link,
        topic: query,
      }));

    return {
      items,
      source: 'quora',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.error('Quora search failed:', error);
    return { items: [], source: 'quora', query, totalCount: 0 };
  }
}

/**
 * Clean Quora title (remove "- Quora" suffix)
 */
function cleanQuoraTitle(title: string): string {
  return title.replace(/\s*-\s*Quora\s*$/i, '').trim();
}

/**
 * Search for pain points expressed as questions
 */
export async function searchQuoraPainPoints(keywords: string[]): Promise<QuoraQuestion[]> {
  const allItems: QuoraQuestion[] = [];

  const painPhrases = [
    'struggling with',
    'how to solve',
    'why is it so hard',
    'best way to',
    'alternative to',
    'frustrated with',
    'problem with',
  ];

  for (const keyword of keywords.slice(0, 3)) {
    // Search keyword directly
    const result1 = await searchQuora(keyword, { maxResults: 10 });
    allItems.push(...result1.items);

    // Search with pain phrases
    for (const phrase of painPhrases.slice(0, 2)) {
      const result2 = await searchQuora(`${keyword} ${phrase}`, { maxResults: 5 });
      allItems.push(...result2.items);

      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for "How do I..." questions (indicates demand)
 */
export async function searchQuoraHowTo(vertical: string): Promise<QuoraQuestion[]> {
  const allItems: QuoraQuestion[] = [];

  const howToQueries = [
    `how to ${vertical}`,
    `how do I ${vertical}`,
    `best tool for ${vertical}`,
    `automate ${vertical}`,
    `${vertical} workflow`,
  ];

  for (const query of howToQueries.slice(0, 3)) {
    const result = await searchQuora(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for tool recommendations (market research)
 */
export async function searchQuoraToolRecommendations(vertical: string): Promise<QuoraQuestion[]> {
  const allItems: QuoraQuestion[] = [];

  const queries = [
    `best ${vertical} software`,
    `${vertical} tool recommendation`,
    `what software for ${vertical}`,
    `${vertical} app recommendation`,
  ];

  for (const query of queries.slice(0, 3)) {
    const result = await searchQuora(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Check if Quora search is available
 */
export function isQuoraAvailable(): boolean {
  return canUseSerper();
}
