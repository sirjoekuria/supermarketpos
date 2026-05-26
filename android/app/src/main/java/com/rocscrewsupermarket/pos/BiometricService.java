package com.rocscrewsupermarket.pos;

import android.content.Context;
import android.os.Build;
import androidx.annotation.RequiresApi;
import androidx.biometric.BiometricPrompt;
import androidx.fragment.app.FragmentActivity;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import com.getcapacitor.BridgeActivity;

/**
 * Service for handling biometric authentication (fingerprint/face ID)
 * Bridges native Android biometric capabilities with the web app
 */
@RequiresApi(api = Build.VERSION_CODES.P)
public class BiometricService {
    
    private final Context context;
    private final FragmentActivity activity;
    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;
    
    public BiometricService(Context context, FragmentActivity activity) {
        this.context = context;
        this.activity = activity;
        setupBiometric();
    }
    
    private void setupBiometric() {
        Executor executor = Executors.newSingleThreadExecutor();
        
        biometricPrompt = new BiometricPrompt(activity, executor,
                new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                // Handle authentication error
                notifyAuthenticationResult(false, "Authentication error: " + errString);
            }
            
            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                // Biometric authentication successful
                notifyAuthenticationResult(true, "Biometric authenticated");
            }
            
            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                // Biometric authentication failed (but not an error)
                notifyAuthenticationResult(false, "Authentication failed - try again");
            }
        });
        
        promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Manager Authorization")
                .setSubtitle("Authenticate to perform this action")
                .setDescription("Place your finger on the sensor or look at the camera")
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(
    androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG |
    androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
)
                .build();
    }
    
    /**
     * Start biometric authentication
     */
    public void authenticate() {
        if (biometricPrompt != null && promptInfo != null) {
            biometricPrompt.authenticate(promptInfo);
        }
    }
    
    /**
     * Check if device supports biometric authentication
     */
    public static boolean isBiometricAvailable(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return false;
        }
        
        try {
            androidx.biometric.BiometricManager biometricManager =
                    androidx.biometric.BiometricManager.from(context);
            return biometricManager.canAuthenticate(
                    androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
            ) == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Notify the web app of authentication result
     */
    private void notifyAuthenticationResult(boolean success, String message) {
        // This will be called by JavaScript through a bridge
        String resultJson = String.format(
            "{\"success\": %b, \"message\": \"%s\"}",
            success,
            message
        );
        
        // Execute JavaScript callback in the web view
        if (activity instanceof com.getcapacitor.BridgeActivity) {
            com.getcapacitor.BridgeActivity bridgeActivity = (com.getcapacitor.BridgeActivity) activity;
            bridgeActivity.getBridge().getWebView().evaluateJavascript(
                "window.onBiometricResult && window.onBiometricResult(" + resultJson + ")",
                null
            );
        }
    }
}
