// entities.js

export class SoundManager {
    constructor() {
        this.enabled = true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log("Audio not supported");
        }
    }

    toggle(enabled) {
        this.enabled = enabled;
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    shoot() { this.playTone(600, 'square', 0.1); }
    sword() { this.playTone(150, 'sawtooth', 0.15); }
    hit() { this.playTone(100, 'sawtooth', 0.1); }
    win() { 
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 200);
    }
}

class Entity {
    constructor(x, y, size, speed, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.color = color;
        this.hp = 100;
        this.maxHp = 100;
        this.dead = false;
        this.angle = 0;
    }

    drawShadow(ctx, camX, camY) {
        ctx.save();
        ctx.translate(this.x - camX, this.y - camY);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBody(ctx, camX, camY) {
        ctx.save();
        ctx.translate(this.x - camX, this.y - camY);
        ctx.rotate(this.angle);
        
        // სხეული
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // თავი/მხრები (უფრო "კაცივით")
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // იარაღი/ხელი
        ctx.fillStyle = '#333';
        ctx.fillRect(this.size - 5, -3, 10, 6);

        ctx.restore();
    }
    
    draw(ctx, camX, camY) {
        this.drawShadow(ctx, camX, camY);
        this.drawBody(ctx, camX, camY);
    }
}

export class Player extends Entity {
    constructor(soundManager) {
        super(window.innerWidth / 2, window.innerHeight / 2 + 300, 18, 4, '#3498db');
        this.sound = soundManager;
        this.swordCd = 0;
        this.swordMaxCd = 30; // უფრო სწრაფი
        this.gunCd = 0;
        this.gunMaxCd = 60;
        this.swordRange = 80;
        this.isSwinging = false;
        this.swingTimer = 0;
    }

    update(keys, enemies) {
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= this.speed;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += this.speed;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= this.speed;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += this.speed;

        let nearest = this.getNearestEnemy(enemies);
        if (nearest) {
            this.angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        }

        if (this.swordCd > 0) this.swordCd--;
        if (this.gunCd > 0) this.gunCd--;
        
        if (this.swingTimer > 0) this.swingTimer--;
        else this.isSwinging = false;

        if (keys['Space'] && this.swordCd <= 0) this.useSword(enemies);
        if (keys['KeyX'] && this.gunCd <= 0) return this.shootGun();
        
        return null;
    }

    getNearestEnemy(enemies) {
        let nearest = null;
        let minDst = Infinity;
        enemies.forEach(e => {
            let d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDst) { minDst = d; nearest = e; }
        });
        return nearest;
    }

    useSword(enemies) {
        this.swordCd = this.swordMaxCd;
        this.isSwinging = true;
        this.swingTimer = 10;
        this.sound.sword();
        
        enemies.forEach(e => {
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist < this.swordRange) {
                let angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                let angleDiff = angleToEnemy - this.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) < Math.PI / 2.5) {
                    e.takeDamage(60);
                    e.x += Math.cos(angleToEnemy) * 40; // Knockback
                    e.y += Math.sin(angleToEnemy) * 40;
                }
            }
        });
    }

    shootGun() {
        this.gunCd = this.gunMaxCd;
        this.sound.shoot();
        return new Bullet(this.x, this.y, this.angle, 15, true);
    }
    
    draw(ctx, camX, camY) {
        super.draw(ctx, camX, camY);
        
        // ხმლის ეფექტი
        if (this.isSwinging) {
            ctx.save();
            ctx.translate(this.x - camX, this.y - camY);
            ctx.rotate(this.angle);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.swordRange, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.restore();
        }
    }
}

export class Enemy extends Entity {
    constructor(x, y, type, difficultyMult) {
        super(x, y, 18, 2.5 * difficultyMult, type === 'gun' ? '#c0392b' : '#d35400');
        this.type = type;
        this.attackCd = 0;
        this.hp = 40 * difficultyMult;
        this.difficultyMult = difficultyMult;
    }

    update(player) {
        let dist = Math.hypot(player.x - this.x, player.y - this.y);
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);

        if (this.type === 'sword') {
            if (dist > 35) {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
            } else if (this.attackCd <= 0) {
                player.hp -= 15 * this.difficultyMult;
                this.attackCd = 50;
                this.sound.hit(); // თუ sound manager გადაეცემა
            }
        } else {
            // Gun logic
            if (dist > 350) {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
            } else if (dist < 200) {
                this.x -= Math.cos(this.angle) * this.speed;
                this.y -= Math.sin(this.angle) * this.speed;
            }

            if (this.attackCd <= 0 && dist < 500) {
                this.attackCd = 90 / this.difficultyMult;
                return new Bullet(this.x, this.y, this.angle, 8, false);
            }
        }
        if (this.attackCd > 0) this.attackCd--;
        return null;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) this.dead = true;
    }
}

export class Bullet {
    constructor(x, y, angle, speed, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.isPlayerBullet = isPlayerBullet;
        this.radius = 5;
        this.dead = false;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0) this.dead = true;
    }

    draw(ctx, camX, camY) {
        ctx.fillStyle = this.isPlayerBullet ? '#f1c40f' : '#2c3e50';
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // ტყვიის კვალი
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(this.x - this.vx*2 - camX, this.y - this.vy*2 - camY, this.radius*0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}
export class Decoration {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'tree' or 'bush'
        this.size = type === 'tree' ? 40 : 20;
        this.color = type === 'tree' ? '#2ecc71' : '#27ae60';
    }

    draw(ctx, camX, camY) {
        let screenX = this.x - camX;
        let screenY = this.y - camY;

        // თუ ეკრანს გარეთაა, არ დავხატოთ (ოპტიმიზაცია)
        if (screenX < -50 || screenX > window.innerWidth + 50 || 
            screenY < -50 || screenY > window.innerHeight + 50) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        if (this.type === 'tree') {
            // ტანი
            ctx.fillStyle = '#8B4513'; // ყავისფერი
            ctx.fillRect(-5, 0, 10, 20);
            
            // ვარჯი (სამი წრე ერთმანეთზე)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, -10, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // ჩრდილი/დეტალი
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(-5, -15, 10, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'bush') {
            // ბუჩქი (რამდენიმე პატარა წრე)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.arc(-10, 5, 12, 0, Math.PI * 2);
            ctx.arc(10, 5, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}