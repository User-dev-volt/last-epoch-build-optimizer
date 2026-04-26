import { useGameDataStore } from "../../stores/gameDataStore";

export function LoadingScreen() {
  const { fetchProgress, loadError, initialize } = useGameDataStore();

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-lebo-base text-lebo-text-primary gap-6">
        <div className="text-lebo-gold text-2xl font-display">LEBO</div>
        <p className="text-lebo-text-secondary text-sm">Couldn't load game data.</p>
        <p className="text-red-400 text-xs max-w-sm text-center">{loadError}</p>
        <button
          onClick={() => initialize()}
          className="px-4 py-2 bg-lebo-gold text-lebo-base rounded text-sm font-medium hover:bg-lebo-gold-bright transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const progressText = fetchProgress
    ? `${fetchProgress.step} (${fetchProgress.current}/${fetchProgress.total})`
    : "Loading game data...";

  const progressPct = fetchProgress
    ? Math.round((fetchProgress.current / fetchProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-lebo-base text-lebo-text-primary gap-8">
      <div className="text-lebo-gold text-4xl font-display tracking-widest">LEBO</div>
      <div className="text-lebo-text-secondary text-xs uppercase tracking-widest">
        Last Epoch Build Optimizer
      </div>

      <div className="w-64 flex flex-col gap-2">
        <div className="h-1 bg-lebo-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-lebo-gold rounded-full transition-all duration-300"
            style={{ width: fetchProgress ? `${progressPct}%` : "0%" }}
          />
        </div>
        <p className="text-lebo-text-muted text-xs text-center">{progressText}</p>
      </div>

      {/* Pulsing indicator */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-lebo-gold animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
