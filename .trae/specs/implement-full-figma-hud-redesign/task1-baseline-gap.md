# Task 1 基线与差异台账

## 固定窗口与四屏基线
- 标准窗口：`1440 x 900`
- 基线对照图：
  - `.figma/image/screenshot_1_230.png`（Dashboard）
  - `.figma/image/screenshot_1_2.png`（Trend）
  - `.figma/image/screenshot_1_472.png`（District）
  - `.figma/image/screenshot_1_718.png`（Type）

## 主要差异与收敛结果
| 页面 | 发现差异 | 收敛动作 |
|---|---|---|
| Dashboard | 标题与状态区文案硬编码、主题无切换、状态态弱 | 接入 i18n、引入深浅主题、升级状态组件 |
| Trend | 页面标题与卡片标题语义偏技术化 | 统一中文语义标题并接入页面专属 shell 变体 |
| District | 局部卡片命名与 Figma 语义不一致 | 调整标题、保留数据联动路径与参数 |
| Type | 家暴标签/未知值降级文案分散 | 统一走语言包 key，集中降级策略 |

## 按钮与交互映射产物
- 主映射表：`task3-button-interaction-map.md`
- 验收与门禁：`task6-validation-report.md`
