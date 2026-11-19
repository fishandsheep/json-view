# JSON Crack Editor 复刻分析报告

> 目标：尽可能复刻 https://jsoncrack.com/editor ，并遵循
> [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance-src) 现代最佳实践。

---

## 一、原站架构分析（源码级）

基于官方仓库 `AykutSarac/jsoncrack.com`（Apache-2.0，44.6k stars）main 分支的源码分析。

### 1.1 技术栈

| 层面 | 原站选型 | 说明 |
| --- | --- | --- |
| 框架 | Next.js 16（Pages Router + webpack） | SPA 式编辑器页，SSR 仅壳 |
| UI 库 | Mantine v8 + styled-components v6 | 双主题系统（Mantine color scheme + SC ThemeProvider） |
| 文本编辑器 | Monaco Editor（`@monaco-editor/react`，CDN loader） | JSON/YAML/XML/CSV 语法高亮 + 校验 |
| 分栏布局 | Allotment | 左编辑器 / 右可视化，可拖拽调宽 |
| 图渲染 | 自研 `jsoncrack-react` 包（reaflow + react-zoomable-ui + ELK layered 布局） | **已发布为公开 npm 包** |
| 状态管理 | zustand ×5 个 store | useFile / useJson / useConfig / useModal / useGraph |
| 通知 | react-hot-toast | — |
| 解析器 | jsonc-parser（JSONC 容错解析）· js-yaml · fast-xml-parser · json-2-csv | 统一 `contentToJson` / `jsonToContent` 适配层 |
| 工具链 | jq-web（WASM）· jsonpath-plus · json_typegen_wasm · html-to-image | 查询 / 代码生成 / 图片导出 |

### 1.2 页面结构（editor.tsx）

```
┌────────────────────────────────────────────────────────────┐
│ Toolbar (45px)  JSON CRACK │ File │ View │ Tools │  ★Upgrade│
│                            │      │       │       │ 🌙Chrome GH ⛶│
├──────────────────────┬─────────────────────────────────────┤
│ BottomBar            │                                     │
│  ⏴ Valid  ⟳Live     │        LiveEditor                  │
│    Transform  JSON ▾ │   ┌───────────────────────────┐     │
├──────────────────────┤   │  GraphView / TreeView     │     │
│                      │   │  (reaflow 画布)            │     │
│  TextEditor          │   │                           │     │
│  (Monaco)            │   │   右下角: 玻璃拟态悬浮工具栏  │     │
│                      │   │   ⊙ ⛶ − ＋ │ ⬇ 🔍 ⇄ ⊟ │ ⚙ │     │
│                      │   └───────────────────────────┘     │
├──────────────────────┴─────────────────────────────────────┤
│            FullscreenDropzone（整页拖放导入遮罩）              │
└────────────────────────────────────────────────────────────┘
  模态层: Import / Download / JQ / JPath / Schema / Type / Node
```

### 1.3 功能清单（按优先级）

**P0 — 核心体验**
- 双栏布局：Monaco 文本编辑器 ⇄ 图可视化，可拖拽分隔条，左侧可收起（全屏图模式，左缘悬停展开按钮）
- 实时转换（Live Transform）：编辑 → 400ms debounce → 解析 → 图更新（可关闭，关闭后出现 "Click to Transform"）
- Valid / Invalid 状态指示 + 错误信息 popover
- 多格式：JSON / YAML / XML / CSV，切换格式自动转换内容
- 图视图：ELK 分层布局、平移缩放、节点折叠/全部折叠、旋转布局方向（RIGHT→DOWN→LEFT→UP）、聚焦首节点、适应屏幕
- 节点点击 → NodeModal 详情
- 图内搜索高亮
- 主题切换（暗色默认 / 亮色），全站即时生效
- View 菜单：Graph / Tree 两种视图（树视图 = react-json-tree）
- 全屏拖放 / 点击导入文件

**P1 — 工具集**
- File 菜单：Import（文件/URL 导入）、Export（下载 `jsoncrack.json` 等）
- Tools 菜单：
  - JSON Query（jq，WASM）
  - JSON Path（jsonpath-plus）
  - JSON Schema（生成 + 应用于 Monaco 校验）
  - Generate Type（TypeScript / TS merged / Go / JSON Schema / Kotlin / Rust，WASM）
