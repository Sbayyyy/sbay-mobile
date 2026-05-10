pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    }

    environment {
        EXPO_NO_TELEMETRY = '1'
        CI = '1'
        AAB_PATH = 'artifacts/SBay-android-production.aab'
    }

    stages {
        stage('Pull Mobile Repo') {
            steps {
                checkout scm
            }
        }

        stage('Resolve Mobile Directory') {
            steps {
                script {
                    env.MOBILE_DIR = fileExists('package.json') ? '.' : 'sbay-mobile'
                    env.ARTIFACT_PREFIX = env.MOBILE_DIR == '.' ? '' : "${env.MOBILE_DIR}/"
                }
            }
        }

        stage('Install') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'npm ci'
                }
            }
        }

        stage('Test') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'npm run test:ci'
                    sh 'npx --yes expo-doctor'
                    sh 'npm audit --audit-level=high'
                }
            }
        }

        stage('Generate Android Project') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'npx expo prebuild --platform android --clean --non-interactive'
                }
            }
        }

        stage('Build Signed AAB') {
            steps {
                dir(env.MOBILE_DIR) {
                    withCredentials([
                        file(credentialsId: 'android-upload-keystore', variable: 'ANDROID_UPLOAD_KEYSTORE'),
                        string(credentialsId: 'android-keystore-password', variable: 'ANDROID_KEYSTORE_PASSWORD'),
                        string(credentialsId: 'android-key-alias', variable: 'ANDROID_KEY_ALIAS'),
                        string(credentialsId: 'android-key-password', variable: 'ANDROID_KEY_PASSWORD')
                    ]) {
                        sh '''
                            set -eu
                            mkdir -p artifacts android/app
                            cp "$ANDROID_UPLOAD_KEYSTORE" android/app/upload-keystore.jks
                            trap 'rm -f android/app/upload-keystore.jks' EXIT
                            cd android
                            chmod +x ./gradlew
                            ./gradlew bundleRelease \
                                -Pandroid.injected.signing.store.file="$PWD/app/upload-keystore.jks" \
                                -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
                                -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
                                -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD"
                            cd ..
                            cp android/app/build/outputs/bundle/release/app-release.aab "$AAB_PATH"
                            test -s "$AAB_PATH"
                        '''
                    }
                }
            }
        }

        stage('Verify AAB') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        unzip -t "$AAB_PATH" >/dev/null
                        if command -v jarsigner >/dev/null 2>&1; then
                            jarsigner -verify "$AAB_PATH"
                        fi
                    '''
                }
            }
        }

        stage('Archive Artifact') {
            steps {
                archiveArtifacts artifacts: "${env.ARTIFACT_PREFIX}artifacts/*.aab", fingerprint: true
            }
        }
    }

    post {
        always {
            echo 'Mobile AAB pipeline finished.'
        }
    }
}
