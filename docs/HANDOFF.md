# 交接文档（HANDOFF）

> 更新日期：2026-08-14
> 项目：dsh-kit —— DeepSeek Harness (DSH) 傻瓜式插件全家桶

> **当前状态（2026-08-15）**：全家桶 v1 定稿并全部实现——dsh-kit（管理+商店）、lan-auth（远程访问）、notifier（桌面通知）、scheduler（定时任务），均已验证并提交。browse 选择器已插件化（零 profile 配置）。剩余待办：发布流程（npm 发布、版本规范）；v2 功能候选见 §5。详见 [§2](#2-当前状态) 与 [§7](#7-近期待办)。

## 1. 项目目标

做一个「傻瓜式」的 DSH 插件聚合包：**装一个包，所有功能开箱即用**。
相当于一个插件管理器 + 所有插件打包在一起，面向开箱即用，尽量减少用户配置。

## 2. 当前状态

- **架构方案已定稿**：见 `docs/ARCHITECTURE.md`（含开发架构：pnpm dev 热重载 / 多 profile / 热开关）
- **MVP 骨架已搭好并验证**：
  - `packages/dsh-kit/` 聚合 bundle（host 提供 `dshKit.store` service + **CLI 管理命令** `dsh-kit list/enable/disable`）
  - `packages/dsh-kit-notifier/`、`packages/dsh-kit-scheduler/` 两个占位功能子包（独立 bundle，patch 带动态 disabled 表达式）
  - 根 workspace：`pnpm build` / `pnpm dev`（仿官方 dev-web.ts，client 热构建）/ typecheck
- **插件管理机制已验证（核心成果）**：
  - 子包 patch 的 `disabled` 用自包含 `!!js` 表达式直接读状态文件（`process.getBuiltinModule('fs')` + `dshHomePath`）
  - 双向开关 + 重启保留全通过：`dsh-kit disable dsh-kit-notifier` → 重启 → notifier 不加载；enable 后加载
- **验证通过**：
  - `pnpm install && pnpm -r build` 全绿
  - `dsh plugin --profile dev add -w <paths>` 三个包装入 dev profile
  - `dsh --profile dev --dump-config` 三层 patch 正确展开、无重复 id
  - `dsh --profile dev --port <p>` 启动，动态 disabled 生效（off 不加载 / on 加载）
- GitHub 仓库：**https://github.com/jlu-lujing/dsh-kit**（**PRIVATE**，账号 jlu-lujing）
- 本地路径：`~/workspace/dsh-kit`
- dsh 源码 + Rust 参考已 clone 到 `refs/`：`refs/deepseek-harness/`、`refs/dsh-plugin-pet-rs/`

## 3. 环境

| 项 | 值 |
|---|---|
| Node | v24.16.0（nvm） |
| pnpm | 8.15.4（系统级 /usr/local/bin） |
| dsh | 全局安装 `@deepseek-ai/dsh` 0.1.0-rc.6 |
| profile | `~/.dsh/profiles/web`（web profile 已初始化） |
| git 协议 | ssh（gh 已认证 jlu-lujing） |

**注意**：
- 构建 dsh 插件用 `npx pnpm@9`（pnpm 8 有 rolldown binding bug）
- profile 目录有 pnpm-workspace，`dsh plugin` 加依赖时需 `-w` 参数
- `@deepseek-ai/dsh-tools` 必须锁 `next` tag（`0.1.0-rc.6`），npm latest 是过期的 `0.0.1-rc.1`

## 4. 插件开发工作流

```
1. npx create-dsh-plugin <name> -t <tool|events|webui>   # 官方脚手架
2. cd <name> && pnpm install && pnpm build                # 构建（tsc → dist）
3. dsh plugin --profile web add -w ~/workspace/dsh-kit/packages/<name>   # 安装
4. dsh web                                                # 启动测试
5. 改代码 → pnpm build → 重启 dsh web                     # 迭代
6. dsh plugin --profile web remove <name>                 # 卸载（拔插件）
```

- 插件结构：`package.json` 里 `dsh.bundle.patch` 指向 `cordis.patch.yml`（`- insert: {id, name}` 声明行）；`src/index.ts` 导出 `name`/`inject`/`apply`
- 验证：`dsh web --dump-config` 看配置树；`dsh --profile headless "任务"` 快速冒烟
- 脚手架 `--verify` 可自动 build + install + dump-config

## 5. 全家桶功能清单（v1 已定稿，2026-08-15）

**重要**：用户要的是「自己写」插件，不是收录别人的！以下候选只作为功能方向参考。catalog 调研（1000 个 dsh-plugin 仓库）后筛选的候选方向：

| 类别 | 仓库 | Stars | 用途 |
|---|---|---|---|
| Web UI 全家桶 | `zhu1090093659/dsh-web-ui` | 914 | 任务看板/Git图谱/右侧面板/宠物/实时token/皮肤 |
| 视觉 | `liustack/modlens` | 853 | 图片→结构化JSON（OCR/布局/语义） |
| 搜索 | `liustack/modsearch` | 71 | Web/X 搜索桥 |
| 确定性工具包 | `omdsh-dev/dsh-toolkit` | 10 | time/encoding/json/calculator/csv/regex/markdown/diff/stat/schema 十个零依赖工具 |
| 侧边栏工作台 | `omdsh-dev/DSH-better-sidebar` | 370 | 文件编辑/终端/Git/子代理 |
| 终端 TUI | `ccch1mneyyy/dsh-TUI` | 483 | Claude Code 风格全屏终端 |
| 记忆 | `csyangwen/dsh-memory-evolve` | 24 | 跨会话长期记忆 |

### v1 全家桶（已实现并验证）

| 插件 | 功能 | 对应的候选方向 |
|---|---|---|
| `dsh-kit` | 插件管理 + 功能商店设置面板（底座） | —（自研底座） |
| `dsh-kit-lan-auth` | 局域网远程访问网关（认证/登出/browse 注入） | —（自研核心诉求） |
| `dsh-kit-notifier` | 桌面通知 | 通知（`dsh-notification`） |
| `dsh-kit-scheduler` | cron 定时任务 | 自动化/定时（`dsh-automation`） |

### v2 候选（未选，未定优先级）

按价值/工作量初步排序：**记忆（跨会话长期记忆）** > **确定性工具包**（简单零依赖） > **搜索桥** > **Web UI 面板** > **侧边栏工作台** > **终端 TUI** > **视觉 OCR**。

> 决策规则：只做「自己写、开箱即用、与现有 4 插件互补」的功能；不收录他人插件。

## 6. 踩坑记录（重要）

1. **dsh-web-ui 插件（zhu1090093659/dsh-web-ui）在 rc.6 上有 DOM 选择器问题**：
   - 插件用 `[data-pane="sidebar"]` / `[data-pane="conversation"]` / `[data-dsh-frame]`
   - 实际 rc.6 DOM 是 `[data-slot="sidebar"]` / `[data-slot="conversation"]`，frame 是 `[data-slot="root"] > :first-child`
   - 需改源码重建才可用（已在 dsh-web-ui 仓库修过，但该仓库已删除）
2. **loopback-only 限制**：dsh web 的特权 API（settings/credentials 等）只允许 127.0.0.1 访问；改 `dsh-client-connection/lib/index.js:538` 的 `isTrustedApiRequest(request, [])` 为 `trustedHosts` 可放开局域网（有安全风险）
3. **crypto.randomUUID**：通过局域网 IP（非安全上下文）访问时浏览器没有 `crypto.randomUUID`，上传图片会崩；需在 index.html 注入 polyfill（可用 `crypto.getRandomValues` 实现）
4. **SSH 插件 fence**：dsh-ssh 的 `isLoopbackRequest` 只认 loopback 来源；已放宽为接受私有网段（10.x/172.16-31.x/192.168.x/169.254.x）
5. **dsh-ssh 导入 bug**：ssh config 里没有 IdentityFile 的主机被误判为 password 认证导致全部失败；改为默认走 key 认证（空 keyPath 让 ssh2 用默认密钥）
6. **环境变量**：DEEPSEEK_API_KEY / OPENCODE_API_KEY（opencode.ai 网关，模型 deepseek-v4-pro，baseURL https://opencode.ai/zen/go/v1）
7. **之前改过 dsh 全局包的源码**：`dsh-client-connection/lib/index.js`（放开特权方法）、`dsh-web-frontend/dist/index.html`（randomUUID polyfill）——升级 dsh 后需重打补丁
8. **聚合包 + 子包的重复 id 冲突（实测）**：cordis loader 在同一次 update 里拒绝重复 loader entry id（`duplicate loader entry id`）。聚合包 patch **不能**重复 insert 子包行。正确结构：子包 patch 各 insert 自己，聚合包只 insert 自身行。全家桶通过**一条多参数 add** 装入：
   ```sh
   dsh plugin --profile <p> add -w <dsh-kit> <dsh-kit-notifier> <dsh-kit-scheduler>
   ```
9. **pnpm `link:` 装聚合包不传递依赖**：`link:` 协议的包跳过其 dependencies 解析，file: 子依赖也不会 hoist 到 profile 根 node_modules（`nodeLinker: hoisted` 只提升直接依赖）。cordis loader 从 profile 根按包名解析 → 子包不可达。**必须在 profile 根直接安装子包**（如上一条的多参数 add，或独立 add 子包）。
10. **cordis host 插件 apply**：`config` 参数需默认值 `config: Config = {}`；`ctx.set('x.y', v)` 前必须 `ctx.provide('x.y')`，否则 `cannot set property without provide`。
11. **`!!js` 表达式求值环境（插件管理核心）**：`with (ctx) { eval(expr) }`。可用：`process`、`process.env`、`ctx`、根 ctx service（如 `dshHomePath`）。**不可用**：`require`（`ReferenceError: require is not defined`）。同步读文件用 `process.getBuiltinModule('fs')`（Node 22.3+，Eval 里可用）。
12. **`disabled` 表达式时序坑**：patch 的 `disabled` **首次求值发生在 dsh-kit 插件 apply 之前**（loader 并行加载），所以表达式**不能依赖** `dshKit.featureState` service（首轮返回 undefined → guard 短路 false → 不禁用 → 插件仍 init）。**解法**：表达式自给自足（`getBuiltinModule` + `dshHomePath` 直接读状态文件），首次求值即正确。
13. **YAML `!!js` 引号**：含 `:` 的复杂表达式必须**整体双引号包裹**（`!!js "(...)"`），否则 YAML 误解析为 mapping（`--dump-config` 里看到 `{'[object Object]': false)`）。
14. **loader 动态开关（备选，非首选）**：`ctx.loader.entries()`（id 带 `include:` 前缀，用 `endsWith(':id')` 匹配）+ `entry.update({disabled}, false, true)` 可停已加载 fiber，但 init 已发生一次。表达式方案更干净。
15. **验证插件加载**：`dsh --profile dev --port <p>`（不是 `dsh web`——那是 web profile 别名！）。插件 apply 里写临时文件验证是否被加载。
16. **lan-auth 路径重复拼接（真实 bug，2026-08-14 已修复）**：`$DSH_HOME` 已是 `~/.dsh`，旧代码又在 `index.ts` 里 `path.join(home, '.dsh')` 二次拼接，导致 token/用户落到 `~/.dsh/.dsh/dsh-kit-lan-auth/`，LAN 带 token 也 401（token 不在运行进程读取的文件里）。已统一为 `store.ts` 的 `lanAuthRoot()`（直接返回 `$DSH_HOME`），`index.ts` 不再重复拼接；升级前嵌套目录里的旧数据需合并回顶层 `~/.dsh/dsh-kit-lan-auth/state.json`。
17. **网关转发必须剥掉浏览器标记头（真实 bug，2026-08-14 已修复）**：DSH 的 `/api` 路由有**同源信任栅栏**（`client-connection/src/api-request-trust.ts`）：请求带 `Origin` 时要求 `Origin.host === Host.host`。网关原样透传浏览器 `Origin: https://<lan>:3443`、只改写 `Host → 127.0.0.1:3080`，导致所有 `/api` POST（pickDirectory/openPath/settings/credentials/llm.discoverModels）和 WebSocket 升级被 DSH 判 403。修复：`gateway.ts` 的 `outboundHeaders()` 在 LAN 转发时删除 `origin`/`sec-fetch-*`/`referer`/`referrer-policy`，只留 `x-dsh-kit-lan-auth-proxy` 标记 + 重写 Host。**网关就是认证边界**，转发到 loopback 的请求必须让 DSH 视为干净的 loopback 调用者（全权限面）。
18. **网关 WebSocket 升级不能用 httpRequest 转发（真实 bug，2026-08-14 已修复）**：DSH 的 `WebUpgradeRoute` 把**原始 TCP socket + head 字节**交给 `ws.handleUpgrade` 完成握手；网关原先用 `httpRequest().on('upgrade')` 转发，第二条 HTTP 连接无法把客户端 socket 交接回去，导致 WS 握手永不完成（curl/WS 客户端都挂起）。修复：`gateway.ts` upgrade 分支改为**原生 TCP 隧道**——`tcpConnect(target)` 后重写请求行 + 剥离标记的头部 + 写回 `head` 字节，再双向 pipe socket。
19. **远程访问必须用 browse 选择器而非 native（2026-08-14 修复，08-15 升级为插件化）**：`directory-picker-auto` 在**启动时**凭 `webServer.bindHost === '127.0.0.1'` 解析为 `native`（在**宿主机器**弹 OS 选择器）——网关保持 DSH 绑定 loopback，所以远程用户点「添加工作区」时选择器弹在宿主机器上、远程浏览器「没反应」；官方 0.0.0.0 时解析为 `browse`（webui 内 HTML 选择器，远程可见）。**当前做法（已插件化）**：`dsh-kit-lan-auth` 的 `cordis.patch.yml` 禁用 `directory-picker`(auto) 行；lan-auth `apply()` 用 `ctx.loader.create` 动态注入 browse pair（`@deepseek-ai/dsh-host-directory-picker-browse` + `@deepseek-ai/dsh-client-ui-directory-picker-browse`），teardown 时 remove——**无需任何 profile 配置**（`~/.dsh/profiles/web/cordis.patch.yml` 已清空为 `[]`）。早期曾用 profile 配置固定 browse，现已废弃。代价：**本机和远程都用** web 选择器。验证：`host.pickDirectory` → `directory-picker-unavailable`、`host.listDirectory` 正常（本机 + 经网关 LAN 均 200）、browse client surface 在 boot graph。
20. **client bundle（`lib/client.js`）不会随 `pnpm build` 生成（2026-08-14 排查/修复）**：`dsh.client` 包（如 lan-auth 的 `src/client/index.ts`）需要 **tsdown** 产出 `lib/client.js`，而根 `pnpm build` 只跑 `tsc -b`（不产 client bundle）。症状：DSH 把 entry 插进 boot graph，但 `/plugins/<id>/client.js` 404 → 浏览器 `client-modules: bundle script ... failed to load`，**非本机远程访问也报同样错**。修复：新增 `scripts/build-client-once.mjs`（tsdown workspace 单次构建，仿 `scripts/dev-web.ts` 去 watch）；`pnpm dev`（watch）常驻产出亦可。**换机器/重新 clone 后必须跑一次**该脚本（或 `pnpm dev`）再启动 dsh，才有客户端面板。
21. **动态 loader 注入的插件必须是 profile 已解析的依赖（2026-08-15）**：`ctx.loader.create({ name })` 只能装 profile node_modules 里**可解析**的包。browse pair 是 `@deepseek-ai` 官方包（web-app 已依赖），所以 lan-auth 动态注入可用；若是自研子包需确保在 profile dependencies。`ctx.loader` 类型来自 `@deepseek-ai/cordis-plugin-loader`（devDep，故 lan-auth 补了 `cordis-plugin-loader: 1.0.2`）。
22. **JSDoc 注释里的 `*/` 会提前闭合块注释（2026-08-15 踩坑）**：写 `cron 表达式 '*/s'` 这类注释时 `*/` 被 TS 当注释终止符，后续内容变成代码 → `TS1005/TS1002`（"Unterminated string/template literal"）。规避：注释里用转义 `*\/` 或改写措辞避开 `*/` 序列。**顺带**：scheduler 任务命令一开始用 `execFile`（无 shell，`$()` 原样），用户期望 shell → 已改 `exec`（`/bin/sh -c`），支持管道/变量（命令来自本地可信配置面，风险可控）。

## 7. 近期待办

- [x] 插件管理机制（CLI list/enable/disable + 状态文件 + 动态 disabled 表达式）——已验证
- [x] `dsh-kit-lan-auth` 局域网鉴权网关（独立 HTTPS 反向代理 + 自签 TLS + token/用户管理 webui + 默认关闭）——已实现并验证
  - 取代了原来的「改 client-connection 源码放开局域网」方案；特权方法管理面保持仅本机
- [x] 远程可用性（lan-auth 网关 + browse 选择器，2026-08-14 打通，08-15 插件化）：
  - 网关转发剥浏览器标记头（Origin/sec-fetch-*）→ `/api` 不再 403（踩坑 #17）
  - WebSocket 升级改原生 TCP 隧道 → `events.mux`/`events.host` 握手成功（踩坑 #18）
  - browse 选择器：lan-auth 插件动态注入（禁用 auto + loader.create browse pair）→ 远程浏览器内弹 web 选择器，**零 profile 配置**（踩坑 #19/#21）
- [x] dsh-kit 商店 webui 面板（2026-08-15 实现并验证）：
  - host 侧：`GET /dsh-kit/store`（清单+状态）+ `POST /dsh-kit/store/{id}`（启停）管理路由
  - client 侧：设置页「功能商店」（`settings.section` slot，非侧边栏）
  - dsh-kit 变为 dual-face 包（host + client）；`pnpm build:client` 扫 `dsh-kit`+`dsh-kit-*`（修复 glob）
  - 验证：本机 + 远程经网关（带 token）读清单 200，启停真实写 state.json 并保留
  - 配套：lan-auth 登出（`__dsh_kit_lan_logout` + `revokeToken` + LogoutButton）
- [x] `dsh-kit-notifier` 桌面通知（2026-08-15 实现）：监听 `session/event` 的 `turn/end`，按 reason 发跨平台桌面通知——macOS `osascript` / Linux `notify-send` / Windows PowerShell toast，零 npm 依赖（dep: `@deepseek-ai/dsh-session` 取类型）
- [x] `dsh-kit-scheduler` 定时任务（2026-08-15 实现）：用户级 cron（5 字段）+ 持久化 `~/.dsh/dsh-kit-scheduler/tasks.json` + 管理路由 `/dsh-kit-scheduler/tasks`（GET/POST/DELETE/PATCH）+ 每秒 tick 触发；命令走 `/bin/sh -c`（支持管道/变量，用户配置的本地信任面）
- [x] **确定全家桶功能清单（v1 定稿）**：4 个功能（dsh-kit / lan-auth / notifier / scheduler）定为 v1，全部实现并验证；v2 候选与排序见 §5
- [ ] 发布流程（npm 发布、版本规范）

## 8. 关键命令速查

```sh
# 本机访问 dsh web（局域网 IP 会 403 特权 API）
dsh web --port 3080
# 局域网开放（需改过源码 + 0.0.0.0 patch）
dsh web  # patch 已配置 host: 0.0.0.0

# 插件管理
dsh plugin --profile web add -w <path|pkg>
dsh plugin --profile web remove <name>

# dsh-kit 全家桶安装（一条命令）
dsh plugin --profile <p> add -w \
  <dsh-kit> <dsh-kit-notifier> <dsh-kit-scheduler>

# dsh-kit 插件管理 CLI（读写 ~/.dsh/dsh-kit/state.json）
dsh-kit list | status | ls
dsh-kit enable <feature>
dsh-kit disable <feature>

# 配置查看
dsh web --dump-config
dsh --profile dev --dump-config
dsh --profile dev --port 3090   # 启动 dev profile（注意不是 dsh web！）

# git（私有仓库）
git push
```
