import { Search, StopCircle } from 'lucide-react';
import { Button } from './ui';
import { useForgeStore } from '@/hooks';
import { VERTICALS } from '@/config';

export function Header() {
  const { view, isHunting, startHunting, stopHunting, status, selectedVerticalId, setSelectedVertical, minScoreFilter, setMinScoreFilter } = useForgeStore();

  const titles = {
    forge: {
      title: 'THE FORGE',
      subtitle: 'Exploración autónoma de mercados de alta fricción.',
    },
    vault: {
      title: 'THE VAULT',
      subtitle: 'Repositorio persistente de inteligencia de negocios.',
    },
    validation: {
      title: 'LABORATORIO',
      subtitle: 'Validación rápida de hipótesis en 48 horas.',
    },
  };

  const { title, subtitle } = titles[view];

  return (
    <header className="px-8 pt-10 pb-6 flex justify-between items-end">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-white mb-1">
          {title}
        </h1>
        <p className="text-slate-500 font-medium">{subtitle}</p>

        {/* Status indicator when hunting */}
        {isHunting && status && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex space-x-1">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <span className="text-indigo-400 font-mono text-xs uppercase tracking-widest">
              {status}
            </span>
          </div>
        )}
      </div>

      {view === 'forge' && (
        <div className="flex items-center gap-3">
          {/* Category selector */}
          <select
            value={selectedVerticalId}
            onChange={(e) => setSelectedVertical(e.target.value)}
            disabled={isHunting}
            className="bg-forge-card border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {VERTICALS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Min score filter */}
          <select
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(Number(e.target.value))}
            className="bg-forge-card border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>Todos</option>
            <option value={40}>40+</option>
            <option value={60}>60+</option>
            <option value={80}>80+</option>
          </select>

          {isHunting ? (
            <Button variant="danger" onClick={stopHunting}>
              <StopCircle size={18} />
              DETENER
            </Button>
          ) : (
            <Button variant="primary" onClick={startHunting}>
              <Search size={18} />
              BUSCAR
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
