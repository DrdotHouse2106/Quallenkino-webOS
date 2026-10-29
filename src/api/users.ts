import { request } from './http'

export interface UserSummary {
  Id: string
  Name: string
  PrimaryImageTag?: string
  HasPassword?: boolean
}

interface AuthenticationResult {
  User: UserSummary
  AccessToken: string
}

export interface Session {
  userId: string
  name: string
  token: string
  imageTag?: string
}

function toSession(result: AuthenticationResult): Session {
  return { userId: result.User.Id, name: result.User.Name, token: result.AccessToken, imageTag: result.User.PrimaryImageTag }
}

/** Sichtbare Profile des Servers (für „Wer schaut gerade?“). */
export function publicUsers(baseUrl: string): Promise<UserSummary[]> {
  return request<UserSummary[]>(baseUrl, '/Users/Public')
}

export async function signIn(baseUrl: string, username: string, password: string): Promise<Session> {
  return toSession(await request<AuthenticationResult>(baseUrl, '/Users/AuthenticateByName', {
    method: 'POST',
    body: { Username: username, Pw: password },
  }))
}

/**
 * Ist die gespeicherte Anmeldung noch gültig? Verworfen wird sie nur, wenn der Server sie ablehnt (401/403) –
 * nicht bei Zeitüberschreitung oder Neustart des Servers (z. B. nach einem Plugin-Update).
 */
export async function checkSession(baseUrl: string, session: Session): Promise<boolean> {
  try {
    await request(baseUrl, '/Users/Me', { token: session.token })
    return true
  } catch (error) {
    const status = (error as { status?: number }).status
    return !(status === 401 || status === 403)
  }
}

/** Anmeldung beim Server widerrufen (Token ungültig machen); Fehler werden ignoriert. */
export async function logout(baseUrl: string, token: string): Promise<void> {
  try {
    await request(baseUrl, '/Sessions/Logout', { method: 'POST', token, timeoutMs: 4_000 })
  } catch {
    // offline oder schon abgemeldet – lokal wird trotzdem gelöscht
  }
}

export function userImageUrl(baseUrl: string, userId: string, tag: string, size = 300): string {
  return `${baseUrl.replace(/\/+$/, '')}/Users/${userId}/Images/Primary?tag=${encodeURIComponent(tag)}&maxHeight=${size}&quality=90`
}

// Quick Connect: Code am Fernseher anzeigen, auf dem Handy bestätigen
export interface QuickConnectState {
  Code: string
  Secret: string
  Authenticated: boolean
}

export function quickConnectEnabled(baseUrl: string): Promise<boolean> {
  return request<boolean>(baseUrl, '/QuickConnect/Enabled').catch(() => false)
}

export function quickConnectStart(baseUrl: string): Promise<QuickConnectState> {
  return request<QuickConnectState>(baseUrl, '/QuickConnect/Initiate', { method: 'POST' })
}

export function quickConnectCheck(baseUrl: string, secret: string): Promise<QuickConnectState> {
  return request<QuickConnectState>(baseUrl, `/QuickConnect/Connect?secret=${encodeURIComponent(secret)}`)
}

export async function quickConnectFinish(baseUrl: string, secret: string): Promise<Session> {
  return toSession(await request<AuthenticationResult>(baseUrl, '/Users/AuthenticateWithQuickConnect', {
    method: 'POST',
    body: { Secret: secret },
  }))
}
