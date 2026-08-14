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

# 2. 安装到 dsh web profile（在项目父目录执行）
dsh plugin --profile web add -w ~/workspace/dsh-kit/packages/<插件名>

# 3. 启动 dsh web
dsh web
```

## 开发

```sh
pnpm build       # 全量构建
pnpm typecheck   # 类型检查
pnpm test        # 测试
```

新插件用官方脚手架生成，再移入 `packages/`：

```sh
npx create-dsh-plugin my-plugin -t tool
```

## 插件清单

（待补充——每个功能插件一行：名称、用途、状态）

| 包 | 功能 | 状态 |
| --- | --- | --- |
| 待定 | 待定 | 规划中 |

## 发布

（待补充——npm 发布流程、版本规范）

## License

MIT
