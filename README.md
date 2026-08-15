# dsh-kit

DeepSeek Harness (DSH) 傻瓜式插件全家桶 —— 装一个包，所有功能开箱即用。

## 定位

- **开箱即用**：一条命令装好，无需手动配置
- **全家桶**：工具、UI 增强、自动化等插件全部打包在一起
- **可拔插**：每个功能是独立子包，可单独装、单独卸

## 结构

```
dsh-kit/
├── packages/
│   └── dsh-*            # 各功能插件（dsh 前缀，官方 bundle 规范）
├── .gitignore
├── package.json         # workspace 根
├── pnpm-workspace.yaml  # pnpm workspace
└── README.md
```

## 快速开始

```sh
# 1. 安装依赖并构建
pnpm install
pnpm build

# 2. 安装全家桶到 dev profile（推荐开发隔离，不污染 web）
#    发布版：装 dsh-kit 一个包即带出全家桶（它声明 4 个功能包为依赖，聚合 patch 挂载全部 5 行）
#    本地源码：dsh-kit 用 link: 装入时不解析依赖，需连同 4 个功能包一起 link（见下）
dsh plugin --profile dev add -w \
  ~/workspace/dsh-kit/packages/dsh-kit \
  ~/workspace/dsh-kit/packages/dsh-kit-notifier \
  ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
  ~/workspace/dsh-kit/packages/dsh-kit-lan-auth \
  ~/workspace/dsh-kit/packages/dsh-anchored-standard

# 3. 启动 dsh web
dsh web
```

> **只装 dsh-kit = 全家桶**（发布后）：`dsh plugin add dsh-kit` 即带出全员——pnpm 把 4 个功能包作为依赖 hoist 进 profile 顶层 node_modules，dsh-kit 的聚合 patch 挂载全部 5 个功能行。
> **本地源码（link:）需 5 包一起 add**：`link:` 协议不解析依赖（HANDOFF #9），所以源码调试 profile 里要像上面那样把 5 个包都 link。发布后无需此步。

## 插件管理

装好全家桶后，用 `dsh-kit` 命令管理各功能开关（状态存 `~/.dsh/dsh-kit/state.json`，重启保留）：

```sh
dsh-kit list                # 列出所有功能及状态
dsh-kit enable notifier     # 启用桌面通知
dsh-kit disable scheduler   # 停用定时任务
dsh-kit install             # 一条命令把全家桶装进 profile（发布后，默认 web）
dsh-kit install --profile dev   # 装进指定 profile
```

