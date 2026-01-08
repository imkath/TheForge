import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, CheckCircle, XCircle } from 'lucide-react';
import { useForgeStore } from '@/hooks';
import { GlassCard, Badge, Button } from '@/components';
import { EmptyState } from '@/components';
import type { MicroSaaSIdea } from '@/types';

export function ValidationView() {
  const { savedIdeas } = useForgeStore();
  const [selectedIdea, setSelectedIdea] = useState<MicroSaaSIdea | null>(null);

  // Filter ideas that have UVP generated (ready for validation)
  const validatableIdeas = savedIdeas.filter((idea) => idea.uvp);

  if (validatableIdeas.length === 0) {
    return <EmptyState type="validation" />;
  }

  return (
    <div className="space-y-8">
      {/* Validation Dashboard Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Sprint de Validación 48 Horas
            </h2>
            <p className="text-slate-400 text-sm">
              Prueba hipótesis rápidamente con feedback de usuarios reales
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-indigo-400">
                {validatableIdeas.length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                Listas
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">
                {savedIdeas.filter((i) => i.validationStatus === 'validated').length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                Validadas
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Idea Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Selecciona una Idea para Validar
          </h3>
          {validatableIdeas.map((idea) => (
            <motion.button
              key={idea.id}
              onClick={() => setSelectedIdea(idea)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedIdea?.id === idea.id
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-forge-card/50 border-white/5 hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white text-sm">{idea.title}</h4>
                <Badge
                  variant={
                    idea.validationStatus === 'validated'
                      ? 'success'
                      : idea.validationStatus === 'invalidated'
                      ? 'danger'
                      : 'default'
                  }
                  size="sm"
                >
                  {idea.validationStatus === 'validated' ? 'validada' : idea.validationStatus === 'invalidated' ? 'invalidada' : 'pendiente'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{idea.uvp}</p>
            </motion.button>
          ))}
        </div>

        {/* Validation Details */}
        <div className="lg:col-span-2">
          {selectedIdea ? (
            <GlassCard className="p-6">
              <div className="space-y-6">
                {/* UVP */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {selectedIdea.title}
                  </h3>
                  <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">
                      Propuesta de Valor Única
                    </p>
                    <p className="text-white">{selectedIdea.uvp}</p>
                  </div>
                </div>

                {/* Interview Script */}
                {selectedIdea.interviewScript && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                      Script de Entrevista (15 min)
                    </p>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {selectedIdea.interviewScript}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Validation Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <Button variant="primary">
                    <Target size={16} />
                    Iniciar Sprint de Validación
                  </Button>
                  <Button variant="secondary">
                    <Users size={16} />
                    Buscar Candidatos
                  </Button>
                </div>

                {/* Quick Status Update */}
                <div className="flex items-center gap-4 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <CheckCircle size={16} />
                    Marcar Validada
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                  >
                    <XCircle size={16} />
                    Marcar Invalidada
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-slate-600">Selecciona una idea para ver detalles de validación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
