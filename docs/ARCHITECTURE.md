# dsh-kit 架构设计

> 更新日期：2026-08-15
> 状态：v1 已全部实现并验证（2026-08-15）

## 1. 定位

dsh-kit 是一个 DSH「傻瓜式插件全家桶」：

- **装一个包，所有功能开箱即用**：`dsh plugin add dsh-kit` 一次带进全部
- **每个功能可单装/单卸**：每个功能是独立子包（bundle），可单独 `add`/`remove`
- **用户可开关**：webui 面板一键启用/停用，状态持久化，重启保留
- **插件商店**：webui 面板浏览/安装/管理全家桶内所有插件
- **可扩展**：第三方插件可通过商店接入（清单 + 元数据）

## 2. 核心机制（来自 dsh 源码调研）

### 2.1 插件 = bundle 层

- 一个 npm 包声明 `dsh.bundle.patch` → `cordis.patch.yml` 即成为一个 bundle 插件
- `dsh plugin add` 时 reconcile 进 profile 的 `dsh.profile.bundles` 层栈（`apps/cli/src/plugin.ts`）
- 加载时按层栈顺序 apply patch：每层按行 `id` 覆盖/插入，**后写的层赢**
- **聚合是原生能力**：`@deepseek-ai/dsh-base` 就是依赖 20+ 子包 + patch insert 它们行的 bundle

### 2.2 开关 = `disabled` 行属性

- loader 启动时跳过 `entry.disabled` 的行（`packages/boot/app-boot/src/index.ts:659`）
- 用户 profile 的 `cordis.patch.yml` 是最后一层，可对任意行写 `disabled: true`

### 2.3 webui 面板 = client 端 Cordis 插件

- client 端插件通过 `ctx.slots` 注入 UI
- 官方模板：`@deepseek-ai/dsh-client-ui-cordis`（CordisPanel：inventory 列表 + 启停按钮）
- 参考 `packages/extensions/ui-cordis/src/client/`（CordisPanel.tsx + inventory.ts）
- **我们实际用的 slot**：功能商店挂 `settings.section`（设置页），lan-auth 设置页也用 `settings.section`；远程会话登出按钮挂 `sidebar.footer.action`

### 2.4 动态装载 = `dynamicCordisRunner`（注意边界）

- `@deepseek-ai/dsh-cordis-host-runner` + `@deepseek-ai/dsh-tool-cordis` 提供运行时 define/run/stop/undefine
- **模型驱动**：session 作用域、vm 沙箱、需审批、**纯进程内存、不持久化**
- 结论：**不适合做用户傻瓜包的开关机制**（商店面板用的是持久化状态文件 + 管理路由，见 §3）

## 3. 架构决策

| 决策点 | 结论 |
|---|---|
| 傻瓜包本体 | 聚合 bundle（`dsh-kit`）+ 管理入口（设置页「功能商店」） |
| 功能粒度 | 每个功能 = 独立 Cordis bundle（可单装） |
| 商店形态 | webui 设置面板（`settings.section` slot） |
| 用户开关机制 | 持久化状态文件 + 进程内 apply（**不用** dynamicCordisRunner 做启停） |
| 面板 UI 投递 | 直接 client 插件 + 管理路由（未用动态 runner 的投递机制） |
| 持久化位置 | dsh-kit 自管理状态文件（不碰用户 cordis.patch.yml） |

## 4. 仓库结构

```
dsh-kit/
├── packages/
│   ├── dsh-kit/                 # 傻瓜包本体 = 聚合 bundle + 管理 CLI
│   │   ├── package.json         #   dsh.bundle.patch + bin: dsh-kit
│   │   ├── cordis.patch.yml     #   insert 自身行（host service）
│   │   ├── bin/dsh-kit.mjs      #   CLI：list / enable / disable
│   │   └── src/
│   │       ├── index.ts         #   host 插件：dshKit.store service + 管理路由
│   │       ├── store.ts         #   功能元数据 + 清单
│   │       ├── state.ts         #   状态文件读写（~/.dsh/dsh-kit/state.json）
│   │       └── client/          #   「功能商店」设置面板
│   ├── dsh-kit-notifier/        # 桌面通知（监听 turn/end，跨平台通知）
│   ├── dsh-kit-scheduler/       # 定时任务（cron + 持久化 + 管理路由）
│   ├── dsh-kit-lan-auth/        # 局域网鉴权网关（HTTPS 反向代理，默认关闭）
│   │   ├── bin/dsh-kit-lan-auth.mjs # CLI：init-ca / status（私有 CA 管理）
│   │   ├── src/index.ts         #   host：起网关 + 管理路由 + browse 注入
│   │   ├── src/gateway.ts       #   HTTPS 代理（本机免登 + token/登录 + 代理标记 + WS 隧道 + 静态放行 + CA/登出端点 + 登录限速）
│   │   ├── src/store.ts         #   用户/token 持久化 + TTL 过期 + 爆破限速 + 登出吊销
│   │   ├── src/cert.ts          #   私有 CA 自动生成（root + leaf，SAN 覆盖本机 IP）+ initPrivateCa
│   │   └── src/client/          #   webui 设置页（token/用户）+ 远程登出按钮
└── docs/
    ├── ARCHITECTURE.md          # 本文档
    └── HANDOFF.md               # 交接文档
```

