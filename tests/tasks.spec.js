/**
 * E2E Tests - Task Management
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-tasks-${Date.now()}@example.com`,
  password: 'testpassword123'
};

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('#auth-email', TEST_USER.email);
    await page.fill('#auth-password', TEST_USER.password);
    await page.click('#signup-btn');
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
  });

  test('should create task via quick input', async ({ page }) => {
    const taskText = 'Test task from E2E';
    
    // Type in quick input
    await page.fill('#quick-input', taskText);
    await page.click('#quick-add-btn');
    
    // Wait for task to appear in backlog column
    await page.waitForTimeout(2000); // Wait for Firestore
    
    const taskCard = page.locator('.task-card', { hasText: taskText }).first();
    await expect(taskCard).toBeVisible();
  });

  test('should parse quick input with tags and priority', async ({ page }) => {
    const taskText = 'API task #backend !high';
    
    await page.fill('#quick-input', taskText);
    await page.click('#quick-add-btn');
    
    await page.waitForTimeout(2000);
    
    // Check for task with parsed content
    const taskCard = page.locator('.task-card', { hasText: 'API task' }).first();
    await expect(taskCard).toBeVisible();
    
    // Should have high priority badge
    await expect(taskCard.locator('.priority-badge--high')).toBeVisible();
    
    // Should have backend tag
    await expect(taskCard.locator('.tag', { hasText: 'backend' })).toBeVisible();
  });

  test('should parse dates in quick input', async ({ page }) => {
    const taskText = 'Task due tomorrow';
    
    await page.fill('#quick-input', taskText);
    await page.click('#quick-add-btn');
    
    await page.waitForTimeout(2000);
    
    const taskCard = page.locator('.task-card', { hasText: 'Task due' }).first();
    await expect(taskCard).toBeVisible();
    
    // Should have due date indicator
    await expect(taskCard.locator('.task-card__due')).toBeVisible();
  });

  test('should open task modal on card click', async ({ page }) => {
    // Create a task first
    await page.fill('#quick-input', 'Task to edit');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Click on the task card
    const taskCard = page.locator('.task-card', { hasText: 'Task to edit' }).first();
    await taskCard.click();
    
    // Task modal should open
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();
    
    // Title input should have the task text
    const titleInput = page.locator('#task-title-input');
    await expect(titleInput).toHaveValue('Task to edit');
  });

  test('should update task from modal', async ({ page }) => {
    // Create a task
    await page.fill('#quick-input', 'Original task');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Open modal
    const taskCard = page.locator('.task-card', { hasText: 'Original task' }).first();
    await taskCard.click();
    
    // Update title
    await page.fill('#task-title-input', 'Updated task');
    await page.fill('#task-description', 'This is a description');
    await page.selectOption('#task-priority', 'high');
    
    // Save
    await page.click('#save-task-btn');
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Task should be updated
    await expect(page.locator('.task-card', { hasText: 'Updated task' })).toBeVisible();
  });

  test('should delete task from modal', async ({ page }) => {
    // Create a task
    const taskText = 'Task to delete';
    await page.fill('#quick-input', taskText);
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Open modal
    const taskCard = page.locator('.task-card', { hasText: taskText }).first();
    await taskCard.click();
    
    // Setup dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Delete
    await page.click('#delete-task-btn');
    
    // Wait for deletion
    await page.waitForTimeout(2000);
    
    // Task should be gone
    await expect(page.locator('.task-card', { hasText: taskText })).not.toBeVisible();
  });

  test('should create and display subtasks', async ({ page }) => {
    // Create a parent task
    await page.fill('#quick-input', 'Parent task');
    await page.click('#quick-add-btn');
    await page.waitForTimeout(2000);
    
    // Open modal
    const taskCard = page.locator('.task-card', { hasText: 'Parent task' }).first();
    await taskCard.click();
    
    // Add subtask
    await page.click('#add-subtask-btn');
    await page.waitForTimeout(1000);
    
    // Edit subtask
    const subtaskInput = page.locator('.subtask-edit__input').first();
    await subtaskInput.fill('Subtask 1');
    await page.waitForTimeout(1000);
    
    // Close modal
    await page.click('.task-modal__close');
    await page.waitForTimeout(1000);
    
    // Parent card should show subtask indicator
    const parentCard = page.locator('.task-card', { hasText: 'Parent task' }).first();
    await expect(parentCard.locator('.task-card__subtasks')).toBeVisible();
  });
});
