const { expect } = require('@playwright/test');

module.exports = async function confirmInSandbox(page, dialog) {
  if (process.env.AUTO_CONFIRM_PAYMENT !== 'true') return;
  const sandbox = process.env.SANDBOX_ORIGIN;
  if (!sandbox) throw new Error('Set SANDBOX_ORIGIN to the authorized test payment environment');
  const expected = new URL(sandbox);
  const actual = new URL(page.url());
  const isProduction = host => host === 'fly-up.app' || host === 'www.fly-up.app';
  if (isProduction(actual.hostname) || isProduction(expected.hostname) || actual.origin !== expected.origin) {
    throw new Error('Automatic investment confirmation requires the configured non-production sandbox origin');
  }
  // Reaching QR payment does not mean money was paid successfully.
  // Configure this with the QR element selector observed in the sandbox DOM.
  if (!process.env.PAYMENT_QR_SELECTOR) {
    throw new Error('Set PAYMENT_QR_SELECTOR before running sandbox payment confirmation');
  }
  // Validate selector syntax before the action that creates a payment request.
  await page.locator(process.env.PAYMENT_QR_SELECTOR).count();
  await dialog.getByRole('button', { name: 'ยืนยันการลงทุน', exact: true }).click();
  await expect(page.locator(process.env.PAYMENT_QR_SELECTOR)).toBeVisible();
};
