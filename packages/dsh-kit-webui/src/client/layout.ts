/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色。
 * - 右侧顶部标题栏：官方 conversation header 背景改成左栏同色，横贯全窗
 *   （含右侧详情列上方；顶部用左栏同色填充，视觉贯通）。
 * - 右侧边栏：官方 details 列（挤占式，展开时把中间内容区往左挤），
 *   标题栏折叠按钮调用官方 ctx.layout 的 openDetails()/closeDetails()。
 */

import { SYNC_EVENT } from './stats-panel.ts'

const STYLE_ID = 'dsh-kit-webui-layout-tweaks'

const LAYOUT_CSS = `
/* ── 全局：禁止非录入区的文本选取；鼠标默认箭头，不显示 I-beam ── */
:root {
  -webkit-user-select: none;
  user-select: none;
}
/* 最广覆盖：所有元素默认箭头。后续用 html 前缀提特异性豁免。 */
html,
body,
body * {
  cursor: default !important;
}
/* 可输入/可编辑/对话框（对话流）区：恢复选词能力 + text 光标 */
html input,
html textarea,
html [contenteditable="true"],
html [contenteditable=""],
html [role="textbox"] {
  -webkit-user-select: text;
  user-select: text;
  cursor: text !important;
}
html [data-chat-flow],
html [data-chat-anchor-key] {
  -webkit-user-select: text;
  user-select: text;
}
/* 对话流内可交互控件：pointer（文本本身仍是箭头，data-chat-flow 已豁免选词） */
html [data-chat-flow] button,
html [data-chat-flow] a,
html [data-chat-flow] select,
html [data-chat-flow] summary,
html [data-chat-flow] [role="button"],
html [data-chat-flow] [role="menuitem"],
html [data-chat-flow] [role="link"] {
  cursor: pointer !important;
}
/* 其余全局交互控件：pointer */
html button,
html a,
html select,
html summary,
html [role="button"],
html [role="menuitem"],
html [role="link"],
html [role="tab"],
html label {
  cursor: pointer !important;
}
/* 右栏拖拽柄 */
.dsh-kit-right-resizer {
  cursor: col-resize !important;
}

/* 左栏与内容区分割线：透明（无视觉分割线，宽度保留） */
.pI_x6G_sidebarCol {
  border-right-color: transparent !important;
}

/* 左栏 logo 行隐藏：logo 与折叠按钮已移到标题栏，左栏从新会话开始 */
.pI_x6G_sidebarCol .hHd-Xa_logoRow,
.pI_x6G_sidebarCol [class*="logoRow"] {
  display: none !important;
}
.pI_x6G_sidebarCol button {
  position: relative;
  z-index: 100;
}

/* 标题栏左侧：logo + 左折叠按钮 */
.dsh-kit-titlebar-logo {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  margin-right: 18px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
}
.dsh-kit-left-toggle {
  cursor: pointer;
  width: 28px;
  height: 28px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: none;
  border-radius: 50%;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
}
.dsh-kit-left-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* 左上角常驻 logo + 左折叠钮：独立 fixed 容器，
   不受官方 header 隐藏（新会话 blank 页 header display:none）影响，始终显示。
   --dsh-kit-left-width = 紧凑 wordmark(高16→宽~122) + gap + 折叠钮 + padding */
.dsh-kit-titlebar-left {
  --dsh-kit-left-width: 190px;
  position: fixed;
  top: 0;
  left: 0;
  height: 60px;
  width: var(--dsh-kit-left-width);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 0 12px;
  box-sizing: border-box;
  z-index: 201;
  background: transparent;
  pointer-events: none;
}
.dsh-kit-titlebar-left > * {
  pointer-events: auto;
}
/* 紧凑 wordmark：缩小到高16px（宽按 182:24 比例 → 约122px），避免 logo 区过长 */
.dsh-kit-titlebar-left .dsh-kit-titlebar-logo {
  flex: none;
}
.dsh-kit-titlebar-left .dsh-kit-titlebar-logo svg {
  display: block;
  height: 16px;
  width: auto;
}

/* 顶部标题栏：fixed 贯穿整窗（跨左栏+内容区），高度对齐左栏 logo 行 60px */
/* 带左上/右上 12px 圆角：desktop 透明窗体依赖 #root 的 border-radius 做窗口圆角，
   而 fixed 标题栏贴 top:0 不会被 #root 的 overflow:hidden 裁剪，必须自己补圆角，
   否则会盖住窗口上方的两个圆角。最大化时取消（与 desktop 的
   body.dshkit-maximized #root 规则对齐）。 */
.wSkVaW_header {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  /* z-index 低于 settings overlay(1000) 等模态层：标题栏不再盖住设置页，
     同时高于对话区内部最高层级(100)，不会被子元素盖住 */
  z-index: 200 !important;
  height: 60px !important;
  padding: 0 20px !important;
  box-sizing: border-box;
  background: var(--dsw-specific-sidebar-fill) !important;
  border-bottom-color: transparent !important;
  border-radius: 12px 12px 0 0 !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
body.dshkit-maximized .wSkVaW_header {
  border-radius: 0 !important;
}

/* 下方 frame 整体下移避开 fixed 标题栏；用 height+margin 而非 padding，
   避免 grid 高度超出视口把底部输入框挤出屏幕 */
.pI_x6G_frame {
  box-sizing: border-box;
  height: calc(100% - 60px) !important;
  margin-top: 60px;
}
.wSkVaW_header .wSkVaW_titleRow {
  min-height: 0;
}
/* 标题行整体往右：按顺序 logo→折叠→(空)→标题→右侧，避免叠在一起 */
.wSkVaW_header .wSkVaW_titleRow {
  margin-left: calc(var(--dsh-kit-left-width, 190px) - 20px);
  min-width: 0;
}
.wSkVaW_header::after {
  display: none !important;
}

/* 禁用官方窗口层右侧 grid 列：右栏由我们放内容区内 */
.pI_x6G_detailsCol {
  display: none !important;
}

/* 取消顶部「对话/轨迹」标签切换器：整个中间区域都是对话 */
.wSkVaW_tabs {
  display: none !important;
}

/* 内容区定位上下文（右栏 absolute 用） + 背景与栏一体 + 底部留白 */
.wSkVaW_root {
  position: relative;
  background: var(--dsw-specific-sidebar-fill);
  /* 底部留出与边栏同色的 margin，让对话区不贴窗口底边 */
  padding-bottom: 6px;
}

/* 滑动过渡时长（收起时更明显，稍慢一点） */
.wSkVaW_root {
  --dsh-kit-right-slow: 0.28s;
  --dsh-kit-right-ease: var(--ds-ease-in-out, ease-in-out);
}

/* 对话区域（中间列：消息+输入框）：
   - 展开右侧栏时往左缩窄留出右栏空间，折叠时内容区扩展、但右侧仍留 6px
     与底部对称的边栏灰留白，不贴窗口右缘
   - 自身背景 bg-base（与边栏灰���分），在 sidebar-fill 外圈上形成
     白色圆角矩形；四圆角 + 细边框让形状清晰 */
.wSkVaW_scrollBody {
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  overflow: hidden auto;
  margin-right: 6px;
  transition: margin-right var(--dsh-kit-right-slow) var(--dsh-kit-right-ease);
}
.wSkVaW_root.dsh-kit-right-open .wSkVaW_scrollBody {
  margin-right: var(--dsh-kit-right-width, 320px);
}
/* 启动/刷新恢复展开状态时：禁用过渡，避免对话区先占满再收回 */
.wSkVaW_root.dsh-kit-right-boot .wSkVaW_scrollBody {
  transition: none !important;
}
/* 拖拽右栏宽度时，边距平滑跟随（无过渡：跟手） */


/* 右侧栏宽度拖拽边缘（贴面板左缘，col-resize） */
.dsh-kit-right-resizer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 5;
  touch-action: none;
}
.dsh-kit-right-resizer::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
}
.dsh-kit-right-resizer:hover::before,
.dsh-kit-right-resizer:active::before {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, transparent);
}
/* 拖拽中：禁用面板滑入/滑出与滚动区 margin 过渡，宽度跟手 */
.dsh-kit-right-resizing .dsh-kit-right-panel {
  transition: transform 0s, visibility 0s;
}
.dsh-kit-right-resizing .wSkVaW_scrollBody {
  transition: margin-right 0s;
}

/* 右侧栏：内容区内、标题栏下方、右缘贴内容区；transform 滑入/滑出。
   visibility 用延迟过渡：展开立即可见，收起等 transform 滑出后再隐藏，
   这样收起的滑出动画不会被 visibility:hidden 立即吞掉。 */
.dsh-kit-right-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 6px;
  width: var(--dsh-kit-right-width, 320px);
  background: var(--dsw-specific-sidebar-fill);
  border-left: 1px solid transparent;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  container-type: inline-size;
  container-name: right-panel;
  transform: translateX(102%);
  transition:
    transform var(--dsh-kit-right-slow) var(--dsh-kit-right-ease),
    visibility 0s linear var(--dsh-kit-right-slow);
  visibility: hidden;
  pointer-events: none;
}
.wSkVaW_root.dsh-kit-right-open .dsh-kit-right-panel {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
  transition:
    transform var(--dsh-kit-right-slow) var(--dsh-kit-right-ease),
    visibility 0s;
}
.dsh-kit-right-panel-header {
  flex: none;
  height: auto;
  display: flex;
  align-items: flex-end;
  padding: 0 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  gap: 22px;
}

/* 右侧栏标签页 —— 对齐官方 pbvGtq tabs 风格 */
.dsh-kit-right-tab {
  flex: none;
  cursor: pointer;
  font: inherit;
  background: transparent;
  border: 0;
  color: var(--dsw-alias-label-tertiary);
  padding: 7px 1px 9px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  position: relative;
}
.dsh-kit-right-tab:hover,
.dsh-kit-right-tab.is-active {
  color: var(--dsw-alias-label-primary);
}
.dsh-kit-right-tab:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
  color: var(--dsw-alias-label-primary);
  border-radius: 2px;
}
.dsh-kit-right-tab.is-active:after,
.dsh-kit-right-tab:focus-visible:after {
  content: "";
  background: var(--dsw-alias-label-primary);
  border-radius: 2px 2px 0 0;
  height: 2px;
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
}
.dsh-kit-right-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-kit-right-tabpane {
  display: none;
}
.dsh-kit-right-tabpane.is-active {
  display: block;
}
/* ══════ 信息面板：响应式会话统计（容器查询自适应右侧栏宽度） ══════ */
.dsh-kit-info-stats {
  display: block;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 20px;
}
.dsh-kit-info-stats .dsh-kit-info-empty {
  color: var(--dsw-alias-label-caption);
  font-size: 12px;
  line-height: 20px;
  padding: 8px 0;
}
.dsh-kit-stats-card {
  display: block !important;
  flex-direction: column !important;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--dsw-shadow-lv1, 0 1px 2px rgba(0, 0, 0, 0.04));
  animation: dsh-kit-stats-in .3s cubic-bezier(.22,.61,.36,1);
}
@keyframes dsh-kit-stats-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.dsh-kit-stats-head {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  margin-bottom: 12px;
}
.dsh-kit-stats-head-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);
}
.dsh-kit-stats-head-title {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-kit-stats-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 400;
  flex: none;
  white-space: nowrap;
}
.dsh-kit-stats-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
  animation: dsh-kit-stats-pulse 2s ease-in-out infinite;
}
.dsh-kit-stats-card { position: relative; }
@keyframes dsh-kit-stats-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .35; }
}
.dsh-kit-stats-body {
  display: block !important;
  width: 100% !important;
}
.dsh-kit-stats-body > * + * {
  margin-top: 16px;
}
/* 窄容器收窄间距 */
@container right-panel (max-width: 319px) {
  .dsh-kit-stats-body > * + * { margin-top: 12px; }
}
.dsh-kit-stats-donut-wrap {
  position: relative;
  width: 132px;
  height: 132px;
  z-index: 0;
}
.dsh-kit-stats-donut {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.dsh-kit-stats-donut-track {
  stroke: var(--dsw-alias-interactive-bg-hover);
  stroke-width: 12;
}
.dsh-kit-stats-donut-arc {
  stroke: url(#dsh-kit-stats-donut-grad);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: var(--dsh-kit-donut-c, 264);
  stroke-dashoffset: 264;
  transition: stroke-dashoffset .8s cubic-bezier(.22,.61,.36,1);
  filter: drop-shadow(0 3px 8px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent));
}
.dsh-kit-stats-card.dsh-kit-stats-live .dsh-kit-stats-donut-arc {
  stroke-dashoffset: var(--donut-target, 264);
}
.dsh-kit-stats-donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.dsh-kit-stats-donut-value {
  color: var(--dsw-alias-label-primary);
  font-size: 25px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.dsh-kit-stats-donut-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dsh-kit-stats-donut-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dsh-kit-stats-cache-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-kit-stats-cache-row-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dsh-kit-stats-cache-pct {
  color: var(--dsw-alias-state-success-primary);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.dsh-kit-stats-cache-sub {
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 16px;
}
.dsh-kit-stats-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, transparent), transparent 60%);
  border-radius: 12px;
  padding: 16px 14px 14px;
}
.dsh-kit-stats-hero .dsh-kit-stats-cache-row {
  align-items: center;
}
.dsh-kit-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.dsh-kit-stats-tile {
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  animation: dsh-kit-stats-tile-in .35s cubic-bezier(.22,.61,.36,1) both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
@keyframes dsh-kit-stats-tile-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.dsh-kit-stats-tile-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-kit-stats-tile-value {
  color: var(--dsw-alias-label-primary);
  font-size: 17px;
  font-weight: 650;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform .18s ease;
}
.dsh-kit-stats-tile:hover {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  transform: translateY(-1px);
}
.dsh-kit-stats-tile:hover .dsh-kit-stats-tile-value {
  transform: translateX(0);
}
.dsh-kit-flash {
  animation: dsh-kit-stats-flash .9s ease-out;
}
@keyframes dsh-kit-stats-flash {
  0% { color: var(--dsw-alias-state-business-primary); text-shadow: 0 0 8px color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, transparent); }
  60% { color: var(--dsw-alias-state-business-primary); }
  100% { color: inherit; }
}
.dsh-kit-accent-brand { color: var(--dsw-alias-state-business-primary); }
.dsh-kit-accent-good { color: var(--dsw-alias-state-success-primary); }
.dsh-kit-accent-warn { color: var(--dsw-alias-state-warn-primary); }
.dsh-kit-stats-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsh-kit-stats-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.dsh-kit-stats-section-title::before {
  content: "";
  width: 3px;
  height: 10px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  opacity: .8;
  flex: none;
}
.dsh-kit-stats-pairbar {
  display: flex;
  gap: 3px;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);
}
.dsh-kit-stats-pairbar-time [data-k$="-seg"]:nth-child(1) { background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-business-primary) 92%, #fff), var(--dsw-alias-state-business-primary)); }
.dsh-kit-stats-pairbar-time [data-k$="-seg"]:nth-child(2) { background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 92%, #fff), var(--dsw-alias-state-warn-primary)); }
.dsh-kit-stats-pairbar-token [data-k$="-seg"]:nth-child(1) { background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-business-primary) 92%, #fff), var(--dsw-alias-state-business-primary)); }
.dsh-kit-stats-pairbar-token [data-k$="-seg"]:nth-child(2) { background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-success-primary) 92%, #fff), var(--dsw-alias-state-success-primary)); }
.dsh-kit-stats-pairbar [data-k] {
  transition: width .5s cubic-bezier(.22,.61,.36,1);
  border-radius: 999px;
  min-width: 2px;
}
.dsh-kit-stats-pairlegend {
  display: flex;
  gap: 12px;
}
.dsh-kit-stats-pairitem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dsh-kit-stats-pairitem-swatch {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  flex: none;
}
.dsh-kit-stats-pairitem-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dsh-kit-stats-pairitem-value {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-kit-stats-pairbar-time + .dsh-kit-stats-pairlegend .dsh-kit-stats-pairitem:nth-child(1) .dsh-kit-stats-pairitem-swatch { background: var(--dsw-alias-state-business-primary); }
.dsh-kit-stats-pairbar-time + .dsh-kit-stats-pairlegend .dsh-kit-stats-pairitem:nth-child(2) .dsh-kit-stats-pairitem-swatch { background: var(--dsw-alias-state-warn-primary); }
.dsh-kit-stats-pairbar-token + .dsh-kit-stats-pairlegend .dsh-kit-stats-pairitem:nth-child(1) .dsh-kit-stats-pairitem-swatch { background: var(--dsw-alias-state-business-primary); }
.dsh-kit-stats-pairbar-token + .dsh-kit-stats-pairlegend .dsh-kit-stats-pairitem:nth-child(2) .dsh-kit-stats-pairitem-swatch { background: var(--dsw-alias-state-success-primary); }

@container right-panel (max-width: 319px) {
  .dsh-kit-stats-card { padding: 12px; }
  .dsh-kit-stats-donut-wrap { width: 108px; height: 108px; }
  .dsh-kit-stats-donut-value { font-size: 20px; }
  .dsh-kit-stats-cache-pct { font-size: 18px; }
  .dsh-kit-stats-tile-value { font-size: 15px; }
  .dsh-kit-stats-tile { padding: 6px 8px; }
  .dsh-kit-stats-body { gap: 12px; }
}
@container right-panel (min-width: 420px) {
  .dsh-kit-stats-hero {
    flex-direction: row;
    justify-content: flex-start;
    gap: 18px;
  }
  .dsh-kit-stats-hero .dsh-kit-stats-cache-row {
    align-items: flex-start;
  }
  .dsh-kit-stats-cache-row-label { font-size: 12px; }
  .dsh-kit-stats-cache-pct { font-size: 24px; }
}
@container right-panel (min-width: 520px) {
  .dsh-kit-stats-grid { grid-template-columns: repeat(4, 1fr); }
  .dsh-kit-stats-card { padding: 16px; }
  .dsh-kit-stats-body { gap: 18px; }
}
/* 右侧边栏折叠/展开按钮：标题栏最右侧、与左侧折叠按钮对称 */
.dsh-kit-right-toggle {
  cursor: pointer;
  width: 28px;
  height: 28px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: none;
  border-radius: 50%;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.dsh-kit-right-toggle:hover,
.dsh-kit-right-toggle[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
}
/* win/linux：左移避让右上角三按钮（与官方 headerUtilities 同宽度让位） */
body:not([data-dsh-platform="darwin"]) .dsh-kit-right-toggle {
  margin-right: 128px;
}
`

