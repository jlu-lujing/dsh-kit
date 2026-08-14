# 交接文档（HANDOFF）

> 更新日期：2026-08-14
> 项目：dsh-kit —— DeepSeek Harness (DSH) 傻瓜式插件全家桶

## 1. 项目目标

做一个「傻瓜式」的 DSH 插件聚合包：**装一个包，所有功能开箱即用**。
相当于一个插件管理器 + 所有插件打包在一起，面向开箱即用，尽量减少用户配置。

## 2. 当前状态

- 空项目骨架已建好：workspace 根 + packages/ 目录 + pnpm workspace
- GitHub 仓库：**https://github.com/jlu-lujing/dsh-kit**（**PRIVATE**，账号 jlu-lujing）
- 本地路径：`~/workspace/dsh-kit`
- 已有文件：README.md（含插件清单待填表格）、.gitignore（排除 refs/ 等）、package.json、pnpm-workspace.yaml
- **还没有任何实际插件代码** —— 下一步是生成第一个功能插件

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

## 7. 近期待办

- [ ] 用 create-dsh-plugin 生成第一个功能插件（建议先做一个简单 tool 插件验证全家桶流程）
- [ ] 确定全家桶功能清单（自己写，非收录）
- [ ] 搭聚合包结构（类似 dsh-web-ui-all：aggregate.yml + 子包 dependencies）
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

# 配置查看
dsh web --dump-config
dsh web --dump-default-config

# git（私有仓库）
git push
```
