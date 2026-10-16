async function handleCookies(page) {
  const button = process.env.COOKIE_BUTTON_SELECTOR
    ? page.locator(process.env.COOKIE_BUTTON_SELECTOR)
    : page.getByRole('button', {
      name: /^(ยอมรับทั้งหมด|ยอมรับคุกกี้ทั้งหมด|ยอมรับคุกกี้|ยอมรับ|อนุญาตทั้งหมด|Accept all|Accept all cookies|Accept cookies|Allow all)$/i
    });
  // Handler also handles banners that appear late and intercept a login/next click.
  await page.addLocatorHandler(button.first(), async locator => {
    await locator.click();
  });
  if (await button.first().isVisible()) await button.first().click();
}
module.exports = handleCookies;
