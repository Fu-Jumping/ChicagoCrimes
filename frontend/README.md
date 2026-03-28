# frontend

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### 首次启动与数据导入

桌面端首次启动时会检测后端 `GET /api/setup/status`。若 MySQL 尚未配置或数据/汇总表未就绪，将显示**首次设置向导**（环境检测、`.env` 写入、表结构、CSV 导入、汇总与索引构建）。请先启动 FastAPI 后端并准备好 `Crimes_-_2001_to_Present.csv`。

详细说明见仓库根目录 [`docs/user-guide.md`](../docs/user-guide.md)。

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Regression Gate

```bash
# Typecheck gate
$ npm run typecheck

# Strict typecheck gate
$ npm run typecheck:strict

# Performance benchmark gate
$ npm run perf:benchmark

# CI performance benchmark gate
$ npm run perf:benchmark:ci

# Combined regression gate
$ npm run gate:regression

# Release gate
$ npm run gate:release
```