- 导出图片：PNG / JPEG / SVG（html-to-image），含尺寸选项
- 快捷键：`⌘/Ctrl+=` 放大、`⌘-` 缩小、`⇧1` 聚焦、`⇧2` 适应、`⌘F` 搜索、`⌘S` 导出、`⌘⇧D` 旋转
- sessionStorage 持久化（<80KB）+ `?json=<url>` URL 导入

**P2 — 周边**
- 顶部 Upgrade to Pro 渐变按钮、Chrome/GitHub 链接、浏览器全屏
- 画布设置：Zoom on Scroll（trackpad 手势）、Rulers 网格
- 节点渲染上限（默认 1500，超出显示 NotSupported）
- SEO / OG meta、manifest、favicon

### 1.4 视觉规范（从 CSS 变量还原）

**暗色（默认）**
| 令牌 | 值 | 用途 |
| --- | --- | --- |
| 工具栏 | `#262626` | Toolbar / BottomBar 背景 |
| 面板 | `#2f3136` | 编辑器区背景 |
| 画布网格底 | `#141414` / 网格线 `#1c1b1b` `#191919` | 图视图背景 |
| 边框 | `rgba(79,84,92,.48)` | 分隔线 |
| 文字 | `#b9bbbe`（hover `#dcddde`） | 工具栏文字（Discord 风格） |
| 节点：对象 | `#59b8ff` | 键名/对象节点 |
| 节点：数组 | `#FC9A40` | 数组节点 |
| 节点：数字 | `#e8c479` | — |
| 节点：bool | `#00DC7D` / `#F85C50` | true/false |
| 节点：null | `#939598` | — |

**亮色**：白底、对象紫 `#761CEA`、数组橙 `#FF6B00`、画布 `#f2f3f5` 系。

节点样式：圆角 5px、drop-shadow(2px 2px 0 rgba(0,0,0,.6)) 的"卡片"感；悬浮工具栏为玻璃拟态（blur(20px) saturate(180%) + 半透明底 + inset 高光）。字体 monaSans（自托管 woff2）。

### 1.5 数据流

```
Monaco onChange ─→ useFile.setContents()
                  ├─ contentToJson(contents, format)   ← js-yaml / fast-xml-parser / json-2-csv
                  ├─ 错误 → useFile.error（BottomBar Invalid + popover）
                  └─ debouncedUpdateJson (400ms) → useJson.setJson()
                                                  └→ jsoncrack-react <JSONCrack json=…> 重布局
```

---

## 二、modern-web-guidance 最佳实践映射

原站（Next.js + Mantine + styled-components）是 2021 年架构。复刻时按 Modern Web Guidance 用**原生平台能力替换组件库**，关键映射：

| 原站实现 | 现代最佳实践（指南 ID） | 收益 |
| --- | --- | --- |
| Mantine `Menu`（File/View/Tools） | **`app-menus` + `menu`**：原生 Popover API + `role="menubar"` + focusgroup + roving tabindex + anchor positioning（JS 降级） | 零依赖、原生 light-dismiss/顶层、键盘行为与原生菜单栏一致 |
| Mantine `Modal` ×7 | **`dialog`**：原生 `<dialog>`（`showModal()`，Esc/light-dismiss，`prevent-page-scroll-under-modal-dialog`），进入/退出动画用 `@starting-style` + `allow-discrete`（`animate-to-from-top-layer`） | 无焦点陷阱库、自带 top layer |
| Mantine `SegmentedControl`、`Tooltip`、`Popover` | `popover` + `interest-triggered-tooltips` / `position-aware-tooltips`（anchor positioning） | 同上 |
| styled-components 双主题对象 | **`dark-mode` + `dark-mode-toggle` + `browser-ui-theming`**：CSS `light-dark()` + `color-scheme` + localStorage（无闪烁内联脚本） | 主题系统从 JS 移回 CSS |
| 十六进制硬编码色 | **`color`**：`oklch()` 色彩空间 + 相对颜色语法派生明暗变体 | 可维护的设计令牌 |
| Mantine `Tooltip`+`ActionIcon` 工具栏 | **`toolbar`**：语义工具栏模式 | 可访问性 |
| react-zoomable-ui 画布平移 | **`2d-panning`**：`overscroll-behavior` + `touch-action` 正确配置 | 原生滚动手感 |
| （若用 canvas 渲染） | `expose-canvas-content-to-browser-features` | 无障碍可达 |
| 主线程解析大 JSON 卡顿 | **`performance` / `interactions-in-complex-layouts`**：解析与布局移入 Web Worker + `scheduler.yield()` 切片 | INP |
| 拖放导入 | `drag-and-drop` / 原生 DnD API | — |
| 布局 | **`css-layout`**：分栏可用原生 `resize`/grid；弹窗尺寸 `min()`/容器查询单位 | 现代 CSS |
| 入场/状态过渡 | **`natural-interactions`** + `@starting-style`、View Transitions（主题切换 `document.startViewTransition`） | 原生动效 |

