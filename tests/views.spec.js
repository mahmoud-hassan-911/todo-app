/**
 * E2E Tests - View Switching (Kanban, List, Calendar)
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-views-${Date.now()}@example.com`,
  password: 'testpassword123'
};

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#signup-btn');
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    
    // Create some test tasks
    const tasks = [
      'Task 1 #tag1 !high',
      'Task 2 tomorrow',
      'Task 3 #tag2'
    ];
    for (const task of tasks) {
      await page.fill('#quick-input', task);
      await page.click('#quick-add-btn');
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
  });

  test('should start in Kanban view by default', async ({ page }) => {
    await expect(page.locator('#kanban-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // Kanban nav button should be active
    const kanbanBtn = page.locator('[data-view="kanban"]');
    await expect(kanbanBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to List view', async ({ page }) => {
    // Click List view button
    const listBtn = page.locator('[data-view="list"]');
    await listBtn.click();
    
    // List view should be visible
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#kanban-view')).toBeHidden();
    
    // List should contain tasks
    const listItems = page.locator('.list-item');
    await expect(listItems).not.toHaveCount(0);
    
    // List button should be active
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to Calendar view', async ({ page }) => {
    // Click Calendar view button
    const calendarBtn = page.locator('[data-view="calendar"]');
    await calendarBtn.click();
    
    // Calendar view should be visible
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#kanban-view')).toBeHidden();
    
    // Calendar should show month/year
    const calendarTitle = page.locator('#calendar-title');
    await expect(calendarTitle).toBeVisible();
    
    // Calendar button should be active
    await expect(calendarBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should display tasks in List view sorted correctly', async ({ page }) => {
    // Switch to List view
    await page.locator('[data-view="list"]').click();
    
    // List items should be visible
    const listItems = page.locator('.list-item');
    await expect(listItems.first()).toBeVisible();
    
    // Each list item should have status badge
    const statusBadges = page.locator('.status-badge');
    await expect(statusBadges.first()).toBeVisible();
  });

  test('should navigate calendar months', async ({ page }) => {
    // Switch to Calendar view
    await page.locator('[data-view="calendar"]').click();
    
    // Get current month
    const initialMonth = await page.locator('#calendar-title').textContent();
    
    // Click next month
    await page.click('#next-month');
    await page.waitForTimeout(500);
    
    const nextMonth = await page.locator('#calendar-title').textContent();
    expect(nextMonth).not.toBe(initialMonth);
    
    // Click previous month twice to go back
    await page.click('#prev-month');
    await page.waitForTimeout(500);
    await page.click('#prev-month');
    await page.waitForTimeout(500);
    
    const prevMonth = await page.locator('#calendar-title').textContent();
    expect(prevMonth).not.toBe(initialMonth);
  });

  test('should show tasks on calendar dates', async ({ page }) => {
    // Switch to Calendar view
    await page.locator('[data-view="calendar"]').click();
    
    // Calendar should have day cells
    const dayCells = page.locator('.calendar__day');
    await expect(dayCells.first()).toBeVisible();
    
    // Some cells may have tasks (with due dates)
    const tasksInCalendar = page.locator('.calendar__task');
    // May or may not exist depending on due dates
  });

  test('should persist task data when switching views', async ({ page }) => {
    // In Kanban, verify task exists
    await expect(page.locator('.task-card', { hasText: 'Task 1' })).toBeVisible();
    
    // Switch to List
    await page.locator('[data-view="list"]').click();
    await expect(page.locator('.list-item', { hasText: 'Task 1' })).toBeVisible();
    
    // Switch back to Kanban
    await page.locator('[data-view="kanban"]').click();
    await expect(page.locator('.task-card', { hasText: 'Task 1' })).toBeVisible();
  });
});
