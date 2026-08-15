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
dsh plugin --profile dev add -w \
  ~/workspace/dsh-kit/packages/dsh-kit \
  ~/workspace/dsh-kit/packages/dsh-kit-notifier \
  ~/workspace/dsh-kit/packages/dsh-kit-scheduler \
  ~/workspace/dsh-kit/packages/dsh-kit-lan-auth

# 3. 启动 dsh web
dsh web
```

## 插件管理

装好全家桶后，用 `dsh-kit` 命令管理各功能开关（状态存 `~/.dsh/dsh-kit/state.json`，重启保留）：

```sh
dsh-kit list                # 列出所有功能及状态
dsh-kit enable notifier     # 启用桌面通知
dsh-kit disable scheduler   # 停用定时任务
dsh-kit install             # 一条命令把全家桶装进 profile（发布后，默认 web）
dsh-kit install --profile dev   # 装进指定 profile
```

> `dsh-kit install` 内部执行 `dsh plugin --profile <p> add -w dsh-kit dsh-kit-notifier dsh-kit-scheduler dsh-kit-lan-auth`（4 个包各为独立 bundle，装进 profile 根，可单装/单卸）。
> 发布前（本地路径安装）不用此命令，见下方[快速开始](#快速开始)。

每个功能的 `disabled` 由 patch 里的动态表达式读状态文件决定，**无需编辑任何 patch 文件**。

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

> 全家桶安装（一条命令带进全部）：
> ```sh
> dsh plugin --profile web add -w <dsh-kit> <dsh-kit-notifier> <dsh-kit-scheduler> <dsh-kit-lan-auth>
> ```
> 详见 `docs/ARCHITECTURE.md`。
>
> 远程访问：启用 `dsh-kit-lan-auth` 后，局域网设备经 `https://<主机IP>:3443` + token 访问；dsh-kit-lan-auth 会在启用时自动注入 browse 目录选择器（无需改 profile 配置），远程浏览器内弹 web 选择器而非宿主原生窗口。
>
> 证书（零配置）：首启自动生成私有 CA（`ca.pem` 根 + 叶子 `key.pem`/`cert.pem`，SAN 覆盖本机全部局域网 IP）。设备首次访问在登录页会看到「下载根证书永久免警告」引导（`.crt`），装一次后该设备免警告；不装也能用（浏览器点一次「继续访问」）。管理：`dsh-kit-lan-auth init-ca [--ip ...]` / `dsh-kit-lan-auth status`。

## 发布

- **已发布**（2026-08-15）：4 个包均已发布到 npm registry（`0.1.0`）：
  - `dsh-kit` / `dsh-kit-notifier` / `dsh-kit-scheduler` / `dsh-kit-lan-auth`（均 `license: MIT`）
  - 根 workspace `private: true`，只承载开发工具链，不发布。
- **安装（发布后）**：
  ```sh
  dsh-kit install            # 一条命令装全家桶（默认 web profile）
  # 等价于: dsh plugin --profile web add -w dsh-kit dsh-kit-notifier dsh-kit-scheduler dsh-kit-lan-auth
  ```
- **更新发布**：`cd packages/<pkg> && npm publish`（4 包各自发布；已构建 `lib/` 随包带出；改版本号后重发）。
- **架构说明**：4 个包都是独立 bundle（各带 patch，可单装/单卸）；`dsh-kit` 为聚合壳（管理 CLI + 功能商店），不声明子包依赖——全家桶靠一条多参 `add` 装齐。

## License

MIT
