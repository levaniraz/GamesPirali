// game.js
import { Player, Enemy, Bullet, SoundManager, Decoration } from './entities.js';
import { Player, Enemy, Bullet, SoundManager } from './entities.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
    this.keys = {};
    this.setupInputs();

    // Game Data
    this.level = 1;
    this.score = 0;
    this.username = 'Player';
    this.difficulty = 'normal';
    this.diffMultiplier = 1;

    // Entities
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.camera = { x: 0, y: 0 };
    this.castleRect = { x: 0, y: 0, w: 200, h: 150 };

    // Managers
    this.sound = new SoundManager();

    // Expose to window for HTML buttons
    window.gameApp = this;
    this.loadLeaderboard();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));

    document
      .getElementById('settingsBtn')
      .addEventListener('click', () => this.toggleSettings());
    document.getElementById('soundToggle').addEventListener('change', (e) => {
      this.sound.toggle(e.target.checked);
    });
  }

  startGame() {
    const nameInput = document.getElementById('usernameInput').value;
    if (nameInput.trim()) this.username = nameInput;

    const diffSelect = document.getElementById('difficultySelect').value;
    this.difficulty = diffSelect;
    if (diffSelect === 'easy') this.diffMultiplier = 0.8;
    if (diffSelect === 'normal') this.diffMultiplier = 1.0;
    if (diffSelect === 'hard') this.diffMultiplier = 1.3;

    this.level = 1;
    this.score = 0;
    this.state = 'PLAYING';

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('controlsHint').classList.remove('hidden');

    this.generateLevel();
    this.loop();
  }

      generateLevel() {
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.decorations = []; // ახალი მასივი
        
        let mapHeight = 2000 + (this.level * 500);
        let mapWidth = 1000; // რუკის სიგანე
        
        this.castleRect = { x: mapWidth/2 - 100, y: 100, w: 200, h: 150 };
        
        this.player = new Player(this.sound);
        this.player.x = mapWidth / 2;
        this.player.y = mapHeight;

        // 1. მტრების გენერაცია (ძველი კოდი)
        let enemyCount = 5 + (this.level * 3);
        for(let i=0; i<enemyCount; i++) {
            let ex = Math.random() * (mapWidth - 100) + 50;
            let ey = Math.random() * (mapHeight - 400) + 200;
            let type = Math.random() > 0.5 ? 'gun' : 'sword';
            this.enemies.push(new Enemy(ex, ey, type, this.diffMultiplier));
        }

        // 2. დეკორაციების გენერაცია (ახალი კოდი)
        // ხეები გზის გარეთ (გზა არის ცენტრში, დაახლოებით 350-650 X-ზე)
        let decorCount = 40 + (this.level * 10);
        for(let i=0; i<decorCount; i++) {
            let dx, dy;
            // ვცადოთ პოზიციის შერჩევა, რომ გზაზე არ მოხვდეს
            do {
                dx = Math.random() * mapWidth;
                dy = Math.random() * mapHeight;
            } while (dx > 350 && dx < 650 && dy > 200); // თუ გზაზეა, თავიდან აირჩიოს

            let type = Math.random() > 0.7 ? 'tree' : 'bush'; // 30% ხე, 70% ბუჩქი
            this.decorations.push(new Decoration(dx, dy, type));
        }
    }

  update() {
    if (this.state !== 'PLAYING') return;

    // Player Logic
    let newBullet = this.player.update(this.keys, this.enemies);
    if (newBullet) this.bullets.push(newBullet);

    // Camera Follow
    this.camera.x +=
      (this.player.x - this.canvas.width / 2 - this.camera.x) * 0.1;
    this.camera.y +=
      (this.player.y - this.canvas.height / 2 - this.camera.y) * 0.1;

    // Enemies
    this.enemies.forEach((e) => {
      let b = e.update(this.player);
      if (b) this.bullets.push(b);
    });
    this.enemies = this.enemies.filter((e) => !e.dead);

    // Bullets
    this.bullets.forEach((b) => {
      b.update();
      // Collision Logic
      if (b.isPlayerBullet) {
        this.enemies.forEach((e) => {
          if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.size + b.radius) {
            e.takeDamage(25);
            b.dead = true;
            this.sound.hit();
          }
        });
      } else {
        if (
          Math.hypot(this.player.x - b.x, this.player.y - b.y) <
          this.player.size + b.radius
        ) {
          this.player.hp -= 10 * this.diffMultiplier;
          b.dead = true;
          this.sound.hit();
        }
      }
    });
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Check Win/Loss
    if (this.player.hp <= 0) this.endGame(false);

    // Check Castle Entry
    if (
      this.player.x > this.castleRect.x &&
      this.player.x < this.castleRect.x + this.castleRect.w &&
      this.player.y > this.castleRect.y &&
      this.player.y < this.castleRect.y + this.castleRect.h
    ) {
      this.nextLevel();
    }

    // Update HUD
    document.getElementById('hpFill').style.width =
      (this.player.hp / this.player.maxHp) * 100 + '%';
    document.getElementById('swordFill').style.width =
      ((this.player.swordMaxCd - this.player.swordCd) /
        this.player.swordMaxCd) *
        100 +
      '%';
    document.getElementById('gunFill').style.width =
      ((this.player.gunMaxCd - this.player.gunCd) / this.player.gunMaxCd) *
        100 +
      '%';
    document.getElementById('scoreDisplay').innerText = this.score;
    document.getElementById('levelDisplay').innerText = this.level;
  }

          draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ... (ბალახი, გზა, grid კოდი იგივე რჩება) ...
        
        // 1. ბალახი
        this.ctx.fillStyle = '#3a5f0b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. გზა
        let roadWidth = 300;
        let roadX = 500 - roadWidth / 2; 
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(roadX - this.camera.x, -1000 - this.camera.y, roadWidth, 5000);
        this.ctx.strokeStyle = '#777';
        this.ctx.setLineDash([40, 40]);
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(500 - this.camera.x, -1000 - this.camera.y);
        this.ctx.lineTo(500 - this.camera.x, 5000 - this.camera.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 3. Grid
        this.drawGrid();

        // 4. დეკორაციები (ხეები და ბუჩქები) - ახალი!
        this.decorations.forEach(d => d.draw(this.ctx, this.camera.x, this.camera.y));

        // 5. ციხესიმაგრე
        this.drawCastle();

        // 6. ობიექტები (მოთამაშე, მტრები, ტყვიები)
        if(this.player) this.player.draw(this.ctx, this.camera.x, this.camera.y);
        this.enemies.forEach(e => e.draw(this.ctx, this.camera.x, this.camera.y));
        this.bullets.forEach(b => b.draw(this.ctx, this.camera.x, this.camera.y));
    }

    drawCastle() {
        let cx = this.castleRect.x - this.camera.x;
        let cy = this.castleRect.y - this.camera.y;
        
        // კედლები
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(cx, cy, this.castleRect.w, this.castleRect.h);
        
        // კოშკები
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(cx - 20, cy - 20, 60, 60); // მარცხენა
        this.ctx.fillRect(cx + this.castleRect.w - 40, cy - 20, 60, 60); // მარჯვენა
        
        // კარი
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(cx + this.castleRect.w/2, cy + this.castleRect.h, 40, Math.PI, 0);
        this.ctx.fill();
        
        // ტექსტი
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = "bold 30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("NOLO", cx + this.castleRect.w/2, cy + 60);
    }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    this.ctx.lineWidth = 1;
    let gs = 100;
    let sx = Math.floor(this.camera.x / gs) * gs;
    let sy = Math.floor(this.camera.y / gs) * gs;

    for (let x = sx; x < this.camera.x + this.canvas.width; x += gs) {
      this.ctx.beginPath();
      this.ctx.moveTo(x - this.camera.x, 0);
      this.ctx.lineTo(x - this.camera.x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = sy; y < this.camera.y + this.canvas.height; y += gs) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y - this.camera.y);
      this.ctx.lineTo(this.canvas.width, y - this.camera.y);
      this.ctx.stroke();
    }
  }

  nextLevel() {
    this.level++;
    this.score += 100;
    this.sound.win();
    alert(`ტური ${this.level - 1} გავლილია!`);
    this.generateLevel();
  }

  endGame(win) {
    this.state = 'GAMEOVER';
    this.saveScore();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controlsHint').classList.add('hidden');
    document.getElementById('endScreen').classList.remove('hidden');
    document.getElementById('endTitle').innerText = win
      ? 'გამარჯვება!'
      : 'დამარცხდი!';
    document.getElementById('endScoreText').innerText =
      `ქულა: ${this.score} | ტური: ${this.level}`;
  }

  resetGame() {
    document.getElementById('endScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    this.loadLeaderboard();
  }

  toggleSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.toggle('hidden');
  }

  saveScore() {
    let scores = JSON.parse(localStorage.getItem('nolo_scores_v2')) || [];
    scores.push({
      name: this.username,
      score: this.score,
      level: this.level,
      difficulty: this.difficulty,
    });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem('nolo_scores_v2', JSON.stringify(scores));
  }

  loadLeaderboard() {
    let scores = JSON.parse(localStorage.getItem('nolo_scores_v2')) || [];
    const list = document.getElementById('scoresList');
    list.innerHTML =
      '<div class="score-row header-row"><span>სახელი</span><span>სირთულე</span><span>ქულა</span></div>';
    scores.forEach((s) => {
      let div = doment.createElement('div');
      div.classNase = 'score-row';
      // სირთულის თარგმნა
      let diffText =
        s.difficulty === 'easy'
          ? 'მარტივი'
          : s.difficulty === 'hard'
            ? 'რთული'
            : 'ნორმა';
      div.innerHTML = `<span>${s.name}</span> <span>${diffText}</span> <span>${s.score}</span>`;
      list.appendChild(div);
    });
  }

  loop() {
    if (this.state === 'PLAYING') {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.loop());
    }
  }
}

// Initialize Game
const game = new Game();
