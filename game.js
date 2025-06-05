const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 40;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let money = 100;
let towers = [];
let enemies = [];
let path = [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
    { x: 6, y: 3 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 10, y: 3 },
    { x: 10, y: 4 },
    { x: 10, y: 5 },
    { x: 10, y: 6 },
    { x: 10, y: 7 },
    { x: 10, y: 8 },
    { x: 9, y: 8 },
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
    { x: 7, y: 10 },
    { x: 7, y: 11 },
    { x: 7, y: 12 },
    { x: 8, y: 12 },
    { x: 9, y: 12 },
    { x: 10, y: 12 },
    { x: 10, y: 11 },
    { x: 10, y: 10 },
    { x: 11, y: 10 },
    { x: 12, y: 10 },
    { x: 13, y: 10 },
    { x: 14, y: 10 },
    { x: 14, y: 9 },
    { x: 14, y: 8 },
    { x: 14, y: 7 },
    { x: 14, y: 6 },
    { x: 14, y: 5 },
    { x: 14, y: 4 },
    { x: 15, y: 4 },
    { x: 16, y: 4 },
    { x: 17, y: 4 },
    { x: 18, y: 4 },
    { x: 18, y: 6 },
    { x: 18, y: 7 },
    { x: 18, y: 8 },
    { x: 18, y: 9 },
    { x: 18, y: 10 },
    { x: 18, y: 10 },
    { x: 19, y: 10 }
];

let gameSpeed = 1;
let previewTower = null;
let isPlacingTower = false;
let isPlacingDoubleTower = false;

let cheatSequence = [];
let cheatCode = ['c', 'h', 'e', 'a', 't'];

let gameOver = false;

class Projectile {
    constructor(x, y, targetEnemy, damage) {
        this.x = x;
        this.y = y;
        this.targetEnemy = targetEnemy;
        this.baseSpeed = 8;
        this.radius = 4;
        this.hasHit = false;
        this.damage = damage;
    }

    move() {
        if (this.hasHit) return true;

        let speed = this.baseSpeed;
        if (gameSpeed >= 1) {
            speed *= gameSpeed;
        }

        const dx = this.targetEnemy.x + this.targetEnemy.width / 2 - this.x;
        const dy = this.targetEnemy.y + this.targetEnemy.height / 2 - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.x += (dx / distance) * speed;
        this.y += (dy / distance) * speed;

        if (this.targetEnemy.isColliding(this)) {
            this.targetEnemy.health -= this.damage;
            this.hasHit = true;
            return true;
        }

        return distance > 1000;
    }

