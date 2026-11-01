// Фиксированный шаг через аккумулятор; рендер каждый кадр с интерполяцией alpha.
// На паузе update не вызывается, render вызывается.
export function createLoop({ step, maxDt, update, render, frame }) {
  let last = 0, acc = 0, raf = 0, running = false;
  const loop = {
    paused: false, timeScale: 1, fps: 60, frameMs: 16.7,
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); },
    stop() { running = false; cancelAnimationFrame(raf); },
    resetAccumulator() { acc = 0; },
  };
  let fpsAcc = 0, fpsFrames = 0;
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    let dt = (now - last) / 1000; last = now;
    if (!(dt >= 0)) dt = 0;
    dt = Math.min(dt, maxDt);
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 0.5) { loop.fps = fpsFrames / fpsAcc; loop.frameMs = 1000 * fpsAcc / fpsFrames; fpsAcc = 0; fpsFrames = 0; }
    if (frame) frame(dt);
    if (!loop.paused) {
      acc += dt * loop.timeScale;
      let n = 0;
      while (acc >= step && n < 8) { update(step); acc -= step; n++; if (loop.paused) { acc = 0; break; } }
      if (n >= 8) acc = 0;
    }
    render(loop.paused ? 1 : acc / step, dt);
  }
  return loop;
}
