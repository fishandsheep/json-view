# JSON Crack Editor — 复刻版

对 [https://jsoncrack.com/editor](https://jsoncrack.com/editor) 的功能复刻，按
[GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance-src/dm)
的最佳实践，用**原生 Web 平台能力**替代原站 2021 年代��的组件库。

设计与与原站的对照分析见 [ANALYSIS.md](./ANALYSIS.md)。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 类型检查 + 生产构建 → dist/
npm run preview
```

## 已实现功能

**P0**
- Monaco 文本编辑�� ⇄ 图可视化双栏，Allotment 可拖拽分隔条（300–800px）
- 实时转换（400ms debounce）· Valid / Invalid 状态与错误信息悬浮提示
- JSON / YAML / XML / CSV 四格式互转（切换格式自动转换）
- 图视图：ELK 分层布局、平移缩放、节点折叠/展开、旋转布局方向、聚焦首节点、适应屏幕
- 节点点击 → NodeModal（内容 + JSON Path）
- 图内搜索高亮 · Graph / Treeyard 视图切换
- 暗色 / 亮色主题切换（无闪烁）· 全屏图模式（左缘悬停展开按钮）
- 整页拖放 / 文件选择导入 · GitHub 链接 · 浏览器全屏

**P1**
- File → Import（URL / 文件）/ Export（下载文件）
- Tools → JSON Query (jq, WASM) · JSON Path · JSON Schema（应用��� Monaco 校验）· Generate Type
  （TypeScript / TS combined / Go / JSON Schema / Kotlin / Rust，WASM）
- 导出图片 PNG / JPEG / SVG，含背景色与剪贴板复制
- 快捷键：`⌘+=` 放大 · `⌘-` 缩小 · `⇧1` 聚焦首项 · `⇧2` 适应 · `⌘F` 搜索 · `⌘S` 导出 · `⌘⇧D` 旋转
- sessionStorage 对话持久化 · `?json=<url>` URL 导入 · 离开前未保存提醒

**P2**
- 画布设置：Zoom on Scroll、Rulers（网格）
- 节点上限 1500，超出显示 NotSupported 提示
- 大文档性能保护：图节点数超过 250 时自动折叠为前两层（可逐层 "+" 展开，工具栏可一键全部展开），并自动关闭逐节点投影滤镜
- 本地处理隐私徽标、SEO meta、暗色主题色

## 技术栈

Vite 7 · React 19 · TypeScript · Monaco Editor · `jsoncrack-react`（图渲染，Apache-2.0）
· zustand · jsonc-parser / js-yaml / fast-xml-parser / json-2-csv · jq-web & json_typegen_wasm（WASM，按需加载）
· html-to-image

## modern-web-guidance 落地对照

| 指南 | 实现位置 | 说明 |
| --- | --- | --- |
| `dark-mode` / `dark-mode-toggle` / `browser-ui-theming` | `index.html`、`src/styles/global.css` | 还原前内联脚本读 `localStorage` 或 `prefers-color-scheme`，写入 `<html data-theme>`，无闪烁；`color-scheme` 驱动原生控件与滚动条 |
| `color` | `src/styles/global.css` | 设计令牌统一 `oklch`/`light-dark()`，附带不支持 `light-dark()` 时的 `@supports` 回退 |
| `app-menus` / `menu` | `src/components/Menus.tsx`、`src/styles/menu.css` | 原生 Popover API 菜单栏：真相 `role="menubar"`、roving tabindex、focus 预览、←→ 切换、指向切换、即时切换禁用过渡；focusgroup 与 invoker commands 均带特性检测降级 |
| `toolbar` | 同上（`role="menubar"`）+ 图悬浮`Toolbar` | 工具栏语义与键盘可访问性 |
| `dialog` / `position-anchor` / `scroll-under-modal` | `src/components/Modal.tsx`、`modal.css` | 原生 `<dialog showModal()>`：内置 top layer、Esc、焦点陷阱；`@starting-style` + `allow-discrete` 进出动画；点击遮罩 light dismiss；原生 radio 分段控件 |
| `interest-triggered-tooltips` / `position-aware-tooltips` | `global.css` `[data-tip]` | 纯 CSS `::after` 提示，无 JS 气泡库 |
| `2d-panning` | 图视图（依赖 `jsoncrack-react` 的 react-zoomable-ui） | trackpad 缩放可选开关 |
| `performance` | `App.tsx`、`LiveEditor.tsx`、`jsonAdapter.ts`、`Toolbar.tsx` | 图引擎 `React.lazy` 拆分（首屏 423→354 kB）；各格式解析器动态导入；jq/types/ELK WASM 均按需加载；编辑到重布局 400ms debounce |
| `accessibility` | 所有交互组件 | 语义化 button、`aria-label`、`aria-expanded`/`aria-checked`、`aria-pressed`、`role="alert"`/`status`、`:focus-visible` 轮廓、`prefers-reduced-motion` 全局降级 |
| 原生 File API | `FullscreenDropzone.tsx`、`ImportModal.tsx` | 原生 `dragenter/dragover/drop` 拖放导入，替代 Mantine Dropzone |

## 目录结构

```
src/
├── main.tsx / App.tsx        应用骨架
├── styles/  global.css 设计令牌（oklch + light-dark）· menu.css · modal.css
├── components/  Menus.tsx 原生 Popover 菜单栏 · Modal.tsx <dialog>/Toast/CodeBlock/Segmented
├── editor/  Toolbar · BottomBar · TextEditor(Monaco) · LiveEditor · GraphView
│            GraphToolbar(玻璃拟态悬浮栏) · GraphExtras · SearchInput · TreeView · FullscreenDropzone
├── hooks/   useFocusNode.ts
├── modals/  Import / Download / JQ / JPath / Schema / Type / Node + ModalController
├── stores/  file · json · config · graph · modal
├── lib/     jsonAdapter · helpers · search · highlight · json2go
├── data/    example.json（与原站同款默认示例）
└── enums.ts
```

## 说明

- 图渲染直接使用原站官方开源包 `jsoncrack-react`，画布行为与原站一致。
- Monaco 以 npm 本地打包（ESM + `?worker`），不依赖 unpkg 等 CDN，也不产生全局 `define`。
- jq-web 的 WASM 二进制在 `npm run dev|build` 时自动从 `node_modules` 复制到 `public/jq.wasm`。
- 原站 ToDiagram/Chrome 扩展等推广入口未复刻，GA 埋点已移除。
- 大文档（如图节点 > 250）首载自动折叠到前两层：全量渲染 1300 节点约需 15 秒且产生 8 万 DOM 节点，折叠后即时呈现、逐层展开零卡顿。