    draw() {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y - 1, this.radius / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Tower {
    constructor(x, y, level = 1) {
        this.x = x;
        this.y = y;
        this.range = 150;
        this.lastShot = 0;
        this.baseCooldown = 750;
        this.projectiles = [];
        this.showRange = false;
        this.level = level;
        this.damage = 100;
        this.upgradeCost = 100;
        this.showUpgrade = false;
    }

    getRange() {
        const rangeUpgrades = Math.floor((this.level + 1) / 2);
        return this.range + (rangeUpgrades * 50);
    }

    getCooldown() {
        const speedUpgrades = Math.floor(this.level / 2);
        const baseCooldownWithUpgrades = this.baseCooldown / (1 + speedUpgrades * 0.5);
        return baseCooldownWithUpgrades / gameSpeed;
    }

    draw() {
        let baseColor;
        switch (this.level) {
            case 1:
                baseColor = '#4A90E2';
                break;
            case 2:
                baseColor = '#2980B9';
                break;
            case 3:
                baseColor = '#8E44AD';
                break;
            case 4:
                baseColor = '#C0392B';
                break;
            default:
                baseColor = '#E74C3C';
        }

        if (this.showRange) {
            ctx.strokeStyle = 'rgba(74, 144, 226, 0.5)';
            ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
            ctx.beginPath();
            const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
            const currentRange = this.getRange();
            ctx.arc(centerX, centerY, currentRange, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = baseColor;
        ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        ctx.fillStyle = '#2C3E50';
        const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
        const target = this.findTarget();
        if (target) {
            ctx.save();
            ctx.translate(centerX, centerY);
            const angle = Math.atan2(
                target.y + GRID_SIZE / 4 - centerY,
                target.x + GRID_SIZE / 4 - centerX
            );
            ctx.rotate(angle);
            ctx.fillRect(0, -4, GRID_SIZE / 2, 8);
            ctx.restore();
        } else {
            ctx.fillRect(centerX, centerY - 4, GRID_SIZE / 2, 8);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.level, centerX, centerY + 5);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#34495E';
        ctx.fill();
        if (this.showUpgrade) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE - 30, GRID_SIZE, 25);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const nextUpgrade = this.level % 2 === 0 ? "Range" : "Speed";
            ctx.fillText(`Upgrade ${nextUpgrade}: ${this.upgradeCost}$`,
                this.x * GRID_SIZE + GRID_SIZE / 2,
                this.y * GRID_SIZE - 15);
        }
    }

    shoot() {
        const now = Date.now();
        const currentCooldown = this.getCooldown();
        if (now - this.lastShot >= currentCooldown) {
            const target = this.findTarget();
            if (target) {
                const projectile = new Projectile(
                    this.x * GRID_SIZE + GRID_SIZE / 2,
                    this.y * GRID_SIZE + GRID_SIZE / 2,
                    target,
                    this.damage
                );
                this.projectiles.push(projectile);
                this.lastShot = now;
            }
        }
        this.projectiles = this.projectiles.filter(proj => {
            proj.draw();
            return !proj.move();
        });
    }

    findTarget() {
        return enemies.find(enemy => {
            const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dx = enemyCenterX - centerX;
            const dy = enemyCenterY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.getRange();
        });
    }

    upgrade() {
        if (money >= this.upgradeCost) {
            money -= this.upgradeCost;
            this.level += 1;
            this.upgradeCost *= 2;
            document.getElementById('money').textContent = money;
            return true;
        }
        return false;
    }
}

class DoubleTower extends Tower {
    constructor(x, y, level = 1) {
        super(x, y, level);
        this.damage = 50;
        this.baseCooldown = 1500;
        this.upgradeCost = 200;
        this.isDoubleTower = true;
    }

    shoot() {
        const now = Date.now();
        const currentCooldown = this.getCooldown();
        if (now - this.lastShot >= currentCooldown) {
            const target = this.findTarget();
            if (target) {
                const projectile1 = new Projectile(
                    this.x * GRID_SIZE + GRID_SIZE / 2 - 10,
                    this.y * GRID_SIZE + GRID_SIZE / 2,
                    target,
                    this.damage
                );
                const projectile2 = new Projectile(
                    this.x * GRID_SIZE + GRID_SIZE / 2 + 10,
                    this.y * GRID_SIZE + GRID_SIZE / 2,
                    target,
                    this.damage
                );
                this.projectiles.push(projectile1, projectile2);
                this.lastShot = now;
            }
        }
        this.projectiles = this.projectiles.filter(proj => {
            proj.draw();
            return !proj.move();
        });
    }

    draw() {
        if (this.showRange) {
            ctx.strokeStyle = 'rgba(255, 87, 51, 0.5)';
            ctx.fillStyle = 'rgba(255, 87, 51, 0.2)';
            ctx.beginPath();
            const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
            const currentRange = this.getRange();
            ctx.arc(centerX, centerY, currentRange, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.fillStyle = '#FF5733';
        ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

        ctx.fillStyle = '#2C3E50';
        const target = this.findTarget();
        if (target) {
            ctx.save();
            ctx.translate(centerX, centerY);
            const angle = Math.atan2(
                target.y + GRID_SIZE / 4 - centerY,
                target.x + GRID_SIZE / 4 - centerX
            );
            ctx.rotate(angle);
            ctx.fillRect(-15, -4, GRID_SIZE / 2, 6);
            ctx.fillRect(5, -4, GRID_SIZE / 2, 6);
            ctx.restore();
        } else {
            ctx.fillRect(centerX - 15, centerY - 4, GRID_SIZE / 2, 6);
            ctx.fillRect(centerX + 5, centerY - 4, GRID_SIZE / 2, 6);
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.level, centerX, centerY + 5);
    }
}

class Enemy {
    constructor(wave) {
        this.pathIndex = 0;
        this.x = path[0].x * GRID_SIZE + GRID_SIZE / 4;
        this.y = path[0].y * GRID_SIZE + GRID_SIZE / 4;
        this.width = GRID_SIZE / 2;
        this.height = GRID_SIZE / 2;
        this.wave = wave;
        this.maxHealth = 100 * wave;
        this.health = this.maxHealth;
        this.baseSpeed = 0.5 + (wave * 0.1);
        if (this.baseSpeed > 2) {
            this.baseSpeed = 2;
        }
        this.reward = wave * 2;
        const colorPhase = (wave - 1) % 5;
        this.colors = {
            0: '#FF4444',
            1: '#FF8C00',
            2: '#9932CC',
            3: '#4169E1',
            4: '#2F4F4F'
        };
        this.color = this.colors[colorPhase];
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        const eyeWidth = 4;
        const eyeHeight = 4;
        const eyeX = this.x + this.width / 4;
        const eyeY = this.y + this.height / 4;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(eyeX, eyeY, eyeWidth, eyeHeight);
        ctx.fillRect(eyeX + this.width / 2, eyeY, eyeWidth, eyeHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.fillText(`Niv.${this.wave}`, this.x, this.y - 15);
        const healthBarWidth = this.width;
        const healthBarHeight = 6;
        const currentHealth = (this.health / this.maxHealth) * healthBarWidth;
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - 1, this.y - 11, healthBarWidth + 2, healthBarHeight + 2);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y - 10, currentHealth, healthBarHeight);
    }

    move() {
        const targetX = path[this.pathIndex].x * GRID_SIZE + GRID_SIZE / 4;
        const targetY = path[this.pathIndex].y * GRID_SIZE + GRID_SIZE / 4;
        const currentSpeed = this.baseSpeed * gameSpeed;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
            if (this.pathIndex >= path.length) {
                lives -= 2;
                document.getElementById('lives').textContent = lives;
                return true;
            }
        } else {
            this.x += (dx / distance) * currentSpeed;
            this.y += (dy / distance) * currentSpeed;
        }

        if (this.health <= 0) {
            updateMoney(money + this.reward);
            return true;
        }
        return false;
    }

    isColliding(projectile) {
        return projectile.x >= this.x &&
            projectile.x <= this.x + this.width &&
            projectile.y >= this.y &&
            projectile.y <= this.y + this.height;
    }
}

let lives = 20;

let currentWave = 1;
let enemiesInWave = 5;
let enemiesSpawned = 0;
let waveInProgress = false;

function drawGrid() {
    ctx.fillStyle = '#90CF50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#7FBF40';
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            ctx.strokeRect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
    }
}

function drawPath() {
    ctx.fillStyle = '#8B8B8B';
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        const startX = Math.min(current.x, next.x);
        const startY = Math.min(current.y, next.y);
        const width = Math.abs(next.x - current.x) + 1;
        const height = Math.abs(next.y - current.y) + 1;
        ctx.fillRect(
            startX * GRID_SIZE,
            startY * GRID_SIZE,
            width * GRID_SIZE,
            height * GRID_SIZE
        );
    }
    ctx.strokeStyle = '#696969';
    ctx.lineWidth = 2;
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        const startX = Math.min(current.x, next.x);
        const startY = Math.min(current.y, next.y);
        const width = Math.abs(next.x - current.x) + 1;
        const height = Math.abs(next.y - current.y) + 1;
        ctx.strokeRect(
            startX * GRID_SIZE,
            startY * GRID_SIZE,
            width * GRID_SIZE,
            height * GRID_SIZE
        );
    }
}

