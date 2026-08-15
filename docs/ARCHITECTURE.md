# dsh-kit 架构设计

> 更新日期：2026-08-16
> 状态：v0.2.0 已全部实现并验证

## 1. 定位

dsh-kit 是一个 DSH「傻瓜式插件全家桶」：

- **装一个包，所有功能开箱即用**：`dsh plugin add dsh-kit` 一次带进全部；
- **每个功能可独立开关/装卸**：功能包是 dsh-kit 的 npm 依赖 + 由 dsh-kit 聚合 patch 挂载的行，开关经状态文件（CLI / 设置面板），重启保留；
- **内置能力**：满血模式 preset、GitHub 生态目录、归档会话管理等随 dsh-kit 打包，不占独立包；
- **双产品线**：npm 插件包 + 桌面客户端（Electron + 内置 dsh-runtime，共用同一套全家桶逻辑）。

## 2. 核心机制（来自 dsh 源码调研）

### 2.1 插件 = bundle 层

- 一个 npm 包声明 `dsh.bundle.patch` → `cordis.patch.yml` 即成为一个 bundle 插件；
- `dsh plugin add` 时 reconcile 进 profile 的 `dsh.profile.bundles` 层栈（`apps/cli/src/plugin.ts`）；
- 加载时按层栈顺序 apply patch：每层按行 `id` 覆盖/插入，**后写的层赢**；
- **聚合是原生能力**：`@deepseek-ai/dsh-base` 就是依赖 20+ 子包 + patch insert 它们行的 bundle。

### 2.2 开关 = `disabled` 行属性

- loader 启动时跳过 `entry.disabled` 的行（`packages/boot/app-boot/src/index.ts:659`）；
- 用户 profile 的 `cordis.patch.yml` 是最后一层，可对任意行写 `disabled: true`。

### 2.3 webui 面板 = client 端 Cordis 插件

- client 端插件通过 `ctx.slots` 注入 UI；
- **我们使用的 slot**：
  - `settings.section`：功能商店、归档会话、局域网鉴权；
  - `sidebar.footer.action`：远程会话登出按钮；
  - `conversation.composer.dock`：输入历史提示条。

### 2.4 动态装载 = `dynamicCordisRunner`（注意边界）

- `@deepseek-ai/dsh-cordis-host-runner` + `@deepseek-ai/dsh-tool-cordis` 提供运行时 define/run/stop/undefine；
- **模型驱动**：session 作用域、vm 沙箱、需审批、纯进程内存、不持久化；
- 结论：**不适合做用户傻瓜包的开关机制**（商店用的是持久化状态文件 + 管理路由，见 §5）。

## 3. 架构决策

| 决策点 | 结论 |
|---|---|
| 傻瓜包本体 | 聚合 bundle（`dsh-kit`）+ 管理入口（设置页「功能商店」） |
| 功能粒度 | 4 个功能包 = dsh-kit 依赖 + dsh-kit 聚合 patch 持有的行（非独立 bundle） |
| 内置能力粒度 | preset / 生态目录 / 归档 等随 dsh-kit 内置，不走 loader 行 |
| 商店形态 | webui 设置面板（`settings.section` slot） |
| 用户开关机制 | 持久化状态文件 + 动态 `disabled` 表达式（**不用** dynamicCordisRunner 做启停） |
| 面板 UI 投递 | 直接 client 插件 + 管理路由（未用动态 runner 的投递机制） |
| 持久化位置 | dsh-kit 自管理状态文件（`~/.dsh/dsh-kit/state.json`，不碰用户 cordis.patch.yml） |
| 桌面端 | Electron 壳 + 内置 dsh-runtime 独立子模块（见 `docs/DESKTOP.md`） |

## 4. 仓库结构

