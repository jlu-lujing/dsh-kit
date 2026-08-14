/** Self-signed TLS certificate generation for the dsh-kit-lan-auth gateway. */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface CertBundle {
  key: string
  cert: string
}

/**
 * Ensure a self-signed key/cert pair exists under `dir` and return them.
 * Generated once via the local `openssl` binary (zero extra npm deps).
 * @throws when openssl is unavailable or generation fails.
 */
export function ensureSelfSignedCert(dir: string): CertBundle {
  mkdirSync(dir, { recursive: true })
  const keyPath = path.join(dir, 'key.pem')
  const certPath = path.join(dir, 'cert.pem')
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') }
  }

  const cn = 'dsh-kit-lan-auth'
  const tmpKey = keyPath + '.tmp'
  const tmpCsr = path.join(dir, 'csr.pem.tmp')
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
    '-keyout', tmpKey, '-out', certPath,
    '-days', '825', '-subj', `/CN=${cn}`, '-addext', 'subjectAltName=IP:0.0.0.0,DNS:localhost'])
  writeFileSync(keyPath, readFileSync(tmpKey, 'utf8'))
  try { execFileSync('rm', ['-f', tmpKey, tmpCsr]) } catch { /* best-effort cleanup */ }
  return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') }
}
