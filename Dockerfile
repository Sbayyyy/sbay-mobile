FROM node:22-bookworm

ENV EXPO_NO_TELEMETRY=1 \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    GRADLE_USER_HOME=/root/.gradle

ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

ARG ANDROID_CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM=android-36
ARG ANDROID_BUILD_TOOLS=35.0.0
ARG ANDROID_NDK=27.1.12297006

RUN apt-get -o Acquire::Retries=5 -o Acquire::http::Pipeline-Depth=0 update \
    && apt-get -o Acquire::Retries=5 -o Acquire::http::Pipeline-Depth=0 install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        openjdk-17-jdk-headless \
        unzip \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
    && curl -fSL "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -o /tmp/android-commandline-tools.zip \
    && unzip -q /tmp/android-commandline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
    && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
    && rm /tmp/android-commandline-tools.zip

RUN yes | sdkmanager --licenses >/dev/null \
    && sdkmanager \
        "platform-tools" \
        "platforms;${ANDROID_PLATFORM}" \
        "build-tools;${ANDROID_BUILD_TOOLS}" \
        "cmake;3.22.1"

# NDK is a large download (~700 MB) and prone to transient failures — retry up to 3 times.
RUN sdkmanager "ndk;${ANDROID_NDK}" \
    || sdkmanager "ndk;${ANDROID_NDK}" \
    || sdkmanager "ndk;${ANDROID_NDK}"

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
