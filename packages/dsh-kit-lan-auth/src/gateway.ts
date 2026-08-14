/** HTTPS reverse-proxy gateway: loopback bypass + LAN token/login check. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { connect as tcpConnect } from 'node:net'
import { URL } from 'node:url'
import type { AddressInfo } from 'node:net'

import type { Store } from './store.ts'

export interface GatewayOptions {
  /** Loopback target of the DSH web server (http). */
  target: string
  /** TLS key/cert. */
  tls: { key: string; cert: string }
  /** Bind host of the gateway (all-interfaces), default 0.0.0.0. */
  host?: string
  /** Bind port (0 → OS-assigned). Returned via the `listening` callback. */
  port?: number
  store: Store
}

export interface GatewayHandle {
  close(): Promise<void>
  /** The bound port once listening. */
  port(): number | undefined
}

/** Whether a request arrived from loopback (no auth required). */
export function isLoopback(req: IncomingMessage): boolean {
  const addr = (req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '')
  return addr === '127.0.0.1' || addr === '::1' || addr === 'localhost'
}

const COOKIE_NAME = 'dsh_kit_lan_auth'

/** Extract the bearer token from Authorization / X-Token headers. */
export function bearerToken(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization
  if (auth) {
    const m = /^Bearer\s+([^\s]+)$/i.exec(auth)
    if (m) return m[1]
  }
  const xt = req.headers['x-dsh-token']
  if (typeof xt === 'string' && xt.trim()) return xt.trim()
  // session cookie
  const cookie = req.headers.cookie
  if (typeof cookie === 'string') {
    for (const part of cookie.split(';')) {
      const [k, ...rest] = part.trim().split('=')
      if (k === COOKIE_NAME && rest.length) return rest.join('=').trim()
    }
  }
  return undefined
}

/** Whether the client prefers an HTML page (browser) over JSON (API). */
function wantsHtml(req: IncomingMessage): boolean {
  return typeof req.headers.accept === 'string' && req.headers.accept.includes('text/html')
}

const LOGIN_PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>dsh-lan-auth · 登录</title>
<script>
/* Resolve the DSH web default of "system": set the same theme attribute the
   host app toggles on <body>, here on <html> before first paint (no flash).
   Light users keep light, dark users get dark. */
try {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-ds-dark-theme', '')
  }
} catch (e) { /* system media query unavailable — stay light */ }
</script>
<style>
/* Match the DeepSeek Harness design platform (design-platform.css):
   --dsw-static-deepseek-* blue accents, neutral-bluish surfaces,
   --dsw-specific-login-input input fill, 10px control radius, SF-style
   system font stack, dark theme via [data-ds-dark-theme]. */
