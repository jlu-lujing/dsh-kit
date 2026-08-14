# 交接文档（HANDOFF）

> 更新日期：2026-08-14
> 项目：dsh-kit —— DeepSeek Harness (DSH) 傻瓜式插件全家桶

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

## 5. 全家桶选型（规划中，未定稿）

catalog 调研（1000 个 dsh-plugin 仓库）后筛选的候选：

| 类别 | 仓库 | Stars | 用途 |
|---|---|---|---|
| Web UI 全家桶 | `zhu1090093659/dsh-web-ui` | 914 | 任务看板/Git图谱/右侧面板/宠物/实时token/皮肤 |
| 视觉 | `liustack/modlens` | 853 | 图片→结构化JSON（OCR/布局/语义） |
| 搜索 | `liustack/modsearch` | 71 | Web/X 搜索桥 |
| 确定性工具包 | `omdsh-dev/dsh-toolkit` | 10 | time/encoding/json/calculator/csv/regex/markdown/diff/stat/schema 十个零依赖工具 |
| 侧边栏工作台 | `omdsh-dev/DSH-better-sidebar` | 370 | 文件编辑/终端/Git/子代理 |
| 终端 TUI | `ccch1mneyyy/dsh-TUI` | 483 | Claude Code 风格全屏终端 |
| 自动化 | `titanwings/dsh-automation` | 15 | 定时任务 |
| 记忆 | `csyangwen/dsh-memory-evolve` | 24 | 跨会话长期记忆 |
| 通知 | `omdsh-dev/dsh-notification` | 26 | 桌面通知 |

**重要**：用户要的是「自己写」插件，不是收录别人的！这些只作为功能方向参考。

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

## 7. 近期待办

- [x] 插件管理机制（CLI list/enable/disable + 状态文件 + 动态 disabled 表达式）——已验证
- [ ] 确定全家桶功能清单（自己写，非收录）
- [ ] 给 `dsh-kit` 加 webui 商店面板（client 插件，验证 pnpm dev 热重载链路）
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
