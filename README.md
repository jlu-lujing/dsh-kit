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

## 📦 功能清单

| 组件 | 功能 | 说明 |
| --- | --- | --- |
| `dsh-kit` | 聚合底座 | host 管理 CLI + 设置页「功能商店」+ 内置 preset 管理器 |
| `dsh-kit-notifier` | 桌面通知 | 监听回合结束，跨平台通知（macOS/Linux/Windows），零 npm 依赖 |
| `dsh-kit-scheduler` | 定时任务 | cron 定时任务 + 持久化 + 管理路由（支持 shell 命令） |
| `dsh-kit-lan-auth` | 局域网鉴权网关 | HTTPS 反向代理 + token/登录，默认关闭；私有 CA 零配置自动生成 |
| `满血模式`（preset，内置） | 二阶段 agent preset | Minimal 工具引导 → 首次晋升后开放完整工具；dsh-kit 内置导入/删除管理器 |

> 💡 满血模式不是独立 npm 包，由 `dsh-kit` 内置打包分发（详见下方「借鉴」）。

---

## 🚀 快速开始

### 方式一：发布版（一条命令装全家桶）

```sh
dsh-kit install            # 装进默认 web profile
# 等价于: dsh plugin --profile web add -w dsh-kit
```

只需要 `dsh-kit` 一个包，pnpm 会把 3 个功能包作为依赖自动带出，满血模式 preset 由 dsh-kit 内置——真正的「装一个包，全家桶开箱即用」。

### 方式二：本地源码调试（推荐隔离环境）

```sh
# 1. 安装依赖并构建
pnpm install
pnpm build
pnpm build:client    # 产 client bundle（有 dsh.client 的包必须跑）

# 2. 装进 dev profile（link: 不解析依赖，需 4 包一起 link）
dsh plugin --profile dev add -w \
  ~/workspace/dsh-kit/packages/dsh-kit \
  ~/workspace/dsh-kit/packages/dsh-kit-notifier \
  ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
  ~/workspace/dsh-kit/packages/dsh-kit-lan-auth

# 3. 启动 dsh web
dsh web
```

> **本地源码为什么 4 包一起 link？** `link:` 协议不解析依赖（见 `docs/HANDOFF.md`），所以源码调试要显式 link 全部子包；发布版（registry）则一条命令即可。

---

## 🛠️ 插件管理

装好全家桶后，用 `dsh-kit` 命令管理各功能开关：

```sh
dsh-kit list                # 列出所有功能及状态
dsh-kit enable notifier     # 启用桌面通知
dsh-kit disable scheduler   # 停用定时任务
dsh-kit install [--profile <p>]   # 一条命令装全家桶（默认 web）
```

- 状态保存在 `~/.dsh/dsh-kit/state.json`，**重启后保留**。
- 每个功能的启停由聚合 patch 里的动态表达式读状态文件决定，**无需编辑任何 patch 文件**。
- 也可以通过设置页「功能商店」面板一键点按开关。

---

## 💻 开发

```sh
pnpm dev               # client 插件热构建（改面板即时生效，常驻 watch）
pnpm build             # 全量构建（tsc，host 端）
pnpm build:client      # 产 client bundle（tsdown，lib/client.js）
pnpm typecheck         # 类型检查
pnpm test              # 测试
```

> ⚠️ `pnpm build` 只编译 host 端；client 插件（如 lan-auth 的 `src/client/`）要产 `lib/client.js` 需另跑 `pnpm build:client` 或 `pnpm dev`。**换机器/重新 clone 后两个都要跑。**

新插件可用官方脚手架生成，再移入 `packages/`：

```sh
npx create-dsh-plugin my-plugin -t tool
```

---

## 🔒 局域网远程访问（dsh-kit-lan-auth）

启用后，局域网设备经 `https://<主机IP>:3443` + token 访问：

- **证书（零配置）**：首启自动生成私有 CA（根 `ca.pem` + 叶子，SAN 覆盖本机全部局域网 IP）。登录页引导下载 `.crt` 永久免警告。
- **安全模型**：本机 loopback 免登录直通；局域网需有效 token 或账号密码登录；管理路由仅本机可达。
- **管理**：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`

---

## 📤 发布

**已发布**（2026-08-15）：4 个 npm 包（`0.1.0`，均 `license: MIT`）：

- `dsh-kit` / `dsh-kit-notifier` / `dsh-kit-scheduler` / `dsh-kit-lan-auth`
- 满血模式 preset **不是独立 npm 包**，由 `dsh-kit` 内置分发。
- 根 workspace `private: true`，只承载开发工具链，不发布。

更新某个包：

```sh
cd packages/<pkg> && npm publish    # 4 包各自发布；已构建 lib/ 随包带出；改版本号后重发
```

架构详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、开发坑位详见 [`docs/HANDOFF.md`](docs/HANDOFF.md)。

---

## 📚 借鉴与许可

- **满血模式 preset** 的算法与文件集合**借鉴**自社区项目 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT，含 DeepSeek 声明）。dsh-kit 以自研的导入/删除管理器（`src/preset.ts`）内置并注明借鉴。
  - 简介：首次请求用 Minimal 工具对（`bash` / `str_replace_editor`），首次持久晋升信号后开放完整工具目录。
  - 全家桶接入：内置 `packages/dsh-kit/preset/`，默认开启，自动导入到 `~/.dsh/.agent-presets/anchored-standard`；功能商店可手动导入/删除。

## License

本项目遵循 [MIT License](LICENSE)。

- Copyright (c) 2026 **Lu Jing**
- 满血模式 preset 部分借鉴自社区 [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT，含 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 声明）。
