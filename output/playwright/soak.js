async (page) => {
  const report = [];
  const reload = async () => {
    await page.reload();
    await page.getByRole('heading', { name: '阵地突围' }).waitFor();
  };

  await reload();
  await page.getByRole('button', { name: '开始任务' }).click();
  await page.waitForTimeout(8000);
  report.push({ mode: 'campaign', responsive: await page.locator('#game').isVisible() });

  await reload();
  await page.getByRole('button', { name: /丧尸模式/ }).click();
  await page.waitForTimeout(10000);
  report.push({ mode: 'zombie', responsive: await page.locator('#game').isVisible() });

  await reload();
  await page.getByRole('button', { name: /战线模式/ }).click();
  await page.getByRole('button', { name: /第一关 · 步兵前线/ }).click();
  await page.waitForTimeout(8000);
  report.push({ mode: 'frontline', responsive: await page.locator('#game').isVisible() });
  return report;
}
