export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.lastTime = 0;
    this.running = false;
  }

  start = () => {
    this.running = true;
    requestAnimationFrame(this.loop);
  };

  stop = () => {
    this.running = false;
  };

  loop = (time) => {
    if (!this.running) return;

    const delta = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.loop);
  };
}