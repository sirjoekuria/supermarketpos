import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rocscrewsupermarket.pos',
  appName: 'Rocscrew Supermarket POS',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://supermarketpos.vercel.app',
    cleartext: true,
  },
  ios: {
    scheme: 'rocscrew',
  },
  android: {
    buildOptions: {
      keystorePath: '~/.android/debug.keystore',
      keystorePassword: 'android',
      keystoreAlias: 'androiddebugkey',
      keystoreAliasPassword: 'android',
      releaseType: 'APK',
    },
  },
  plugins: {
    Camera: {
      permissions: ['CAMERA'],
    },
    BiometricAuth: {
      android: {
        useStrength: 'strong',
      },
    },
  },
};

export default config;