## 5. 关键流程

### 5.1 安装

```sh
dsh plugin --profile web add -w ~/workspace/dsh-kit/packages/dsh-kit \
    ~/workspace/dsh-kit/packages/dsh-kit-notifier \
    ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
    ~/workspace/dsh-kit/packages/dsh-kit-lan-auth
```

- 聚合包 dsh-kit + 各功能子包一次装入（一条命令带进全家桶）
- pnpm 装入并 reconcile 进 `dsh.profile.bundles`
- dsh-kit apply：读取默认状态，注册 `dshKit.store` 服务

### 5.1.1 关键约束：聚合包不重复 insert 子包行

**实测发现**（dev profile 验证）：cordis loader 在同一层栈的**同一次 update 内拒绝重复 id**（`duplicate loader entry id`）。因此：

- ✅ **子包各自 patch 只 insert 自己**（`- id: dsh-kit-notifier`）
- ✅ **聚合包 dsh-kit 只 insert 自身行**（host + 面板），**不重复 insert 子包行**
- 各子包声明独立 `dsh.bundle.patch`（可单装），聚合包依赖它们（`file:` 或 registry）

**装机命令是一条多参数 add**（见上），四个都进 bundles 栈，patch 各自展开、无重复。

### 5.2 用户开关（CLI / 面板 → 状态文件）

```
用户: dsh-kit disable dsh-kit-notifier      # 或面板点"停用"
  → CLI/面板调 store.setEnabled('dsh-kit-notifier', false)
  → 写状态文件 ~/.dsh/dsh-kit/state.json { "features": { "dsh-kit-notifier": false } }
  → 下次加载（或 HMR 重求值）时生效
```

### 5.3 生效机制：子包 patch 动态 disabled 表达式（已验证）

每个功能子包的 patch 里，行带一个**自包含的 `!!js` 表达式**直接读状态文件：

```yaml
- id: dsh-kit-notifier
  name: dsh-kit-notifier
  disabled: !!js "( (function () { try { var fs = process.getBuiltinModule('fs'); var s = JSON.parse(fs.readFileSync(dshHomePath('dsh-kit/state.json'), 'utf8')); return s.features['dsh-kit-notifier'] === false; } catch (e) { return false; } })() )"
```

- **表达式自包含**：用 `process.getBuiltinModule('fs')`（Node 22+）读文件 + `dshHomePath()`（根 ctx 提供的路径函数）——**不依赖任何 service 加载顺序**，首次 loader pass 即正确。
- 状态文件缺失/损坏 → catch → 返回 false（不禁用，默认启用）。
- **重启后状态保留**：启动时表达式按状态文件求值，决定该行是否加载。

### 5.4 关键机制发现（实测）

1. **`!!js` 求值环境**：`with (ctx) { eval(expr) }`，可访问 `process`、`process.env`、`ctx` 及根 ctx 提供的 service（如 `dshHomePath`）。`require` **不可用**（Eval 无 CJS），`fs` 需经 `process.getBuiltinModule`。
2. **时序坑**：patch `disabled` 首次求值在 dsh-kit 插件 apply **之前**（loader 并行加载），所以表达式**不能依赖** `dshKit.featureState` service（首次返回 undefined → guard 短路 false → 不禁用 → 插件仍 init）。**解法**：表达式自给自足直接读文件。
3. **YAML 引号**：含 `:` 的复杂表达式必须整体用双引号包裹，否则 YAML 误解析为 mapping（dump 里会看到 `{'[object Object]': false)`）。
4. **loader 动态开关（备选）**：`ctx.loader.entries()` + `entry.update({disabled}, false, true)` 可运行时禁用已加载 entry（`_disabled` → `_dispose` 停 fiber），但 init 已发生一次，不如表达式方案干净。

## 6. 商店可扩展性

- 内置清单：`store.ts` 内置 `dsh-kit-*` 全家桶清单（`GET /dsh-kit/store` 返回）
- 面板展示：名称、描述、状态、启停按钮（`POST /dsh-kit/store/{id}`）
- 第三方接入：当前实现为只读内置清单；未做注册表/git URL 动态解析

