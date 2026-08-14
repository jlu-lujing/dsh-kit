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
```

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
| `dsh-kit-lan-auth` | 局域网鉴权网关（自签 HTTPS + token，默认关闭） | 已实现并验证（含远程可用性：标记头剥离 / WS 隧道 / browse 选择器注入 / 登出） |

> 全家桶安装（一条命令带进全部）：
> ```sh
> dsh plugin --profile web add -w <dsh-kit> <dsh-kit-notifier> <dsh-kit-scheduler> <dsh-kit-lan-auth>
> ```
> 详见 `docs/ARCHITECTURE.md`。
>
> 远程访问：启用 `dsh-kit-lan-auth` 后，局域网设备经 `https://<主机IP>:3443` + token 访问；dsh-kit-lan-auth 会在启用时自动注入 browse 目录选择器（无需改 profile 配置），远程浏览器内弹 web 选择器而非宿主原生窗口。

## 发布

- **状态**：当前通过**本地路径**安装（`dsh plugin add -w <path>`），尚未发布到 npm（registry 404）。
- **版本**：4 个子包均为 `0.1.0`；根 workspace 为 `private: true`（只承载开发工具链，不发布）。
- 发布后可用 `dsh plugin add dsh-kit` 直接安装；npm 发布流程与版本规范尚未制定（见 `docs/HANDOFF.md` §7 待办）。

## License

MIT
