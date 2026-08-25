async (page) => {
  await page.mouse.move(250, 520);
  await page.waitForTimeout(650);
  await page.screenshot({ path: 'output/playwright/tank-turret-left-v3.png', type: 'png' });

  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  await page.mouse.move(1050, 180);
  await page.waitForTimeout(650);
  await page.screenshot({ path: 'output/playwright/tank-hull-turret-split-v3.png', type: 'png' });
  return {
    first: 'output/playwright/tank-turret-left-v3.png',
    second: 'output/playwright/tank-hull-turret-split-v3.png',
  };
}
