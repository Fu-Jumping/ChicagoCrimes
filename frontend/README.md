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
