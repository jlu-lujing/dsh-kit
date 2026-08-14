# dsh-kit 架构设计

> 更新日期：2026-08-14
> 状态：方案已定稿（待实现）

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

- client 端插件通过 `ctx.slots`（如 `sidebar.footer.action`）注入 UI
- 官方模板：`@deepseek-ai/dsh-client-ui-cordis`（CordisPanel：inventory 列表 + 启停按钮）
- 参考 `packages/extensions/ui-cordis/src/client/`（CordisPanel.tsx + inventory.ts）

### 2.4 动态装载 = `dynamicCordisRunner`（注意边界）

- `@deepseek-ai/dsh-cordis-host-runner` + `@deepseek-ai/dsh-tool-cordis` 提供运行时 define/run/stop/undefine
- **模型驱动**：session 作用域、vm 沙箱、需审批、**纯进程内存、不持久化**
- 结论：**不适合做用户傻瓜包的开关机制**，但 browser half 的"投递 UI 到页面"机制可复用于商店面板

## 3. 架构决策

| 决策点 | 结论 |
|---|---|
| 傻瓜包本体 | 聚合 bundle（`dsh-kit`）+ 管理入口（webui 商店面板） |
| 功能粒度 | 每个功能 = 独立 Cordis bundle（可单装），内部重逻辑可选 Rust sidecar |
| 商店形态 | 直接做 webui 面板 |
| 用户开关机制 | 持久化状态文件 + 进程内 apply（**不用** dynamicCordisRunner 做启停） |
| 面板 UI 投递 | 复用动态 runner 的 browser-half 投递机制（可选，一期可不做） |
| 持久化位置 | dsh-kit 自管理状态文件（不碰用户 cordis.patch.yml） |
| Rust 定位 | JS 只做壳（编排/聚合/面板），重计算/重 IO 功能用 Rust sidecar（pet-rs 模式） |

## 4. 仓库结构

```
dsh-kit/
├── packages/
│   ├── dsh-kit/                 # 傻瓜包本体 = 聚合 bundle + 管理入口
│   │   ├── package.json         #   dsh.bundle.patch + dependencies: 全部 dsh-kit-*
│   │   ├── cordis.patch.yml     #   insert 所有子功能行（默认 enabled，附 config）
│   │   └── src/
│   │       ├── host.ts          #   商店 API：list/enable/disable → 状态文件 + apply
│   │       ├── store.ts         #   商店元数据 + 清单（内置 + 可扩展）
│   │       ├── state.ts         #   状态文件读写（~/.dsh/dsh-kit/state.json）
│   │       └── client/
│   │           └── StorePanel.tsx  # 商店/开关面板（复刻 ui-cordis 结构）
│   ├── dsh-kit-notifier/        # 功能子包（独立 bundle，可单装）
│   ├── dsh-kit-scheduler/       # 功能子包
│   └── ...                      # 每功能一个
├── crates/                      # （后续）Rust sidecar
│   └── ...
└── docs/
    ├── ARCHITECTURE.md          # 本文档
    └── HANDOFF.md               # 交接文档
```

## 5. 关键流程

### 5.1 安装

```sh
dsh plugin --profile web add -w ~/workspace/dsh-kit/packages/dsh-kit \
    ~/workspace/dsh-kit/packages/dsh-kit-notifier \
    ~/workspace/dsh-kit/packages/dsh-kit-scheduler
```

- 聚合包 dsh-kit + 各子包一次装入（一条命令带进全家桶）
- pnpm 装入并 reconcile 进 `dsh.profile.bundles`
- dsh-kit apply：读取默认状态，注册 `dshKit.store` 服务

### 5.1.1 关键约束：聚合包不重复 insert 子包行

**实测发现**（dev profile 验证）：cordis loader 在同一层栈的**同一次 update 内拒绝重复 id**（`duplicate loader entry id`）。因此：

- ✅ **子包各自 patch 只 insert 自己**（`- id: dsh-kit-notifier`）
- ✅ **聚合包 dsh-kit 只 insert 自身行**（host + 面板），**不重复 insert 子包行**
- 各子包声明独立 `dsh.bundle.patch`（可单装），聚合包依赖它们（`file:` 或 registry）

**装机命令是一条多参数 add**（见上），三个都进 bundles 栈，patch 各自展开、无重复。

### 5.2 用户开关（webui 面板）

```
用户点"停用 notifier"
  → browser 面板调 host API（remote.dshKit.disable('dsh-kit-notifier')）
  → host 写状态文件 state.json { "dsh-kit-notifier": false }
  → host 调动态 runner 停用对应行（或标记下次启动跳过）
  → 立即生效 + 持久化
```

### 5.3 重启后状态保留

```
dsh 启动 → dsh-kit bundle apply
  → 读取 state.json，对 disabled 的插件行补 disabled: true
  → 其余按 cordis.patch.yml 默认启用
```

## 6. 商店可扩展性

- 内置清单：`store.ts` 内置 `dsh-kit-*` 全家桶清单
- 第三方接入：支持从注册表/git URL 解析插件清单（一期可只读内置）
- 面板展示：名称、描述、状态、启停按钮、安装/卸载

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
- 我们的 `pnpm dev`：复制 `dev-web.ts` 逻辑，workspace 只扫 `packages/dsh-kit-*/`，无需改动 dsh 本体

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

## 8. Rust 定位（后置，一期不实现）

- 原则：JS 只做壳，重逻辑 Rust sidecar（pet-rs 零侵入模式）
- 候选：notifier 的桌面通知、scheduler 的 cron 引擎、视觉/搜索等重 IO 功能
- 接入方式：JS 壳 spawn Rust 二进制，HTTP/WS 接 dsh（如 pet-rs 的 RpcClient + SseConnector）
- 时机：全家桶骨架跑通后，逐个功能评估是否值得上 Rust

## 9. 一期范围（MVP）

1. `dsh-kit` 聚合 bundle：cordis.patch.yml + 2-3 个占位功能子包
2. `dsh-kit` host 侧：state.ts + host.ts（list/enable/disable API）
3. 商店 webui 面板：StorePanel 挂到 sidebar slot
4. `pnpm dev` 热重载工具链（仿官方 dev-web.ts）
5. 验证闭环：add → 面板开关 → 重启状态保留

## 10. 参考

- dsh 源码：`refs/deepseek-harness/`（apps/cli/src/plugin.ts、packages/boot/app-boot、packages/extensions/ui-cordis、packages/extensions/cordis-host-runner）
- Rust sidecar 参考：`refs/dsh-plugin-pet-rs/`
