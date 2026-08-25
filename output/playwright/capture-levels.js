async (page) => {
  const url = 'http://127.0.0.1:8765/index.html';
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem('position_breakout_save_v2', JSON.stringify({
      maxUnlocked: 8,
      completed: 8,
      armor: 80
    }));
  });
  const results = [];
  for (let level = 0; level < 9; level++) {
    await page.goto(url);
    await page.locator('#level-select').click();
    await page.locator(`.level-choice[data-level="${level}"]`).click();
    await page.waitForTimeout(1400);
    const path = `output/playwright/campaign-${String(level + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path, type: 'png' });
    results.push({ level: level + 1, path });
  }
  return results;
}
