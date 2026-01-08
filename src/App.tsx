import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Sidebar, Header } from '@/components';
import { ForgeView, VaultView, ValidationView } from '@/views';
import { useForgeStore } from '@/hooks';
import { validateConfig } from '@/config';

export default function App() {
  const { view, error, setError, initAuth } = useForgeStore();

  useEffect(() => {
    validateConfig();
    initAuth();
  }, [initAuth]);

  return (
    <div className="min-h-screen bg-forge-bg text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="pl-20 relative z-10">
        <Header />

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-8 mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Content */}
        <div className="px-8 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'forge' && <ForgeView />}
              {view === 'vault' && <VaultView />}
              {view === 'validation' && <ValidationView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