```
dsh-kit/
├── packages/
│   ├── dsh-kit/                 # 傻瓜包本体 = 聚合 bundle + 管理 CLI + 内置能力
│   │   ├── package.json         #   dsh.bundle.patch + 4 个功能包 dependencies + bin: dsh-kit
│   │   ├── cordis.patch.yml     #   insert 全部 5 行（自身 + 4 功能）+ directory-picker 禁用
│   │   ├── bin/dsh-kit.mjs      #   CLI：list / enable / disable / install
│   │   ├── preset/              #   内置满血模式 preset（agent.cordis.yml + 各 .mjs + preset.yml）
│   │   ├── ecosystem-fallback.json # GitHub 生态目录内置快照（网络失败/无缓存时回退）
│   │   └── src/
│   │       ├── index.ts         #   host 插件：dshKit.store 服务 + 管理路由 + preset 自动导入
│   │       ├── preset.ts        #   自研 preset 导入/删除管理器（幂等、非破坏性）
│   │       ├── ecosystem.ts     #   GitHub `topic:dsh-plugin` 目录（分片抓取 + 缓存 + 回退）
│   │       ├── archive.ts       #   归档会话恢复/删除（读写 workspace.json）
│   │       ├── store.ts         #   功能元数据 + 清单
│   │       ├── state.ts         #   状态文件读写（~/.dsh/dsh-kit/state.json）
│   │       └── client/          #   「功能商店」+「归档会话」设置面板
│   ├── dsh-kit-notifier/        # 桌面通知——纯库，行由 dsh-kit 挂载
│   ├── dsh-kit-scheduler/       # 定时任务——纯库，行由 dsh-kit 挂载
│   ├── dsh-kit-lan-auth/        # 局域网鉴权网关——纯库 + dsh.client，行由 dsh-kit 挂载
│   │   ├── bin/dsh-kit-lan-auth.mjs # CLI：init-ca / status
│   │   └── src/                 #   index/gateway/store/cert + src/client（设置页 + 登出按钮）
│   └── dsh-kit-input-history/   # 输入历史——纯 client surface，行由 dsh-kit 挂载
├── apps/
│   ├── dsh-runtime/             # 内置 dsh 独立运行时子模块（详见 docs/DESKTOP.md）
│   └── desktop/                 # Electron 壳（托盘/自启/更新/错误页 + 首启自动装全家桶）
├── scripts/
│   ├── dev.ts                   # 统一 dev 编排：client watch + host tsc watch
│   ├── dev-web.ts               # client bundle watch（tsdown）
│   ├── dev-host-watch.ts        # host `tsc -b --watch`（4 包并行）
│   └── build-client-once.mjs    # 一次性产出所有 lib/client.js
├── .github/workflows/           # ci.yml（build/typecheck/test）+ release.yml（npm 发布）
└── docs/
    ├── ARCHITECTURE.md          # 本文档
    ├── HANDOFF.md               # 交接文档
    └── DESKTOP.md               # 桌面客户端设计
```

## 5. 关键流程

### 5.1 安装

```sh
# 发布后：装 dsh-kit 一个包 = 全家桶（它声明 4 个功能包为依赖，聚合 patch 挂载全部 5 行）
dsh plugin --profile web add -w dsh-kit

# 本地源码（link: 不解析依赖）：5 包一起 link 进 dev profile
dsh plugin --profile web add -w \
    ~/workspace/dsh-kit/packages/dsh-kit \
    ~/workspace/dsh-kit/packages/dsh-kit-notifier \
    ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
    ~/workspace/dsh-kit/packages/dsh-kit-lan-auth \
    ~/workspace/dsh-kit/packages/dsh-kit-input-history
```

- 发布版 `pnpm add dsh-kit` → pnpm 把 4 个功能包作为传递依赖 hoist 进 profile **顶层** node_modules（已验证：`nodeLinker: hoisted` 下从 profile 根可 `require.resolve`）→ reconcile 只看到直接依赖 `dsh-kit`（已是 layer）→ 层栈稳定为 `[dsh-base, dsh-kit]`。
- 满血模式 preset / 生态目录 / 归档由 dsh-kit 内置分发，无需额外包。
- dsh-kit apply：读取默认状态，注册 `dshKit.store` 服务；若「满血模式」启用且未导入，自动把内置 preset 导入到 `~/.dsh/.agent-presets/anchored-standard`。

### 5.2 行的唯一归属（聚合包持有全部行）

**实测发现**：cordis loader 在**同一次 update 内拒绝重复 id**（`duplicate loader entry id`，`vendor/loader/src/config/group.ts:64`）。

