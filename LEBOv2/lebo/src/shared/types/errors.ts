export type ErrorType =
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'DATA_STALE'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'UNKNOWN'

export interface AppError {
  type: ErrorType
  message: string
  detail?: string
}
