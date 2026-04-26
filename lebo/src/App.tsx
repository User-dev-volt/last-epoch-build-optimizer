import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClassSelectorScreen } from "./components/screens/ClassSelectorScreen";
import { MasterySelectorScreen } from "./components/screens/MasterySelectorScreen";
import { BuildScreen } from "./components/screens/BuildScreen";
import { LoadingScreen } from "./components/screens/LoadingScreen";
import { useGameDataStore } from "./stores/gameDataStore";
import { useBuildStore } from "./stores/buildStore";
import { useScoreStore } from "./stores/scoreStore";

export default function App() {
  const { initialize, isLoaded, isLoading, getPassiveTree } = useGameDataStore();
  const masteryId = useBuildStore((s) => s.masteryId);
  const passiveAllocations = useBuildStore((s) => s.passiveAllocations);
  const recalculate = useScoreStore((s) => s.recalculate);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ── Reactive score sync ──────────────────────────────────────────────────
  // Runs whenever allocations or mastery changes; stays < 16ms (deterministic)
  useEffect(() => {
    const tree = masteryId ? getPassiveTree(masteryId) : undefined;
    recalculate(passiveAllocations, tree);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passiveAllocations, masteryId]);

  if (isLoading || !isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClassSelectorScreen />} />
        <Route path="/mastery/:classId" element={<MasterySelectorScreen />} />
        <Route
          path="/build/:masteryId"
          element={masteryId ? <BuildScreen /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
