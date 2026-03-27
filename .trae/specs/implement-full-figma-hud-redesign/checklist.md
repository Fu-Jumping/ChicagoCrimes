# 全量 Figma HUD 对齐验收清单（Checklist）

## 一、视觉一致性（四屏）
- [x] Dashboard Overview 与设计稿关键区域像素差异 <= 1px
- [x] Trend Analysis 与设计稿关键区域像素差异 <= 1px
- [x] District Analysis 与设计稿关键区域像素差异 <= 1px
- [x] Type Analysis 与设计稿关键区域像素差异 <= 1px
- [x] 四屏的尺寸、圆角、间距、字体、图标、图片、动效均完成差异闭环

## 二、按钮与交互一致性
- [x] 已提交全量按钮/交互映射表（含文案、状态、路径、参数、权限、接口）
- [x] normal/hover/active/disabled 状态均与设计定义一致
- [x] 路由跳转、参数传递与后端接口调用与映射表一致
- [x] 核心交互流程经自动化测试通过

## 三、缺失元素补全
- [x] 空状态插图/面板按设计稿补齐
- [x] 加载骨架屏按设计稿补齐
- [x] 错误提示浮层按设计稿补齐
- [x] 工具提示与微动效按设计稿补齐
- [x] 新增组件具备 JSX/样式/单元测试，覆盖渲染、交互、无障碍

## 四、中文化与 i18n
- [x] 已建立统一 `zh-CN.json` 语言包
- [x] 所有按钮、标签、占位符、错误提示、帮助文本已中文化
- [x] aria-label 等无障碍文案已中文化且无硬编码
- [x] 国际化扫描脚本通过（无遗漏、无截断、无乱码）

## 五、深色模式与主题
- [x] 已提供亮色/深色两套 token 文件
- [x] 已实现运行时主题切换与用户偏好持久化
- [x] 容器边框、背景、字体、按钮、图标、分割线、阴影完成 token 化
- [x] 关键文本对比度满足 WCAG 2.1 AA（>= 4.5:1）
- [x] 已输出两套主题审查截图（Storybook 或同等方案）

## 六、交付与门禁
- [x] 已提交整改报告（差异清单、修复方案、token 映射、组件 API 文档）
- [x] UI 自动化测试脚本覆盖所有改动点且通过
- [x] ESLint、Stylelint、commit-lint 全部通过且无新增警告
- [x] 前端性能基线检测通过（LCP <= 2.5s，CLS <= 0.1，FID <= 100ms）

## 附注
- 门禁命令：`npm run gate:release`
- 报告文档：`task1-baseline-gap.md`、`task3-button-interaction-map.md`、`task6-validation-report.md`
