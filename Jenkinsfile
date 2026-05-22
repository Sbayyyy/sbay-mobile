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
        MIN_ANDROID_VERSION_CODE = '8'
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

        stage('Prepare Docker Inputs') {
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

        stage('Set Android Version Code') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        VERSION_CODE="$BUILD_NUMBER"
                        if [ "$VERSION_CODE" -lt "$MIN_ANDROID_VERSION_CODE" ]; then
                            VERSION_CODE="$MIN_ANDROID_VERSION_CODE"
                        fi
                        npm run set:android-version-code -- "$VERSION_CODE"
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'docker compose build app'
                }
            }
        }

        stage('Test In Docker') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh 'docker compose run --rm app npm run test:ci'
                    sh 'docker compose run --rm app npx --yes expo-doctor'
                    sh 'docker compose run --rm app npm audit --audit-level=high'
                }
            }
        }

        stage('Build Signed AAB In Docker') {
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
            steps {
                archiveArtifacts artifacts: "${env.ARTIFACT_PREFIX}artifacts/*.aab", fingerprint: true
            }
        }
    }

    post {
        always {
            dir(env.MOBILE_DIR ?: '.') {
                sh '''
                    set +e
                    docker compose --profile build down --remove-orphans --volumes --rmi local
                    docker image rm -f "$DOCKER_IMAGE"
                    rm -rf android ios .expo
                '''
            }
            echo 'Mobile Docker AAB pipeline finished.'
        }
    }
}
