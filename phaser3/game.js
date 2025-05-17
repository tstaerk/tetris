class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  preload() {
    this.load.image('block', 'assets/block.png');
  }

  create() {
    // Spielfeld-Größe und Offset
    this.gridWidth = 10; this.gridHeight = 19; this.cellSize = 32;
    this.offsetX = (this.scale.width - this.gridWidth * this.cellSize) / 2;
    this.offsetY = this.cellSize; // Spiel einen Block tiefer

    // Leeres Spielfeld
    this.grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(0));

    // Score-Anzeige
    this.score = 0;
    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });

    // Umrandung
    this.border = this.add.graphics();
    this.border.lineStyle(2, 0xffffff);
    this.border.strokeRect(this.offsetX, this.offsetY, this.gridWidth * this.cellSize, this.gridHeight * this.cellSize);
    this.border.setDepth(1000);

    // Steuerung: Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyMap = this.input.keyboard.addKeys({
      kp4: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      kp6: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX,
      kp2: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      kp5: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE,
      num4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      num6: Phaser.Input.Keyboard.KeyCodes.SIX,
      num2: Phaser.Input.Keyboard.KeyCodes.TWO,
      num5: Phaser.Input.Keyboard.KeyCodes.FIVE
    });

    // Tetromino-Definitionen inkl. neuem Block
    const rawShapes = [
      // klassische Tetrominos
      [[1,1,1,1]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1]],
      [[0,1,1],[1,1,0]],
      [[1,1,0],[0,1,1]],
      [[1,0,0],[1,1,1]],
      [[0,0,1],[1,1,1]],
      // Neuer Block (Hohlquadrat)
      [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]]
    ];
    this.tetrominos = rawShapes.map(shape => this.getRotations(shape));

    // Touch-Buttons unter dem Spielfeld
    const controlY = this.offsetY + this.gridHeight * this.cellSize + 10;
    const btnStyle = { fontSize: '28px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', padding: { x: 10, y: 10 }};
    ['◀','▶','⏬','⤴️'].forEach((sym, i) => {
      const x = this.offsetX + i * 80;
      const btn = this.add.text(x, controlY, sym, btnStyle).setInteractive();
      btn.on('pointerdown', () => {
        if(sym==='◀') this.move(-1,0);
        else if(sym==='▶') this.move(1,0);
        else if(sym==='⏬') this.moveDown();
        else if(sym==='⤴️') this.rotate();
      });
    });

    // Erstes Tetromino
    this.spawnTetromino();

    // Automatisches Fallen
    this.fallEvent = this.time.addEvent({ delay: 500, callback: this.moveDown, callbackScope: this, loop: true });
  }

  update() {
    if (this.gameOver) return;
    // Keyboard-Steuerung
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
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) res[x][h-1-y] = matrix[y][x];
    return res;
  }

  spawnTetromino() {
    const idx = Phaser.Math.Between(0, this.tetrominos.length-1);
    this.current = { rotations: this.tetrominos[idx], rotationIndex:0, x:Math.floor(this.gridWidth/2)-1, y:0 };
    if (!this.canMove(0,0,this.current.rotationIndex)) this.endGame();
    this.renderGrid();
  }

  canMove(dx, dy, rotIdx) {
    const shape = this.current.rotations[rotIdx];
    for (let y = 0; y < shape.length; y++) for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const nx = this.current.x + x + dx;
        const ny = this.current.y + y + dy;
        if (nx<0||nx>=this.gridWidth||ny>=this.gridHeight) return false;
        if (ny>=0&&this.grid[ny][nx]) return false;
      }
    }
    return true;
  }

  move(dx, dy) { if (this.canMove(dx,dy,this.current.rotationIndex)) {this.current.x+=dx;this.current.y+=dy;this.renderGrid();}}
  moveDown() { if (this.canMove(0,1,this.current.rotationIndex)) this.current.y++; else {this.lockPiece();this.clearLines();this.spawnTetromino();} this.renderGrid();}
  rotate() { const next=(this.current.rotationIndex+1)%this.current.rotations.length; if(this.canMove(0,0,next)){this.current.rotationIndex=next;this.renderGrid();}}
  lockPiece(){ this.current.rotations[this.current.rotationIndex].forEach((r,y)=>r.forEach((c,x)=>{if(c)this.grid[this.current.y+y][this.current.x+x]=1;})); }
  clearLines(){ let ln=0; this.grid=this.grid.filter(r=>{if(r.every(v=>v)){ln++;return false;}return true;});while(this.grid.length<this.gridHeight)this.grid.unshift(Array(this.gridWidth).fill(0));if(ln)this.scoreText.setText('Score: '+(this.score+=ln*100)); }

  renderGrid(){ if(this.blocks)this.blocks.clear(true,true);this.blocks=this.add.group();for(let y=0;y<this.gridHeight;y++)for(let x=0;x<this.gridWidth;x++)if(this.grid[y][x])this.blocks.create(this.offsetX+x*this.cellSize,this.offsetY+y*this.cellSize,'block').setOrigin(0);
    this.current.rotations[this.current.rotationIndex].forEach((r,y)=>r.forEach((c,x)=>{if(c)this.blocks.create(this.offsetX+(this.current.x+x)*this.cellSize,this.offsetY+(this.current.y+y)*this.cellSize,'block').setOrigin(0);}));
    if(this.gameOver&&!this.gameOverText) this.gameOverText=this.add.text(this.offsetX+this.cellSize*2,this.offsetY+this.cellSize*10,'Game Over',{fontSize:'40px',fill:'#f00'});
    this.border.setDepth(1000);
  }

  endGame(){ this.gameOver=true; this.fallEvent.remove(false); }
}

const config={type:Phaser.AUTO,width:320,height:720,backgroundColor:'#000',scene:[GameScene]};
window.addEventListener('load',()=>new Phaser.Game(config));
