# Notification System Tests

This guide explains how to run and execute tests for the notification badge system.

## Test Files

### 1. Services Tests
- **`services/__tests__/notifications.test.ts`** - Tests for notification API calls
  - Tests `getUnreadNotificationCount()` function
  - Tests `getNotifications()` function
  - Tests error handling and edge cases

- **`services/__tests__/chat-realtime.test.ts`** - Tests for real-time WebSocket handlers
  - Tests `onNotificationNew()` handler registration
  - Tests `onNotificationRead()` handler registration
  - Tests integration with message handlers

### 2. Provider Tests
- **`providers/__tests__/NotificationProvider.test.tsx`** - Tests for the NotificationProvider context
  - Tests unread count state management
  - Tests initial count loading
  - Tests error handling
  - Tests context usage validation

### 3. Component Tests
- **`components/common/__tests__/SearchBar.test.tsx`** - Tests for badge display
  - Tests badge visibility based on count
  - Tests badge formatting ("99+" capping)
  - Tests notification button navigation
  - Tests badge update when count changes

### 4. Hooks Tests
- **`hooks/__tests__/use-push-notifications.test.ts`** - Tests for push notification listeners
  - Tests notification received listener registration
  - Tests notification response listener registration
  - Tests handler execution on events
  - Tests cleanup on unmount

### 5. Integration Tests
- **`__tests__/notification-integration.test.tsx`** - End-to-end notification flow tests
  - Tests push notification arriving and updating badge
  - Tests error recovery
  - Tests multiple notification scenarios
  - Tests badge display in different states

- **`__tests__/tabs-realtime.test.ts`** - Tests for real-time event handling in tabs
  - Tests WebSocket event handling
  - Tests message and notification event coordination
  - Tests rapid event succession handling
  - Tests connection lifecycle management

## Setup

### Install Dependencies

```bash
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest \
  ts-jest \
  @types/jest \
  jest-mock-extended
```

### Configuration Files

The following files configure Jest for this project:

- **`jest.config.js`** - Jest configuration
  - Sets up TypeScript support via ts-jest
  - Configures module name mapping for `@/` imports
  - Sets up coverage collection

- **`jest.setup.js`** - Jest setup file
  - Mocks native modules (AsyncStorage, expo-notifications, etc.)
  - Suppresses expected console warnings
  - Initializes test environment

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test services/__tests__/notifications.test.ts
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests for a Specific Pattern
```bash
npm test -- --testNamePattern="SearchBar"
```

## Test Scenarios

### Notification Badge Display

**Test File:** `components/common/__tests__/SearchBar.test.tsx`

Scenarios tested:
1. Badge not shown when count = 0
2. Badge shown with count when count > 0
3. Badge shows "99+" when count > 99
4. Badge updates when count changes
5. Badge hides when count returns to 0

### API Integration

**Test File:** `services/__tests__/notifications.test.ts`

Scenarios tested:
1. API call to `/api/notifications/unread-count`
2. Successful response parsing
3. Error handling and fallback to 0
4. Missing token handling
5. Response validation

### Real-time Updates

**Test File:** `services/__tests__/chat-realtime.test.ts`

Scenarios tested:
1. WebSocket handler registration for `notification:new`
2. WebSocket handler registration for `notification:read`
3. Handler execution on event trigger
4. Multiple handlers support
5. Event isolation (notifications vs messages)

### Push Notifications

**Test File:** `hooks/__tests__/use-push-notifications.test.ts`

Scenarios tested:
1. Listener registration on component mount
2. Handler execution when notification received
3. Listener cleanup on unmount
4. Multiple notification handling
5. Data extraction and type checking

### End-to-End Flow

**Test File:** `__tests__/notification-integration.test.tsx`

Scenarios tested:
1. Push notification arrives → Badge updates
2. Multiple notifications → Badge shows cumulative count
3. API error during update → Badge maintains previous count
4. No token available → Badge shows 0
5. Badge display with different count values

## Manual Testing on Android

### Prerequisites
- Android device or emulator
- App running with EAS or local build
- Another test account to send notifications

### Test Steps

1. **Initial State**
   - Open app
   - Navigate to home screen
   - Verify notification bell icon shows no badge

2. **Send Notification**
   - From another account/device, send a notification
   - Wait 1-2 seconds
   - Verify red badge appears with count

3. **Multiple Notifications**
   - Send 3-5 more notifications
   - Verify badge count increases
   - Verify badge shows "99+" if count > 99

4. **Navigate Away**
   - Go to another tab (favorites, chats, etc.)
   - Come back to home
   - Verify badge count is still correct

5. **Read Notifications**
   - Click notification bell → Open notifications screen
   - Mark notifications as read
   - Badge should disappear after refresh

6. **Real-time Update**
   - Keep notifications screen open
   - Send notification from another device
   - Verify notification appears in real-time
   - Go back to home → Badge should update

## Debugging

### Enable Debug Logging

Add to `providers/NotificationProvider.tsx`:
```typescript
console.log("Notification count refreshed:", count);
```

Add to `hooks/use-push-notifications.ts`:
```typescript
console.log("Push notification received:", data);
```

### Test Specific Component

```bash
npm test -- --testNamePattern="SearchBar.*badge"
```

### View Full Test Output

```bash
npm test -- --verbose
```

## Coverage Report

Generate coverage report:
```bash
npm test -- --coverage
```

Expected coverage:
- `services/notifications.ts`: >90%
- `providers/NotificationProvider.tsx`: >85%
- `components/common/SearchBar.tsx`: >80%
- `hooks/use-push-notifications.ts`: >85%

## Common Issues

### Issue: "Not inside a <SafeAreaProvider>"

**Solution:** This warning is suppressed in `jest.setup.js` for test environment.

### Issue: Mocks not being called

**Solution:** Ensure jest.mock() is at the top of test file before imports.

### Issue: Async test timeout

**Solution:** Increase timeout for specific test:
```typescript
it("test name", async () => {
  // test code
}, 10000); // 10 second timeout
```

## Best Practices

1. **Use descriptive test names** - Clearly indicate what is being tested
2. **Test behavior, not implementation** - Focus on what the component does
3. **Clean up after tests** - Use `beforeEach()` and `afterEach()`
4. **Mock external dependencies** - Don't test external APIs
5. **Test edge cases** - Empty state, errors, boundary conditions
6. **Keep tests focused** - One concept per test

## Performance Considerations

Tests should run in < 5 seconds total. If slower:

1. Check for missing mocks
2. Reduce unnecessary async operations
3. Use `jest.useFakeTimers()` for time-based tests
4. Consider splitting test files

## Continuous Integration

Add to your CI pipeline:

```yaml
- name: Run Tests
  run: npm test -- --coverage --watchAll=false

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
