/** Persistent user + token store for dsh-kit-lan-auth. */

import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface StoredUser {
  id: string
  username: string
  /** sha256 of the raw password; never stored in plaintext. */
  passwordHash: string
  createdAt: string
}

interface StoredToken {
  id: string
  name: string
  /** sha256 of the raw token; raw value shown once at creation. */
  tokenHash: string
  createdAt: string
  lastUsedAt: string
}

interface StoreFile {
  users: StoredUser[]
  tokens: StoredToken[]
}

export interface TokenRecord {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string
}

export interface Store {
  load(): void
  listUsers(): Array<{ id: string; username: string; createdAt: string }>
  createUser(username: string, password: string): { id: string; username: string } | undefined
  removeUser(id: string): boolean
  listTokens(): TokenRecord[]
  createToken(name: string): { id: string; name: string; token: string }
  removeToken(id: string): boolean
  /** Validate raw password against a username. */
  checkLogin(username: string, password: string): boolean
  /** Validate a raw bearer token; updates lastUsedAt on success. */
  checkToken(raw: string): boolean
  /** Validate a username+password login; returns a fresh session token. */
  loginToken(username: string, password: string): string | undefined
  /** Revoke a token by its raw value (logout): removes it so it can no longer be used. */
  revokeToken(raw: string): boolean
}

const hash = (v: string) => createHash('sha256').update(v).digest('hex')
const newId = (p: string) => `${p}_${randomBytes(6).toString('hex')}`

/**
 * Resolve the dsh-kit-lan-auth runtime dirs. `$DSH_HOME` already points at
 * the per-user config root (e.g. `~/.dsh`), so we must NOT re-append `.dsh`.
 * Falls back to `$HOME/.dsh` when `$DSH_HOME` is unset.
 */
export function lanAuthRoot(home = process.env.DSH_HOME ?? join(process.env.HOME ?? '.', '.dsh')): string {
  return home
}

export function createStore(stateDir?: string): Store {
  const dir = stateDir ?? lanAuthRoot()
  const file = join(dir, 'dsh-kit-lan-auth', 'state.json')
  let data: StoreFile = { users: [], tokens: [] }

  const persist = () => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(data, null, 2))
  }

  const normalizeToken = (t: StoredToken): TokenRecord => ({
    id: t.id, name: t.name, createdAt: t.createdAt, lastUsedAt: t.lastUsedAt,
  })

  return {
    load() {
      try {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as StoreFile
        data = { users: parsed.users ?? [], tokens: parsed.tokens ?? [] }
      } catch {
        data = { users: [], tokens: [] }
      }
    },
    listUsers() {
      return data.users.map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }))
    },
    createUser(username, password) {
      const uname = username.trim()
      if (!uname || !password) return undefined
      if (data.users.some(u => u.username === uname)) return undefined
      const user: StoredUser = {
        id: newId('u'), username: uname, passwordHash: hash(password), createdAt: new Date().toISOString(),
      }
      data.users.push(user)
      persist()
      return { id: user.id, username: user.username }
    },
    removeUser(id) {
      const before = data.users.length
      data.users = data.users.filter(u => u.id !== id)
      if (data.users.length !== before) { persist(); return true }
      return false
    },
    listTokens() {
      return data.tokens.map(normalizeToken)
    },
    createToken(name) {
      const raw = randomBytes(24).toString('base64url')
      const token: StoredToken = {
        id: newId('t'), name: name.trim() || 'token',
        tokenHash: hash(raw), createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(),
      }
      data.tokens.push(token)
      persist()
      return { id: token.id, name: token.name, token: raw }
    },
    removeToken(id) {
      const before = data.tokens.length
      data.tokens = data.tokens.filter(t => t.id !== id)
      if (data.tokens.length !== before) { persist(); return true }
      return false
    },
    checkLogin(username, password) {
      const user = data.users.find(u => u.username === username)
      if (!user) return false
      return hash(password) === user.passwordHash
    },
    /** Validate a username+password login; returns a fresh token on success. */
    loginToken(username, password) {
      const user = data.users.find(u => u.username === username)
      if (!user) return undefined
      if (hash(password) !== user.passwordHash) return undefined
      const raw = randomBytes(24).toString('base64url')
      const token: StoredToken = {
        id: newId('t'), name: `session:${username}`, tokenHash: hash(raw),
        createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(),
      }
      data.tokens.push(token)
      persist()
      return raw
    },
    checkToken(raw) {
      const h = hash(raw)
      const t = data.tokens.find(x => x.tokenHash === h)
      if (!t) return false
      t.lastUsedAt = new Date().toISOString()
      persist()
      return true
    },
    revokeToken(raw) {
      const h = hash(raw)
      const before = data.tokens.length
      data.tokens = data.tokens.filter(t => t.tokenHash !== h)
      if (data.tokens.length !== before) { persist(); return true }
      return false
    },
  }
}
