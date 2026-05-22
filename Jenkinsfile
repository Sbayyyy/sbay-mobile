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
                        test -f package.json
                        touch .env
                        touch .env.android-signing.local
                        mkdir -p artifacts
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
                    sh 'docker compose build app'
                }
            }
        }

        stage('Test In Docker') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'docker compose run --rm app npm run test:ci'
                    sh 'docker compose run --rm app npx --yes expo-doctor'
                    sh 'docker compose run --rm app npm audit --audit-level=high'
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
                            docker compose run --rm \
                                -v "$ANDROID_UPLOAD_KEYSTORE_FILE:/run/secrets/upload-keystore.jks:ro" \
                                -e ANDROID_UPLOAD_KEYSTORE=/run/secrets/upload-keystore.jks \
                                -e ANDROID_KEYSTORE_PASSWORD \
                                -e ANDROID_KEY_ALIAS \
                                -e ANDROID_KEY_PASSWORD \
                                -e AAB_PATH="$AAB_PATH" \
                                app npm run build:android
                            test -s "$AAB_PATH"
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
                        unzip -t "$AAB_PATH" >/dev/null
                        docker compose run --rm app jarsigner -verify "$AAB_PATH"
                    '''
                }
            }
        }

        stage('Archive Artifact') {
            when {
                expression { env.SHOULD_BUILD_AAB == 'true' }
            }
            steps {
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
                            docker compose --profile build down --remove-orphans --volumes --rmi local
                            docker image rm -f "$DOCKER_IMAGE"
                            rm -rf android ios .expo
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
