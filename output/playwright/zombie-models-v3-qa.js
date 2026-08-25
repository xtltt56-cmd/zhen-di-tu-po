const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /丧尸模式/ }).click();
  await page.waitForTimeout(13500);
  await page.keyboard.down('a');
  await page.waitForTimeout(1200);
  await page.keyboard.up('a');
  await page.waitForTimeout(350);
  const state = await page.evaluate(() => {
    const files = performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => name.includes('/assets/zombies-v3/'));
    return {
      inGame: document.querySelector('#menu').classList.contains('hidden'),
      imageFiles: files.map(file => file.split('/').pop()).sort(),
      canvas: [document.querySelector('#game').width, document.querySelector('#game').height],
    };
  });
  await page.screenshot({ path: 'output/playwright/zombie-models-v3.png' });

  const performance = await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const start = window.performance.now();
    const tick = now => {
      frames++;
      if (now - start >= 2000) {
        resolve(Math.round(frames * 1000 / (now - start)));
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

  console.log(JSON.stringify({ state, fps: performance, errors }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
