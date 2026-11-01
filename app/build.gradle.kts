plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ante.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.ante.app"
        minSdk = 26
        targetSdk = 36 // Google Play requires API 36 for new apps and updates since 31 Aug 2026
        versionCode = 4
        versionName = "0.4.0"
    }

    // Release signing: put your own keystore details in keystore.properties (never commit it;
    // see README "Release signing"). Without it, release builds fall back to the debug key so
    // they still install, but they must not be shared: anyone can sign with a debug key.
    val keystoreProps = rootProject.file("keystore.properties")
    signingConfigs {
        if (keystoreProps.exists()) {
            val p = java.util.Properties()
            keystoreProps.inputStream().use { stream -> p.load(stream) }
            create("release") {
                storeFile = rootProject.file(p.getProperty("storeFile"))
                storePassword = p.getProperty("storePassword")
                keyAlias = p.getProperty("keyAlias")
                keyPassword = p.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    // Sign in with Google (Credential Manager). Needs Google Play services on the phone.
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    testImplementation("junit:junit:4.13.2")
    // Real org.json for JVM unit tests (the Android one is a stub there).
    testImplementation("org.json:json:20240303")
}
