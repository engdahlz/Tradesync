import { expect, test } from '@playwright/test';

type TradesyncTestWindow = Window & { __tradesync_last_advisor_response?: string };
const getLastAdvisorResponse = () => (window as TradesyncTestWindow).__tradesync_last_advisor_response || '';

test.describe('Financial Advisor chat', () => {
  test('can send message and receive a response', async ({ page }) => {
    await page.goto('/advisor');

    await expect(page.getByRole('heading', { name: 'Financial Advisor' })).toBeVisible();

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
      .toMatch(/rsi|relative strength index/i);

    await page.screenshot({ path: '.sisyphus/evidence/financial-advisor-chat.png', fullPage: true });
  });
});
