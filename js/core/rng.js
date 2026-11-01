// Сидированный ГПСЧ mulberry32. Math.random() в игровой логике запрещён.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createRng(seed = 170) {
  let next = mulberry32(seed);
  const rng = {
    seed,
    next: () => next(),
    reseed(s) { rng.seed = s; next = mulberry32(s); },
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length) % arr.length],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return rng;
}
