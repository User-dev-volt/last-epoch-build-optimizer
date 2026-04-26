export type OptimizationGoal =
  | 'maximize_damage'
  | 'maximize_survivability'
  | 'maximize_speed'
  | 'balanced'

export interface BuildScore {
  damage: number | null
  survivability: number | null
  speed: number | null
}

export interface NodeChange {
  fromNodeId: string | null
  toNodeId: string
  pointsChange: number
}

export interface SuggestionResult {
  rank: number
  nodeChange: NodeChange
  explanation: string
  deltaDamage: number | null
  deltaSurvivability: number | null
  deltaSpeed: number | null
  baselineScore: BuildScore
  previewScore: BuildScore
}
