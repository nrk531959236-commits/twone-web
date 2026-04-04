# Twone Web3.0 Community Homepage Prototype

为 Twone Web3.0 社区搭建的 Next.js 首页 / Landing Page 原型。

## 技术选型

- Next.js 16
- React 19
- TypeScript
- App Router
- 适合后续部署到 Vercel

## 已完成内容

当前原型包含：

- Hero 首屏
- 价值介绍 / 平台定位
- 会员权益区块
- 课程入口模块
- AI 助手入口模块
- CTA 行动区
- Footer 页脚
- 深色、现代、偏 Web3 科技感的视觉风格

## 本地运行

进入项目目录：

```bash
cd /Users/eryi/.openclaw/workspace/twone-web
```

安装依赖（create-next-app 已自动安装，如需重装再执行）：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

然后打开：

```text
http://localhost:3000
```

## 生产构建

```bash
npm run build
npm run start
```

## 关键文件

- `src/app/page.tsx`
  - 首页结构与全部文案
- `src/app/globals.css`
  - 全局样式、深色科技风视觉、响应式布局
- `src/app/layout.tsx`
  - 页面 metadata 与全局布局
- `package.json`
  - 运行脚本与依赖配置

## 后续可扩展方向

- 接入会员申请表单
- 接入登录系统（Clerk / NextAuth / Supabase Auth）
- 接入支付（Stripe / Lemon Squeezy）
- 接入 CMS 或 Notion/MDX 内容系统
- 增加课程详情页、社群介绍页、AI 助手对话页
- 一键部署到 Vercel