## 7. 开发架构（热重载 / 多 profile / 热开关）

> 调研结论（来自 dsh 源码 `scripts/dev-web.ts`、`packages/client/hmr`、`apps/cli/src/profile-boot.ts`）。

### 7.1 热重载能力边界

dsh 原生热更新分两层，**对插件代码的边界不同**：

| 层 | 改动内容 | 是否需要重启 |
|---|---|---|
| **patch 层** | `cordis.patch.yml`（插件启停/配置） | ❌ 即时生效（HMR `watchUserPatches`） |
| **client 插件**（webui/面板） | `lib/client.js` 构建产物 | ❌ 自动热更新（SSE `rebuilt` 帧） |
| **host 插件**（服务端逻辑） | `lib/*.js` 模块 | ✅ 需重启（web bundle 禁模块级 HMR） |

### 7.2 client 热更新链路（官方机制，直接复用）

```
pnpm dev（仿 scripts/dev-web.ts）       dsh web（常驻）
┌─────────────────────────┐     ┌──────────────────────────────┐
│ tsdown watch 所有        │     │ client-hmr 插件（500ms 轮询）  │
│ dsh.client.web 包        │ ──► │ stat-poll lib/client.js       │
│ 源码改动 → 自动 rebuild   │     │ → SSE rebuilt 帧             │
└─────────────────────────┘     │ → 浏览器串行换 fiber           │
                                └──────────────────────────────┘
```

- 官方实现：`scripts/dev-web.ts` + `packages/client/hmr`（host 端轮询 + `/plugins/events` SSE + 浏览器端换 fiber）
- 我们的 `pnpm dev`：复制 `dev-web.ts` 逻辑，workspace 只扫 `packages/dsh-kit*`（含聚合包本体），无需改动 dsh 本体

### 7.3 host 插件开发流程

host 逻辑改动少（我们的 host 层很薄）：
```
改 src/host/*.ts → pnpm build → 重启 dsh web
```

### 7.4 多 profile 隔离（推荐）

- 开发用独立 profile：`dsh plugin --profile dev add -w packages/dsh-kit`
- 日常 `web` profile 不受开发影响
- 验证组合/开关完全在 `cordis.patch.yml` 上做，走 HMR 无需重启

### 7.5 开发工具链

- **构建**：tsdown（官方同款），host 产 `lib/index.js`，client 产 `lib/client.js`（closure-factory 形态）
- **热重载**：`pnpm dev` = 官方 `dev-web.ts` 的简化版（只 watch 我们的包）
- **类型**：tsc `--build`（host 产 `lib/types`，供 client 注入）
- **冒烟**：`dsh --profile dev "任务"` 或 `dsh web --dump-config`

### 7.6 日常迭代流程

```sh
# 终端 1：dsh 主程序常驻
dsh web --port 3080

# 终端 2：client UI 热构建（改面板即时生效）
pnpm dev

# 终端 3：改 host 逻辑
pnpm build   # 然后重启 dsh web
```

## 8. 局域网鉴权网关（dsh-kit-lan-auth）

> 状态：已实现并验证（2026-08-15）

### 定位与动机

DSH Web 界面刻意只监听 `127.0.0.1`，特权方法（settings/credentials/llm.discoverModels）锁 loopback——上游明确等到「真正的鉴权层」才放开。`dsh-kit-lan-auth` 不修改 `dsh-client-connection`，而是在边界加一层**HTTPS 反向代理网关**，作为唯一暴露到局域网的入口。

```
局域网设备 ──HTTPS──▶ [网关 :3443 TLS] ──验 token/登录──▶ 本机 DSH web (loopback)
```

### 证书（零配置，私有 CA 方案）

