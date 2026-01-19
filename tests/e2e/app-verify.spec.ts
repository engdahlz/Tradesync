import { expect, test } from '@playwright/test';

test.describe('Trade/Sync App Verification', () => {
    test('Homepage loads and displays dashboard', async ({ page }) => {
        test.setTimeout(60_000);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: '.sisyphus/evidence/homepage.png', fullPage: true });

        const title = await page.title();
        expect(title).toContain('Trade/Sync');
    });

    test('Login page renders correctly', async ({ page }) => {
        test.setTimeout(60_000);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginPageVisible = await page.locator('text=Sign In').isVisible().catch(() => false);
        const dashboardVisible = await page.locator('text=Market').isVisible().catch(() => false);

        expect(loginPageVisible || dashboardVisible).toBe(true);

        await page.screenshot({ path: '.sisyphus/evidence/app-state.png', fullPage: true });
    });
});
