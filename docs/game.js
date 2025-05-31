class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('block', 'assets/block.png');
    this.load.image('left',  'assets/left.png');
    this.load.image('right', 'assets/right.png');
    this.load.image('down',  'assets/down.png');
    this.load.image('rotate','assets/rotate.png');
    // no spark asset to load: we'll generate it in code
  }

  create() {
    // --- layout & grid setup ---
    this.gridWidth  = 10;
    this.gridHeight = 17;
    this.cellSize   = 32;

    const reservedBottomSpace = 75;
    const totalHeight = this.gridHeight * this.cellSize + 60 + reservedBottomSpace;
    const availableHeight = this.scale.height;
    const availableOffsetY = Math.max(10, (availableHeight - totalHeight) / 2);

    this.offsetX = (this.scale.width  - this.gridWidth  * this.cellSize) / 2;
    this.offsetY = availableOffsetY;

    this.grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(0));

    // --- score & border ---
    this.score = 0;
    this.scoreText = this.add
      .text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' })
      .setDepth(1001);

    this.border = this.add.graphics();
    this.border.lineStyle(2, 0xffffff);
    this.border.strokeRect(
      this.offsetX,
      this.offsetY,
      this.gridWidth  * this.cellSize,
      this.gridHeight * this.cellSize
    );
    this.border.setDepth(1000);

    // --- input setup ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyMap = this.input.keyboard.addKeys({
      kp4:  Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      kp6:  Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX,
      kp2:  Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      kp5:  Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE,
      num4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      num6: Phaser.Input.Keyboard.KeyCodes.SIX,
      num2: Phaser.Input.Keyboard.KeyCodes.TWO,
      num5: Phaser.Input.Keyboard.KeyCodes.FIVE
    });

    // --- generate spark texture for explosions ---
    const sparkSize = 16;
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(sparkSize/2, sparkSize/2, sparkSize/2);
    gfx.generateTexture('spark', sparkSize, sparkSize);
    gfx.destroy();

    // --- particle emitter manager ---
    this.exploder = this.add.particles('spark');

    // --- tetromino shapes & controls icons ---
    const rawShapes = [
      [[1,1,1,1]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1]],
      [[0,1,1],[1,1,0]],
      [[1,1,0],[0,1,1]],
      [[1,0,0],[1,1,1]],
      [[0,0,1],[1,1,1]],
      [[1,1,1],[1,0,1],[1,1,1]]
    ];
    this.tetrominos = rawShapes.map(shape => this.getRotations(shape));

    const controlY     = this.offsetY + this.gridHeight * this.cellSize + 50;
    const iconSpacing  = 80;
    const iconSize     = 48;
    const icons        = ['left','right','down','rotate'];
    icons.forEach((key, i) => {
      const x = 30 + this.offsetX + i * iconSpacing;
      const btn = this.add.image(x, controlY, key)
        .setInteractive()
        .setDisplaySize(iconSize, iconSize);
      btn.on('pointerdown', () => {
        if      (key === 'left')   this.move(-1,  0);
        else if (key === 'right')  this.move( 1,  0);
        else if (key === 'down')   this.moveDown();
        else if (key === 'rotate') this.rotate();
      });
    });

    // --- start game ---
    this.spawnTetromino();
    this.fallEvent = this.time.addEvent({
      delay: 500,
      callback: this.moveDown,
      callbackScope: this,
      loop: true
    });
  }

  update() {
    if (this.gameOver) return;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keyMap.kp4) || Phaser.Input.Keyboard.JustDown(this.keyMap.num4)) this.move(-1, 0);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keyMap.kp6) || Phaser.Input.Keyboard.JustDown(this.keyMap.num6)) this.move(1, 0);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keyMap.kp2) || Phaser.Input.Keyboard.JustDown(this.keyMap.num2)) this.moveDown();
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyMap.kp5) || Phaser.Input.Keyboard.JustDown(this.keyMap.num5)) this.rotate();
  }

  getRotations(matrix) {
    const rotations = [];
    let current = matrix;
    for (let i = 0; i < 4; i++) {
      rotations.push(current);
      current = this.rotateMatrix(current);
    }
    return rotations;
  }

  rotateMatrix(matrix) {
    const h = matrix.length, w = matrix[0].length;
    const res = Array.from({ length: w }, () => Array(h).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        res[x][h - 1 - y] = matrix[y][x];
      }
    }
    return res;
  }

  spawnTetromino() {
    const idx = Phaser.Math.Between(0, this.tetrominos.length - 1);
    this.current = {
      rotations: this.tetrominos[idx],
      rotationIndex: 0,
      x: Math.floor(this.gridWidth / 2) - 1,
      y: 0
    };
    if (!this.canMove(0, 0, this.current.rotationIndex)) this.endGame();
    this.renderGrid();
  }

  canMove(dx, dy, rotIdx) {
    const shape = this.current.rotations[rotIdx];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const nx = this.current.x + x + dx;
          const ny = this.current.y + y + dy;
          if (nx < 0 || nx >= this.gridWidth || ny >= this.gridHeight || (ny >= 0 && this.grid[ny][nx])) return false;
        }
      }
    }
    return true;
  }

  move(dx, dy) {
    if (this.canMove(dx, dy, this.current.rotationIndex)) {
      this.current.x += dx;
      this.current.y += dy;
      this.renderGrid();
    }
  }

  moveDown() {
    if (this.canMove(0, 1, this.current.rotationIndex)) {
      this.current.y++;
      this.renderGrid();
    } else {
      this.lockPiece();
      const linesCleared = this.clearLines();
      if (linesCleared === 0) this.spawnTetromino();
    }
  }

  rotate() {
    const next = (this.current.rotationIndex + 1) % this.current.rotations.length;
    if (this.canMove(0, 0, next)) {
      this.current.rotationIndex = next;
      this.renderGrid();
    }
  }

  lockPiece() {
    this.current.rotations[this.current.rotationIndex].forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) this.grid[this.current.y + y][this.current.x + x] = 1;
      });
    });
  }

  clearLines() {
    const fullRows = [];
    for (let y = 0; y < this.gridHeight; y++) {
      if (this.grid[y].every(v => v === 1)) fullRows.push(y);
    }
    if (fullRows.length === 0) return 0;

    fullRows.forEach(rowY => {
      const rowSprites = this.blocks.getChildren().filter(b => b.y === this.offsetY + rowY * this.cellSize);
      rowSprites.forEach(blockSprite => {
        const emitter = this.add.particles(
          blockSprite.x + this.cellSize/2,
          blockSprite.y + this.cellSize/2,
          'spark', {
            speed: { min: -200, max: 200 },
            lifespan: 500,
            scale: { start: 1, end: 0 },
            quantity: 8,
            gravityY: 300,
            on: false
          }
        );
        emitter.explode();
        emitter.on('complete', () => emitter.destroy());

        this.tweens.add({
          targets: blockSprite,
          scale: { from: 1, to: 0 },
          alpha: { from: 1, to: 0 },
          ease: 'Power1',
          duration: 300,
          onComplete: () => blockSprite.destroy()
        });
      });
    });

    this.time.delayedCall(350, () => {
      this.grid = this.grid.filter((row, idx) => !fullRows.includes(idx));
      while (this.grid.length < this.gridHeight) this.grid.unshift(Array(this.gridWidth).fill(0));
      this.score += fullRows.length * 100;
      this.scoreText.setText('Score: ' + this.score);
      this.renderGrid();
      this.spawnTetromino();
    }, [], this);

    return fullRows.length;
  }

  renderGrid() {
    if (this.blocks) this.blocks.clear(true, true);
    this.blocks = this.add.group();

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x]) {
          this.blocks.create(
            this.offsetX + x * this.cellSize,
            this.offsetY + y * this.cellSize,
            'block'
          ).setOrigin(0);
        }
      }
    }

    this.current.rotations[this.current.rotationIndex].forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          this.blocks.create(
            this.offsetX + (this.current.x + x) * this.cellSize,
            this.offsetY + (this.current.y + y) * this.cellSize,
            'block'
          ).setOrigin(0);
        }
      });
    });

    if (this.gameOver && !this.gameOverText) {
      this.gameOverText = this.add
        .text(this.scale.width/2, this.scale.height/2 - 40,
              'Game Over', { fontSize: '40px', fill: '#f00' })
        .setOrigin(0.5)
        .setDepth(2000);

      fetch('https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgWGX7YEqp_5sXxaPt0BB9H4jPfta-lrl_cvkkqCeGWQQpM6MwoJ6PSyZ36f9fo_pwb-RQQ3fNcJA9SiwoG9z3P_d1BuuDVqWvDtxXbOyVUr37A9eRoYDtnxuRrkV1JZvlVDFkG7XueAxW96XEqj9olvaaCgVEUNDJeUXzyKRjmGK32C3SGgmeYFugd0vub10v6NV72uPbCGWLQda5LjR4LILSVJJknR9aRIOdD8oJPH6am0JaIsjuKGZ3D-h0qasWoJ8m_mtez44VNng-ECiyAFYrOEOuyEVxGg6UJ&lib=MRvR--8OAnxKTz7ir3zS_HSAC01fmXA90')
        .then(res => res.json())
        .then(data => {
          const top3 = data.slice(0, 3);
          const lines = ['HISCORE:'];
          top3.forEach((entry, i) => {
            lines.push(`${i + 1}. ${entry.name}: ${entry.score}`);
          });
          this.add.text(this.scale.width/2, this.scale.height/2,
                        lines.join('\n'), {
                          fontSize: '16px', fill: '#fff', align: 'center', fontFamily: 'monospace'
                        })
              .setOrigin(0.5)
              .setDepth(2000);
        })
        .catch(() => {
          this.add.text(this.scale.width/2, this.scale.height/2,
                        'HISCORE:\nFehler', {
                          fontSize: '16px', fill: '#ff0000', align: 'center'
                        })
              .setOrigin(0.5)
              .setDepth(2000);
        });

      const restartBtn = this.add
        .text(this.scale.width/2, this.scale.height/2 + 80,
              '[ Restart ]', {
                fontSize: '20px', fill: '#0f0',
                backgroundColor: '#222', padding: { x:10, y:5 }
              })
        .setOrigin(0.5).setDepth(2000)
        .setInteractive();
      restartBtn.on('pointerdown', () => window.location.reload());

      const visitBtn = this.add
        .text(this.scale.width/2, this.scale.height/2 + 120,
              '[ Visit www.staerk.de/thorsten ]', {
                fontSize: '16px', fill: '#0af',
                backgroundColor: '#222', padding: { x:10, y:5 }
              })
        .setOrigin(0.5).setDepth(2000)
        .setInteractive();
      visitBtn.on('pointerdown', () => location.href = 'https://www.staerk.de/thorsten');
    }

    this.border.setDepth(1000);
  }

  endGame() {
    this.gameOver = true;
    this.fallEvent.remove(false);
  }
}

const config = {
  type: Phaser.AUTO,
  width:  320,
  height: window.innerHeight,
  backgroundColor: '#000',
  scene: [ GameScene ]
};

window.addEventListener('load', () => new Phaser.Game(config));
