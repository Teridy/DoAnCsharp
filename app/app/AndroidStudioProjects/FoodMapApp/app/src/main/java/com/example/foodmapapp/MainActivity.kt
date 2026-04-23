package com.example.foodmapapp

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import java.util.Locale

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var tts: TextToSpeech

    // =====================================================================
    // 📍 LOGIC CHUẨN: FUSED LOCATION PROVIDER
    // Tự động kết hợp GPS Vệ Tinh + Wi-Fi + Trạm di động để ra tọa độ cực chuẩn
    // =====================================================================
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private var lastLat: Double? = null
    private var lastLon: Double? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tts = TextToSpeech(this, this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        startStandardGPS() // Bắt đầu định vị chuẩn

        val webView = findViewById<WebView>(R.id.webView)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.util.Log.d("WebViewStatus", "Đã tải xong trang: $url")
            }
        }

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.setGeolocationEnabled(true)
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setJavaScriptCanOpenWindowsAutomatically(true)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true)
        }

        // =====================================================================
        // 🪄 CẦU NỐI JS (Không thay đổi trên Frontend)
        // =====================================================================
        class WebAppInterface {
            @JavascriptInterface
            fun speak(text: String, langCode: String) {
                when (langCode) {
                    "en" -> tts.language = Locale.US
                    "zh" -> tts.language = Locale.CHINA
                    else -> tts.language = Locale("vi", "VN")
                }
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
            }

            @JavascriptInterface
            fun stop() {
                if (tts.isSpeaking) tts.stop()
            }

            @JavascriptInterface
            fun getLatitude(): Double = lastLat ?: 0.0

            @JavascriptInterface
            fun getLongitude(): Double = lastLon ?: 0.0

            @JavascriptInterface
            fun hasGPS(): Boolean = lastLat != null && lastLon != null
        }

        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        // 3. Xử lý quyền WebView Geolocation
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                android.util.Log.d("JS_Console", consoleMessage?.message() ?: "")
                return true
            }
        }

        // 4. Xin quyền hệ thống
        requestLocationPermission()

        // 5. Tải Web (Assets)
        webView.loadUrl("file:///android_asset/index.html")
    }

    // =====================================================================
    // 📍 TRIỂN KHAI FUSED LOCATION + AGGRESSIVE NETWORK PROVIDER
    // =====================================================================
    @SuppressLint("MissingPermission")
    private fun startStandardGPS() {
        val fineLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        
        // Nếu không có bất kỳ quyền nào (cả Fine và Coarse đều bị từ chối), thì mới thoát
        if (!fineLocation && !coarseLocation) {
            android.util.Log.e("NativeGPS", "BỊ TỪ CHỐI TẤT CẢ QUYỀN ĐỊNH VỊ")
            return
        }

        // 1. Dùng FusedLocation
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2000)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(1000)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    lastLat = location.latitude
                    lastLon = location.longitude
                }
            }
        }
        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
            if (location != null) {
                lastLat = location.latitude
                lastLon = location.longitude
            }
        }

        // 2. Chế độ Bạo lực (Aggressive Fallback): Ép truy xuất thẳng từ Cột sóng / Wi-Fi cấp thấp
        try {
            val locationManager = getSystemService(LOCATION_SERVICE) as android.location.LocationManager
            val listener = object : android.location.LocationListener {
                override fun onLocationChanged(location: Location) {
                    // Ưu tiên cập nhật nếu tọa độ mới chính xác hơn
                    lastLat = location.latitude
                    lastLon = location.longitude
                }
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            if (locationManager.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(android.location.LocationManager.NETWORK_PROVIDER, 2000, 0f, listener)
            }
            if (locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER, 2000, 0f, listener)
            }
        } catch (e: Exception) {
            android.util.Log.e("AggressiveGPS", "Lỗi fallback: ${e.message}")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startStandardGPS()
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(Locale("vi", "VN"))
        }
    }

    override fun onDestroy() {
        if (this::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        if (this::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
        super.onDestroy()
    }

    private fun requestLocationPermission() {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, permissions, 1)
        }
    }
}