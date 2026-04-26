import toast from 'react-hot-toast'
import { invokeCommand } from '../../shared/utils/invokeCommand'
import { useBuildStore } from '../../shared/stores/buildStore'
import type { BuildState, BuildMeta } from '../../shared/types/build'

export function migrateBuildState(raw: unknown): BuildState {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('STORAGE_ERROR: invalid build data')
  }
  const obj = raw as Record<string, unknown>
  return {
    schemaVersion: 1,
    id: String(obj.id ?? crypto.randomUUID()),
    name: String(obj.name ?? ''),
    classId: String(obj.classId ?? ''),
    masteryId: String(obj.masteryId ?? ''),
    nodeAllocations:
      typeof obj.nodeAllocations === 'object' && obj.nodeAllocations !== null
        ? (obj.nodeAllocations as Record<string, number>)
        : {},
    contextData:
      typeof obj.contextData === 'object' && obj.contextData !== null
        ? (obj.contextData as BuildState['contextData'])
        : { gear: [], skills: [], idols: [] },
    isPersisted: true,
    createdAt: String(obj.createdAt ?? new Date().toISOString()),
    updatedAt: String(obj.updatedAt ?? new Date().toISOString()),
  }
}

export async function saveBuild(build: BuildState): Promise<void> {
  const { setSavedBuilds, savedBuilds, setActiveBuildPersisted } = useBuildStore.getState()
  await invokeCommand('save_build', {
    id: build.id,
    name: build.name,
    classId: build.classId,
    masteryId: build.masteryId,
    schemaVersion: build.schemaVersion,
    data: JSON.stringify(build),
    createdAt: build.createdAt,
    updatedAt: build.updatedAt,
  })
  setActiveBuildPersisted()
  const existing = savedBuilds.find((b) => b.id === build.id)
  if (existing) {
    setSavedBuilds(
      savedBuilds.map((b) =>
        b.id === build.id ? { ...b, name: build.name, updatedAt: build.updatedAt } : b
      )
    )
  } else {
    const meta: BuildMeta = {
      id: build.id,
      name: build.name,
      classId: build.classId,
      masteryId: build.masteryId,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
    }
    setSavedBuilds([meta, ...savedBuilds])
  }
  toast(`Build saved as ${build.name}`, { duration: 3000 })
}

export async function loadBuildsList(): Promise<void> {
  const metas = await invokeCommand<BuildMeta[]>('load_builds_list')
  useBuildStore.getState().setSavedBuilds(metas)
}

export async function loadBuild(id: string): Promise<void> {
  const { setActiveBuild, setSelectedClass, setSelectedMastery } = useBuildStore.getState()
  const dataJson = await invokeCommand<string>('load_build', { id })
  const raw: unknown = JSON.parse(dataJson)
  const build = migrateBuildState(raw)
  setSelectedClass(build.classId)
  setSelectedMastery(build.masteryId)
  setActiveBuild(build)
}

export async function deleteBuild(id: string): Promise<void> {
  const { activeBuild, savedBuilds, setSavedBuilds, clearActiveBuild } =
    useBuildStore.getState()
  await invokeCommand('delete_build', { id })
  setSavedBuilds(savedBuilds.filter((b) => b.id !== id))
  if (activeBuild?.id === id) {
    clearActiveBuild()
  }
}

export async function renameBuild(id: string, newName: string): Promise<void> {
  const { savedBuilds, setSavedBuilds, activeBuild, setActiveBuild } =
    useBuildStore.getState()
  await invokeCommand('rename_build', { id, newName })
  setSavedBuilds(savedBuilds.map((b) => (b.id === id ? { ...b, name: newName } : b)))
  if (activeBuild?.id === id) {
    setActiveBuild({ ...activeBuild, name: newName })
  }
}

export async function loadBuildsOnStartup(): Promise<void> {
  try {
    await loadBuildsList()
  } catch {
    // Non-fatal — app works without saved builds
  }
}
