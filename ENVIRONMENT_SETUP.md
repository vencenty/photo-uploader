# 环境配置说明

## 概述

本项目支持开发环境和生产环境使用不同的API地址，通过 Vite 的配置函数和环境变量实现。

## 配置方式

### 1. 默认配置

- **开发环境**: `http://localhost:8787`
- **生产环境**: `https://photo-kits-server.vencenty.cc`

### 2. 环境变量覆盖

你可以通过环境变量来覆盖默认配置：

```bash
# 开发环境API地址
VITE_DEV_API_URL=http://localhost:8787

# 生产环境API地址
VITE_PROD_API_URL=https://photo-kits-server.vencenty.cc
```

### 3. 使用方法

#### 开发环境
```bash
npm run dev
# 或
yarn dev
```

#### 生产环境
```bash
npm run build
# 或
yarn build
```

## 配置示例

### 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件：

```env
# 开发环境API地址
VITE_DEV_API_URL=http://localhost:8787

# 生产环境API地址
VITE_PROD_API_URL=https://photo-kits-server.vencenty.cc
```

### 使用自定义API地址

```bash
# 使用自定义开发API
VITE_DEV_API_URL=http://192.168.1.100:8787 npm run dev

# 使用自定义生产API
VITE_PROD_API_URL=https://your-custom-api.com npm run build
```

## 日志输出

启动时会显示详细的配置信息：

```
🚀 ===== 环境配置信息 =====
📋 当前命令: serve
🌍 当前模式: development
🔧 开发环境: 是
🌐 API地址: http://localhost:8787
🔗 开发API: http://localhost:8787
🔗 生产API: https://photo-kits-server.vencenty.cc
========================
```

## 注意事项

1. 环境变量必须以 `VITE_` 开头才会被 Vite 识别
2. `.env.local` 文件不会被提交到版本控制
3. 修改环境变量后需要重启开发服务器
4. 生产环境构建时会自动使用生产API地址

## 故障排除

### 问题1: API请求失败
- 检查API地址是否正确
- 确认API服务器是否运行
- 查看控制台错误信息

### 问题2: 环境变量不生效
- 确认变量名以 `VITE_` 开头
- 重启开发服务器
- 检查 `.env.local` 文件格式

### 问题3: 代理配置问题
- 查看控制台代理日志
- 确认目标服务器可访问
- 检查网络连接 