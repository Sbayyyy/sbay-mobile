# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## API configuration

The app is configured to use the deployed SBay services by default:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.syrian-bay.com
EXPO_PUBLIC_WEB_BASE_URL=https://syrian-bay.com
```

Override these in `.env` only when testing against a local backend.

## Docker

Docker support is available for running the Expo dev server, checks, web export, and Android builds.

```bash
docker compose build
docker compose up app
```

See `DOCKER.md` for Android debug APK and signed release AAB commands.

## Jenkins Android release

`Jenkinsfile` builds a Docker image, runs checks inside the container, builds a signed Android production AAB inside Docker, archives it, and removes Docker resources afterward.

Required Jenkins credentials:

- `android-upload-keystore`: Secret file containing the Android upload keystore.
- `android-keystore-password`: Secret text containing the keystore password.
- `android-key-alias`: Secret text containing the upload key alias.
- `android-key-password`: Secret text containing the upload key password.

The pipeline uses Docker Compose to run TypeScript, lint, Jest, Expo Doctor, high-severity audit, Expo prebuild, Gradle `bundleRelease`, AAB verification, artifact archival, and Docker cleanup.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
