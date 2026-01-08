import { create } from 'zustand';
import type { ForgeState, MicroSaaSIdea, ScoringWeights, ForgeUser } from '@/types';
import { DEFAULT_SCORING_WEIGHTS, VERTICALS } from '@/config';
import {
  authService,
  vaultService,
  huntOpportunities,
  calculateScore,
} from '@/services';

// AbortController for cancelling ongoing hunts
let currentHuntController: AbortController | null = null;
let currentHuntId = 0;

interface ForgeActions {
  // Auth
  initAuth: () => Promise<void>;
  setUser: (user: ForgeUser | null) => void;

  // View
  setView: (view: 'forge' | 'vault' | 'validation') => void;

  // Hunting
  startHunting: () => Promise<void>;
  stopHunting: () => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
  setSelectedVertical: (verticalId: string) => void;
  setMinScoreFilter: (score: number) => void;
  getFilteredIdeas: () => MicroSaaSIdea[];

  // Ideas
  addIdeas: (ideas: MicroSaaSIdea[]) => void;
  clearCurrentIdeas: () => void;
  saveIdea: (idea: MicroSaaSIdea) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  setSavedIdeas: (ideas: MicroSaaSIdea[]) => void;

  // Scoring
  setScoringWeights: (weights: ScoringWeights) => void;
  recalculateScores: () => void;
}

type ForgeStore = ForgeState & ForgeActions;

export const useForgeStore = create<ForgeStore>((set, get) => ({
  // Initial State
  user: null,
  currentIdeas: [],
  savedIdeas: [],
  isHunting: false,
  currentVertical: null,
  selectedVerticalId: VERTICALS[0]?.id || 'developer-tools',
  minScoreFilter: 0,
  status: '',
  error: null,
  view: 'forge',
  scoringWeights: DEFAULT_SCORING_WEIGHTS,

  // Auth Actions
  initAuth: async () => {
    try {
      const user = await authService.signIn();
      set({ user });

      // Subscribe to saved ideas
      vaultService.subscribeToIdeas(user.uid, (ideas) => {
        set({ savedIdeas: ideas });
      });
    } catch (error) {
      set({ error: 'Authentication failed' });
    }
  },

  setUser: (user) => set({ user }),

  // View Actions
  setView: (view) => set({ view }),

  // Hunting Actions
  startHunting: async () => {
    const { isHunting, selectedVerticalId } = get();
    if (isHunting) return;

    // Find selected vertical
    const vertical = VERTICALS.find((v) => v.id === selectedVerticalId);
    if (!vertical) {
      set({ error: 'Categoría no encontrada' });
      return;
    }

    // Cancel any previous hunt
    if (currentHuntController) {
      currentHuntController.abort();
    }

    // Create new controller and track hunt ID
    currentHuntController = new AbortController();
    currentHuntId++;
    const thisHuntId = currentHuntId;

    set({
      isHunting: true,
      error: null,
      currentIdeas: [],
      status: `Buscando en: ${vertical.name}...`,
      currentVertical: vertical.name,
    });

    try {
      const ideas = await huntOpportunities(vertical, currentHuntController.signal);

      // Check if this hunt was cancelled
      if (thisHuntId !== currentHuntId) {
        return; // A newer hunt started, ignore results
      }

      // Calculate scores for each idea
      const { scoringWeights } = get();
      const scoredIdeas = ideas.map((idea) => {
        const scoreResult = calculateScore(idea, scoringWeights);
        return {
          ...idea,
          potentialScore: scoreResult.totalScore,
        };
      });

      set({
        currentIdeas: scoredIdeas,
        status: `Encontradas ${scoredIdeas.length} oportunidades`,
        isHunting: false,
        currentVertical: null,
      });
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Check if this hunt was cancelled
      if (thisHuntId !== currentHuntId) {
        return;
      }
      set({
        error: 'Búsqueda falló. Revisa tu configuración de API.',
        isHunting: false,
        currentVertical: null,
        status: '',
      });
    }
  },

  setSelectedVertical: (verticalId) => set({ selectedVerticalId: verticalId }),

  setMinScoreFilter: (score) => set({ minScoreFilter: score }),

  getFilteredIdeas: () => {
    const { currentIdeas, minScoreFilter } = get();
    if (minScoreFilter === 0) return currentIdeas;
    return currentIdeas.filter((idea) => idea.potentialScore >= minScoreFilter);
  },

  stopHunting: () => {
    // Actually cancel the ongoing hunt
    if (currentHuntController) {
      currentHuntController.abort();
      currentHuntController = null;
    }
    currentHuntId++; // Invalidate any pending results

    set({
      isHunting: false,
      status: 'Búsqueda detenida',
      currentVertical: null,
    });
  },

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  // Ideas Actions
  addIdeas: (ideas) =>
    set((state) => ({
      currentIdeas: [...state.currentIdeas, ...ideas],
    })),

  clearCurrentIdeas: () => set({ currentIdeas: [] }),

  saveIdea: async (idea) => {
    const { user } = get();
    if (!user) {
      set({ error: 'Not authenticated' });
      return;
    }

    try {
      await vaultService.saveIdea(user.uid, idea);
    } catch (error) {
      set({ error: 'Failed to save idea' });
    }
  },

  deleteIdea: async (ideaId) => {
    const { user } = get();
    if (!user) {
      set({ error: 'Not authenticated' });
      return;
    }

    try {
      await vaultService.deleteIdea(user.uid, ideaId);
    } catch (error) {
      set({ error: 'Failed to delete idea' });
    }
  },

  setSavedIdeas: (ideas) => set({ savedIdeas: ideas }),

  // Scoring Actions
  setScoringWeights: (weights) => set({ scoringWeights: weights }),

  recalculateScores: () => {
    const { currentIdeas, scoringWeights } = get();
    const rescored = currentIdeas.map((idea) => {
      const scoreResult = calculateScore(idea, scoringWeights);
      return {
        ...idea,
        potentialScore: scoreResult.totalScore,
      };
    });
    set({ currentIdeas: rescored });
  },
}));
