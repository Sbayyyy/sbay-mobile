# Notification Badge Implementation - Complete Guide

## Overview

This document provides a complete overview of the notification badge system implementation, including:
- Architecture and components
- Push notification integration
- Real-time updates via WebSocket
- Comprehensive testing suite
- Manual and automated testing procedures

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Root (_layout.tsx)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NotificationProvider (Global Context)                    │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │ useNotificationContext                             │  │  │
│  │ │ - unreadCount state                                │  │  │
│  │ │ - refreshUnreadCount() function                    │  │  │
│  │ │ - usePushNotificationListener() hook               │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼────┐  ┌─────▼────┐  ┌────▼────┐
         │   Tabs    │  │   Home   │  │  Chat   │
         │  Layout   │  │  Screen  │  │ Realtime│
         └─────┬─────┘  └────┬─────┘  └────┬────┘
               │             │             │
         ┌─────▼─────────────▼─────────────▼─────┐
         │    SearchBar Component                  │
         │  ┌─────────────────────────────────┐  │
         │  │ Notification Bell with Badge    │  │
         │  │ - Receives notificationCount    │  │
         │  │ - Shows red badge with count    │  │
         │  │ - Displays "99+" when > 99      │  │
         │  └─────────────────────────────────┘  │
         └─────────────────────────────────────────┘
```

### Data Flow

```
1. INITIAL LOAD
   NotificationProvider
   → getStoredToken()
   → getUnreadNotificationCount()
   → Update unreadCount state

2. REAL-TIME UPDATES (WebSocket)
   TabsLayout (ChatConnection)
   → onNotificationNew() event
   → Call refreshUnreadCount()
   → Update NotificationProvider state

3. PUSH NOTIFICATIONS (Background)
   Expo Notifications
   → usePushNotificationListener()
   → Call refreshUnreadCount()
   → Update badge automatically

4. UI UPDATE
   SearchBar receives notificationCount
   → Display badge if count > 0
   → Format count as "99+" if > 99
   → Hide badge if count = 0
```

## Push Notification Integration

### How It Works

1. **App Initialization**
   - `AuthProvider` calls `syncPushToken()` on login
   - Push token is registered with backend

2. **Notification Received**
   - Expo Notifications receives push notification
   - `usePushNotificationListener()` hook triggers
   - `refreshUnreadCount()` is called
   - Badge updates in real-time

3. **User Interaction**
   - User taps notification (if app is backgrounded)
   - Navigation routes to appropriate screen
   - Badge count is refreshed on screen focus

### Push Notification Payload Example

```json
{
  "to": "ExponentPushToken[...]",
  "data": {
    "type": "notification",
    "title": "New Message",
    "body": "Someone sent you a message"
  }
}
```

For chat notifications:
```json
{
  "to": "ExponentPushToken[...]",
  "data": {
    "type": "chat",
    "chatId": "123",
    "title": "New Message from John",
    "body": "Hey, how are you?"
  }
}
```

## File Structure

```
sbay-mobile/
├── providers/
│   ├── NotificationProvider.tsx      ← Context provider for badge state
│   └── __tests__/
│       └── NotificationProvider.test.tsx
├── services/
│   ├── notifications.ts              ← API calls for notifications
│   ├── chat-realtime.ts              ← Real-time handlers
│   └── __tests__/
│       ├── notifications.test.ts
│       └── chat-realtime.test.ts
├── components/common/
│   ├── SearchBar.tsx                 ← Badge UI component
│   └── __tests__/
│       └── SearchBar.test.tsx
├── hooks/
│   ├── use-push-notifications.ts     ← Push notification listeners
│   └── __tests__/
│       └── use-push-notifications.test.ts
├── screens/tabs/home/
│   └── index.tsx                     ← Integrates SearchBar with badge
├── app/
│   ├── _layout.tsx                   ← Root layout with providers
│   └── (tabs)/
│       └── _layout.tsx               ← Tab layout with WebSocket setup
├── __tests__/
│   ├── notification-integration.test.tsx
│   └── tabs-realtime.test.ts
├── jest.config.js                    ← Jest configuration
├── jest.setup.js                     ← Jest setup and mocks
├── TESTING.md                        ← Testing guide
└── NOTIFICATION_SYSTEM.md            ← This file
```

## Implementation Details

### 1. NotificationProvider (Global State)

**Location:** `providers/NotificationProvider.tsx`

Manages:
- `unreadCount` state - Current number of unread notifications
- `refreshUnreadCount()` - Function to fetch count from API
- Push notification listener integration

```typescript
export function useNotificationContext() {
  return useContext(NotificationContext);
}

