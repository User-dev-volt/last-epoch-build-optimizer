import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UnlistenFn } from '@tauri-apps/api/event'

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (p: string) => `asset://${p}`,
}))
vi.mock('../../shared/commands/iconCommands', () => ({
  getIconCachePath: vi.fn(),
}))
vi.mock('pixi.js', () => ({
  Assets: { load: vi.fn() },
  Texture: class {},
}))

import { listen } from '@tauri-apps/api/event'
import { getIconCachePath } from '../../shared/commands/iconCommands'
import { Assets } from 'pixi.js'
import { useIconTextures } from './useIconTextures'

const mockListen = vi.mocked(listen)
const mockGetIconCachePath = vi.mocked(getIconCachePath)
const mockAssetsLoad = vi.mocked(Assets.load)

describe('useIconTextures', () => {
  let triggerInitialized: () => void
  let capturedUnlisten: UnlistenFn

  beforeEach(() => {
    vi.clearAllMocks()
    capturedUnlisten = vi.fn()
    mockListen.mockImplementation((_event, callback) => {
      triggerInitialized = callback as () => void
      return Promise.resolve(capturedUnlisten)
    })
  })

  it('does not call getIconCachePath before icon-pipeline:initialized fires', async () => {
    renderHook(() => useIconTextures(['skill-a', 'skill-b']))
    // Give promises time to settle
    await act(async () => {})
    expect(mockGetIconCachePath).not.toHaveBeenCalled()
  })

  it('calls getIconCachePath for each skillId after event fires', async () => {
    mockGetIconCachePath.mockResolvedValue(null)
    const { } = renderHook(() => useIconTextures(['skill-a', 'skill-b']))
    await act(async () => {})
    await act(async () => { triggerInitialized() })
    await act(async () => {})
    expect(mockGetIconCachePath).toHaveBeenCalledWith('skill-a')
    expect(mockGetIconCachePath).toHaveBeenCalledWith('skill-b')
  })

  it('excludes null paths from the returned Map', async () => {
    mockGetIconCachePath.mockResolvedValue(null)
    const { result } = renderHook(() => useIconTextures(['skill-a']))
    await act(async () => {})
    await act(async () => { triggerInitialized() })
    await act(async () => {})
    expect(result.current.size).toBe(0)
  })

  it('passes non-null paths through convertFileSrc then to Assets.load', async () => {
    mockGetIconCachePath.mockImplementation((id) =>
      Promise.resolve(id === 'skill-a' ? '/cache/skill-a.png' : null)
    )
    mockAssetsLoad.mockResolvedValue({} as never)
    renderHook(() => useIconTextures(['skill-a', 'skill-b']))
    await act(async () => {})
    await act(async () => { triggerInitialized() })
    await act(async () => {})
    expect(mockAssetsLoad).toHaveBeenCalledWith('asset:///cache/skill-a.png')
    expect(mockAssetsLoad).not.toHaveBeenCalledWith(expect.stringContaining('skill-b'))
  })

  it('returned Map contains resolved textures for non-null paths', async () => {
    const fakeTexture = { id: 'fake-texture' }
    mockGetIconCachePath.mockImplementation((id) =>
      Promise.resolve(id === 'skill-a' ? '/cache/skill-a.png' : null)
    )
    mockAssetsLoad.mockResolvedValue(fakeTexture as never)
    const { result } = renderHook(() => useIconTextures(['skill-a']))
    await act(async () => {})
    await act(async () => { triggerInitialized() })
    await act(async () => {})
    expect(result.current.get('skill-a')).toBe(fakeTexture)
  })

  it('calls unlisten on unmount', async () => {
    const { unmount } = renderHook(() => useIconTextures(['skill-a']))
    await act(async () => {})
    unmount()
    expect(capturedUnlisten).toHaveBeenCalled()
  })
})