- ✅ **聚合包 dsh-kit 的 patch insert 全部 5 行**（自身 + notifier + scheduler + lan-auth + input-history），每行带动态 `disabled` 表达式；
- ✅ **4 个功能包不再声明 `dsh.bundle`**（改为纯库，仅提供 host/client 代码，行由 dsh-kit 挂载）——彻底避免重复 id；
- lan-auth / input-history 的 client 面板仍正常：`dsh.client` 注入只要求 loader 里有对应 name 且未 disabled 的 entry，与「该包是否是 bundle」无关。

> 代价（已接受）：功能包不再可**单独**作为 bundle add/remove；想移除某个功能用 `dsh-kit disable <feature>`（行 disabled），保留物理安装（方便随时恢复）。

### 5.3 用户开关（CLI / 面板 → 状态文件）

```
用户: dsh-kit disable dsh-kit-notifier      # 或面板点"停用"
  → CLI/面板调 store.setEnabled('dsh-kit-notifier', false)
  → 写状态文件 ~/.dsh/dsh-kit/state.json { "features": { "dsh-kit-notifier": false } }
  → 下次加载（或 HMR 重求值）时生效
```

### 5.4 生效机制：聚合 patch 动态 disabled 表达式（已验证）

每个功能行由 dsh-kit 聚合 patch 声明，行带一个**自包含的 `!!js` 表达式**直接读状态文件：

```yaml
- id: dsh-kit-notifier
  name: dsh-kit-notifier
  disabled: !!js "( (function () { try { var mod = process.getBuiltinModule('module'); var req = mod.createRequire((typeof ctx !== 'undefined' && ctx.baseUrl) ? ctx.baseUrl : process.cwd() + '/'); req.resolve('dsh-kit-notifier'); } catch (e) { return true; } try { var fs = process.getBuiltinModule('fs'); var s = JSON.parse(fs.readFileSync(dshHomePath('dsh-kit/state.json'), 'utf8')); return s.features['dsh-kit-notifier'] === false; } catch (e) { return false; } })() )"
```

- **表达式自包含**：用 `process.getBuiltinModule('fs')`（Node 22+）读文件 + `dshHomePath()`（根 ctx 提供的路径函数）——**不依赖任何 service 加载顺序**，首次 loader pass 即正确。
- **双条件**：
  1. 状态开关（`dsh-kit disable X` / 商店面板停用）；
  2. **可解析性守卫**：功能包未安装（如只装了 dsh-kit 但依赖未解析）→ 行 disabled，裸装 boot 干净；商店「一键安装」补齐。
- 状态文件缺失/损坏 → catch → 默认不禁用（默认启用）。
- **重启后状态保留**：启动时表达式按状态文件求值，决定该行是否加载。

### 5.5 关键机制发现（实测）

1. **`!!js` 求值环境**：`with (ctx) { eval(expr) }`，可访问 `process`、`process.env`、`ctx` 及根 ctx 提供的 service（如 `dshHomePath`）。`require` **不可用**（Eval 无 CJS），`fs` 需经 `process.getBuiltinModule`。
2. **时序坑**：patch `disabled` 首次求值在 dsh-kit 插件 apply **之前**（loader 并行加载），表达式**不能依赖** `dshKit.featureState` service。解法：表达式自给自足直接读文件。
3. **YAML 引号**：含 `:` 的复杂表达式必须整体用双引号包裹，否则 YAML 误解析为 mapping。
4. **loader 动态开关（备选）**：`ctx.loader.entries()` + `entry.update({disabled}, false, true)` 可运行时禁用已加载 entry，但 init 已发生一次，不如表达式方案干净。

## 6. 内置能力与路由（dsh-kit 聚合包）

dsh-kit 的 host（`src/index.ts`）除了提供 store 服务，还注册了以下管理路由（loopback DSH webServer，网关后视为本机信任面）：

