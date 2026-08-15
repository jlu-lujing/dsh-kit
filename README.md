<div align="center">

# dsh-kit

**DeepSeek Harness (DSH) 傻瓜式插件全家桶**

装一个包，所有功能开箱即用。

`MIT License` · Language: [Chinese](#) · Powered by [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

</div>

---

## ✨ 项目定位

`dsh-kit` 是一个 **DSH 插件聚合包**，目标是「傻瓜式」——一条命令装好，无需手动配置。

- **开箱即用**：一条命令装好全家桶，无需手动配置
- **全家桶**：工具、UI 增强、自动化等插件全部打包在一起
- **可拔插**：每个功能是独立子包（或内置模块），可单独装、单独卸、随时开关
- **可扩展**：功能商店面板一键管理启停

---

```
dsh-kit/
├── packages/            # 各功能插件（dsh 前缀，官方 bundle 规范，npm 发布线）
├── apps/
│   ├── dsh-runtime/     # 桌面端内置 dsh 独立运行时子模块（自带 Node + @deepseek-ai/dsh 全依赖树）
│   └── desktop/         # Electron 壳（桌面客户端，见 docs/DESKTOP.md）
├── .github/workflows/   # CI（build/typecheck/test）+ npm 发布 workflow
├── .gitignore
├── package.json         # workspace 根
├── pnpm-workspace.yaml  # pnpm workspace
└── README.md
```

## 📦 功能清单

| 组件 | 功能 | 说明 |
| --- | --- | --- |
| `dsh-kit` | 聚合底座 | host 管理 CLI + 设置页「功能商店」+「归档会话」管理 + 内置 preset 管理器 |
| `dsh-kit-notifier` | 桌面通知 | 监听回合结束，跨平台通知（macOS/Linux/Windows），零 npm 依赖 |
| `dsh-kit-scheduler` | 定时任务 | cron 定时任务 + 持久化 + 管理路由（支持 shell 命令） |
| `dsh-kit-lan-auth` | 局域网鉴权网关 | HTTPS 反向代理 + token/登录，默认关闭；私有 CA 零配置自动生成 |
| `dsh-kit-input-history` | 输入历史 | 记录**当前会话**发送的消息，输入框无命令菜单时按 ↑/↓ 切换回填（每个会话单独记忆） |
| `dsh-kit-webui` | WebUI 主题商店 | **全局界面调整**（叠加在所有主题上，自动适配深/浅色）+ **每主题独立风格**；内置海洋/樱/森林三套预设（各含深色版/浅色版），支持自定义主题的新建/编辑/删除 |
| `满血模式`（preset，内置） | 二阶段 agent preset | Minimal 工具引导 → 首次晋升后开放完整工具；dsh-kit 内置导入/删除管理器 |
| GitHub 生态目录（内置） | `topic:dsh-plugin` 仓库展示 | 按 Star 排序的只读展示；打开仓库查看各自安装方式 |
| 归档会话管理（内置） | 归档会话恢复 / 删除 | 官方「归档」只隐藏不删；设置页可恢复或彻底删除（含日志文件） |

> 💡 满血模式不是独立 npm 包，由 `dsh-kit` 内置打包分发（详见下方「借鉴」）。

---

## 🚀 快速开始

### 方式一：发布版（全新系统装全家桶）

装一个包 = 用 DSH 的原生插件命令把 `dsh-kit` 加进某个 profile：

```sh
dsh plugin --profile web add -w dsh-kit
```

`dsh-kit` 声明 5 个功能包为 npm 依赖（pnpm 自动带出、hoist 进 profile），满血模式 preset 由 dsh-kit 内置——真正「装一个包，全家桶开箱即用」。

> 💡 **关键**：`dsh-kit install` 这个命令**并不是**全新系统的入口。它内部只是执行上面这条 `dsh plugin ... add -w dsh-kit`；而要运行 `dsh-kit` 命令，你**得先装上 `dsh-kit` 这个 npm 包**（它的 `bin` 才会进入 PATH）。全新系统请直接用上面的 `dsh plugin` 命令；`dsh-kit install` 更适合「dsh-kit 已装到某环境、想在其它 profile 补装 / 重装」的场景。

### 方式二：本地源码调试（推荐隔离环境）

```sh
# 1. 安装依赖并构建
pnpm install
pnpm build
pnpm build:client    # 产 client bundle（有 dsh.client 的包必须跑）

# 2. 装进 dev profile（link: 不解析依赖，需 6 包一起 link）
dsh plugin --profile dev add -w \
  ~/workspace/dsh-kit/packages/dsh-kit \
  ~/workspace/dsh-kit/packages/dsh-kit-notifier \
  ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
  ~/workspace/dsh-kit/packages/dsh-kit-lan-auth \
  ~/workspace/dsh-kit/packages/dsh-kit-input-history \
  ~/workspace/dsh-kit/packages/dsh-kit-webui

# 3. 启动 dsh web
dsh web
```

> **本地源码为什么 6 包一起 link？** `link:` 协议不解析依赖（见 `docs/HANDOFF.md`），所以源码调试要显式 link 全部子包；发布版（registry）则一条命令即可。

---

## 🛠️ 插件管理

装好全家桶后，用 `dsh-kit` 命令管理各功能开关：

```sh
dsh-kit list                                        # 列出所有功能及状态
dsh-kit enable notifier                             # 启用桌面通知
dsh-kit disable scheduler                           # 停用定时任务
dsh-kit install [--profile <p>]                     # 把全家桶装进指定 profile（默认 web）
# 注：需要系统里已有 dsh-kit 命令；全新系统请用: dsh plugin --profile web add -w dsh-kit
```

- 状态保存在 `~/.dsh/dsh-kit/state.json`，**重启后保留**。
- 每个功能的启停由聚合 patch 里的动态表达式读状态文件决定，**无需编辑任何 patch 文件**。
- 也可以通过设置页「功能商店」面板一键点按开关。

### GitHub 生态目录（只读展示）

功能商店底部会展示 GitHub `topic:dsh-plugin` 生态仓库，按 **Star 数降序**排列，点击卡片打开仓库主页（安装方式各不相同，请以各仓库 README 为准，暂不提供一键安装）。

- 首次打开先秒出 Top 100，随后后台补全完整目录并写入 30 分钟磁盘缓存。
- 网络受限时自动回退到包内置快照；可配置 `GITHUB_TOKEN` 提升 GitHub API 限流（未认证 10 次/分钟 → 认证 30 次/分钟）。
- 目录抓取策略参考 [0xKcyzz/dsh-plugin-store](https://github.com/0xKcyzz/dsh-plugin-store)（MIT）。

### 归档会话管理

DSH 官方的「归档」只会把会话从列表隐藏、保留日志；dsh-kit 在设置页新增「归档会话」面板，补齐恢复与彻底删除：

- **恢复**：把会话从 `archivedSessionIds` 移除，回到原工作区分组。
- **删除**：从归档集和所有 workspace 的 `sessionIds` 摘除，并删除 `~/.dsh/sessions` 下对应日志目录；**不可恢复，UI 有二次确认**。
- 操作直接落盘到 `~/.dsh/storages/workspace.json`；dsh 运行期以内存态为准，**操作后需重启 dsh 生效**。

### WebUI 主题商店（dsh-kit-webui）

> 完整验收记录见 [`docs/THEME_STORE_VERIFICATION.md`](docs/THEME_STORE_VERIFICATION.md)。

设置页新增「主题商店」面板。它**不替换官方主题**，而是跑在官方 `ui-theme` 的两个公开扩展点上：

- **全局界面调整**：走官方 `ctx.theme.overrideTokens()` 叠加层——**与主题无关，切到任何主题（含官方浅色/深色/跟随系统）都生效**；每个 token 分别保存浅色/深色两套值，随当前模式自动取值。
- **主题风格**：走官方 `ctx.theme.register()` + `setTheme()`——每个主题有自己独立的 `--dsw-alias-*` token 集合；预设按「家族」提供深色版 + 浅色版，自定义主题可新建 / 编辑 / 删除。
- **持久化**：自定义主题与全局调整写入 `~/.dsh/dsh-kit-webui/themes.json`（host 路由 `/dsh-kit-webui/themes` 管理），当前所选主题另存 localStorage；重启 dsh 后自动恢复。
- **开关**：功能商店面板 / `dsh-kit disable dsh-kit-webui` 可整体停用；停用后设置页不出现该面板，host 路由与 client bundle 一并下线。

---

## 💻 开发

```sh
pnpm dev              # 双 watch：client 热构建（改面板即时生效）+ host tsc watch（自动重编译，重启 dsh 生效）
pnpm build             # 全量构建：各包跑自己的 build（host tsc；lan-auth / input-history 含 client tsdown）
pnpm build:client      # 统一补齐所有 dsh.client 包的 lib/client.js（含聚合包 dsh-kit）
pnpm typecheck         # 类型检查
pnpm test              # 测试
```

> 注意：`pnpm build` 已包含 lan-auth / input-history 的 client bundle；聚合包 `dsh-kit` 的 `lib/client.js` 仍需 `pnpm build:client`（或 `pnpm dev`）产出。换机器/重新 clone 后建议两个都跑一遍。
> `pnpm dev` 常驻双 watch：client 面板改完浏览器自动热更；host 逻辑会自动重编译到 `lib/`，但 dsh host 不支持模块级 HMR，仍需重启 dsh web 生效。
> `dsh-kit-webui` 已配置 `test` 脚本（9 个测试：预设/持久化/控制器/全局叠加层/host 路由数据），`pnpm test` 会实际执行；其余子包暂未配置，后续补充会自动进入 CI 门禁。

新插件可用官方脚手架生成，再移入 `packages/`：

```sh
npx create-dsh-plugin my-plugin -t tool
```

---

## 🔒 局域网远程访问（dsh-kit-lan-auth）

启用后，局域网设备经 `https://<主机IP>:3443` + token 访问。

- **证书（零配置）**：首启自动生成私有 CA（根 `ca.pem` + 叶子，SAN 覆盖本机全部局域网 IP）。登录页引导下载 `.crt` 永久免警告。
- **安全模型**：本机 loopback 免登录直通；局域网需有效 token 或账号密码登录；管理路由仅本机可达。
- **登出**：远程会话登出按钮带二次确认，防误触；登出即吊销会话 token 并清 cookie。
- **管理**：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`

## 🖥️ 桌面客户端（Electron + 内置 dsh-runtime）

独立桌面软件（Electron 壳 + 内置 dsh-runtime 子模块，**用户无需单独装 dsh**，已在 main 合入）。方案与演进见 `docs/DESKTOP.md`。

- **M1–M5 已落地并真机验证**（2026-08-16）：
  - `apps/dsh-runtime`：从本机已验证 dsh 构建独立运行时。自带官方 Node 二进制（方案 B）为目标态；当前 MVP 走 **Electron 内置 Node（方案 A）**，本地构建用 `build.mjs --skip-node-download`（官方 Node 下载待接线，见 `build.mjs`）+ `scripts/smoke.mjs` 冒烟
  - `apps/desktop`：Electron 壳（electron-vite + electron-builder）——spawn/就绪 URL/BrowserWindow/退出清理、托盘、开机自启、错误页、更新链路（feed + sha512 + 原子切换 + 回滚）
  - **开箱即用**：自管 dsh 实例就绪后，后台检测 web profile 并自动装 dsh-kit 全家桶（`dsh plugin --profile web add -w dsh-kit`）；仅对自管实例执行，复用外部 `3080` 实例时不干预用户已有配置

**启动方式**（任选其一）：

```sh
# 方式一：打包好的 App（本机构建）
open "apps/desktop/dist/mac-arm64/dsh-kit Desktop.app"

# 方式二：开发模式（electron-vite，热重载）
cd apps/desktop
npm install && npm run dev
```

> 💡 **常见坑**：`npm install` 装了 electron 包但二进制没下载时，`npm run dev` 会报
> `Error: Electron uninstall`（缺 `node_modules/electron/dist` 与 `path.txt`）。手动跑一次
> `node node_modules/electron/install.js` 即可补下二进制。
>
> 客户端启动时会先探测 `127.0.0.1:3080` 是否已有健康 dsh 实例，有则**直接复用**（不重复
> spawn）；无则自己拉起 `dsh web --port 0` 并等待就绪 URL。日志在
> `~/Library/Application Support/@dsh-kit/desktop/desktop.log`。

## 📤 发布

**当前版本 `0.2.0`**（2026-08-16）：6 个 npm 包（均 `license: MIT`）：

- `dsh-kit` / `dsh-kit-notifier` / `dsh-kit-scheduler` / `dsh-kit-lan-auth` / `dsh-kit-input-history` / `dsh-kit-webui`
- 满血模式 preset **不是独立 npm 包**，由 `dsh-kit` 内置分发。
- 根 workspace `private: true`，只承载开发工具链，不发布。

### GitHub Actions

- **`ci.yml`**：push / PR 自动跑 `pnpm -r build` → `typecheck` → `test`。
- **`release.yml`**：`workflow_dispatch` 手动触发，默认 **dry-run**（只打包校验，不上传 npm）；把输入改为 `false` 才用 `NPM_TOKEN` 真实发布。发布前会自动校验 6 包版本一致、聚合包依赖指向同版本 `^0.x.0`。

本地手动发布（仅备选；日常推荐走 CI）：

```sh
pnpm -r build && pnpm -r typecheck && pnpm -r test

# 先 dry-run 校验打包内容，再真实发布
pnpm -r publish --access public --no-git-checks --dry-run
pnpm -r publish --access public --no-git-checks
```

架构详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、开发坑位详见 [`docs/HANDOFF.md`](docs/HANDOFF.md)。

---

## 📚 借鉴与许可

- **满血模式 preset** 的算法与文件集合**借鉴**自社区项目 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT，含 DeepSeek 声明）。dsh-kit 以自研的导入/删除管理器（`src/preset.ts`）内置并注明借鉴。
- **GitHub 生态目录**的分片抓取 / 缓存思路参考 [0xKcyzz/dsh-plugin-store](https://github.com/0xKcyzz/dsh-plugin-store)（MIT）；dsh-kit 只取展示能力，不做安装。
  - 简介：首次请求用 Minimal 工具对（`bash` / `str_replace_editor`），首次持久晋升信号后开放完整工具目录。
  - 全家桶接入：内置 `packages/dsh-kit/preset/`，默认开启，自动导入到 `~/.dsh/.agent-presets/anchored-standard`；功能商店可手动导入/删除。

## License

本项目遵循 [MIT License](LICENSE)。

- Copyright (c) 2026 **Lu Jing**
- 满血模式 preset 部分借鉴自社区 [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT，含 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 声明）。
