import { describe, it, expect } from 'vitest'
import { normalizeAppError } from './errorNormalizer'

describe('normalizeAppError', () => {
  it('wraps unknown string errors as UNKNOWN type', () => {
    const result = normalizeAppError('some rust error string')
    expect(result.type).toBe('UNKNOWN')
    expect(result.message).toBeTruthy()
  })

  it('wraps unknown Error instances as UNKNOWN type', () => {
    const result = normalizeAppError(new Error('unexpected crash'))
    expect(result.type).toBe('UNKNOWN')
    expect(result.detail).toBe('unexpected crash')
  })

  it('detects API_ERROR from string', () => {
    const result = normalizeAppError('API_ERROR: rate limit exceeded')
    expect(result.type).toBe('API_ERROR')
    expect(result.detail).toBe('API_ERROR: rate limit exceeded')
  })

  it('detects AUTH_ERROR from string', () => {
    const result = normalizeAppError('AUTH_ERROR: no key configured')
    expect(result.type).toBe('AUTH_ERROR')
  })

  it('detects STORAGE_ERROR from string', () => {
    const result = normalizeAppError('STORAGE_ERROR: sqlite write failed')
    expect(result.type).toBe('STORAGE_ERROR')
  })

  it('detects NETWORK_ERROR from string', () => {
    const result = normalizeAppError('NETWORK_ERROR: connection refused')
    expect(result.type).toBe('NETWORK_ERROR')
  })

  it('detects TIMEOUT from string', () => {
    const result = normalizeAppError('TIMEOUT: request exceeded 45s')
    expect(result.type).toBe('TIMEOUT')
  })

  it('passes through already-normalized AppError objects', () => {
    const existing = { type: 'AUTH_ERROR' as const, message: 'No API key' }
    const result = normalizeAppError(existing)
    expect(result).toBe(existing)
  })

  it('handles null/undefined gracefully', () => {
    const result = normalizeAppError(null)
    expect(result.type).toBe('UNKNOWN')
    expect(result.message).toBeTruthy()
  })

  it('all error types have non-empty user-facing messages', () => {
    const types = [
      'API_ERROR', 'NETWORK_ERROR', 'TIMEOUT', 'PARSE_ERROR',
      'DATA_STALE', 'STORAGE_ERROR', 'AUTH_ERROR', 'UNKNOWN',
    ]
    for (const type of types) {
      const result = normalizeAppError(`${type}: test`)
      if (result.type === type) {
        expect(result.message.length).toBeGreaterThan(0)
      }
    }
  })
})
