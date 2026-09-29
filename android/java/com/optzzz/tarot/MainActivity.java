package com.optzzz.tarot;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

/**
 * 塔罗安卓外壳：一个铺满全屏的 WebView，打开线上网站。
 * 网页内容画到状态栏和底部导航条下面（背景一直延伸到屏幕顶端），
 * 两块系统栏的高度通过地址参数 ?sat=&sab= 和 window.__setSafeArea() 告诉网页，由网页自己留出间距。
 */
public class MainActivity extends Activity {
    private static final String HOME = "https://optzzz.github.io/tarot/";
    private static final String HOST = "optzzz.github.io";
    private static final String RETRY = "tarot-retry://";
    private static final int BG = 0xFF0B0D18;

    private FrameLayout root;
    private WebView web;
    private float satDp = -1, sabDp = -1;
    private boolean started;
    private boolean clearHistoryAfterLoad;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        drawEdgeToEdge(getWindow());

        root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setTextZoom(100); // 页面按固定字号排版，不跟随系统字体缩放，避免牌阵布局被挤乱
        s.setUserAgentString(s.getUserAgentString() + " TarotApp/1.0");
        web.setWebViewClient(new Client());

        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if (saved != null && web.restoreState(saved) != null) started = true;
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            applyInsets(insets);
            return insets;
        });
        root.requestApplyInsets();
        // 兜底：个别系统迟迟不回调 insets 时也要把页面打开
        root.postDelayed(() -> {
            if (!started) {
                started = true;
                satDp = Math.max(satDp, 0);
                sabDp = Math.max(sabDp, 0);
                web.loadUrl(homeUrl());
            }
        }, 800);
        registerBack();
    }

    /** 状态栏、导航条透明，内容画到它们下面；刘海区域也允许绘制 */
    private static void drawEdgeToEdge(Window w) {
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) {
            w.setStatusBarContrastEnforced(false);
            w.setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                    ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                // 深色背景：状态栏、导航条图标用浅色
                c.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        }
    }

    /** 读出系统栏和键盘占的高度：系统栏交给网页留白；键盘弹出时把整个网页往上让出键盘的位置 */
    private void applyInsets(WindowInsets insets) {
        int top, bottom, ime;
        if (Build.VERSION.SDK_INT >= 30) {
            Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            top = bars.top;
            bottom = bars.bottom;
            ime = insets.getInsets(WindowInsets.Type.ime()).bottom;
        } else {
            top = insets.getSystemWindowInsetTop();
            int b = insets.getSystemWindowInsetBottom();
            int nav = insets.getStableInsetBottom();
            bottom = Math.min(b, nav);
            ime = b > nav ? b : 0; // 旧系统上键盘弹出时，底部高度里包含键盘
        }
        root.setPadding(0, 0, 0, ime);

        float d = getResources().getDisplayMetrics().density;
        float sat = Math.round(top / d * 10) / 10f;
        float sab = ime > 0 ? 0 : Math.round(bottom / d * 10) / 10f;
        if (sat == satDp && sab == sabDp) return;
        satDp = sat;
        sabDp = sab;
        if (!started) {
            started = true;
            web.loadUrl(homeUrl());
        } else {
            pushInsets();
        }
    }

    private String homeUrl() {
        return HOME + "?sat=" + Math.max(satDp, 0) + "&sab=" + Math.max(sabDp, 0);
    }

    private void pushInsets() {
        if (satDp < 0) return;
        web.evaluateJavascript("window.__setSafeArea&&window.__setSafeArea(" + satDp + "," + sabDp + ")", null);
    }

    /** 返回键 / 返回手势：网页里能后退就后退（关闭牌面详情、回到上一页），否则退到桌面 */
    private void registerBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    (OnBackInvokedCallback) this::handleBack);
        }
    }

    private void handleBack() {
        if (web.canGoBack()) web.goBack();
        else moveTaskToBack(true);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (u.toString().startsWith(RETRY)) {
                clearHistoryAfterLoad = true;
                view.loadUrl(homeUrl());
                return true;
            }
            if (HOST.equals(u.getHost())) return false;
            // 站外链接交给系统浏览器
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (Exception ignored) {
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (clearHistoryAfterLoad && url != null && url.startsWith(HOME)) {
                clearHistoryAfterLoad = false;
                view.clearHistory();
            }
            pushInsets();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            if (!req.isForMainFrame()) return;
            // 第一次打开且没有网络（之后网站会被离线缓存）：显示一个同色调的重试页
            String html = "<!doctype html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
                    + "<style>html,body{height:100%;margin:0;background:#0b0d18;color:rgba(235,230,218,.7);"
                    + "font:15px -apple-system,sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px}"
                    + "a{color:#cfb27b;text-decoration:none;border:1px solid rgba(207,178,123,.3);border-radius:12px;padding:10px 22px;letter-spacing:.1em}"
                    + "</style></head><body><div>无法连接网络</div><a href='" + RETRY + "'>重试</a></body></html>";
            view.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
        }
    }
}