> 已用 `npx modern-web-guidance search/retrieve` 验证以上指南均存在且可检索；
> `app-menus` 指南全文已读取，作为菜单栏实现蓝本。
> Popover API 已 Baseline（2025-01）；anchor positioning / focusgroup / invoker commands 为渐进增强，指南均给出 <50 LOC 的定向降级方案 —— 完全符合"负责任降级"原则。

---

## 三、复刻方案（建议）

### 3.1 技术选型建议

| 决策点 | 建议 | 理由 |
| --- | --- | --- |
| 构建 | **Vite 7 + React 19 + TypeScript**（或 Next.js 仅静态壳） | 编辑器是纯客户端应用，无需 SSR；Vite 更贴合"现代 Web 平台"理念 |
| 图渲染 | **直接用 npm 包 `jsoncrack-react@1.0.5`**（官方开源、Apache-2.0） | 100% 还原图视图（reaflow+ELK+折叠+缩放全套），省 ~3000 行核心代码 |
| 文本编辑器 | Monaco（`@monaco-editor/react`，与原站一致） | 还原度最高；备选 CodeMirror 6（更轻） |
| UI 组件 | **不用 Mantine**，按指南用原生 popover/dialog/menubar + 手写少量样式 | 这是本次"最佳实践"的核心体现 |
| 主题 | CSS `light-dark()` + `color-scheme` + `oklch()` 令牌 | 指南要求 |
| 状态 | zustand（沿用原站模式，迁移成本低、模式已验证） | — |
| 解析 | 与原站同款四件套 + 统一 adapter；**大文件解析进 Web Worker** | 性能最佳实践 |
| jq / 类型生成 | jq-web + json_typegen_wasm（同原站） | 功能一致 |

### 3.2 目录结构（Vite 方案）

```
json-view/
├── index.html
├── public/               # favicon、cursor.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx           # 页面骨架（Toolbar + SplitPane + Dropzone）
│   ├── styles/           # oklch 令牌、light-dark() 主题、基础样式
│   ├── components/       # Menubar(原生)、Dialog(原生)、Tooltips、Toaster…
│   ├── editor/           # TextEditor(Monaco)、BottomBar、视图切换
│   ├── graph/            # jsoncrack-react 封装、悬浮工具栏、搜索
│   ├── tree/             # TreeView
│   ├── modals/           # Import/Download/JQ/JPath/Schema/Type/Node
│   ├── stores/           # zustand: file/json/config/modal/graph
│   ├── lib/              # contentToJson adapter（Worker 化）、导出图片
│   └── data/             # example.json（与原站同款默认示例）
```

### 3.3 里程碑

1. **M1 骨架 + 主题**：布局、oklch/light-dark 令牌、原生 menubar、BottomBar（Valid/LiveTransform/格式切换）
2. **M2 核心闭环**：Monaco + jsoncrack-react 实时转换、错误状态、格式互转、拖放/URL 导入
3. **M3 工具**：7 个原生 `<dialog>` 模态（jq / JSONPath / Schema / Types / 导入 / 导出图片 / 节点详情）
4. **M4 交互打磨**：快捷键、折叠、旋转布局、搜索、Tree 视图、sessionStorage、`?json=` 支持
5. **M5 性能与无障碍**：Worker 解析、scheduler.yield、a11y 走查（对照指南 Verify 清单）

### 3.4 风险与说明

- `json_typegen_wasm` / `jq-web` 为 WASM，需懒加载（仅打开对应弹窗时 import()）——同时满足性能指南。
- anchor positioning 在 Firefox 尚未支持 → 按指南写 JS 定位降级（<50 LOC）。
- 原站 Pro/ToDiagram 推广位、GA 统计：复刻为静态占位或省略。
- monaSans 字体为原站自托管资源，复刻可用同源加载或以系统字体栈近似（JetBrains Mono / system-ui）。
