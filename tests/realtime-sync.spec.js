/**
 * E2E Tests - Realtime Sync
 * Tests that changes in one browser context appear in another
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-sync-${Date.now()}@example.com`,
  password: 'testpassword123'
};

test.describe('Realtime Sync', () => {
  test('should sync task creation across two sessions', async ({ browser }) => {
    // Create two browser contexts (two separate sessions)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Login on both pages with same user
      await page1.goto('/');
      await page1.fill('#auth-email', TEST_USER.email);
      await page1.fill('#auth-password', TEST_USER.password);
      await page1.click('#signup-btn');
      await expect(page1.locator('#app')).toBeVisible({ timeout: 10000 });
      
      await page2.goto('/');
      await page2.fill('#auth-email', TEST_USER.email);
      await page2.fill('#auth-password', TEST_USER.password);
      await page2.click('#login-btn');
      await expect(page2.locator('#app')).toBeVisible({ timeout: 10000 });
      
      // Create task on page1
      const taskText = 'Synced task test';
      await page1.fill('#quick-input', taskText);
      await page1.click('#quick-add-btn');
      
      // Wait a moment for Firestore sync
      await page1.waitForTimeout(3000);
      
      // Task should appear on page2 via onSnapshot
      const taskOnPage2 = page2.locator('.task-card', { hasText: taskText }).first();
      await expect(taskOnPage2).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Task synced from page1 to page2');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should sync task updates across sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Login both
      await page1.goto('/');
      await page1.fill('#auth-email', TEST_USER.email);
      await page1.fill('#auth-password', TEST_USER.password);
      await page1.click('#login-btn');
      await expect(page1.locator('#app')).toBeVisible({ timeout: 10000 });
      
      await page2.goto('/');
      await page2.fill('#auth-email', TEST_USER.email);
      await page2.fill('#auth-password', TEST_USER.password);
      await page2.click('#login-btn');
      await expect(page2.locator('#app')).toBeVisible({ timeout: 10000 });
      
      // Create task on page1
      await page1.fill('#quick-input', 'Task to update');
      await page1.click('#quick-add-btn');
      await page1.waitForTimeout(3000);
      
      // Verify it appears on page2
      await expect(page2.locator('.task-card', { hasText: 'Task to update' })).toBeVisible();
      
      // Update task on page1
      const taskCard = page1.locator('.task-card', { hasText: 'Task to update' }).first();
      await taskCard.click();
      await page1.fill('#task-title-input', 'Updated task title');
      await page1.click('#save-task-btn');
      await page1.waitForTimeout(3000);
      
      // Updated task should appear on page2
      await expect(page2.locator('.task-card', { hasText: 'Updated task title' })).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Task update synced from page1 to page2');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should sync task deletion across sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Login both
      await page1.goto('/');
      await page1.fill('#auth-email', TEST_USER.email);
      await page1.fill('#auth-password', TEST_USER.password);
      await page1.click('#login-btn');
      await expect(page1.locator('#app')).toBeVisible({ timeout: 10000 });
      
      await page2.goto('/');
      await page2.fill('#auth-email', TEST_USER.email);
      await page2.fill('#auth-password', TEST_USER.password);
      await page2.click('#login-btn');
      await expect(page2.locator('#app')).toBeVisible({ timeout: 10000 });
      
      // Create task on page1
      const taskText = 'Task to delete';
      await page1.fill('#quick-input', taskText);
      await page1.click('#quick-add-btn');
      await page1.waitForTimeout(3000);
      
      // Verify on both pages
      await expect(page1.locator('.task-card', { hasText: taskText })).toBeVisible();
      await expect(page2.locator('.task-card', { hasText: taskText })).toBeVisible();
      
      // Delete on page1
      await page1.locator('.task-card', { hasText: taskText }).first().click();
      page1.on('dialog', dialog => dialog.accept());
      await page1.click('#delete-task-btn');
      await page1.waitForTimeout(3000);
      
      // Should disappear from page2
      await expect(page2.locator('.task-card', { hasText: taskText })).not.toBeVisible({ timeout: 5000 });
      
      console.log('✓ Task deletion synced from page1 to page2');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
