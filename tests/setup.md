# E2E Test Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Playwright Test Framework**

## Installation

```bash
# Install Playwright
npm init -y
npm install -D @playwright/test
npx playwright install
```

## Firebase Setup for Testing

Create a `tests/test-config.js` file with your Firebase test project credentials:

```javascript
export const testFirebaseConfig = {
  apiKey: "YOUR_TEST_API_KEY",
  authDomain: "YOUR_TEST_PROJECT.firebaseapp.com",
  projectId: "YOUR_TEST_PROJECT",
  storageBucket: "YOUR_TEST_PROJECT.appspot.com",
  messagingSenderId: "YOUR_TEST_SENDER_ID",
  appId: "YOUR_TEST_APP_ID"
};

export const testUser = {
  email: "test@example.com",
  password: "testpassword123"
};
```

**Important:** Use a separate Firebase project for testing, not your production project.

## Running Tests

```bash
# Run all tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/auth.spec.js

# Run with debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

## Test Coverage

The E2E tests cover:

1. **Authentication**: Sign up, login, logout
2. **Task Creation**: Create task via quick input with realtime sync
3. **Drag & Drop**: Move tasks between Kanban columns
4. **Realtime Sync**: Verify sync across multiple browser contexts
5. **List & Calendar**: View switching and interaction
6. **Offline Behavior**: Verify writes are disabled when offline

## CI/CD Integration

For GitHub Actions, add this to `.github/workflows/test.yml`:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: |
          npm install
          npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Notes

- Tests use the Firebase Emulator Suite for local testing (recommended)
- Each test runs in isolation with a fresh auth state
- Tests clean up created data after completion
