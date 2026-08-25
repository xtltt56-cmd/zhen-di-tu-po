async (page) => {
const results = {};

async function reloadMenu() {
  await page.reload();
  await page.getByRole('heading', { name: '阵地突围' }).waitFor();
}

async function combatState() {
  return page.evaluate(() => {
    return {
      canvas: [document.querySelector('#game').width, document.querySelector('#game').height],
      menuHidden: document.querySelector('#menu').classList.contains('hidden'),
      overlayHidden: document.querySelector('#overlay').classList.contains('hidden'),
    };
  });
}

await reloadMenu();
await page.getByRole('button', { name: '操作说明' }).click();
await page.getByRole('button', { name: '返回', exact: true }).click();
results.helpReturn = await page.locator('#overlay').evaluate(el => el.classList.contains('hidden'));

await page.getByRole('button', { name: '训练场' }).click();
await page.waitForTimeout(900);
results.training = await combatState();

await reloadMenu();
await page.getByRole('button', { name: /丧尸模式/ }).click();
await page.waitForTimeout(1600);
results.zombie = await combatState();

await reloadMenu();
await page.getByRole('button', { name: '开始任务' }).click();
await page.waitForTimeout(1000);
results.campaign = await combatState();
const urlBefore = page.url();
await page.locator('#game').dispatchEvent('pointerdown', { button: 2, buttons: 2, clientX: 640, clientY: 360 });
await page.locator('#game').dispatchEvent('pointermove', { button: 2, buttons: 2, clientX: 580, clientY: 360 });
await page.locator('#game').dispatchEvent('contextmenu', { button: 2, buttons: 2, clientX: 580, clientY: 360 });
await page.locator('#game').dispatchEvent('pointerup', { button: 2, buttons: 0, clientX: 580, clientY: 360 });
results.rightDragStayedInGame = page.url() === urlBefore;

await reloadMenu();
await page.getByRole('button', { name: /战线模式/ }).click();
await page.getByRole('button', { name: /第一关 · 步兵前线/ }).click();
await page.waitForTimeout(900);
results.frontline = await combatState();

return results;
}
