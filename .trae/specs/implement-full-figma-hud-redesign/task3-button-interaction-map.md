# Task 3 按钮与交互映射表

| 区域 | 元素 | 状态 | 路由/行为 | 参数/上下文 | 接口绑定 |
|---|---|---|---|---|---|
| 顶部导航 | 总览/趋势分析/类型分析/分区分析 | normal/active | `navigate(path)` | 当前全局筛选保留 | 页面切换后按页请求 |
| 顶部操作区 | 主题切换 | normal/hover | `toggleTheme()` | `ccv.theme.mode` 持久化 | 无 |
| 顶部操作区 | 通知/设置图标 | normal/hover | 保留入口 | 无 | 无 |
| 全局筛选条 | 清空筛选 | normal/hover | `clearFilters()` | 重置 `year/primaryType` | 触发各页重新请求 |
| 标题栏 | 最小化/最大化/关闭 | normal/hover | IPC 发送窗口控制事件 | Electron 主进程处理 | 无 |
| 状态面板 | 重新加载 | normal/active | 调用页面 `fetchData()` | 保留当前筛选 | 对应分析 API 重试 |
| 调试面板 | 清空历史 | normal/active | `clearRequestHistory()` | 清空本地历史缓存 | 无 |
| 图表组件 | 点击数据点 | normal/active | 触发统一图表事件协议 | 同步 year/type/district | 触发相关接口重拉 |
| 图表组件 | 清除刷选/图例显隐 | normal/active | 派发 clear/toggle 事件 | 保持跨图语义一致 | 触发联动重绘 |

## 权限与边界
- 本轮前端交互均为本地客户端行为，不新增后端鉴权口径。
- 路由与请求路径保持既有契约，不引入破坏性 URL 变更。
