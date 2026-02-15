/**
 * E2E Tests - Authentication
 */

import { test, expect } from '@playwright/test';

// Test user credentials (use a test Firebase project)
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show auth modal on initial load', async ({ page }) => {
    // Auth modal should be visible
    const authModal = page.locator('#auth-modal');
    await expect(authModal).toBeVisible();
    
    // Check for email and password inputs
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
  });

  test('should create new account and login', async ({ page }) => {
    // Fill in credentials
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    
    // Click sign up
    await page.click('#signup-btn');
    
    // Wait for auth modal to close and app to show
    await expect(page.locator('#auth-modal')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#app')).toBeVisible();
    
    // Verify user is logged in - header should be visible
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();
  });

  test('should login with existing account', async ({ page }) => {
    // First create an account
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#signup-btn');
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    
    // Logout
    await page.click('#logout-btn');
    await expect(page.locator('#auth-modal')).toBeVisible();
    
    // Login again
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#login-btn');
    
    // Should be logged in
    await expect(page.locator('#auth-modal')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#app')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Try to login with invalid email
    await page.fill('#auth-email', 'invalid-email');
    await page.fill('#auth-password', 'password');
    await page.click('#login-btn');
    
    // Error should be displayed
    const authError = page.locator('#auth-error');
    await expect(authError).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#signup-btn');
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    
    // Click logout
    await page.click('#logout-btn');
    
    // Should show auth modal again
    await expect(page.locator('#auth-modal')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });
});
