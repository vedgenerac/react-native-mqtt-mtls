# Setup Instructions for React Native App

## 1. Install the Package

Add this to your React Native app's `package.json`:

```json
{
  "dependencies": {
    "react-native-mqtt-mtls": "github:yourusername/react-native-mqtt-mtls#main"
  }
}
```

Then run:
```bash
npm install
# or
yarn install
```

## 2. Android Configuration

### a. Update `android/settings.gradle`

Add these lines:

```gradle
include ':react-native-mqtt-mtls'
project(':react-native-mqtt-mtls').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-mqtt-mtls/android')
```

### b. Update `android/app/build.gradle`

Add the dependency:

```gradle
dependencies {
    implementation project(':react-native-mqtt-mtls')
    // ... other dependencies
}
```

### c. Update `android/app/src/main/java/.../MainApplication.java`

Import and add the package:

```java
// Add import at the top
import com.reactnativemqttmtls.MqttPackage;

public class MainApplication extends Application implements ReactApplication {
  
  @Override
  protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    // Add this line:
    packages.add(new MqttPackage());
    return packages;
  }
}
```

### d. Ensure Internet Permission

Check that `android/app/src/main/AndroidManifest.xml` has:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## 3. Use in Your Screen

Import and use the hook:

```typescript
import { useMqtt, MqttMessage } from 'react-native-mqtt-mtls';

const MyScreen = () => {
  const { isConnected, error, connect, disconnect, subscribe, publish } = useMqtt();
  
  // Use the hook as shown in example/MqttScreen.tsx
};
```

## 4. Build and Run

```bash
# Clean build (recommended after installation)
cd android && ./gradlew clean && cd ..

# Run the app
npx react-native run-android
```

## 5. Certificate Setup

Replace the placeholder certificates in your screen with actual certificates:

- `clientCertPem`: Your client certificate
- `privateKeyPem`: Your private key
- `rootCaPem`: Your CA certificate

All should be in PEM format (including the `-----BEGIN/END-----` lines).

## Troubleshooting

### Build Errors

1. Clean the build:
```bash
cd android && ./gradlew clean && cd ..
```

2. Clear React Native cache:
```bash
npx react-native start --reset-cache
```

3. Reinstall dependencies:
```bash
rm -rf node_modules && npm install
```

### Module Not Found

Make sure you've:
- Added the package to `settings.gradle`
- Added the package to `MainApplication.java`
- Rebuilt the app after changes

### Connection Issues

- Verify your certificates are correct and in PEM format
- Check your broker URL (should start with `ssl://`)
- Ensure your device/emulator has internet access
- Check broker logs for connection attempts