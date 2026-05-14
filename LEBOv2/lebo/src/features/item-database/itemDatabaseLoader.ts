import { invokeCommand } from '../../shared/utils/invokeCommand'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import type { ItemDatabase } from '../../shared/types/itemDatabase'

export async function loadItemDatabase(): Promise<void> {
  const db = await invokeCommand<ItemDatabase>('load_item_database')
  useGameDataStore.getState().setItemDatabase(db)
}
