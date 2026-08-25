async (page) => {
  await page.keyboard.down('w');
  await page.waitForTimeout(720);
  await page.keyboard.up('w');
  await page.keyboard.press('f');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'output/playwright/training-tank-enter-v3.png', type: 'png' });
  return { screenshot: 'output/playwright/training-tank-enter-v3.png' };
}
