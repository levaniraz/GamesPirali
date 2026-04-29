import { useEffect, useRef } from "react";
import Joystick from "../components/Joystick";

export default function Game() {
  const canvasRef = useRef(null);
  const playerRef = useRef({
    x: 200,
    y: 200,
    size: 20,
    speed: 180,
    vx: 0,
    vy: 0,
  });

  const keys = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // ======================
    // INPUT (WASD)
    // ======================
    const keyDown = (e) => (keys.current[e.key.toLowerCase()] = true);
    const keyUp = (e) => (keys.current[e.key.toLowerCase()] = false);

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    // ======================
    // GAME LOOP
    // ======================
    let lastTime = 0;

    const loop = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      update(delta);
      render();

      requestAnimationFrame(loop);
    };

    const update = (delta) => {
      const p = playerRef.current;

      let x = 0;
      let y = 0;

      // WASD input
      if (keys.current["w"]) y -= 1;
      if (keys.current["s"]) y += 1;
      if (keys.current["a"]) x -= 1;
      if (keys.current["d"]) x += 1;

      // normalize movement
      const length = Math.sqrt(x * x + y * y);
      if (length > 0) {
        x /= length;
        y /= length;
      }

      p.vx = x;
      p.vy = y;

      p.x += p.vx * p.speed * delta;
      p.y += p.vy * p.speed * delta;

      // boundaries
      p.x = Math.max(0, Math.min(canvas.width - p.size, p.x));
      p.y = Math.max(0, Math.min(canvas.height - p.size, p.y));
    };

    const render = () => {
      const p = playerRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // player
      ctx.fillStyle = "#00ff88";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    };

    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ======================
  // MOBILE JOYSTICK INPUT
  // ======================
  const handleMove = (x, y) => {
    const p = playerRef.current;
    p.vx = x;
    p.vy = y;
  };

  return (
    <div>
      <canvas ref={canvasRef} />

      {/* MOBILE JOYSTICK */}
      <Joystick onMove={handleMove} />
    </div>
  );
}