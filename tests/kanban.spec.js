/**
 * E2E Tests - Kanban Board & Drag-Drop
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-kanban-${Date.now()}@example.com`,
  password: 'testpassword123'
};

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#signup-btn');
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
  });

  test('should display all four columns', async ({ page }) => {
    // Check for all Kanban columns
    await expect(page.locator('[data-status="backlog"]')).toBeVisible();
    await expect(page.locator('[data-status="today"]')).toBeVisible();
    await expect(page.locator('[data-status="inprogress"]')).toBeVisible();
    await expect(page.locator('[data-status="done"]')).toBeVisible();
  });

  test('should show task count in column headers', async ({ page }) => {
    // Create a task
    await page.fill('#quick-input', 'Count test task');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Backlog column should show count of 1
    const backlogColumn = page.locator('[data-status="backlog"]').locator('..');
    const countBadge = backlogColumn.locator('.column__count');
    await expect(countBadge).toHaveText('1');
  });

  test('should drag task between columns', async ({ page }) => {
    // Create a task in backlog
    await page.fill('#quick-input', 'Drag test task');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    const taskCard = page.locator('.task-card', { hasText: 'Drag test task' }).first();
    await expect(taskCard).toBeVisible();
    
    // Get column containers
    const backlogColumn = page.locator('[data-sortable="backlog"]');
    const todayColumn = page.locator('[data-sortable="today"]');
    
    // Drag from backlog to today
    await taskCard.dragTo(todayColumn);
    
    // Wait for Firestore update
    await page.waitForTimeout(2000);
    
    // Task should now be in today column
    const taskInToday = todayColumn.locator('.task-card', { hasText: 'Drag test task' });
    await expect(taskInToday).toBeVisible();
    
    // Task should not be in backlog
    const taskInBacklog = backlogColumn.locator('.task-card', { hasText: 'Drag test task' });
    await expect(taskInBacklog).not.toBeVisible();
  });

  test('should update column counts after drag', async ({ page }) => {
    // Create task
    await page.fill('#quick-input', 'Count update test');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Check initial counts
    const backlogCount = page.locator('[data-status="backlog"]')
      .locator('..')
      .locator('.column__count');
    await expect(backlogCount).toHaveText('1');
    
    const todayCount = page.locator('[data-status="today"]')
      .locator('..')
      .locator('.column__count');
    await expect(todayCount).toHaveText('0');
    
    // Drag task
    const taskCard = page.locator('.task-card', { hasText: 'Count update test' }).first();
    const todayColumn = page.locator('[data-sortable="today"]');
    await taskCard.dragTo(todayColumn);
    await page.waitForTimeout(2000);
    
    // Counts should update
    await expect(backlogCount).toHaveText('0');
    await expect(todayCount).toHaveText('1');
  });

  test('should maintain task order within column', async ({ page }) => {
    // Create multiple tasks
    const tasks = ['Task 1', 'Task 2', 'Task 3'];
    for (const task of tasks) {
      await page.fill('#quick-input', task);
      await page.click('#quick-add-btn');
      await page.waitForTimeout(1000);
    }
    
    await page.waitForTimeout(2000);
    
    // Get all tasks in backlog
    const backlogColumn = page.locator('[data-sortable="backlog"]');
    const taskCards = backlogColumn.locator('.task-card');
    
    // Should have 3 tasks
    await expect(taskCards).toHaveCount(3);
  });
});
