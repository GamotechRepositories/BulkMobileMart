# BulkMobileMart — Flutter mobile app

B2B wholesale mobile accessories app. Uses the same backend as the React web frontend (`../backend`).

## Prerequisites

- Flutter SDK 3.x
- Android Studio / Xcode (for device builds)
- Backend running on port **5001** (`cd ../backend && npm run dev`)

## Setup

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

2. Set `API_URL` in `.env` (default is production):
   - **Production:** `https://api.bulkmobilemart.in`
   - **Physical phone (local backend):** your PC LAN IP, e.g. `http://192.168.1.35:5001`
   - **Android emulator:** `http://10.0.2.2:5001`
   - **iOS simulator:** `http://localhost:5001`

3. Ensure the backend listens on all interfaces (`0.0.0.0`) so the phone can reach it.

4. Install dependencies:

   ```bash
   flutter pub get
   ```

## Run on device

```bash
flutter devices
flutter run -d <device-id>
```

After changing `.env`, do a full restart (not hot reload).

## App icon & splash

Branding assets live in `assets/images/app_logo.png`. Regenerate native icons and splash after updating the logo:

```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

## Release APK (Android)

**Package ID:** `com.bulkmobilemart.app`

### Quick debug-signed release (testing)

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Play Store signing

1. Create a keystore:

   ```bash
   keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. Copy `android/key.properties.example` to `android/key.properties` and fill in passwords/paths.

3. Build:

   ```bash
   flutter build appbundle --release
   ```

Release builds enable R8 minification with ProGuard rules for Razorpay (`android/app/proguard-rules.pro`).

## Permissions (Android)

- `INTERNET` — API calls
- `CAMERA` / `READ_MEDIA_IMAGES` — UPI payment proof upload via `image_picker`
- Cleartext HTTP enabled for local/LAN backend testing

## Payments

- **Razorpay:** backend must have `RAZORPAY_KEY_ID` configured
- **UPI QR:** set `MERCHANT_UPI_ID` and `MERCHANT_UPI_NAME` in `.env`

## Tests

```bash
flutter test
flutter analyze
```

CI runs automatically on pull requests that touch `mobile app/` (see `.github/workflows/mobile-app-ci.yml`).

## Deep links

Shared product links open directly in the app:

- `https://bulkmobilemart.com/product/<id>`
- `bulkmobilemart://product/<id>` (custom scheme)

Android intent filters and iOS URL schemes are configured. For universal links on iOS, host `apple-app-site-association` on your domain.

## iOS release

**Bundle ID:** `com.bulkmobilemart.app` (matches Android)

```bash
flutter build ipa --release
```

Requires Xcode signing setup on a Mac.

## Migration complete

The Flutter app mirrors the React web frontend: auth, catalog, cart, checkout (Razorpay + UPI), orders, profile, support, and static pages — all using the same backend API.
