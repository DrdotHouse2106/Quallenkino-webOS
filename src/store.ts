import type { ServerInfo } from './api/server'
import type { Session } from './api/users'

/** Gespeicherter Stand: Server und angemeldete Profile (nur auf diesem Fernseher). */
export interface SavedState {
  server?: ServerInfo
  sessions: Session[]
  lastUserId?: string
}

const KEY = 'qk.state'

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): SavedState {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '{}') as Partial<SavedState>
    return { server: parsed.server, sessions: parsed.sessions ?? [], lastUserId: parsed.lastUserId }
  } catch {
    return { sessions: [] }
  }
}

export function saveState(state: SavedState, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(KEY, JSON.stringify(state))
}

/** Anmeldung eines Profils merken (ersetzt eine ältere desselben Profils). */
export function withSession(state: SavedState, session: Session): SavedState {
  return { ...state, sessions: [...state.sessions.filter(s => s.userId !== session.userId), session], lastUserId: session.userId }
}

export function withoutSession(state: SavedState, userId: string): SavedState {
  return { ...state, sessions: state.sessions.filter(s => s.userId !== userId) }
}