| 能力 | 路由 | 说明 |
|---|---|---|
| 功能商店 | `GET /dsh-kit/store` · `POST /dsh-kit/store/{id}` · `POST /dsh-kit/store/install` | 清单/状态、启停、一键安装全家桶 |
| 满血模式 preset | `POST /dsh-kit/store/dsh-anchored-standard/install` · `.../delete` | 导入/删除 preset（幂等、删除即禁用） |
| GitHub 生态目录 | `GET /dsh-kit/store/ecosystem[?refresh=1]` | 只读展示 `topic:dsh-plugin` 仓库 |
| 归档会话 | `GET /dsh-kit/archive/sessions` · `POST /dsh-kit/archive/{id}/restore` · `.../delete` | 恢复 / 彻底删除归档会话 |
| 定时任务 | `GET/POST /dsh-kit-scheduler/tasks` · `PATCH/DELETE .../tasks/{id}` | scheduler 包自持 |
| 局域网鉴权 | `/dsh-kit-lan-auth/*` | lan-auth 包自持，管理面仅本机 |

### 6.1 功能商店面板（client）

- slot：`settings.section`（id `dsh-kit-store`，priority 40）；
- 展示每个功能的名称/描述/状态；可启停（`togglable`）功能有「启用/停用」按钮；
- 「满血模式」是 `installable` 但 `togglable: false`——只提供「安装/删除」，不提供启停按钮（启停由安装状态直接决定）；
- 底部「一键安装全」= `POST /dsh-kit/store/install` → 执行 `dsh plugin --profile <p> add -w dsh-kit`。

### 6.2 满血模式 preset（内置）

- **形态**：DSH **agent preset**（`~/.dsh/.agent-presets/anchored-standard`），不是 Cordis bundle；
- **来源**：算法与文件集合**借鉴**社区项目 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT，含 DeepSeek 声明；`refs/dsh-anchored-standard/` 本地参考副本）；
- **接入**：preset 文件内置在 `packages/dsh-kit/preset/`，`src/preset.ts` 负责导入/删除（幂等、非破坏；目标已存在不覆盖；staging + rename 原子落位）；
- **开关**：store 清单里的功能 id 为 `dsh-anchored-standard`，默认开启；启用即自动导入，删除即禁用；
- **名称**：DSH 预设选择器里显示 `满血模式`（`preset.yml` 的 `name` 字段）。

### 6.3 GitHub 生态目录

