async (page) => {
  const url = 'http://127.0.0.1:8765/index.html';
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('position_breakout_frontline_v1', JSON.stringify({ maxUnlocked: 6 })));
  await page.reload();
  await page.getByRole('button', { name: /战线模式/ }).click();
  await page.locator('.frontline-level[data-level="5"]').click();
  await page.waitForTimeout(2400);
  await page.screenshot({ path: 'output/playwright/frontline-side-v3.png', type: 'png' });
  return { screenshot: 'output/playwright/frontline-side-v3.png' };
}
