import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { convertFileSrc } from '@tauri-apps/api/core'
import { Assets, Texture } from 'pixi.js'
import { getIconCachePath } from '../../shared/commands/iconCommands'

export function useIconTextures(skillIds: string[]): Map<string, Texture> {
  const [iconTextures, setIconTextures] = useState<Map<string, Texture>>(new Map())
  const [pipelineReady, setPipelineReady] = useState(false)
  const loadedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true
    let unlisten: UnlistenFn | null = null

    listen('icon-pipeline:initialized', () => {
      if (isMounted) setPipelineReady(true)
    })
      .then((fn) => { unlisten = fn })
      .catch(console.error)

    return () => {
      isMounted = false
      unlisten?.()
    }
  }, [])

  useEffect(() => {
    if (!pipelineReady) return

    const newIds = skillIds.filter((id) => !loadedIdsRef.current.has(id))
    if (newIds.length === 0) return

    for (const skillId of newIds) {
      loadedIdsRef.current.add(skillId)
      getIconCachePath(skillId).then((path) => {
        if (path === null) return
        const url = convertFileSrc(path)
        Assets.load<Texture>(url).then((texture) => {
          setIconTextures((prev) => new Map(prev).set(skillId, texture))
        })
      })
    }
  }, [pipelineReady, skillIds])

  return iconTextures
}
