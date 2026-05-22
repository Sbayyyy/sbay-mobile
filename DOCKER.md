# Docker

This project can run the Expo dev server and build Android artifacts inside Docker.

## Build the image

```bash
docker compose build
```

## Run the app

```bash
docker compose up app
```

The Expo dev server is exposed on port `8081`. The compose service reads `.env` at runtime, but `.env` is not copied into the Docker image.

## Run checks

```bash
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run lint
docker compose run --rm app npm test -- --watchAll=false
```

## Export the web build

```bash
docker compose run --rm app npm run build:web
```

The exported web files are written to `dist/`.

## Build Android

For a local debug APK:

```bash
docker compose run --rm app npm run build:android
```

The APK is written to `artifacts/SBay-android-debug.apk`.

For a signed release AAB using the local signing env file:

1. Put the EAS-downloaded keystore at the repo root:

   ```text
   @sbay-organization__sbay-mobile.jks
   ```

2. Make sure `.env.android-signing.local` exists with:

   ```bash
   ANDROID_KEYSTORE_PASSWORD=...
   ANDROID_KEY_ALIAS=...
   ANDROID_KEY_PASSWORD=...
   ```

3. Run:

   ```bash
   docker compose --profile build run --rm android-build
   ```

The AAB is written to `artifacts/SBay-android-production.aab`.

You can also mount a keystore manually:

```bash
docker compose run --rm \
  -v /absolute/path/upload-keystore.jks:/run/secrets/upload-keystore.jks:ro \
  -e ANDROID_UPLOAD_KEYSTORE=/run/secrets/upload-keystore.jks \
  -e ANDROID_KEYSTORE_PASSWORD=change-me \
  -e ANDROID_KEY_ALIAS=change-me \
  -e ANDROID_KEY_PASSWORD=change-me \
  app npm run build:android
```

The AAB is written to `artifacts/SBay-android-production.aab`.
