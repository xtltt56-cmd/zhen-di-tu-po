async (page) => {
  return page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const started = performance.now();
    const sample = now => {
      frames++;
      if (now - started >= 3000) {
        resolve({ frames, elapsedMs: Math.round(now - started), fps: Math.round(frames * 1000 / (now - started)) });
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}
