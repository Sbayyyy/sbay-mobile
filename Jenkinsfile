pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    }

    parameters {
        booleanParam(name: 'SUBMIT_INTERNAL', defaultValue: true, description: 'Upload the signed Android AAB to the Google Play Internal Track')
    }

    environment {
        EXPO_TOKEN = credentials('expo-token')
        GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = credentials('google-play-service-account-json')
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

        stage('Build Signed AAB') {
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        mkdir -p artifacts
                        npx eas-cli build --platform android --profile production --non-interactive --wait --json > artifacts/eas-build.json
                        node <<'NODE'
const fs = require('fs');
const https = require('https');
const data = JSON.parse(fs.readFileSync('artifacts/eas-build.json', 'utf8'));
const build = Array.isArray(data) ? data[0] : data;
const url = build?.artifacts?.buildUrl || build?.artifactUrl || build?.artifacts?.applicationArchiveUrl;
if (!url) {
  console.error('Could not find EAS Android artifact URL in artifacts/eas-build.json');
  process.exit(1);
}
function download(source, target, redirects = 0) {
  if (redirects > 5) {
    console.error('Too many redirects while downloading AAB');
    process.exit(1);
  }
  https.get(source, response => {
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      download(response.headers.location, target, redirects + 1);
      return;
    }
    if (response.statusCode !== 200) {
      console.error(`AAB download failed with HTTP ${response.statusCode}`);
      process.exit(1);
    }
    const file = fs.createWriteStream(target);
    response.pipe(file);
    file.on('finish', () => file.close());
  }).on('error', error => {
    console.error(error);
    process.exit(1);
  });
}
download(url, process.env.AAB_PATH);
NODE
                        test -s "$AAB_PATH"
                    '''
                }
            }
        }

        stage('Upload Internal Track') {
            when {
                expression { return params.SUBMIT_INTERNAL }
            }
            steps {
                dir(env.MOBILE_DIR) {
                    sh '''
                        set -eu
                        cp "$GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" google-play-service-account.json
                        npx eas-cli submit --platform android --profile production --path "$AAB_PATH" --non-interactive --wait
                        rm -f google-play-service-account.json
                    '''
                }
            }
        }

        stage('Archive Artifact') {
            steps {
                archiveArtifacts artifacts: "${env.ARTIFACT_PREFIX}artifacts/*.aab, ${env.ARTIFACT_PREFIX}artifacts/eas-build.json", fingerprint: true
            }
        }
    }

    post {
        always {
            script {
                def mobileDir = env.MOBILE_DIR ?: '.'
                def artifactPrefix = mobileDir == '.' ? '' : "${mobileDir}/"
                dir(mobileDir) {
                    sh 'rm -f google-play-service-account.json || true'
                }
                archiveArtifacts artifacts: "${artifactPrefix}artifacts/*.aab, ${artifactPrefix}artifacts/eas-build.json", allowEmptyArchive: true, fingerprint: true
            }
        }
    }
}
