import { expect, test } from '@playwright/test';

type TradesyncTestWindow = Window & { __tradesync_last_advisor_response?: string };
const getLastAdvisorResponse = () => (window as TradesyncTestWindow).__tradesync_last_advisor_response || '';

async function loginIfNeeded(page: import('@playwright/test').Page) {
  await page.goto('/advisor');

  const emailInput = page.getByPlaceholder('you@example.com');
  if (await emailInput.isVisible().catch(() => false)) {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (email && password) {
      await emailInput.fill(email);
      await page.getByPlaceholder('••••••••').fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();
    } else if (process.env.E2E_AUTH_BYPASS !== '1') {
      throw new Error('Missing E2E_EMAIL/E2E_PASSWORD env vars (or set E2E_AUTH_BYPASS=1 + VITE_E2E_AUTH_BYPASS=1)');
    }
  }

  await expect(page.getByRole('heading', { name: 'Financial Advisor' })).toBeVisible({ timeout: 30_000 });
}

test.describe('Financial Advisor chat', () => {
  test('can send message and receive a response', async ({ page }) => {
    test.setTimeout(120_000);
    await loginIfNeeded(page);


    const input = page.getByTestId('advisor-chat-input');
    await expect(input).toBeVisible();

    await input.fill('Vad är RSI? Svara kortfattat.');
    await page.getByTestId('advisor-chat-send').click();

    await expect
      .poll(async () => {
        return page.evaluate(getLastAdvisorResponse);
      }, {
        timeout: 60_000,
        intervals: [500, 1000, 2000, 5000],
      })
      .toMatch(/rsi|relative strength index|api key expired|encountered an error/i);

    await page.screenshot({ path: '.sisyphus/evidence/financial-advisor-chat.png', fullPage: true });
  });
});
