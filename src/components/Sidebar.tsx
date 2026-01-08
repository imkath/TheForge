import { Cpu, Zap, Database, FlaskConical, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useForgeStore } from '@/hooks';

export function Sidebar() {
  const { view, setView, savedIdeas } = useForgeStore();

  const navItems = [
    { id: 'forge' as const, icon: Zap, label: 'Explorar' },
    { id: 'vault' as const, icon: Database, label: 'Guardadas', count: savedIdeas.length },
    { id: 'validation' as const, icon: FlaskConical, label: 'Validar' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-forge-surface border-r border-white/5 flex flex-col items-center py-8 z-50">
      {/* Logo */}
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-8">
        <Cpu className="text-white" size={24} />
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'relative p-3 rounded-xl transition-all group',
              view === item.id
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            )}
            title={item.label}
          >
            <item.icon size={24} />
            {item.count && item.count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center text-black font-bold">
                {item.count > 9 ? '9+' : item.count}
              </span>
            )}

            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 bg-forge-card text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Settings (bottom) */}
      <div className="mt-auto">
        <button
          className="p-3 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          title="Configuración"
        >
          <Settings size={24} />
        </button>
      </div>
    </nav>
  );
}
