import { useForgeStore } from '@/hooks';
import { IdeaCard, EmptyState } from '@/components';

export function ForgeView() {
  const { currentIdeas, savedIdeas, saveIdea, isHunting, getFilteredIdeas, minScoreFilter } = useForgeStore();

  const filteredIdeas = getFilteredIdeas();
  const hiddenCount = currentIdeas.length - filteredIdeas.length;

  return (
    <div>
      {hiddenCount > 0 && (
        <p className="text-slate-500 text-sm mb-4">
          Mostrando {filteredIdeas.length} de {currentIdeas.length} ideas (filtro: {minScoreFilter}+)
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredIdeas.map((idea, idx) => (
          <IdeaCard
            key={`${idea.title}-${idx}`}
            idea={idea}
            onSave={() => saveIdea(idea)}
            isSaved={savedIdeas.some((s) => s.title === idea.title)}
          />
        ))}
        {filteredIdeas.length === 0 && !isHunting && <EmptyState type="forge" />}
      </div>
    </div>
  );
}
