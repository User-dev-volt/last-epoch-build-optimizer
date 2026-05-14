import { invokeCommand } from '../../shared/utils/invokeCommand'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import type { ItemDatabase } from '../../shared/types/itemDatabase'

export async function loadItemDatabase(): Promise<void> {
  try {
    const db = await invokeCommand<ItemDatabase>('load_item_database')
    useGameDataStore.getState().setItemDatabase(db)
  } catch (err) {
    useGameDataStore.getState().setItemDatabase(null)
    throw err
  }
}
