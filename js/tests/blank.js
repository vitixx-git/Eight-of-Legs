// Пустая служебная сцена для test.leaks / test.audio: между входами в проверяемые сцены.
const scene = {
  id: 'TEST_BLANK', kind: '2d', series: null, objectives: [], checkpoints: ['start'],
  enter(ctx) { ctx.show3d(false); ctx.clear2d(); },
  update() {}, render() {}, exit() {},
};
export default scene;
