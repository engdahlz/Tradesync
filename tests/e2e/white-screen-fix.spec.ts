import { expect, test } from '@playwright/test';

test.describe('White Screen Bug Fix Verification', () => {
    test('Page stays visible after load (no white screen)', async ({ page }) => {
        test.setTimeout(30_000);

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        
        await page.waitForTimeout(3000);
        
        const rootContent = await page.evaluate(() => {
            const root = document.getElementById('root');
            return root?.innerHTML?.length || 0;
        });
        
        expect(rootContent).toBeGreaterThan(100);
        
        await page.screenshot({ path: '.sisyphus/evidence/after-3-seconds.png', fullPage: true });
    });

    test('Page survives refresh without going white', async ({ page }) => {
        test.setTimeout(30_000);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        
        await page.waitForTimeout(3000);
        
        const rootContent = await page.evaluate(() => {
            const root = document.getElementById('root');
            return root?.innerHTML?.length || 0;
        });
        
        expect(rootContent).toBeGreaterThan(100);
        
        await page.screenshot({ path: '.sisyphus/evidence/after-refresh.png', fullPage: true });
    });
});
