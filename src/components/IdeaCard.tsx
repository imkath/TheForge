import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Code,
  FileText,
  Lightbulb,
  Globe,
  BadgeCheck,
  DollarSign,
} from 'lucide-react';
import { GlassCard, Badge, Button, ScoreIndicator } from './ui';
import { cn } from '@/utils/cn';
import type { MicroSaaSIdea, FrictionSeverity } from '@/types';
import { generateValidationKit, analyzeTechnicalViability, getMRRTierLabel } from '@/services';

interface IdeaCardProps {
  idea: MicroSaaSIdea;
  onSave?: () => void;
  onDelete?: () => void;
  isSaved?: boolean;
  isVault?: boolean;
}

const FRICTION_LABELS: Record<FrictionSeverity, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  minor_bug: { label: 'Bug Menor', variant: 'warning' },
  workflow_gap: { label: 'Gap de Flujo', variant: 'success' },
  critical_pain: { label: 'Dolor Crítico', variant: 'danger' },
};

export function IdeaCard({ idea, onSave, onDelete, isSaved, isVault }: IdeaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingUVP, setIsGeneratingUVP] = useState(false);
  const [isAnalyzingTech, setIsAnalyzingTech] = useState(false);
  const [validationKit, setValidationKit] = useState<{ uvp: string; interviewScript: string } | null>(null);
  const [techAnalysis, setTechAnalysis] = useState<{
    backlog: string[];
    estimatedComplexity: string;
    suggestedAPIs: string[];
    warnings: string[];
  } | null>(null);

  const handleGenerateUVP = async () => {
    setIsGeneratingUVP(true);
    try {
      const kit = await generateValidationKit(idea);
      setValidationKit(kit);
    } catch {
      console.error('Failed to generate validation kit');
    } finally {
      setIsGeneratingUVP(false);
    }
  };

  const handleAnalyzeTech = async () => {
    setIsAnalyzingTech(true);
    try {
      const analysis = await analyzeTechnicalViability(idea);
      setTechAnalysis(analysis);
    } catch {
      console.error('Failed to analyze technical viability');
    } finally {
      setIsAnalyzingTech(false);
    }
  };

  const frictionInfo = idea.frictionSeverity ? FRICTION_LABELS[idea.frictionSeverity] : null;
  const mrrLabel = getMRRTierLabel(idea.estimatedMRR);

  return (
    <GlassCard className="group" hover glow={idea.potentialScore >= 80}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{idea.vertical}</Badge>
            {frictionInfo && (
              <Badge variant={frictionInfo.variant}>{frictionInfo.label}</Badge>
            )}
            {/* Import Opportunity Badge */}
            {idea.isImportOpportunity && (
              <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Globe size={10} className="mr-1" />
                Importar EN→ES
              </Badge>
            )}
            {/* Revenue Verified Badge */}
            {idea.revenueVerified && (
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <BadgeCheck size={10} className="mr-1" />
                Revenue Verificado
              </Badge>
            )}
            {/* MRR Tier Badge */}
            {mrrLabel && (
              <Badge variant="warning" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <DollarSign size={10} className="mr-1" />
                {mrrLabel}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {!isVault ? (
              <button
                onClick={onSave}
                disabled={isSaved}
                className={cn(
                  'p-2 rounded-xl transition-all',
                  isSaved
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-white bg-white/5'
                )}
              >
                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            ) : (
              <button
                onClick={onDelete}
                className="p-2 rounded-xl text-red-400 hover:text-red-300 bg-red-500/10 transition-all"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-indigo-400 transition-colors">
          {idea.title}
        </h3>

        {/* Problem Evidence */}
        <div className="p-4 bg-black/30 rounded-xl border border-white/5 mb-4">
          <p className="text-[10px] font-black text-indigo-500 uppercase mb-2 tracking-widest flex items-center gap-1">
            <MessageSquare size={12} /> Evidencia Real
          </p>
          <p className="text-sm text-slate-400 leading-relaxed italic line-clamp-3">
            "{idea.problem}"
          </p>
        </div>

        {/* JTBD */}
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
            Trabajo por Hacer (JTBD)
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{idea.jtbd}</p>
        </div>

        {/* Lead User Indicators */}
        {idea.leadUserIndicators && idea.leadUserIndicators.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest flex items-center gap-1">
              <Users size={12} /> Usuarios Líderes Detectados
            </p>
            <div className="flex flex-wrap gap-1">
              {idea.leadUserIndicators.map((indicator, idx) => (
                <Badge key={idx} variant="success" size="sm">
                  {indicator.type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Score & Tech Stack */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <ScoreIndicator score={idea.potentialScore} size="md" />
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                Potencial de Mercado
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4 border-t border-white/5 mt-4">
                {/* Tech Stack */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1">
                    <Code size={12} /> Stack Tecnológico Sugerido
                  </p>
                  <p className="text-sm text-slate-300">{idea.techStackSuggestion}</p>
                </div>

                {/* Evidence Source */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1">
                    <FileText size={12} /> Fuente de Evidencia
                  </p>
                  <p className="text-xs text-slate-400">{idea.evidenceSource}</p>
                </div>

                {/* Import Opportunity Details */}
                {idea.isImportOpportunity && (
                  <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest flex items-center gap-1">
                      <Globe size={12} /> Oportunidad de Importación
                    </p>
                    <p className="text-xs text-slate-300">
                      Esta idea está validada en mercados de habla inglesa y podría localizarse para LATAM/España.
                      {idea.sourceMarket && (
                        <span className="ml-1 text-blue-400">
                          Mercado origen: {idea.sourceMarket.toUpperCase()}
                        </span>
                      )}
                    </p>
                    {idea.estimatedMRR && idea.estimatedMRR > 0 && (
                      <p className="text-xs text-emerald-400 mt-1">
                        MRR del producto original: ${idea.estimatedMRR.toLocaleString()}/mes
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateUVP}
                    isLoading={isGeneratingUVP}
                  >
                    <Lightbulb size={14} />
                    Generar UVP
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAnalyzeTech}
                    isLoading={isAnalyzingTech}
                  >
                    <Zap size={14} />
                    Análisis Técnico
                  </Button>
                </div>

                {/* Validation Kit Results */}
                {validationKit && (
                  <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">
                      Propuesta de Valor Única
                    </p>
                    <p className="text-sm text-white mb-4">{validationKit.uvp}</p>
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">
                      Script de Entrevista
                    </p>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">
                      {validationKit.interviewScript}
                    </p>
                  </div>
                )}

                {/* Tech Analysis Results */}
                {techAnalysis && (
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        Complejidad:
                      </p>
                      <Badge
                        variant={
                          techAnalysis.estimatedComplexity === 'low'
                            ? 'success'
                            : techAnalysis.estimatedComplexity === 'medium'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {techAnalysis.estimatedComplexity === 'low' ? 'Baja' : techAnalysis.estimatedComplexity === 'medium' ? 'Media' : 'Alta'}
                      </Badge>
                    </div>

                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-2 tracking-widest">
                      Backlog del MVP
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1 mb-3">
                      {techAnalysis.backlog.map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500">-</span>
                          {task}
                        </li>
                      ))}
                    </ul>

                    {techAnalysis.warnings.length > 0 && (
                      <>
                        <p className="text-[10px] font-black text-amber-400 uppercase mb-2 tracking-widest">
                          Advertencias
                        </p>
                        <ul className="text-xs text-amber-300 space-y-1">
                          {techAnalysis.warnings.map((warning, idx) => (
                            <li key={idx}>- {warning}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