function placeTower() {
    if (isPlacingTower || money < 50) return;
    isPlacingTower = true;
    const placeTowerButton = document.querySelector('button[onclick="placeTower()"]');
    placeTowerButton.style.opacity = '0.5';
    previewTower = {
        x: 0,
        y: 0,
        range: 150,
        isValid: false
    };
    canvas.addEventListener('mousemove', handleTowerPreview);
    canvas.addEventListener('click', handleTowerPlacement);
    canvas.style.cursor = 'crosshair';
    saveGame();
}

function handleTowerPreview(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);
    if (previewTower) {
        previewTower.x = x;
        previewTower.y = y;
        previewTower.isValid = isValidPlacement(x, y);
    }
}

function isValidPlacement(x, y) {
    if (isOnPath(x, y)) return false;
    const existingTower = towers.find(tower => tower.x === x && tower.y === y);
    if (existingTower) return false;
    return true;
}

function drawTowerPreview() {
    if (!previewTower) return;
    const x = previewTower.x * GRID_SIZE;
    const y = previewTower.y * GRID_SIZE;
    ctx.globalAlpha = 0.5;
    if (previewTower.isValid) {
        ctx.fillStyle = 'rgba(74, 144, 226, 0.5)';
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.8)';
    } else {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    }
    ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
    ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
    ctx.beginPath();
    ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, previewTower.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function handleTowerPlacement(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);
    if (isValidPlacement(x, y)) {
        if (isPlacingDoubleTower) {
            if (money >= 300) {
                towers.push(new DoubleTower(x, y));
                updateMoney(money - 300);
            }
        } else {
            if (money >= 50) {
                towers.push(new Tower(x, y));
                updateMoney(money - 50);
            }
        }
    }
    isPlacingTower = false;
    isPlacingDoubleTower = false;
    previewTower = null;
    canvas.removeEventListener('mousemove', handleTowerPreview);
    canvas.removeEventListener('click', handleTowerPlacement);
    canvas.style.cursor = 'default';
    const placeTowerButton = document.querySelector('button');
    placeTowerButton.style.opacity = '1';
    saveGame();
}