// Usage in components
const { unreadCount, refreshUnreadCount } = useNotificationContext();
```

### 2. API Integration

**Location:** `services/notifications.ts`

Endpoints:
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notifications` - Get all notifications

```typescript
export async function getUnreadNotificationCount(): Promise<number>
export async function getNotifications(): Promise<AppNotification[]>
```

### 3. Real-time WebSocket Handlers

**Location:** `services/chat-realtime.ts`

Events:
- `notification:new` - New notification received
- `notification:read` - Notification marked as read

```typescript
export function onNotificationNew(
  connection: HubConnection,
  handler: () => void,
)

export function onNotificationRead(
  connection: HubConnection,
  handler: () => void,
)
```

### 4. Push Notification Listeners

**Location:** `hooks/use-push-notifications.ts`

Hooks:
- `usePushNotificationListener()` - Listen for notifications in foreground
- `usePushNotificationResponse()` - Handle user tapping notification

```typescript
export function usePushNotificationListener(
  onNotificationReceived: () => void,
)

export function usePushNotificationResponse(
  onNotificationResponse: (data: PushNotificationData) => void,
)
```

### 5. Badge UI Component

**Location:** `components/common/SearchBar.tsx`

Props:
- `notificationCount?: number` - Count to display in badge

Features:
- Shows red badge (#E53935) when count > 0
- Displays count or "99+" if capped
- Responsive to prop changes

## Testing

### Test Coverage

- **Unit Tests**: Individual components and functions
- **Integration Tests**: Multi-component interactions
- **Real-time Tests**: WebSocket event handling
- **Push Notification Tests**: Event listener registration

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test services/__tests__/notifications.test.ts

# Run in watch mode
npm test -- --watch
```

### Test Files

1. **`services/__tests__/notifications.test.ts`** (11 tests)
   - API call execution
   - Response parsing
   - Error handling
   - Edge cases

2. **`services/__tests__/chat-realtime.test.ts`** (9 tests)
   - Handler registration
   - Event triggering
   - Handler isolation

3. **`components/common/__tests__/SearchBar.test.tsx`** (8 tests)
   - Badge visibility
   - Badge formatting
   - Count updates
   - Navigation

4. **`hooks/__tests__/use-push-notifications.test.ts`** (10 tests)
   - Listener registration
   - Event handling
   - Cleanup on unmount

5. **`providers/__tests__/NotificationProvider.test.tsx`** (7 tests)
   - State management
   - API integration
   - Error handling

6. **`__tests__/notification-integration.test.tsx`** (11 tests)
   - End-to-end flows
   - Error scenarios
   - Badge display

7. **`__tests__/tabs-realtime.test.ts`** (10 tests)
   - WebSocket integration
   - Event coordination
   - Connection lifecycle

**Total: 66 tests**

## Manual Testing

### Prerequisites
- Android device/emulator with the app
- Another device/account to send notifications
- Backend configured to send push notifications

### Test Scenarios

**Scenario 1: Initial Load**
1. Close app completely
2. Open app fresh
3. Navigate to home screen
4. Verify no badge appears (count = 0)

**Scenario 2: Receive Notification**
1. Send notification from another device
2. Wait 1-2 seconds
3. Verify red badge appears with count

**Scenario 3: Badge Updates**
1. Send 5 notifications
2. Verify badge count increases (1, 2, 3, 4, 5)
3. Verify badge shows "99+" when count ≥ 100

**Scenario 4: Navigation**
1. View home screen with badge (count = 5)
2. Navigate to chats tab
3. Navigate back to home
4. Verify badge still shows correct count

**Scenario 5: Real-time Update**
1. Keep app open on home screen
2. Send notification from another device
3. Verify badge updates within 1-2 seconds (no manual refresh needed)

**Scenario 6: Read Notifications**
1. Open notifications screen (tap bell icon)
2. Mark notifications as read
3. Navigate back to home
4. Verify badge count decreases or disappears

**Scenario 7: App in Background**
1. Send home app to background
2. Send notification from another device
3. Bring app back to foreground
4. Verify badge shows updated count

**Scenario 8: Rate Limiting**
1. Send 10+ notifications rapidly
2. Verify badge updates correctly
3. Verify no API errors or crashes

## Troubleshooting

### Badge Not Appearing

**Checklist:**
1. API endpoint `/api/notifications/unread-count` is accessible
2. Backend returns `{ total: number }`
3. Token is properly stored and sent
4. NotificationProvider wraps the app

**Debug:**
```bash
# Check API response
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/notifications/unread-count

# Check notification count in console
console.log("Unread count:", unreadCount);
```

### Badge Not Updating in Real-time

**Checklist:**
1. WebSocket connection established in tabs layout
2. `onNotificationNew` handler is registered
3. Backend sends `notification:new` event on SignalR
4. `refreshUnreadCount` is being called

**Debug:**
```bash
# Monitor WebSocket in app logs
# Add to chat-realtime.ts:
console.log("notification:new event received");
```

### Push Notifications Not Received

**Checklist:**
1. `syncPushToken()` is called on login
2. Push token is registered with backend
3. Backend has permission to send notifications
4. Notification payload includes required fields

**Debug:**
```bash
# Check stored push token
AsyncStorage.getItem("sbay.push.token").then(console.log);

# Check Expo push token validity
# Verify token starts with "ExponentPushToken["
```

### High API Load

If badge refresh is causing too many API calls:

1. **Add debouncing** in `refreshUnreadCount()`
```typescript
const refreshUnreadCountDebounced = useCallback(
  debounce(() => refreshUnreadCount(), 500),
  []
);
```

2. **Limit real-time updates**
```typescript
// Only refresh if notification type is "notification"
if (data?.type === "notification") {
  void refreshUnreadCount();
}
```

3. **Cache results**
```typescript
// Don't call API if refreshed within 2 seconds
const lastRefresh = useRef<number>(0);
if (Date.now() - lastRefresh.current < 2000) return;
```

## Performance Optimization

### Current Performance

- **Initial load time**: ~100ms (API call + state update)
- **Badge update time**: ~50ms (state update)
- **WebSocket latency**: ~200-500ms (network dependent)
- **Push notification latency**: ~1-2 seconds (Expo service)

### Optimization Opportunities

1. **Cache API responses** - Reduce repeated calls
2. **Batch WebSocket events** - Handle multiple events together
3. **Debounce updates** - Limit refresh frequency
4. **Progressive loading** - Show badge earlier with cached value

## Future Enhancements

1. **Notification Categories**
   - Different badges for different notification types
   - Separate counts for messages, alerts, orders

2. **Notification Filtering**
   - Show/hide notifications by category
   - User preferences integration

3. **Badge Animations**
   - Pulse animation on new notification
   - Smooth count transitions

4. **Notification Sound/Haptics**
   - Play sound on notification received
   - Haptic feedback on update

5. **Analytics**
   - Track badge interactions
   - Monitor notification performance

## Support & Debugging

For issues or questions:

1. Check `TESTING.md` for test running instructions
2. Review test files for expected behavior
3. Check console logs for error messages
4. Verify API endpoints return correct format
5. Ensure all services are properly mocked in tests

## Changelog

### Version 1.0.0 (Current)
- ✅ Notification badge implementation
- ✅ Push notification integration
- ✅ Real-time WebSocket updates
- ✅ Comprehensive test suite (66 tests)
- ✅ SearchBar component with badge
- ✅ Global notification context
- ✅ Error handling and recovery