- `src/ecosystem.ts` 从 GitHub Search API 拉取 `topic:dsh-plugin`（按 star 分片，避免单查询 1000 条上限）；
- 首次秒出 Top 100，后台补全；磁盘缓存 30 分钟（`~/.dsh/dsh-kit/ecosystem-cache.json`）；
- 未认证限流 10 次/分钟，配置 `GITHUB_TOKEN` 提升到 30 次/分钟；
- 网络失败 / 无缓存回退到 `ecosystem-fallback.json` 快照；
- 只读展示，不提供一键安装（各仓库安装方式不同）。思路参考 [0xKcyzz/dsh-plugin-store](https://github.com/0xKcyzz/dsh-plugin-store)（MIT）。

### 6.4 归档会话管理

- DSH 官方「归档」只把会话从视图隐藏、保留日志；没有恢复/删除 API；
- `src/archive.ts` 补齐：恢复（从 `archivedSessionIds` 移除回到原分组）；删除（从归档集 + 所有 workspace 的 `sessionIds` 摘除 + 删磁盘日志目录，不可恢复）；
- 落盘 `~/.dsh/storages/workspace.json`；dsh 运行期以内存态为准，**操作后需重启 dsh 生效**；
- 设置页「归档会话」面板（`settings.section`，id `dsh-kit-archive`，priority 41），删除有二次确认。

## 7. 开发架构（热重载 / 多 profile / 热开关）

### 7.1 热重载能力边界

| 层 | 改动内容 | 是否需要重启 |
|---|---|---|
| **patch 层** | `cordis.patch.yml`（插件启停/配置） | ❌ 即时生效（HMR `watchUserPatches`） |
| **client 插件**（webui/面板） | `lib/client.js` 构建产物 | ❌ 自动热更新（SSE `rebuilt` 帧） |
| **host 插件**（服务端逻辑） | `lib/index.js` 模块 | ✅ 需重启（web bundle 禁模块级 HMR；`pnpm dev` 会先自动重编译） |

### 7.2 双 watch（`pnpm dev`）

```
pnpm dev（scripts/dev.ts 编排）        dsh web（常驻）
├─ client watch: tsdown dev-web.ts     → lib/client.js → 浏览器自动热更
└─ host watch:   tsc -b --watch ×4     → lib/index.js → 重启 dsh web 生效
```

- `scripts/dev.ts` 同时启动「client watch」与「host watch」，子进程互监督，任一崩溃整体退出；
- `dev-web.ts` glob `packages/dsh-kit*`（含聚合包），并忽略 host 源码与 `tsconfig.tsbuildinfo` 避免冗余 rebuild；
- client 面板改动零重启；host 改动只自动重编译，仍需重启 dsh web。

### 7.3 host 插件开发流程

```
改 src/**/*.ts → pnpm dev 自动重编译 lib/ → 重启 dsh web
```

### 7.4 多 profile 隔离（推荐）

- 开发用独立 profile：`dsh plugin --profile dev add -w packages/dsh-kit ...`；
- 日常 `web` profile 不受开发影响；
- 验证组合/开关完全在 `cordis.patch.yml` 上做，走 HMR 无需重启。

### 7.5 开发工具链

- **构建**：`pnpm build`（各包自身 scripts：host tsc；lan-auth/input-history 含 client tsdown）、`pnpm build:client`（补齐所有 `lib/client.js`）；
- **热重载**：`pnpm dev`；
- **类型**：`pnpm typecheck`；
- **冒烟**：`dsh --profile dev "任务"` 或 `dsh web --dump-config`。

## 8. 局域网鉴权网关（dsh-kit-lan-auth）

> 状态：已实现并验证（2026-08-15/16）

### 定位与动机

DSH Web 界面刻意只监听 `127.0.0.1`，特权方法（settings/credentials/llm.discoverModels）锁 loopback。`dsh-kit-lan-auth` 不修改 `dsh-client-connection`，而是在边界加一层 **HTTPS 反向代理网关**，作为唯一暴露到局域网的入口。

```
局域网设备 ──HTTPS──▶ [网关 :3443 TLS] ──验 token/登录──▶ 本机 DSH web (loopback)
```

### 证书（零配置，私有 CA 方案）

- **首启自动生成私有 CA**：`cert.ts` 的 `ensureCertBundle` 在空目录时调用 `initPrivateCa`，生成根证书 `ca.pem` + 叶子 `key.pem`/`cert.pem`（SAN 自动收集本机全部局域网 IPv4 + `127.0.0.1` + `localhost`）。已有证书则原样使用、绝不覆盖。
- **登录页 CA 引导（.crt）**：首次访问浏览器点「继续访问」进入登录页后，页面检测 `hasCa` → 显示「下载根证书永久免警告」引导（`.crt`，MIME `application/x-x509-ca-cert`）。设备装一次后**永久免警告**；不装也能用（每会话点一次「继续访问」）。
- **CLI**：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`。
- **Chrome「不安全」图标说明**：私有 CA（IP 直连）站点 Chrome 永远显示「不安全」——这是对非公共 CA 的固有提示，连接本身已加密受信任，无法（也不需要）消除。

### 关键决策

| 决策 | 值 |
|---|---|
| 形态 | 独立 HTTPS 反向代理网关（不改 client-connection / webServer） |
| TLS | 首启自动生成私有 CA；已有证书 verbatim；登录页 `.crt` 下载引导 |
| 本机 | loopback 免登录直通 |
| 局域网 | 需有效 token（`Authorization: Bearer` 或 `X-DSH-Token`）或账号密码登录 |
| 权限 | 全放行（网关转发走 loopback，DSH 视为 loopback 信任） |
| 管理 | **仅本机**：LAN 请求（带代理标记头）一律 403 |
| 默认 | **关闭**：patch `disabled` 要求 `features["dsh-kit-lan-auth"] === true` 才加载 |

### 认证与安全

- **token 过期**：静态 token 30 天绝对过期；会话 token（密码登录 `session:*`）12 小时滑动续期；`checkToken` 每次先清理过期 token；存量旧 token `load()` 自动回填 `expiresAt`。
- **登录爆破限速**：每身份（用户名；未知用户名按来源 IP）15 分钟内 >5 次失败锁定（进程内存态）；成功登录自动重置。
- **登出=吊销**：`/__dsh_kit_lan_logout` 撤销会话 token + 清 cookie（`Max-Age=0`）；登出按钮仅远程会话显示、有**二次确认**，且仅网关确认 200 才跳转。
- **安全模型（实测）**：LAN 无 token → 401；LAN 带 token 访问管理路由 → 403（`x-dsh-kit-lan-auth-proxy` 标记头）；本机管理 → 200。

### 用户开关（默认关）

```sh
dsh-kit enable dsh-kit-lan-auth     # 写 state.json → 重启后网关加载
dsh-kit disable dsh-kit-lan-auth    # 恢复默认关
```

token 通过 webui 设置页（settings.section「局域网鉴权」）或本机管理员路由 `/dsh-kit-lan-auth/tokens` 生成；明文只在生成时显示一次，存储为 sha256。

## 9. 桌面通知（dsh-kit-notifier）

- 监听 `ctx.on('session/event')`，匹配 `turn/end`；按 `event.data.reason.kind` 区分 completed / error / aborted / blocked / max-tokens；
- 通知走平台原生工具、零 npm 依赖：macOS `osascript` / Linux `notify-send` / Windows PowerShell `Windows.UI.Notifications`；
- 类型依赖：`@deepseek-ai/dsh-session`（devDep，仅取 `SessionEvent` 类型）。

## 10. 定时任务（dsh-kit-scheduler）

- 用户级 cron（5 字段：分 时 日 月 周），`*` / 范围 / 步进 / 列表；
- 持久化：`~/.dsh/dsh-kit-scheduler/tasks.json`（重启保留）；
- 管理路由：`GET/POST /dsh-kit-scheduler/tasks`，`PATCH/DELETE /dsh-kit-scheduler/tasks/:id`；
- 调度：每秒 tick 检查到期任务（分钟级防重复触发护栏）；任务命令走 `/bin/sh -c`（支持管道/变量，本地可信配置面）。

## 11. 输入历史（dsh-kit-input-history）

- **纯 client surface 插件**：host 仅空 apply；浏览器逻辑走 `exports["./client"]`（`dsh.client` 声明）；
- slot：`conversation.composer.dock`（session 作用域）；
- 记录当前会话用户「已发送」的纯文本消息，每会话独立存 localStorage（上限 100 条）；
- ↑ / ↓ 在输入框回填历史，仅在「输入框聚焦 + 非 IME + draft 无命令/引用前缀」时接管；写回走官方唯一公开通道 `inputActions.setDraft`，不直接改 DOM。

## 12. 桌面客户端（apps/dsh-runtime + apps/desktop）

逐一实现与验证：见 `docs/DESKTOP.md`。要点：

- **dsh-runtime**：内置 dsh 独立运行时（pin `@deepseek-ai/dsh` 0.1.0-rc.6），自带 Node（目标态方案 B）+ 全依赖树；当前 MVP 用 Electron 内置 Node（方案 A）。
- **desktop 壳**：Electron（electron-vite + electron-builder）——探测/复用 3080、self-spawn `web --port 0`、就绪 URL、退出清理、托盘、开机自启、错误页、更新链路（feed + sha512 + 原子切换 + 回滚）、窗口图标。
- **首启自动装全家桶**：仅自管实例，后台检测 web profile 的 dependencies 是否含 `dsh-kit`，未装则 `dsh plugin --profile web add -w dsh-kit`（尽力而为，失败仅记日志）。

## 13. CI 与发布

- **`ci.yml`**：push / PR 自动 `pnpm -r build` → `typecheck` → `test`；
- **`release.yml`**：`workflow_dispatch` 手动触发，默认 **dry-run**（只打包校验不上传）；`false` 时用 `NPM_TOKEN` 真实发布；发布前自动校验 5 包版本一致、聚合依赖 `^<version>` 对齐；
- 本地手动：`pnpm -r publish --access public --no-git-checks [--dry-run]`。

## 14. 参考

- dsh 源码：`refs/deepseek-harness/`（apps/cli/src/plugin.ts、packages/boot/app-boot、packages/extensions/ui-cordis、packages/extensions/cordis-host-runner）；
- 社区 preset：`refs/dsh-anchored-standard/`（借鉴来源，MIT）；
- 插件生态调研：`docs/research/dsh-plugin-ecosystem.md`。
