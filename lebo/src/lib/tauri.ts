import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Build, BuildSummary, OptimizationGoal } from "./types";

// ─── Game Data ────────────────────────────────────────────────────────────────

export async function fetchGameData(force = false): Promise<void> {
  await invoke("fetch_game_data", { force });
}

export async function getDbStatus(): Promise<{ schemaVersion: string; lastFetched: string | null }> {
  return invoke("get_db_status");
}

export async function getAllGameData(): Promise<unknown> {
  return invoke("get_all_game_data");
}

// ─── Builds ───────────────────────────────────────────────────────────────────

export interface SaveBuildPayload {
  id?: string;
  name: string;
  classId: string;
  masteryId: string;
  passiveAllocations: Record<string, number>;
  skillAllocations: Record<string, Record<string, number>>;
  equippedSkills: string[];
}

export async function saveBuild(build: SaveBuildPayload): Promise<string> {
  return invoke("save_build", { build });
}

export async function loadBuilds(): Promise<BuildSummary[]> {
  return invoke("load_builds");
}

export async function loadBuild(id: string): Promise<Build> {
  return invoke("load_build", { id });
}

export async function deleteBuild(id: string): Promise<void> {
  await invoke("delete_build", { id });
}

export async function importBuildFromUrl(url: string): Promise<Build> {
  return invoke("import_build_from_url", { url });
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export async function getApiKey(): Promise<string | null> {
  return invoke("get_api_key");
}

export async function setApiKey(key: string): Promise<void> {
  await invoke("set_api_key", { key });
}

// ─── Optimization (streaming) ─────────────────────────────────────────────────

export interface OptimizationPayload {
  passiveAllocations: Record<string, number>;
  equippedSkills: string[];
  goal: OptimizationGoal;
  masteryId: string;
}

export async function startOptimization(payload: OptimizationPayload): Promise<void> {
  await invoke("optimize_build", { payload });
}

export function onOptimizationChunk(cb: (delta: string) => void): Promise<UnlistenFn> {
  return listen<{ delta: string }>("optimization-chunk", (e) => cb(e.payload.delta));
}

export function onOptimizationComplete(cb: () => void): Promise<UnlistenFn> {
  return listen("optimization-complete", () => cb());
}

export function onOptimizationError(cb: (message: string) => void): Promise<UnlistenFn> {
  return listen<{ message: string }>("optimization-error", (e) => cb(e.payload.message));
}

export function onGameDataProgress(
  cb: (data: { current: number; total: number; step: string }) => void
): Promise<UnlistenFn> {
  return listen<{ current: number; total: number; step: string }>("game-data-progress", (e) =>
    cb(e.payload)
  );
}
