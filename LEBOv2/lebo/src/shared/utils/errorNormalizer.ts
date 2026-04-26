import type { AppError, ErrorType } from '../types/errors'

const ERROR_TYPE_MAP: Record<string, ErrorType> = {
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  PARSE_ERROR: 'PARSE_ERROR',
  DATA_STALE: 'DATA_STALE',
  STORAGE_ERROR: 'STORAGE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
}

const USER_MESSAGES: Record<ErrorType, string> = {
  API_ERROR: 'The AI API returned an error. Please try again.',
  NETWORK_ERROR: 'Network connection failed. Check your connection and retry.',
  TIMEOUT: 'Request timed out. Please try again.',
  PARSE_ERROR: 'Could not parse the provided data. Check the format and try again.',
  DATA_STALE: 'Game data may be outdated. Consider updating your game data.',
  STORAGE_ERROR: 'A storage error occurred. Your data in memory is safe — try saving again.',
  AUTH_ERROR: 'No API key configured. Add your Claude API key in Settings.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
}

export function normalizeAppError(raw: unknown): AppError {
  if (isAppError(raw)) return raw

  if (typeof raw === 'string') {
    const upperRaw = raw.toUpperCase()
    for (const [key, type] of Object.entries(ERROR_TYPE_MAP)) {
      if (upperRaw.includes(key)) {
        return { type, message: USER_MESSAGES[type], detail: raw }
      }
    }
    return { type: 'UNKNOWN', message: USER_MESSAGES.UNKNOWN, detail: raw }
  }

  if (raw instanceof Error) {
    return { type: 'UNKNOWN', message: USER_MESSAGES.UNKNOWN, detail: raw.message }
  }

  return { type: 'UNKNOWN', message: USER_MESSAGES.UNKNOWN }
}

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    typeof (value as AppError).type === 'string' &&
    typeof (value as AppError).message === 'string'
  )
}
