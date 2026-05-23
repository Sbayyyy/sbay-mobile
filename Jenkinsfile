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
        DOCKER_IMAGE = "sbay-mobile:${BUILD_NUMBER}"
        COMPOSE_PROJECT_NAME = "sbay-mobile-${BUILD_NUMBER}"
        SHOULD_BUILD_AAB = 'false'
        SKIP_REASON = ''
    }

    stages {
        stage('Pull Mobile Repo') {
            steps {
                echo 'Checking out mobile repository from Jenkins SCM...'
                checkout scm
                sh '''
                    set -eu
                    echo "Checked out commit: $(git rev-parse --short HEAD)"
                    echo "Branch: ${BRANCH_NAME:-unknown}"
                '''
            }
        }

        stage('Resolve Mobile Directory') {
            steps {
                script {
                    env.MOBILE_DIR = fileExists('package.json') ? '.' : 'sbay-mobile'
                    env.ARTIFACT_PREFIX = env.MOBILE_DIR == '.' ? '' : "${env.MOBILE_DIR}/"
                    echo "Resolved mobile directory: ${env.MOBILE_DIR}"
                    echo "Artifact prefix: ${env.ARTIFACT_PREFIX ?: '(workspace root)'}"
                }
            }
        }

        stage('Check Android Version Code') {
            steps {
                dir(env.MOBILE_DIR) {
                    script {
                        def currentCode = sh(
                            script: '''
                                set -eu
                                code="$(sed -n 's/.*"versionCode"[[:space:]]*:[[:space:]]*\\([0-9][0-9]*\\).*/\\1/p' app.json | head -n 1)"
                                test -n "$code"
                                printf '%s' "$code"
                            ''',
                            returnStdout: true
                        ).trim()

                        def baseCommit = env.GIT_PREVIOUS_SUCCESSFUL_COMMIT ?: env.GIT_PREVIOUS_COMMIT ?: ''
                        def previousCode = ''

                        withEnv(["BASE_COMMIT=${baseCommit}"]) {
                            previousCode = sh(
                                script: '''
                                    set +e
                                    read_code() {
                                        sed -n 's/.*"versionCode"[[:space:]]*:[[:space:]]*\\([0-9][0-9]*\\).*/\\1/p' | head -n 1
                                    }

                                    if [ -n "$BASE_COMMIT" ] && git cat-file -e "$BASE_COMMIT:app.json" 2>/dev/null; then
                                        git show "$BASE_COMMIT:app.json" | read_code
                                        exit 0
                                    fi

                                    if git rev-parse HEAD~1 >/dev/null 2>&1 && git cat-file -e HEAD~1:app.json 2>/dev/null; then
                                        git show HEAD~1:app.json | read_code
                                        exit 0
                                    fi
                                ''',
                                returnStdout: true
                            ).trim()
                        }

                        env.CURRENT_ANDROID_VERSION_CODE = currentCode
                        env.PREVIOUS_ANDROID_VERSION_CODE = previousCode
                        env.SHOULD_BUILD_AAB = (!previousCode || currentCode.toInteger() > previousCode.toInteger()) ? 'true' : 'false'

                        echo "Current Android versionCode: ${currentCode}"
                        echo "Previous Android versionCode: ${previousCode ?: 'none'}"
                        if (env.SHOULD_BUILD_AAB == 'true') {
                            currentBuild.description = "Building Android versionCode ${currentCode}"
                            echo "Android versionCode increased from ${previousCode ?: 'none'} to ${currentCode}; building signed AAB."
                        } else {
                            env.SKIP_REASON = "Android versionCode ${currentCode} did not increase from ${previousCode}"
                            currentBuild.result = 'NOT_BUILT'
                            currentBuild.description = "Skipped: ${env.SKIP_REASON}"
                            echo "Android versionCode stayed at ${currentCode} or did not increase from ${previousCode}; skipping signed AAB build."
                        }
                    }
                }
            }
        }

        stage('Prepare Docker Inputs') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Preparing Docker build inputs..."
                        test -f package.json
                        touch .env
                        touch .env.android-signing.local
                        mkdir -p artifacts
                        echo "Docker inputs are ready."
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Building Docker image for mobile release checks and Android build..."
                        docker compose build app
                        echo "Docker image built: $DOCKER_IMAGE"
                    '''
                }
            }
        }

        stage('Validate Release Inputs') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running release config validation before any AAB build..."
                        docker compose run --rm app npm run validate:release
                        echo "Release config validation passed."
                    '''
                }
            }
        }

        stage('TypeScript Typecheck') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running TypeScript typecheck..."
                        docker compose run --rm app npm run typecheck
                        echo "TypeScript typecheck passed."
                    '''
                }
            }
        }

        stage('Lint') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running Expo ESLint checks..."
                        docker compose run --rm app npm run lint
                        echo "Lint finished."
                    '''
                }
            }
        }

        stage('Unit And UI Tests') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running Jest release tests with coverage..."
                        docker compose run --rm app npm run test:release
                        echo "Jest release tests passed."
                    '''
                }
            }
        }

        stage('Expo Doctor') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running Expo Doctor dependency/config validation..."
                        docker compose run --rm app npx --yes expo-doctor
                        echo "Expo Doctor passed."
                    '''
                }
            }
        }

        stage('Security Audit') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Running npm audit. High or critical vulnerabilities fail the release."
                        docker compose run --rm app npm audit --audit-level=high
                        echo "npm audit passed."
                    '''
                }
            }
        }

        stage('Build Signed AAB In Docker') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    withCredentials([
                        file(credentialsId: 'android-upload-keystore', variable: 'ANDROID_UPLOAD_KEYSTORE_FILE'),
                        string(credentialsId: 'android-keystore-password', variable: 'ANDROID_KEYSTORE_PASSWORD'),
                        string(credentialsId: 'android-key-alias', variable: 'ANDROID_KEY_ALIAS'),
                        string(credentialsId: 'android-key-password', variable: 'ANDROID_KEY_PASSWORD')
                    ]) {
                        sh '''
                            set -eu
                            echo "Checking Android signing inputs from Jenkins credentials..."
                            test -s "$ANDROID_UPLOAD_KEYSTORE_FILE"
                            test -n "$ANDROID_KEYSTORE_PASSWORD"
                            test -n "$ANDROID_KEY_ALIAS"
                            test -n "$ANDROID_KEY_PASSWORD"
                            echo "Signing inputs present. Building signed Android App Bundle..."
                            docker compose run --rm \
                                -v "$ANDROID_UPLOAD_KEYSTORE_FILE:/run/secrets/upload-keystore.jks:ro" \
                                -e ANDROID_UPLOAD_KEYSTORE=/run/secrets/upload-keystore.jks \
                                -e ANDROID_KEYSTORE_PASSWORD \
                                -e ANDROID_KEY_ALIAS \
                                -e ANDROID_KEY_PASSWORD \
                                -e AAB_PATH="$AAB_PATH" \
                                app npm run build:android
                            test -s "$AAB_PATH"
                            ls -lh "$AAB_PATH"
                            echo "Signed AAB build completed."
                        '''
                    }
                }
            }
        }

        stage('Verify AAB') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        echo "Verifying AAB zip integrity..."
                        unzip -t "$AAB_PATH" >/dev/null
                        echo "Verifying AAB signature..."
                        docker compose run --rm app jarsigner -verify "$AAB_PATH"
                        echo "AAB verification passed."
                    '''
                }
            }
        }

        stage('Archive Artifact') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                echo "Archiving signed AAB artifact from ${env.ARTIFACT_PREFIX}artifacts/*.aab"
                archiveArtifacts artifacts: "${env.ARTIFACT_PREFIX}artifacts/*.aab", fingerprint: true
            }
        }
    }

    post {
        always {
            script {
                if (env.SHOULD_BUILD_AAB == 'true') {
                    dir(env.MOBILE_DIR ?: '.') {
                        sh '''
                            set +e
                            echo "Cleaning Docker compose resources and generated native folders..."
                            docker compose --profile build down --remove-orphans --volumes --rmi local
                            docker image rm -f "$DOCKER_IMAGE"
                            rm -rf android ios .expo
                            echo "Cleanup complete."
                        '''
                    }
                } else {
                    echo "No AAB build requested; Docker cleanup skipped. ${env.SKIP_REASON}"
                }
            }
            echo 'Mobile Docker AAB pipeline finished.'
        }
    }
}
