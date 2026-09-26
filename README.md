# 塔罗

自用的塔罗占卜网页（PWA），电脑和手机通用。纯前端，没有后端。

## 运行

```bash
npm install
npm run dev        # 开发，http://localhost:5173（同一 Wi-Fi 下手机可用电脑 IP 访问）
npm run build      # 构建到 dist/，整个目录可放到任何静态托管
```

## 结构

- `src/data/cards.ts` 78 张牌的名称与正逆位牌义
- `src/data/spreads.ts` 牌阵（单张、三张、凯尔特十字、今日一牌）的位置与布局坐标
- `src/views/Session.tsx` 洗牌 → 抽牌 → 翻牌的完整流程
- `src/components/Fan.tsx` 牌堆、洗牌动画、弧形牌扇与挑牌手势
- `src/lib/ai/` AI 接入：OpenAI 兼容格式（fetch 直连）与 Claude（官方 SDK，按需加载）
- `src/lib/prompt.ts` 发给 AI 的提示词
- `src/lib/store.ts` 占卜记录与 AI 设置（都存在浏览器 localStorage）
- `public/sw.js` 离线缓存

## 素材

- 牌面：1909 年韦特塔罗扫描图（Pamela Colman Smith 绘，公有领域），来自 Wikimedia Commons。
  `npm run cards` 重新下载并压缩到 `public/cards/{lg,sm}`（原图缓存在 `.cache/raw`）。
- 牌背与应用图标：`npm run art` 由代码生成。

## AI 服务

设置里填接口地址、Key、模型。Key 只存在当前设备的浏览器里。
2026-09 实测可从网页直连（CORS 放行）：DeepSeek、通义千问、智谱、硅基流动、OpenRouter、Claude。
Kimi 预检未返回跨域许可；OpenAI 官方接口在本机网络下连不上。
