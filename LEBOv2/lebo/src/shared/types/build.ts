export interface GearItem {
  slotId: string
  itemName: string
  affixes: string[]
}

export interface ActiveSkill {
  slotId: string
  skillName: string
}

export interface IdolItem {
  slotId: string
  idolType: string
  modifiers: string[]
}

export interface BuildState {
  schemaVersion: 1
  id: string
  name: string
  classId: string
  masteryId: string
  nodeAllocations: Record<string, number>
  contextData: {
    gear: GearItem[]
    skills: ActiveSkill[]
    idols: IdolItem[]
  }
  isPersisted: boolean
  createdAt: string
  updatedAt: string
}

export type ApplyNodeResult = { success: boolean; error?: string }

export interface BuildMeta {
  id: string
  name: string
  classId: string
  masteryId: string
  createdAt: string
  updatedAt: string
}
