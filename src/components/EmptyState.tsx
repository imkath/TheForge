import { Layers, Database, FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  type: 'forge' | 'vault' | 'validation';
}

const states: Record<string, { icon: ReactNode; message: string }> = {
  forge: {
    icon: <Layers size={56} className="text-slate-700 opacity-30" />,
    message: 'Inicia la búsqueda para encontrar oportunidades basadas en evidencia real.',
  },
  vault: {
    icon: <Database size={56} className="text-slate-700 opacity-30" />,
    message: 'No hay ideas guardadas. Guarda descubrimientos desde The Forge.',
  },
  validation: {
    icon: <FlaskConical size={56} className="text-slate-700 opacity-30" />,
    message: 'Sin experimentos activos. Genera una UVP desde una idea guardada para comenzar.',
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const { icon, message } = states[type];

  return (
    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-slate-600 font-medium max-w-md mx-auto">{message}</p>
    </div>
  );
}