- **首启自动生成私有 CA**：`cert.ts` 的 `ensureCertBundle` 在空目录时调用 `initPrivateCa`，生成根证书 `ca.pem` + 叶子 `key.pem`/`cert.pem`（SAN 自动收集本机全部局域网 IPv4 + `127.0.0.1` + `localhost`）。已有证书则原样使用、绝不覆盖。
- **登录页 CA 引导（.crt）**：首次访问（浏览器点「继续访问」进入登录页后），页面检测 `hasCa` → 显示「下载根证书永久免警告」引导，提供 `.crt` 下载（MIME `application/x-x509-ca-cert`，Windows 双击即进证书导入向导）与 macOS/iOS/Android/Windows 安装指引。设备装一次根证书后**永久免警告**；不装也能用（每会话点一次「继续访问」）。
- **CLI**：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`（可查看 SAN/有效期/issuer，`status` 需已有证书）。
- **Chrome「不安全」图标说明**：私有 CA（IP 直连）站点 Chrome 永远在地址栏显示「不安全」（即使证书被完全信任）——这是 Chrome 对非公共 CA 的固有提示，连接本身已加密且受信任，不影响安全，无法（也不需要）消除。

### 关键决策

| 决策 | 值 |
|---|---|
| 形态 | 独立 HTTPS 反向代理网关（不改 client-connection / webServer） |
| TLS | 首启自动生成私有 CA（root `ca.pem` + 叶子，`~/.dsh/dsh-kit-lan-auth/certs/`）；已有证书则用 verbatim；登录页提供 `.crt` 下载引导 |
| 本机 | loopback 免登录直通 |
| 局域网 | 需有效 token（`Authorization: Bearer` 或 `X-DSH-Token`）或账号密码登录 |
| 权限 | 全放行（网关后一切方法可达，含特权——因网关转发走 loopback，DSH 视为 loopback 信任） |
| 管理 | **仅本机**：用户/token 管理路由在 loopback DSH 上，LAN 请求（带代理标记头）一律 403 |
| 默认 | **关闭**（安全优先）：patch `disabled` 表达式要求 `features["dsh-kit-lan-auth"] === true` 才加载 |

### 认证与安全（已加固，2026-08-15）

- **token 过期**：静态 token（管理创建）30 天绝对过期；会话 token（密码登录 `session:*`）12 小时滑动过期（每次使用续期）；`checkToken` 每次先清过期 token（`purgeExpired`）。存量旧 token 在 `load()` 自动回填 `expiresAt`（静态 30 天 / 会话 12 小时）。
- **登录爆破限速**：每身份（用户名；未知用户名按来源 IP）15 分钟内 >5 次失败即锁定（进程内存态），锁定后即使密码正确也拒绝，登录页提示「尝试次数过多，请 15 分钟后再试」；成功登录自动重置。
- **登出=吊销**：`/__dsh_kit_lan_logout` 撤销会话 token（`revokeToken`）+ 清除 cookie（`Max-Age=0`）。前端登出按钮仅在远程（非 loopback）会话显示，且只有网关确认成功（200）才跳转，避免旧网关 405 时「假登出→cookie 未清→自动登录」。
- **安全模型（实测）**：LAN 无 token → 401；LAN 带 token 访问管理路由 → 403（`x-dsh-kit-lan-auth-proxy` 标记头）；本机管理 → 200。管理面仅本机的设计由来见 §8 下方自我批评修正。

### 安全模型（已实测验证）

- **LAN 无 token** → 401（网关层拦截）
- **LAN 有 token 访问管理路由** → 403（`x-dsh-kit-lan-auth-proxy` 标记头，管理仅本机）
- **本机管理** → 200（直连 loopback DSH）
- 自我批评修正：v1 曾把 `/dsh-kit-lan-auth/*` 无鉴权转发，导致 LAN 可达管理面——已改为整体鉴权 + 本地标记头隔离。

### 用户开关（默认关）

```sh
dsh-kit enable dsh-kit-lan-auth     # 写 state.json → 重启后网关加载
dsh-kit disable dsh-kit-lan-auth    # 恢复默认关
```

token 通过 webui 设置页（settings.section「局域网鉴权」）或本机管理员路由 `/dsh-kit-lan-auth/tokens` 生成；token 明文只在生成时显示一次，存储为 sha256。

## 9. 桌面通知（dsh-kit-notifier）

- 监听 `ctx.on('session/event')`，匹配 `turn/end`（回合结束）；按 `event.data.reason.kind` 区分 completed / error / aborted / blocked / max-tokens
- 通知走平台原生工具、零 npm 依赖：macOS `osascript` / Linux `notify-send` / Windows PowerShell `Windows.UI.Notifications`
- 类型依赖：`@deepseek-ai/dsh-session`（devDep，仅取 `SessionEvent` 类型）

## 10. 定时任务（dsh-kit-scheduler）

- 用户级 cron（5 字段：分 时 日 月 周），`*` / 范围 / 步进 / 列表
- 持久化：`~/.dsh/dsh-kit-scheduler/tasks.json`（重启保留）
- 管理路由：`GET/POST /dsh-kit-scheduler/tasks`，`PATCH/DELETE /dsh-kit-scheduler/tasks/:id`
- 调度：每秒 tick 检查到期任务（含分钟级防重复触发护栏）；任务命令走 `/bin/sh -c`（支持管道/变量）

## 11. 参考

- dsh 源码：`refs/deepseek-harness/`（apps/cli/src/plugin.ts、packages/boot/app-boot、packages/extensions/ui-cordis、packages/extensions/cordis-host-runner）