/** 右侧面板图标 = 左侧 IconPanelLeftOutline16 的水平镜像（createElementNS 构建，可靠）。 */
const SVG_NS = 'http://www.w3.org/2000/svg'

/** 官方 FishLogo 三文鱼 SVG path（primitives FishLogo），内置不依赖官方 DOM。 */
const FISH_LOGO_PATH = 'M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z'

/** 内置 FishLogo（三文鱼品牌图），与官方 primitives 一致。 */
function buildFishLogo(elem: Document, size = 22): SVGSVGElement {
  const svg = elem.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size * 17.04 / 23.16))
  svg.setAttribute('viewBox', '0 0 23.16 17.04')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  const path = elem.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', FISH_LOGO_PATH)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

function svgIcon(elem: Document, d: string): SVGSVGElement {
  const svg = elem.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  const g = elem.createElementNS(SVG_NS, 'g')
  g.setAttribute('transform', 'scale(-1,1) translate(-16,0)')
  const path = elem.createElementNS(SVG_NS, 'path')
  path.setAttribute('fill-rule', 'evenodd')
  path.setAttribute('clip-rule', 'evenodd')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'currentColor')
  g.appendChild(path)
  svg.appendChild(g)
  return svg
}

const LEFT_PANEL_PATH = 'M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z'

