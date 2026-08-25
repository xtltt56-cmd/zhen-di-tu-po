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
  await page.addInitScript(() => {
    window.__environmentDraws = {};
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      const src = image?.currentSrc || image?.src || '';
      if (src.includes('/assets/defenses-v3/') || src.includes('/assets/objectives-v3/')) {
        const name = src.split('/').pop();
        window.__environmentDraws[name] = (window.__environmentDraws[name] || 0) + 1;
      }
      return original.call(this, image, ...args);
    };
  });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '训练场', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.keyboard.down('d');
  await page.keyboard.down('w');
  await page.waitForTimeout(3200);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await page.waitForTimeout(500);
  const normalDraws = await page.evaluate(() => window.__environmentDraws);
  await page.screenshot({ path: 'output/playwright/objectives-v3.png' });

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /丧尸模式/ }).click();
  await page.waitForTimeout(1800);
  const zombieDraws = await page.evaluate(() => window.__environmentDraws);
  await page.screenshot({ path: 'output/playwright/defenses-v3.png' });

  const fps = await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const started = performance.now();
    const tick = now => {
      frames++;
      if (now - started >= 2000) resolve(Math.round(frames * 1000 / (now - started)));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

  console.log(JSON.stringify({ normalDraws, zombieDraws, fps, errors }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