> `dsh-kit install` 内部执行 `dsh plugin --profile <p> add -w dsh-kit`（发布后 dsh-kit 的依赖自动带出 4 个功能包）。
> 发布前（本地路径安装）不用此命令，见下方[快速开始](#快速开始)。

每个功能的 `disabled` 由聚合 patch 里的动态表达式读状态文件决定，**无需编辑任何 patch 文件**。

## 开发

```sh
pnpm dev              # client 插件热构建（仿官方 dev-web.ts，改面板即时生效，常驻 watch）

pnpm build             # 全量构建（tsc，host 端）
pnpm build:client      # 产 client bundle（tsdown，lib/client.js）—— 有 dsh.client 的包必须跑，否则浏览器报 failed to load
pnpm typecheck         # 类型检查
pnpm test              # 测试
```

> 注意：`pnpm build` 只编译 host 端；client 插件（如 lan-auth 的 `src/client/`）要产 `lib/client.js` 需另跑 `pnpm build:client` 或 `pnpm dev`。换机器/重新 clone 后两个都要跑。

新插件用官方脚手架生成，再移入 `packages/`：

```sh
npx create-dsh-plugin my-plugin -t tool
```

## 插件清单

| 包 | 功能 | 状态 |
| --- | --- | --- |
| `dsh-kit` | 聚合包（host + 商店服务 + 设置面板） | 已通：host 管理路由 + 设置页「功能商店」面板 |
| `dsh-kit-notifier` | 桌面通知 | 已实现：监听回合结束，跨平台通知（macOS/Linux/Windows） |
| `dsh-kit-scheduler` | 定时任务 | 已实现：cron 任务 + 持久化 + 管理路由（支持 shell 命令） |
| `dsh-kit-lan-auth` | 局域网鉴权网关（HTTPS 反向代理 + token/登录，默认关闭） | 已实现并验证：私有 CA 自动生成 + 登录页 CA 下载引导（.crt）、token 过期（静态 30 天/会话 12h 滑动）、登录爆破限速、登出吊销、远程可用性（标记头剥离 / WS 隧道 / browse 选择器注入） |
| `dsh-anchored-standard` | 二阶段 agent preset（`bash`/`str_replace_editor` 引导 → Standard 工具目录，社区算法） | 内置为文件安装器，默认开启；随全家桶自动安装 preset 到 `~/.dsh/.agent-presets/anchored-standard` |

> 全家桶安装（一条命令带进全部，发布后）：
> ```sh
> dsh plugin --profile web add -w dsh-kit
> ```
> dsh-kit 声明 4 个功能包为 npm 依赖，聚合 patch 挂载全部 5 个功能行；装 dsh-kit 一个包即全家桶。详见 `docs/ARCHITECTURE.md`。
> 本地源码（`link:`）调试时需 5 包一起 add（link 不解析依赖），见[快速开始](#快速开始)。
>
> 远程访问：启用 `dsh-kit-lan-auth` 后，局域网设备经 `https://<主机IP>:3443` + token 访问；dsh-kit-lan-auth 会在启用时自动注入 browse 目录选择器（无需改 profile 配置），远程浏览器内弹 web 选择器而非宿主原生窗口。
>
> 证书（零配置）：首启自动生成私有 CA（`ca.pem` 根 + 叶子 `key.pem`/`cert.pem`，SAN 覆盖本机全部局域网 IP）。设备首次访问在登录页会看到「下载根证书永久免警告」引导（`.crt`），装一次后该设备免警告；不装也能用（浏览器点一次「继续访问」）。管理：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`。

## 发布

- **已发布**（2026-08-15）：5 个包均已发布到 npm registry（`0.1.0`）：
  - `dsh-kit` / `dsh-kit-notifier` / `dsh-kit-scheduler` / `dsh-kit-lan-auth` / `dsh-anchored-standard`（均 `license: MIT`）
  - 根 workspace `private: true`，只承载开发工具链，不发布。
- **安装（发布后）**：
  ```sh
  dsh-kit install            # 一条命令装全家桶（默认 web profile）
  # 等价于: dsh plugin --profile web add -w dsh-kit（依赖自动带出 4 个功能包）
  ```
- **更新发布**：`cd packages/<pkg> && npm publish`（5 包各自发布；已构建 `lib/` 随包带出；改版本号后重发）。
- **架构说明**：`dsh-kit` 为聚合 bundle（管理 CLI + 功能商店 + 挂载 5 个功能行 + 声明子包依赖）；4 个功能包为**纯库**（不含 patch，行由 dsh-kit 挂载），发布后装 dsh-kit 即全家桶。

## License

MIT

## 引用 / 参考（Authors）

本仓库 `refs/` 目录只用于本地参考浏览，不进 git（根 `.gitignore` 已忽略 `refs/`）。

**内置功能包：dsh-anchored-standard**（二阶段 DeepSeek Harness agent preset）
- 上游仓库：[xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)
- 简介：首次模型请求使用 Minimal 对齐的 system prompt + Minimal 真实工具对（`bash` / `str_replace_editor`，不注入工作区/技能上下文），首次持久晋升信号（`tool/call` 或首次 `assistant/message`）后开放 Standard 完整工具目录。
- 全家桶接入：`packages/dsh-anchored-standard/` 内置文件系统安装器，随全家桶**默认开启**，自动安装 preset 到 `~/.dsh/.agent-presets/anchored-standard`；若需关闭用 `dsh-kit disable dsh-anchored-standard`。
- 参考副本（本地参考用，不进 git）：`refs/dsh-anchored-standard/`
- 许可：MIT（含 DeepSeek 的 MIT 声明，详见上游 `LICENSE` / `NOTICE`；本项目以安装器形式内置并注明来源）。
