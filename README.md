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

## 已知限制：安卓上安装后的角标与状态栏（2026-09-29 查证）

- **桌面图标右下角的 Edge 角标**：Edge 安卓版"安装"网页应用时，实际只创建一个桌面快捷方式，
  所以带 Edge 角标，也不会出现在应用抽屉里；Chrome 会生成真正的应用包（WebAPK），没有角标，
  但生成过程依赖 Google Play 服务。网站本身已满足全部安装条件（Edge 开发者工具检查 0 个错误），
  这个角标网站侧无法去掉。参考：Microsoft Q&A「Edge Android does not truly install PWA」。
- **状态栏颜色**：Edge 安卓版对安装的网页应用不应用 `theme_color`，有多份用户报告；
  本站顶部边缘实测颜色约为 #0b0d18，与设定的 theme_color 一致，所以在遵守该设置的浏览器里不会有色差。
- **让背景延伸到状态栏下面**：目前所有浏览器安装的网页应用都做不到。Chrome 在 2026-07 开始为已安装应用
  接入 short-edges cutout 模式，尚未发布正式版；Edge 通常更晚跟进。
- **可行的路**：①有 Google 服务的手机改用 Chrome 安装，可去掉角标、状态栏跟随 theme_color（但背景仍不延伸）；
  ②做一个安卓 WebView 外壳 APK，可以真正全屏沉浸、背景延伸到状态栏下、没有角标（已采用，见下）。

## 安卓 App（WebView 外壳）

- 源码在 `android/`：一个全屏 WebView 打开 https://optzzz.github.io/tarot/ ，网站更新后 App 自动同步。
- 内容铺到状态栏和导航条下面；两者的高度通过地址参数 `?sat=&sab=` 和 `window.__setSafeArea()` 传给网页，
  网页用 CSS 变量 `--sat` / `--sab` 留出间距（浏览器里这两个变量取 `env(safe-area-inset-*)`）。
- 打包：`npm run android:setup`（下载 JDK 与安卓构建工具到 `vendor/`，约 600 MB）→ `npm run android`
  → `android/build/tarot-<版本>.apk`。不用 Gradle，直接调用 aapt2 / javac / d8 / zipalign / apksigner。
- 更新 App 本身时把 `android/version.json` 的 `code` 加 1 再打包。
- 1.0 在真机上一点开就闪退：`onCreate` 里在 `setContentView` 之前调用了 `Window.getInsetsController()`，
  而 `PhoneWindow.getInsetsController()` 直接 `return mDecor.getWindowInsetsController()`、不判空；
  之前调用的 setStatusBarColor / setAttributes 等都只在 `mDecor != null` 时才碰它，不会创建它
  （已对照 AOSP android11 / 14 / 16 / main 的 PhoneWindow.java 核实）。1.1 先调 `getDecorView()` 修复。
- 1.1 起加了崩溃记录：闪退后下一次打开会显示崩溃原因（含机型、系统、WebView 版本），方便截图排查。
  电脑上没有可用的安卓模拟器（需要开启 Windows"虚拟机监控程序平台"并重启），真机效果要靠手机验证。
- **签名文件 `android/release.keystore` 和 `android/keystore.properties` 只在本机、不进 git，务必备份。**
  丢了以后新打的包无法覆盖安装，只能卸载重装（App 里的记录会丢）。
