#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${ARTIFACT_DIR:-artifacts}"
AAB_PATH="${AAB_PATH:-${ARTIFACT_DIR}/SBay-android-production.aab}"
DEBUG_APK_PATH="${DEBUG_APK_PATH:-${ARTIFACT_DIR}/SBay-android-debug.apk}"

mkdir -p "${ARTIFACT_DIR}"

export EXPO_NO_TELEMETRY="${EXPO_NO_TELEMETRY:-1}"
export CI="${CI:-1}"

npx expo prebuild --platform android --clean --non-interactive

cd android
chmod +x ./gradlew

if [[ -n "${ANDROID_UPLOAD_KEYSTORE:-}" \
    && -n "${ANDROID_KEYSTORE_PASSWORD:-}" \
    && -n "${ANDROID_KEY_ALIAS:-}" \
    && -n "${ANDROID_KEY_PASSWORD:-}" ]]; then
  ./gradlew bundleRelease \
    -Pandroid.injected.signing.store.file="${ANDROID_UPLOAD_KEYSTORE}" \
    -Pandroid.injected.signing.store.password="${ANDROID_KEYSTORE_PASSWORD}" \
    -Pandroid.injected.signing.key.alias="${ANDROID_KEY_ALIAS}" \
    -Pandroid.injected.signing.key.password="${ANDROID_KEY_PASSWORD}"

  cd ..
  cp android/app/build/outputs/bundle/release/app-release.aab "${AAB_PATH}"
  test -s "${AAB_PATH}"
  echo "Built signed Android App Bundle: ${AAB_PATH}"
else
  ./gradlew assembleDebug

  cd ..
  cp android/app/build/outputs/apk/debug/app-debug.apk "${DEBUG_APK_PATH}"
  test -s "${DEBUG_APK_PATH}"
  echo "Built unsigned debug Android APK: ${DEBUG_APK_PATH}"
  echo "Set ANDROID_UPLOAD_KEYSTORE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD to build a signed release AAB."
fi