function isOnPath(x, y) {
    return path.some(point => point.x === x && point.y === y);
}

function spawnEnemy() {
    if (!waveInProgress) return;
    if (enemiesSpawned < enemiesInWave) {
        enemies.push(new Enemy(currentWave));
        enemiesSpawned++;

        const baseInterval = 2500;
        const minInterval = 1000;
        const reduction = currentWave * 20;
        const newInterval = Math.max(minInterval, baseInterval - reduction);

        clearInterval(spawnInterval);
        spawnInterval = setInterval(spawnEnemy, newInterval);
    } else if (enemies.length === 0) {
        waveInProgress = false;

        const currentBestWave = parseInt(localStorage.getItem('bestWave')) || 0;
        if (currentWave > currentBestWave) {
            localStorage.setItem('bestWave', currentWave);
            updateBestWave();
        }

        currentWave++;
        enemiesInWave = Math.floor(5 + (currentWave * 1.2));
        enemiesSpawned = 0;
        showWaveMessage();
        const delayBetweenWaves = 2000;
        setTimeout(startNextWave, delayBetweenWaves);
    }
    saveGame();
}

function showWaveMessage() {
    const waveMessage = document.getElementById('waveMessage');
    if (!waveMessage) return;
    const waveSpan = document.getElementById('wave');
    waveSpan.textContent = currentWave;
    const waveStats = document.getElementById('waveStats');
    if (waveStats) {
        waveStats.innerHTML = `
            Ennemis: ${enemiesInWave}<br>
            PV: ${100 * currentWave}<br>
        `;
    }
    waveMessage.textContent = `Vague ${currentWave}`;
    waveMessage.style.display = 'block';
    setTimeout(() => {
        waveMessage.style.display = 'none';
    }, 1000);
}

function addWaveDisplay() {
    const controls = document.querySelector('.controls');
    const waveInfo = document.createElement('div');
    waveInfo.className = 'wave-info';
    waveInfo.innerHTML = `
        <p>Vague: <span id="wave">1</span></p>
        <div id="waveStats" class="wave-stats"></div>
    `;
    controls.appendChild(waveInfo);
    saveGame();
}

function updateSpawnInterval() {
    const baseInterval = 2000;
    const minInterval = 500;
    const reduction = currentWave * 50;
    const newInterval = Math.max(minInterval, baseInterval - reduction);
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, newInterval);
}

let spawnInterval;

function startNextWave() {
    waveInProgress = true;
    updateSpawnInterval();
    showWaveMessage();
}