/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(layout?: { toggleSidebar: () => void }): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = LAYOUT_CSS
    ;(document.head ?? root).append(style)
  }

  // 同步标题栏高度到 root（供 details 列顶部填充使用）。
  const syncTitlebar = () => {
    const header = document.querySelector('.wSkVaW_header')
    const h = header ? Math.round(header.getBoundingClientRect().height) : 0
    root.style.setProperty('--dsh-kit-titlebar-height', `${Math.max(0, h)}px`)
  }
  syncTitlebar()

  // 移除历史残留的全屏拖拽条（.dshkit-dragbar），避免挡住左栏顶部按钮。
  document.querySelectorAll('.dshkit-dragbar').forEach((el) => el.remove())
  if (typeof ResizeObserver !== 'undefined') {
    const tryObserve = () => {
      const header = document.querySelector('.wSkVaW_header')
      if (header === null) return false
      const ro = new ResizeObserver(syncTitlebar)
      ro.observe(header)
      syncTitlebar()
      return true
    }
    if (!tryObserve()) {
      const mo = new MutationObserver(() => { if (tryObserve()) mo.disconnect() })
      mo.observe(document.body, { childList: true, subtree: true })
    }
  }

  // 右侧栏宽度：读存储，写回 CSS 变量。
  const RIGHT_WIDTH_KEY = 'dsh-kit:right-panel-width'
  const RIGHT_WIDTH_MIN = 260
  const RIGHT_WIDTH_MAX = 520
  const readRightWidth = (): number => {
    try {
      const v = Number(localStorage.getItem(RIGHT_WIDTH_KEY))
      if (Number.isFinite(v) && v >= RIGHT_WIDTH_MIN && v <= RIGHT_WIDTH_MAX) return v
    } catch { /* ignore */ }
    return 320
  }
  const applyRightWidth = (px: number) => {
    const w = Math.round(Math.min(RIGHT_WIDTH_MAX, Math.max(RIGHT_WIDTH_MIN, px)))
    root.style.setProperty('--dsh-kit-right-width', `${w}px`)
    try { localStorage.setItem(RIGHT_WIDTH_KEY, String(w)) } catch { /* ignore */ }
  }

  // 右侧栏展开/收起状态：持久化，切换对话/刷新都不自动折叠。
  const OPEN_KEY = 'dsh-kit:right-panel-open'
  const readOpen = (): boolean => localStorage.getItem(OPEN_KEY) === '1'
  const saveOpen = (open: boolean) => {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch { /* ignore */ }
  }

  // 挂拖拽边缘：按住面板左缘左右拖动调整宽度。
  const mountResizer = (panel: HTMLElement) => {
    if (panel.querySelector('.dsh-kit-right-resizer') !== null) return
    const resizer = document.createElement('div')
    resizer.className = 'dsh-kit-right-resizer'
    resizer.setAttribute('aria-hidden', 'true')
    panel.appendChild(resizer)

    let startX = 0
    let startW = 0
    let dragging = false

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      // 面板贴右缘，向左拖 = 变宽：宽度 = 起始宽 + (起始X - 当前X)
      applyRightWidth(startW + (startX - e.clientX))
      e.preventDefault()
    }
    const rootEl = () => document.querySelector('.wSkVaW_root')
    const onUp = () => {
      if (!dragging) return
      dragging = false
      rootEl()?.classList.remove('dsh-kit-right-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    resizer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      dragging = true
      startX = e.clientX
      startW = readRightWidth()
      rootEl()?.classList.add('dsh-kit-right-resizing')
      resizer.setPointerCapture?.(e.pointerId)
      e.preventDefault()
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    })
  }

  // 构建内容区内的右侧栏（懒创建，单例）。
  /** 是否新会话页（hero）：此时不显示右侧栏与折叠按钮。 */
  const isNewSession = () => !!document.querySelector('.wSkVaW_root[data-phase="hero"]')

  const ensurePanel = (): HTMLElement | null => {
    if (isNewSession()) return null
    let panel = document.querySelector('.dsh-kit-right-panel') as HTMLElement | null
    if (panel !== null) return panel
    const contentRoot = document.querySelector('.wSkVaW_root')
    if (contentRoot === null) return null
    panel = document.createElement('div')
    panel.className = 'dsh-kit-right-panel'
    const header = document.createElement('div')
    header.className = 'dsh-kit-right-panel-header'

    const tabs: Array<{ id: string; label: string }> = [
      { id: 'info', label: '信息' },
      { id: 'session', label: '会话' },
    ]
    const body = document.createElement('div')
    body.className = 'dsh-kit-right-panel-body'

    const panes = new Map<string, HTMLElement>()
    for (const t of tabs) {
      const tabBtn = document.createElement('button')
      tabBtn.type = 'button'
      tabBtn.className = 'dsh-kit-right-tab'
      tabBtn.textContent = t.label
      tabBtn.dataset.tab = t.id
      tabBtn.addEventListener('click', () => {
        header.querySelectorAll<HTMLElement>('.dsh-kit-right-tab').forEach((b) => b.classList.toggle('is-active', b === tabBtn))
        panes.forEach((pane, pid) => pane.classList.toggle('is-active', pid === t.id))
      })
      header.appendChild(tabBtn)

      const pane = document.createElement('div')
      pane.className = 'dsh-kit-right-tabpane'
      pane.dataset.pane = t.id
      body.appendChild(pane)
      panes.set(t.id, pane)
    }
    header.querySelector<HTMLElement>('.dsh-kit-right-tab[data-tab="info"]')?.classList.add('is-active')
    panes.get('info')?.classList.add('is-active')

    panel.appendChild(header)
    panel.appendChild(body)
    // 首次创建面板：套用已保存的宽度，再挂拖拽边缘。
    applyRightWidth(readRightWidth())
    contentRoot.appendChild(panel)
    mountResizer(panel)
    ensureInfoStats(panes.get('info') ?? null)
    return panel
  }

  // 确保右侧栏「信息」页有 .dsh-kit-info-stats 容器（实时统计 React 组件写入点）。
  const ensureInfoStats = (pane: HTMLElement | null) => {
    if (!pane) return
    let holder = pane.querySelector<HTMLElement>('.dsh-kit-info-stats')
    if (!holder) {
      holder = document.createElement('div')
      holder.className = 'dsh-kit-info-stats'
      pane.appendChild(holder)
    }
    // 保证信息页永远不是空白：先放一个可见的“加载中…”占位，
    // 实时统计组件写入真实数据时会被替换掉。
    if (!holder.querySelector('.dsh-kit-info-empty') && !holder.querySelector('[data-dsh-kit-live="stats"]')) {
      const empty = document.createElement('div')
      empty.className = 'dsh-kit-info-empty'
      empty.textContent = '会话统计加载中…'
      holder.appendChild(empty)
    }
    // 面板（含容器）就绪后，通知实时统计组件把最新数据写进来。
    // 等一帧再派发：确保 StatsPanelEntry 已挂载并注册了监听。
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event(SYNC_EVENT))
    })
  }

  const toggleBtn = () => document.querySelector('.dsh-kit-right-toggle') as HTMLButtonElement | null

  const setOpen = (open: boolean) => {
    const panel = ensurePanel()
    if (panel === null) return
    const contentRoot = document.querySelector('.wSkVaW_root')
    const btn = toggleBtn()
    const apply = () => {
      if (contentRoot) contentRoot.classList.toggle('dsh-kit-right-open', open)
      if (btn) btn.setAttribute('aria-pressed', open ? 'true' : 'false')
    }
    const panelEl = panel as HTMLElement & { __dshkitInited?: boolean }
    if (open && !panelEl.__dshkitInited) {
      // 首次：先确保处于收起态（transform 有初始值），下一帧再展开 → 首次也有动画
      panelEl.__dshkitInited = true
      if (contentRoot) contentRoot.classList.remove('dsh-kit-right-open')
      requestAnimationFrame(() => requestAnimationFrame(apply))
    } else {
      apply()
    }
    saveOpen(open)
  }
  const toggle = () => {
    const contentRoot = document.querySelector('.wSkVaW_root')
    const open = contentRoot?.classList.contains('dsh-kit-right-open') ?? false
    setOpen(!open)
  }

  // 静默同步展开/收起到存储值（无动画、不写回存储、不触发 setOpen）。
  // 用于对抗 React 重渲染把 .dsh-kit-right-open class 覆盖掉的情况
  // （切换对话等）：用户最后意图以存储为准，class 丢了就补回来。
  // 防抖：observer 高频触发时合并到下一帧，避免反复改 class。
  let syncScheduled = false
  /** 本次会话是否已把存储状态完整应用到首个面板（用于首帧免过渡）。 */
  let bootApplied = false
  const ensureOpenState = () => {
    if (syncScheduled) return
    const contentRoot = document.querySelector('.wSkVaW_root')
    if (contentRoot === null) return
    syncScheduled = true
    const apply = () => {
      syncScheduled = false
      const wantOpen = readOpen()
      const isOpen = contentRoot.classList.contains('dsh-kit-right-open')
      if (wantOpen !== isOpen) {
        // 首次恢复（启动/刷新）：禁用过渡，直接切到目标宽度，
        // 避免对话区先占满再平滑收回的闪烁。
        if (!bootApplied) contentRoot.classList.add('dsh-kit-right-boot')
        contentRoot.classList.toggle('dsh-kit-right-open', wantOpen)
        const btn = toggleBtn()
        if (btn) btn.setAttribute('aria-pressed', wantOpen ? 'true' : 'false')
        if (wantOpen) ensurePanel()
      }
      if (!bootApplied) {
        bootApplied = true
        // 下一帧移除 boot 类，恢复后续正常过渡
        requestAnimationFrame(() => requestAnimationFrame(() => contentRoot.classList.remove('dsh-kit-right-boot')))
      }
    }
    // 同步应用：MutationObserver 在 DOM 变化后、浏览器绘制前的微任务里触发，
    // 此时给 root 加 class 能让首帧就是目标的展开/收起宽度，避免先占满再跳变。
    apply()
  }

  // 标题栏右侧折叠按钮。
  const mountToggle = () => {
    if (isNewSession()) return
    if (document.querySelector('.dsh-kit-right-toggle') !== null) return
    const header = document.querySelector('.wSkVaW_header')
    if (header === null) return
    const titleRow = header.querySelector('.wSkVaW_titleRow')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dsh-kit-right-toggle'
    btn.setAttribute('aria-label', '折叠/展开右侧边栏')
    btn.title = '右侧边栏'
    btn.appendChild(svgIcon(document, LEFT_PANEL_PATH))
    btn.addEventListener('click', toggle)
    const host = titleRow ?? header
    host.appendChild(btn)
    syncTitlebar()
  }
  mountToggle()

  // 标题栏左侧 logo + 左折叠按钮（自己创建，控制 layout.toggleSidebar）。
  // 不再迁移官方 DOM，避免折叠态 React 重渲染导致图标丢失/无法展开。
  const mountLeftToggle = () => {
    if (typeof layout === 'undefined') return
    // 常驻左上角容器（logo + 左折叠钮）：
    // 独立 fixed，不受官方 header 隐藏（新会话 blank 页 header display:none）影响。
    let bar = document.querySelector('.dsh-kit-titlebar-left') as HTMLElement | null
    if (bar === null) {
      bar = document.createElement('div')
      bar.className = 'dsh-kit-titlebar-left'
      document.body.appendChild(bar)
    }

    // logo（最左）：复刻官方 BrandWordmark = 鲸鱼 + DeepSeek Harness 文字（最早 logo）。
    // 克隆官方 .hHd-Xa_brand 的完整 wordmark；拿不到时 fallback 内置 FishLogo 鲸鱼。
    let logo = bar.querySelector<HTMLElement>('.dsh-kit-titlebar-logo')
    if (logo === null) {
      logo = document.createElement('button')
      logo.type = 'button'
      logo.className = 'dsh-kit-titlebar-logo'
      logo.title = '新建会话'
      logo.addEventListener('click', () => layout.toggleSidebar())
      bar.appendChild(logo)
    }
    const brand = document.querySelector<HTMLElement>('.hHd-Xa_brand')
    const brandSvg = brand ? brand.querySelector('svg') : null
    // 首挂：克隆官方完整 wordmark；若当前只有 fallback 鱼、而官方 brand 现在可用，则升级为完整版。
    if (brandSvg && !logo.querySelector('.dsh-kit-titlebar-logo-brand')) {
      while (logo.firstChild) logo.removeChild(logo.firstChild)
      const clone = brandSvg.cloneNode(true) as SVGSVGElement
      clone.classList.add('dsh-kit-titlebar-logo-brand')
      logo.appendChild(clone)
    } else if (!brandSvg && logo.firstChild === null) {
      logo.appendChild(buildFishLogo(document))
    }

    // 折叠按钮（logo 右侧）。
    if (bar.querySelector('.dsh-kit-left-toggle') === null) {
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'dsh-kit-left-toggle'
      toggle.setAttribute('aria-label', '折叠/展开左侧边栏')
      toggle.title = '左侧边栏'
      toggle.appendChild(svgIcon(document, LEFT_PANEL_PATH))
      toggle.addEventListener('click', () => layout.toggleSidebar())
      bar.appendChild(toggle)
    }
  }
  mountLeftToggle()

  if (typeof MutationObserver === 'undefined') return
  const mo = new MutationObserver(() => {
    // 新会话页：隐藏右侧栏（若残留）且不挂折叠按钮
    if (isNewSession()) {
      const cr = document.querySelector('.wSkVaW_root')
      if (cr && cr.classList.contains('dsh-kit-right-open')) cr.classList.remove('dsh-kit-right-open')
      const rightToggle = document.querySelector('.dsh-kit-right-toggle')
      rightToggle?.remove()
      return
    }
    mountToggle()
    mountLeftToggle()
    ensureOpenState()
  })
  // 同时监听 class（折叠态/右栏开合）与 data-phase（新会话↔对话切换）
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-phase'] })

  // 立即尝试恢复一次：若 root 已在 DOM（插件晚于 React 挂载），
  // 同步应用存储状态，避免首帧先按默认折叠占满、再跳回展开。
  ensureOpenState()

  // 兜底：切换左侧会话后，无论 React 如何重渲染/重挂载 root，
  // 定期复核展开状态与存储一致（用户最后意图优先）。
  window.setInterval(() => {
    mountLeftToggle()
    ensureOpenState()
  }, 600)
}
