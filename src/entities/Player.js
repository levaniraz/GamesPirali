export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 150;
    this.size = 20;

    this.vx = 0;
    this.vy = 0;
  }

  update(delta) {
    this.x += this.vx * this.speed * delta;
    this.y += this.vy * this.speed * delta;
  }

  setDirection(x, y) {
    this.vx = x;
    this.vy = y;
  }

  draw(ctx) {
    ctx.fillStyle = "lime";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}