import { useForgeStore } from '@/hooks';
import { IdeaCard, EmptyState } from '@/components';

export function VaultView() {
  const { savedIdeas, deleteIdea } = useForgeStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
      {savedIdeas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          isVault
          onDelete={() => idea.id && deleteIdea(idea.id)}
        />
      ))}
      {savedIdeas.length === 0 && <EmptyState type="vault" />}
    </div>
  );
}
