package com.example.foodmapapp

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech // THÊM IMPORT NÀY
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.Locale // THÊM IMPORT NÀY

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener { // THÊM GIAO TIẾP TTS

    // Khai báo biến máy đọc Native của Android
    private lateinit var tts: TextToSpeech

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Khởi tạo máy đọc TTS ngay khi mở App
        tts = TextToSpeech(this, this)

        val webView = findViewById<WebView>(R.id.webView)

        // 1. Cấu hình WebViewClient để xử lý tải trang
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.util.Log.d("WebViewStatus", "Đã tải xong trang: $url")
            }
        }

        // 2. Cấu hình WebSettings - Tối ưu cho Giọng nói và GPS
        val settings: WebSettings = webView.settings

        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.setGeolocationEnabled(true)

        // QUAN TRỌNG: Cho phép truy cập file assets và thực thi JS cục bộ
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true

        // QUAN TRỌNG: Mở khóa âm thanh tự động
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setJavaScriptCanOpenWindowsAutomatically(true)

        // Hỗ trợ nội dung hỗn hợp và tối ưu hóa hiển thị
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Phá bỏ rào cản Sandbox cho Android đời cao (API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true)
        }

        // =====================================================================
        // 🪄 TUYỆT CHIÊU CẦU NỐI: Đưa bộ TTS của Android vào trong Javascript
        // =====================================================================
        class WebAppInterface {
            @JavascriptInterface
            fun speak(text: String, langCode: String) {
                // Đổi giọng đọc theo ngôn ngữ React gửi qua
                when (langCode) {
                    "en" -> tts.language = Locale.US
                    "zh" -> tts.language = Locale.CHINA
                    else -> tts.language = Locale("vi", "VN")
                }
                // Bắt đầu đọc (Xóa giọng cũ nếu đang đọc dở)
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
                android.util.Log.d("NativeTTS", "Đang đọc nội dung: $text")
            }

            @JavascriptInterface
            fun stop() {
                if (tts.isSpeaking) {
                    tts.stop()
                    android.util.Log.d("NativeTTS", "Đã ra lệnh tắt tiếng!")
                }
            }
        }

        // Gắn cầu nối vào WebView với tên gọi là "AndroidBridge" (Rất quan trọng)
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")
        // =====================================================================

        // 3. Xử lý quyền định vị và bắt log từ JavaScript
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                // Tự động đồng ý quyền định vị trong WebView
                callback.invoke(origin, true, false)
            }

            // In log từ JS (console.log) ra Logcat để bạn dễ debug
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                android.util.Log.d("JS_Console", consoleMessage?.message() ?: "")
                return true
            }
        }

        // 4. Xin quyền hệ thống (GPS)
        requestLocationPermission()

        // 5. Tải ứng dụng từ thư mục assets
        webView.loadUrl("file:///android_asset/index.html")
    }

    // =====================================================================
    // CÁC HÀM BẮT BUỘC ĐỂ QUẢN LÝ TEXT-TO-SPEECH
    // =====================================================================

    // Hàm này chạy ngay khi TTS khởi tạo xong để báo cáo trạng thái
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            android.util.Log.d("NativeTTS", "✅ Máy đọc Android Native đã sẵn sàng!")

            // Set thử tiếng Việt xem máy có hỗ trợ không
            val result = tts.setLanguage(Locale("vi", "VN"))
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                android.util.Log.e("NativeTTS", "❌ Lỗi: Máy chưa cài gói Tiếng Việt Offline!")
            }
        } else {
            android.util.Log.e("NativeTTS", "❌ Lỗi khởi tạo TTS Native")
        }
    }

    // Hàm này tự động dọn dẹp bộ nhớ tắt màng loa khi bạn thoát App
    override fun onDestroy() {
        if (this::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        super.onDestroy()
    }

    // =====================================================================

    private fun requestLocationPermission() {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        // Kiểm tra nếu chưa có quyền thì xin, nếu có rồi thì thôi
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, permissions, 1)
        }
    }
}   