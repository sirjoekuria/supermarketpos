# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }

# Android X
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Biometric
-keep class androidx.biometric.** { *; }

# WebKit
-keep class android.webkit.** { *; }
-keep interface android.webkit.** { *; }

# View
-keep class android.view.** { *; }

# Keep all classes with native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes and interfaces
-keep class * extends java.util.ListResourceBundle {
    protected Object[][] getContents();
}

# General rules
-keepattributes SourceFile,LineNumberTable,InnerClasses,EnclosingMethod
-keepnames class *
-renamesourcefileattribute SourceFile