:root{color-scheme:light dark}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;
  color:#15171f; /* neutral-bluish-1000 */
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  background:
    radial-gradient(900px 480px at 12% -8%, rgba(86,134,254,.13), transparent 60%),
    radial-gradient(760px 420px at 105% 112%, rgba(65,118,230,.10), transparent 55%),
    radial-gradient(420px 260px at 88% -4%, rgba(86,134,254,.07), transparent 60%),
    #fbfbfb;
}
[data-ds-dark-theme] body{
  color:#e9eaee; /* neutral-bluish-50 */
  background:
    radial-gradient(900px 480px at 12% -8%, rgba(86,134,254,.14), transparent 60%),
    radial-gradient(760px 420px at 105% 112%, rgba(65,118,230,.12), transparent 55%),
    radial-gradient(420px 260px at 88% -4%, rgba(86,134,254,.09), transparent 60%),
    #19191b; /* neutral-bluish-950 */
}
.wrap{width:min(384px,100%)}
/* ── brand mark + wordmark ─────────────────────────────────────────── */
.brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:26px}
.brand svg{width:26px;height:26px;flex:none}
.brand svg path{fill:currentColor}
.brand-name{font-size:16px;font-weight:600;letter-spacing:-.01em;color:#15171f}
[data-ds-dark-theme] .brand-name{color:#e9eaee}
/* ── card ──────────────────────────────────────────────────────────── */
.card{
  padding:30px 28px 26px;border-radius:16px;
  background:#ffffff;
  border:1px solid rgba(0,0,0,.08);
  box-shadow:0 18px 44px -18px rgba(15,17,21,.18), 0 2px 8px rgba(15,17,21,.04);
}
[data-ds-dark-theme] .card{
  background:rgb(35,35,36); /* neutral-bluish-875 */
  border-color:rgba(255,255,255,.08);
  box-shadow:0 22px 52px -20px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.04);
}
.badge{
  display:inline-flex;align-items:center;gap:8px;
  font-size:11px;font-weight:600;letter-spacing:.05em;color:#5a6378;
  border:1px solid rgba(0,0,0,.09);border-radius:999px;padding:4px 10px;margin-bottom:16px;
}
[data-ds-dark-theme] .badge{color:#9aa2b5;border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.03)}
.badge::before{content:"";width:6px;height:6px;border-radius:50%;background:#4176e6;box-shadow:0 0 0 3px rgba(65,118,230,.16)}
h1{font-size:21px;font-weight:600;margin:0 0 6px;letter-spacing:-.01em}
p.sub{font-size:13px;line-height:1.55;color:#707683;margin:0 0 22px}
[data-ds-dark-theme] p.sub{color:#a0a6b3}
/* ── mode tabs (DeepSeek blue active pill) ─────────────────────────── */
.tab{display:flex;background:#f4f5f7;border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:3px;margin-bottom:20px}
[data-ds-dark-theme] .tab{background:#27272a;border-color:rgba(255,255,255,.07)}
.tab button{
  flex:1;padding:8px 10px;border:0;border-radius:8px;background:transparent;
  color:#5f6574;font-size:13px;font-weight:500;cursor:pointer;transition:all .16s var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1));
}
[data-ds-dark-theme] .tab button{color:#a0a6b3}
.tab button.on{background:#ffffff;color:#4176e6;box-shadow:0 1px 3px rgba(15,17,21,.12), inset 0 0 0 1px rgba(0,0,0,.05)}
[data-ds-dark-theme] .tab button.on{background:#313136;color:#8fb7ff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
/* ── fields ────────────────────────────────────────────────────────── */
.field{display:none}
.field.show{display:block}
label{display:block;font-size:12.5px;font-weight:500;color:#454b58;margin:0 0 6px}
[data-ds-dark-theme] label{color:#a0a6b3}
input{
  width:100%;padding:10px 12px;border-radius:10px;
  border:1px solid rgba(0,0,0,.12);background:#fafafa; /* --dsw-specific-login-input */
  color:inherit;font-size:14px;font-family:inherit;outline:none;
  transition:border-color .16s var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1)), box-shadow .16s var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1));
}
[data-ds-dark-theme] input{border-color:rgba(255,255,255,.14);background:rgb(27,27,28)}
input:focus{border-color:#4176e6;box-shadow:0 0 0 3px rgba(65,118,230,.16)}
[data-ds-dark-theme] input:focus{border-color:#5686fe;box-shadow:0 0 0 3px rgba(86,134,254,.2)}
input::placeholder{color:#9aa0ac}
[data-ds-dark-theme] input::placeholder{color:#6c727e}
.field-gap{margin-bottom:14px}
.pw{position:relative}
.pw input{padding-right:52px}
.pw .toggle{
  position:absolute;right:8px;bottom:8px;transform:none;
  background:none;border:0;color:#7a8090;cursor:pointer;font-size:12px;font-weight:500;padding:4px 6px;border-radius:6px;
}
.pw .toggle:hover{color:#4176e6;background:rgba(65,118,230,.08)}
[data-ds-dark-theme] .pw .toggle:hover{color:#8fb7ff;background:rgba(86,134,254,.14)}
/* ── submit ────────────────────────────────────────────────────────── */
button.submit{
  margin-top:4px;width:100%;padding:11px 12px;border-radius:10px;border:0;
  background:#4176e6;color:#fff;font-family:inherit;font-size:14.5px;font-weight:600;letter-spacing:.01em;cursor:pointer;
  transition:background .16s var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1)), box-shadow .16s, transform .06s;
}
button.submit:hover{background:#5692ef;box-shadow:0 4px 14px -6px rgba(65,118,230,.55)}
button.submit:active{transform:translateY(1px)}
button.submit:disabled{opacity:.6;cursor:not-allowed;box-shadow:none}
[data-ds-dark-theme] button.submit{background:#5686fe}
[data-ds-dark-theme] button.submit:hover{background:#6d9aff;box-shadow:0 4px 16px -6px rgba(86,134,254,.5)}
.hint{font-size:12px;color:#8288a0;margin-top:16px;text-align:center}
[data-ds-dark-theme] .hint{color:#7f8593}
.err{
  display:none;color:rgb(216,64,64);font-size:12.5px;margin-top:14px;padding:10px 12px;border-radius:8px;
  background:rgba(224,68,68,.08);border:1px solid rgba(224,68,68,.22);
}
.err.show{display:block}
[data-ds-dark-theme] .err{color:#ff7a7a;background:rgba(242,90,90,.1);border-color:rgba(242,90,90,.28)}
/* ── loading ───────────────────────────────────────────────────────── */
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:spin .65s linear infinite;vertical-align:-2px;margin-right:8px}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms !important;transition-duration:.01ms !important}}
@media (max-width:420px){body{padding:16px}.card{padding:24px 20px 22px}}
</style></head><body>
<div class="wrap">
<div class="brand">
<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z"/></svg>
<span class="brand-name">DeepSeek Harness</span>
</div>
<div class="card">
<div class="badge">dsh-lan-auth · 安全入口</div>
<h1>访问受限</h1>
<p class="sub">此 DeepSeek Harness 实例需要授权后才能从网络访问</p>
<div class="tab">
<button type="button" class="tab-token __MODE_TOKEN__" data-mode="token">访问 Token</button>
<button type="button" class="tab-login __MODE_LOGIN__" data-mode="login">账号密码</button>
</div>
<form method="post" action="/__dsh_kit_lan_login" autocomplete="on">
<div class="field field-token __TOKEN_SHOW__"><label for="token">访问 Token</label><input id="token" name="token" autocomplete="off" placeholder="粘贴访问 Token"></div>
<div class="field field-login __LOGIN_SHOW__">
<div class="field-gap"><label for="u">用户名</label><input id="u" name="username" autocomplete="username" placeholder="用户名"></div>
<div class="pw"><label for="p">密码</label><input id="p" name="password" type="password" autocomplete="current-password" placeholder="密码"><button type="button" class="toggle" data-target="p">显示</button></div>
</div>
<button type="submit" class="submit" id="submitBtn"><span class="btn-label">登录</span></button>
<div class="err" id="err">__ERR__</div>
</form>
<div class="hint">登录后浏览器将记住本次会话</div>
</div>
</div>
<script>
(function(){
  // Honor the server-rendered default tab (?mode=login). The template stamps
  // the active tab with an 'on' class before hydration; read it so the client
  // script does not fight the server's choice back to the token tab.
  var mode = 'token';
  try { if (document.querySelector('.tab-login').classList.contains('on')) mode = 'login'; } catch (e) {}
  function apply(){
    document.querySelector('.field-token').classList.toggle('show', mode==='token');
    document.querySelector('.field-login').classList.toggle('show', mode==='login');
    document.querySelector('.tab-token').classList.toggle('on', mode==='token');
    document.querySelector('.tab-login').classList.toggle('on', mode==='login');
  }
  document.querySelector('.tab-token').addEventListener('click', function(){ mode='token'; apply(); });
  document.querySelector('.tab-login').addEventListener('click', function(){ mode='login'; apply(); try{document.getElementById('u').focus()}catch(e){} });
  var t = document.querySelector('.toggle');
  if(t){ t.addEventListener('click', function(){
    var p = document.getElementById('p');
    var show = p.type==='password';
    p.type = show ? 'text' : 'password';
    t.textContent = show ? '隐藏' : '显示';
  }); }
  function focusFirst(){ try{ if(mode==='token') document.getElementById('token').focus(); else document.getElementById('u').focus(); }catch(e){} }
  var form = document.querySelector('form');
  form.addEventListener('submit', function(){
    document.getElementById('submitBtn').disabled = true;
    document.querySelector('.btn-label').innerHTML = '<span class="spin"></span>正在验证…';
  });
  apply(); focusFirst();
})();
</script>
</body></html>`

function loginPage(params: { displayLogin: boolean; err?: string; mode?: string }): string {
  const err = params.err ?? ''
  return LOGIN_PAGE
    .replaceAll('__MODE_TOKEN__', params.mode === 'login' ? '' : 'on')
    .replaceAll('__MODE_LOGIN__', params.mode === 'login' ? 'on' : '')
    .replace('__TOKEN_SHOW__', params.mode === 'login' ? '' : 'show')
    .replace('__LOGIN_SHOW__', params.mode === 'login' ? 'show' : '')
    .replace('__ERR__', err)
    .replace('class="err"', err ? 'class="err show"' : 'class="err"')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`)
}

/** Whether a request passes the gateway auth fence. */
export function isAuthorized(req: IncomingMessage, store: Store): boolean {
  if (isLoopback(req)) return true
  const token = bearerToken(req)
  return token !== undefined && store.checkToken(token)
}

/**
 * Build the outbound headers the gateway sends to the loopback DSH server.
 *
 * All forwarded requests are re-stamped with the loopback target's `Host`
 * (DSH's /api trust fence compares the request authority against loopback).
 * LAN-originated requests additionally drop every browser-context marker
 * header — `origin`, `sec-fetch-*`, `referer`, `referrer-policy` — so DSH
 * does not run its same-origin fence (which would fail: a browser loading
 * from the gateway's LAN origin sends an `Origin` for `https://<lan>:3443`
 * that cannot match the rewritten `Host: 127.0.0.1:3080`). Treating the
 * gateway as the one trusted authentication boundary makes every proxied
 * request arrive at DSH as a clean loopback caller (whole-plane access,
 * mirroring how the management plane on the DSH server itself is reached).
 * The `x-dsh-kit-lan-auth-proxy` sticker marks LAN-derived traffic so the
 * gateway's own management routes can refuse it.
 */
function outboundHeaders(
  req: IncomingMessage,
  viaLan: boolean,
  target: URL,
): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {
    ...req.headers,
    host: `${target.hostname}:${Number(target.port || 80)}`,
  }
  if (viaLan) {
    delete headers.origin
    delete headers['sec-fetch-site']
    delete headers['sec-fetch-mode']
    delete headers['sec-fetch-dest']
    delete headers['sec-fetch-user']
    delete headers.referer
    delete headers['referrer-policy']
    headers['x-dsh-kit-lan-auth-proxy'] = '1'
  }
  return headers
}

export function startGateway(opts: GatewayOptions): GatewayHandle {
  const { store, tls } = opts
  const target = new URL(opts.target)
  const targetHostname = target.hostname
  const targetPort = Number(target.port || 80)
  let boundPort: number | undefined

  const forward = (req: IncomingMessage, res: ServerResponse, viaLan: boolean): void => {
    const out = httpRequest({
      host: targetHostname,
      port: targetPort,
      method: req.method,
      path: req.url,
      headers: outboundHeaders(req, viaLan, target),
    })
    out.on('response', (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers)
      upRes.pipe(res)
    })
    out.on('error', (err) => {
      if (!res.headersSent) res.writeHead(502)
      res.end(String(err?.message ?? err))
    })
    req.pipe(out)
  }

  const handle = (req: IncomingMessage, res: ServerResponse): void => {
    // Loopback requests are already trusted by DSH; we mirror the same rule
    // and forward them without a marker.
    if (isLoopback(req)) return forward(req, res, false)

    const pathname = (req.url ?? '/').split('?')[0]
    const tokenIn = bearerToken(req)

    // Internal login endpoint lives on the gateway itself (not proxied).
    if (pathname === '/__dsh_kit_lan_login') {
      void handleLogin(req, res)
      return
    }

    if (tokenIn && store.checkToken(tokenIn)) {
      return forward(req, res, true)
    }

    // Not authorized. Browsers get a login page; API clients get JSON 401.
    if (wantsHtml(req)) {
      const mode = (req.url?.split('?')[1] ?? '').includes('mode=login') ? 'login' : 'token'
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(loginPage({ displayLogin: mode === 'login', mode }))
      return
    }
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'unauthorized', message: 'missing or invalid token' }))
  }

  const handleLogin = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const body = await readBody(req)
    let token: string | undefined
    try {
      const parsed = JSON.parse(body) as { token?: string; username?: string; password?: string }
      if (parsed.token && store.checkToken(parsed.token)) {
        token = parsed.token
      } else if (parsed.username && parsed.password) {
        token = store.loginToken(parsed.username, parsed.password)
      }
    } catch {
      // fall through — parsed as web form below
    }
    if (token === undefined) {
      // try as a URL-encoded form (browser <form> post)
      const params = new URLSearchParams(body)
      if (params.get('token') && store.checkToken(params.get('token') ?? '')) {
        token = params.get('token') as string
      } else if (params.get('username') && params.get('password')) {
        token = store.loginToken(params.get('username') as string, params.get('password') as string)
      }
    }
    if (token === undefined) {
      // Form login failure: render the login page with the error inline.
      // Return 200 (not 401) so the browser keeps the page and just shows the
      // message — a 401 would surface as a network error in the console and
      // drop the form view. Programmatic (non-HTML) callers still get 401.
      const html = wantsHtml(req)
      const params = new URLSearchParams(body)
      const mode = (params.get('username') && params.get('password')) ? 'login' : 'token'
      res.writeHead(html ? 200 : 401, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(loginPage({ displayLogin: mode === 'login', mode, err: html ? 'token 无效或账号密码错误' : 'unauthorized' }))
      return
    }
    setSessionCookie(res, token)
    res.writeHead(302, { Location: '/' })
    res.end()
  }

  const server = createHttpsServer({ key: tls.key, cert: tls.cert }, handle)
  server.on('upgrade', (req, socket, head) => {
    const viaLan = !isLoopback(req)
    const token = bearerToken(req)
    if (viaLan && (token === undefined || !store.checkToken(token))) {
      socket.end()
      return
    }
    // A raw TCP tunnel to the loopback DSH server: DSH hands its WebSocket
    // handler the upgrade socket itself (WebUpgradeRoute), so we must relay
    // the exact HTTP upgrade bytes — request line, our re-stamped headers
    // (markers stripped when LAN-originated, Host rewritten, proxy sticker
    // added) — plus any `head` bytes already read past the headers, then
    // splice the two sockets. Using httpRequest here broke the handshake:
    // its upgrade path cannot hand the client socket back to the handler.
    const out = tcpConnect(targetPort, targetHostname)
    out.once('connect', () => {
      out.write(`${req.method} ${req.url} HTTP/1.1\r\n`)
      for (const [name, value] of Object.entries(outboundHeaders(req, viaLan, target))) {
        if (value === undefined) continue
        for (const v of Array.isArray(value) ? value : [value]) out.write(`${name}: ${v}\r\n`)
      }
      out.write('\r\n')
      if (head !== undefined && head.length > 0) out.write(head)
      socket.pipe(out)
    })
    out.pipe(socket)
    out.once('error', () => socket.destroy())
    socket.once('error', () => out.destroy())
  })

  server.listen({ host: opts.host ?? '0.0.0.0', port: opts.port ?? 0 }, () => {
    boundPort = (server.address() as AddressInfo).port
  })

  return {
    close: () => new Promise((resolve) => server.close(() => resolve())),
    port: () => boundPort,
  }
}
