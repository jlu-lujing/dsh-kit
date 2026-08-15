# dsh-anchored-standard

dsh-kit 全家桶第 5 个功能包，收录社区项目
[xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)
（原始提交 `f57a1bde2dbaba3039bdae8631f78a0cb3ae3ebe`）。

本包是一个 **agent preset 文件安装器**（不是普通 Cordis 服务插件）：它把上游的
`preset/` 目录随包分发，并在 row 启用时安装到：

```
${DSH_HOME:-~/.dsh}/.agent-presets/anchored-standard
```

安装后**完整重启 DeepSeek Harness**，在**新建的空白会话**里选择
**Anchored Standard (experimental)** 即可使用（不要在已产生内容的会话中途切换 preset）。

## 这是什么

Anchored Standard 是二阶段 DSH agent preset：

- 第一次模型请求：只暴露 Minimal 预设的真实工具对 `bash` + `str_replace_editor`，
  并剥离 AGENTS.md/CLAUDE.md 摘要和 available-skills 提醒；
- 出现首次持久晋升信号（首次 `tool/call` 或首次 `assistant/message`，先到者为准）后，
  开放 Standard 完整工具目录并恢复常规上下文注入。

阶段从持久 session event 推导，resume / reload 不丢失状态。它是社区项目，并非
DeepSeek 官方 preset，也不代表 DeepSeek 背书。

## 安装器行为

- 目标目录不存在时，原子安装（先复制到隐藏 staging，再 rename 落位）。
- 目标目录已存在时**绝不覆盖**（保留用户自己的 preset 和修改）。
- 安装失败只告警，不会拖垮 DSH host 启动。
- 默认开启（`dsh-kit` 全家桶的一部分）；可用 `dsh-kit disable dsh-anchored-standard` 关闭，
  但已安装的 preset 目录不会自动删除。

## 开发 / 测试

```sh
pnpm --filter dsh-anchored-standard build      # node --check index.mjs
pnpm --filter dsh-anchored-standard typecheck  # node --check index.mjs
pnpm --filter dsh-anchored-standard test       # node --test（安装器 + 上游 preset 模块测试）
```

## 许可证

MIT。`preset/agent.cordis.yml` 基于 DeepSeek Harness Standard preset 修改，原始
DeepSeek 版权和 MIT 许可声明保留在 `NOTICE` 中（`LICENSE` / `NOTICE` 随包分发）。