function gameLoop() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawPath();
    towers.forEach(tower => {
        tower.draw();
        tower.shoot();
        drawTowerUpgrades(tower);
    });
    enemies = enemies.filter(enemy => {
        enemy.draw();
        return !enemy.move();
    });
    drawTowerPreview();

    if (lives <= 0 && !gameOver) {
        gameOver = true;
        const gameOverMessage = document.getElementById('gameOverMessage');
        document.getElementById('finalWave').textContent = currentWave;
        gameOverMessage.style.display = 'block';
        clearInterval(spawnInterval);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Recommencer';
        restartButton.onclick = resetGame;
        gameOverMessage.appendChild(restartButton);

        return;
    }

    requestAnimationFrame(gameLoop);
}

function init() {
    loadGame();
    addWaveDisplay();
    updateBestWave();
    updateButtonStates();
    addPauseButton();
    canvas.addEventListener('click', handleTowerClick);
    canvas.addEventListener('mousemove', handleTowerHover);
    canvas.addEventListener('mouseleave', () => {
        towers.forEach(tower => {
            tower.showUpgrade = false;
            tower.showRange = false;
        });
    });
    spawnInterval = setInterval(spawnEnemy, 2000);
    startNextWave();
    gameLoop();
}

window.onload = init;

document.getElementById('speedSlider').addEventListener('input', function () {
    gameSpeed = parseFloat(this.value);
    document.getElementById('speedValue').textContent = gameSpeed.toFixed(1);
});

function handleTowerClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const clickY = Math.floor((e.clientY - rect.top) / GRID_SIZE);
    towers.forEach(tower => {
        if (tower.x === clickX && tower.y === clickY) {
            upgradeTower(tower);
        }
    });
}

