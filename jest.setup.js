import "@react-native/polyfills";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" }),
  ),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: "test-push-token" }),
  ),
  setNotificationHandler: jest.fn(),
  AndroidImportance: {
    MAX: 5,
  },
}));

jest.mock("@expo/vector-icons/FontAwesome", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockFontAwesome(props) {
    return React.createElement(Text, { testID: props.testID }, props.name);
  };
});

// Mock expo-device
jest.mock("expo-device", () => ({
  isDevice: false,
  osBuildId: "build-123",
  modelId: "model-123",
}));

// Mock expo-constants
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      easProjectId: "test-project-id",
    },
  },
  easConfig: {
    projectId: "test-project-id",
  },
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => "/"),
  useSegments: jest.fn(() => []),
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately in tests
    if (callback && typeof callback === "function") {
      callback();
    }
  }),
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Not inside a <SafeAreaProvider>")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