function handleTowerHover(e) {
    const rect = canvas.getBoundingClientRect();
    const hoverX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const hoverY = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    towers.forEach(tower => {
        tower.showUpgrade = false;
        tower.showRange = false;
    });

    towers.forEach(tower => {
        if (tower.x === hoverX && tower.y === hoverY) {
            tower.showUpgrade = true;
            tower.showRange = true;
            const nextUpgrade = tower.level % 2 === 0 ? "Range" : "Speed";
            const upgradeCost = tower.upgradeCost;
            const range = tower.getRange();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(tower.x * GRID_SIZE, tower.y * GRID_SIZE - 50, GRID_SIZE, 40);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Upgrade ${nextUpgrade}: ${upgradeCost}$`,
                tower.x * GRID_SIZE + GRID_SIZE / 2,
                tower.y * GRID_SIZE - 35);
            ctx.fillText(`Range: ${range}`,
                tower.x * GRID_SIZE + GRID_SIZE / 2,
                tower.y * GRID_SIZE - 20);
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPlacingTower) {
        isPlacingTower = false;
        previewTower = null;
        canvas.removeEventListener('mousemove', handleTowerPreview);
        canvas.removeEventListener('click', handleTowerPlacement);
        canvas.style.cursor = 'default';
        const placeTowerButton = document.querySelector('button');
        placeTowerButton.style.opacity = '1';
        saveGame();
        return;
    }
    cheatSequence.push(e.key.toLowerCase());
    if (cheatSequence.length > 5) {
        cheatSequence.shift();
    }
    if (cheatSequence.join('') === cheatCode.join('')) {
        money += 10000;
        document.getElementById('money').textContent = money;
        const moneyDisplay = document.getElementById('money');
        moneyDisplay.style.color = '#FFD700';
        setTimeout(() => {
            moneyDisplay.style.color = '';
        }, 1000);
        cheatSequence = [];
        const message = document.createElement('div');
        message.textContent = 'CHEAT ACTIVATED: +10000$';
        message.style.position = 'fixed';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        message.style.color = '#FFD700';
        message.style.padding = '20px';
        message.style.borderRadius = '10px';
        message.style.fontWeight = 'bold';
        message.style.zIndex = '1000';
        document.body.appendChild(message);
        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
    }
});

function saveGame() {
    const gameState = {
        money: money,
        lives: lives,
        currentWave: currentWave,
        towers: towers.map(tower => ({
            x: tower.x,
            y: tower.y,
            level: tower.level,
            isDoubleTower: tower instanceof DoubleTower
        }))
    };
    localStorage.setItem('towerDefenseGame', JSON.stringify(gameState));
}

function loadGame() {
    const savedGame = localStorage.getItem('towerDefenseGame');
    if (savedGame) {
        const gameState = JSON.parse(savedGame);
        money = gameState.money;
        lives = gameState.lives;
        currentWave = gameState.currentWave;
        towers = gameState.towers.map(t => {
            if (t.isDoubleTower) {
                return new DoubleTower(t.x, t.y, t.level);
            } else {
                return new Tower(t.x, t.y, t.level);
            }
        });
        document.getElementById('money').textContent = money;
        document.getElementById('lives').textContent = lives;
    }
}

function placeDoubleTower() {
    if (isPlacingDoubleTower || money < 300) return;
    isPlacingDoubleTower = true;
    const placeTowerButton = document.querySelector('button[onclick="placeDoubleTower()"]');
    placeTowerButton.style.opacity = '0.5';
    previewTower = {
        x: 0,
        y: 0,
        range: 200,
        isValid: false
    };
    canvas.addEventListener('mousemove', handleTowerPreview);
    canvas.addEventListener('click', handleTowerPlacement);
    canvas.style.cursor = 'crosshair';
    saveGame();
}

function upgradeTower(tower) {
    if (money >= tower.upgradeCost) {
        money -= tower.upgradeCost;
        tower.level += 1;
        tower.upgradeCost *= 2;
        document.getElementById('money').textContent = money;
        saveGame();
    }
}

function drawTowerUpgrades(tower) {
    const centerX = tower.x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = tower.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Niv. ${tower.level}`, centerX, centerY + 5);
}

function resetGame() {
    gameOver = false;
    localStorage.removeItem('towerDefenseGame');
    location.reload();
}

function updateBestWave() {
    const bestWave = localStorage.getItem('bestWave') || 0;
    document.getElementById('bestWave').textContent = bestWave;
}

function updateButtonStates() {
    const simpleTowerButton = document.querySelector('button[onclick="placeTower()"]');
    const doubleTowerButton = document.querySelector('button[onclick="placeDoubleTower()"]');

    if (money < 50) {
        simpleTowerButton.disabled = true;
        simpleTowerButton.style.opacity = '0.5';
        simpleTowerButton.style.cursor = 'not-allowed';
    } else {
        simpleTowerButton.disabled = false;
        simpleTowerButton.style.opacity = '1';
        simpleTowerButton.style.cursor = 'pointer';
    }

    if (money < 300) {
        doubleTowerButton.disabled = true;
        doubleTowerButton.style.opacity = '0.5';
        doubleTowerButton.style.cursor = 'not-allowed';
    } else {
        doubleTowerButton.disabled = false;
        doubleTowerButton.style.opacity = '1';
        doubleTowerButton.style.cursor = 'pointer';
    }
}

function updateMoney(newAmount) {
    money = newAmount;
    document.getElementById('money').textContent = money;
    updateButtonStates();
}

function goToWave() {
    const targetWave = parseInt(document.getElementById('waveInput').value);
    if (targetWave < 1) return;

    // Mettre à jour la vague actuelle
    currentWave = targetWave;

    // Nettoyer le terrain
    enemies = [];
    enemiesSpawned = 0;

    // Recalculer le nombre d'ennemis pour cette vague
    enemiesInWave = Math.floor(5 + (currentWave * 1.2));

    // Arrêter la vague en cours
    clearInterval(spawnInterval);

    // Démarrer la nouvelle vague
    waveInProgress = false;
    showWaveMessage();
    setTimeout(startNextWave, 2000);

    // Mettre à jour les boutons
    updateButtonStates();
}

// Function to add the Pause button
function addPauseButton() {
    const pauseButton = document.createElement('button');
    pauseButton.textContent = 'Pause';
    pauseButton.style.position = 'absolute';
    pauseButton.style.top = '10px';
    pauseButton.style.right = '10px';
    pauseButton.style.zIndex = '1000';
    pauseButton.onclick = () => {
        if (gameSpeed === 0) {
            gameSpeed = 1;
            pauseButton.textContent = 'Pause';
        } else {
            gameSpeed = 0;
            pauseButton.textContent = 'Reprendre';
        }
        document.getElementById('speedSlider').value = gameSpeed;
        document.getElementById('speedValue').textContent = gameSpeed.toFixed(1);
    };
    document.body.appendChild(pauseButton);
}
