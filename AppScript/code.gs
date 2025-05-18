// --- File: Code.gs ---
/**
 * Google Sheets Tetris using cells as canvas (blocking loop version)
 */

var sheet, rows=20, cols=10;
var board, colors, tetrominoes, current, next, score;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tetris')
    .addItem('Start Game','startGame')
    .addToUi();
}

function startGame() {
  sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  initGame();
  showControlsSidebar();
  gameLoop();
}

function initGame() {
  sheet.clear();
  sheet.setColumnWidths(1, cols, 30);
  for(var r=1;r<=rows;r++) sheet.setRowHeight(r,30);

  board = Array.from({length:rows},()=>Array(cols).fill(0));
  colors = [null,'#00FFFF','#0000FF','#FFA500','#FFFF00','#00FF00','#800080','#FF0000'];
  tetrominoes = [
    [[1,1,1,1]],
    [[2,0,0],[2,2,2]],
    [[0,0,3],[3,3,3]],
    [[4,4],[4,4]],
    [[0,5,5],[5,5,0]],
    [[6,6,0],[0,6,6]],
    [[7,7,7],[0,7,0]]
  ];
  current = createPiece();
  next = createPiece();
  score = 0;
  updateScore();
}

function showControlsSidebar() {
  var html=HtmlService.createHtmlOutputFromFile('controls').setTitle('Tetris Controls');
  SpreadsheetApp.getUi().showSidebar(html);
}

function gameLoop() {
  while(!isGameOver()){
    Utilities.sleep(500);
    playerDrop();
    drawBoard();
  }
  SpreadsheetApp.getUi().alert('Game Over! Score: '+score);
}

function drawBoard() {
  var range=sheet.getRange(1,1,rows,cols);
  var bgs=board.map(function(r){return r.map(function(c){return c?colors[c]:'#ffffff';});});
  range.setBackgrounds(bgs);
  mergePiece(current);
  SpreadsheetApp.flush();
}

function mergePiece(p){
  p.matrix.forEach(function(row,y){
    row.forEach(function(v,x){
      if(v) sheet.getRange(p.pos.y+y+1,p.pos.x+x+1).setBackground(colors[v]);
    });
  });
}

function createPiece(){
  var type=Math.floor(Math.random()*tetrominoes.length);
  return {matrix:tetrominoes[type],pos:{x:Math.floor(cols/2)-1,y:0}};
}

function collide(){
  var m=current.matrix, p=current.pos;
  for(var y=0;y<m.length;y++){
    for(var x=0;x<m[y].length;x++){
      if(m[y][x]&&(board[p.y+y]&&board[p.y+y][p.x+x])!==0) return true;
    }
  }
  return false;
}

function playerDrop(){
  current.pos.y++;
  if(collide()){
    current.pos.y--;
    lockPiece();
    current=next;
    next=createPiece();
    sweepLines();
  }
}

function lockPiece(){
  var m=current.matrix,p=current.pos;
  m.forEach(function(r,y){r.forEach(function(v,x){if(v)board[p.y+y][p.x+x]=v;});});
}

function sweepLines(){
  for(var y=rows-1;y>=0;y--){
    if(board[y].every(function(c){return c;})){
      board.splice(y,1);
      board.unshift(Array(cols).fill(0));
      score+=10;updateScore();y++;
    }
  }
}

function rotateMatrix(m){
  for(var y=0;y<m.length;y++)for(var x=0;x<y;x++) [m[x][y],m[y][x]]=[m[y][x],m[x][y]];
  m.forEach(function(r){r.reverse();});return m;
}

function playerMove(dir){
  current.pos.x+=dir;
  if(collide())current.pos.x-=dir;
  drawBoard();
}

function playerRotate(){
  var copy=JSON.parse(JSON.stringify(current.matrix));
  current.matrix=rotateMatrix(current.matrix);
  if(collide())current.matrix=copy;
  drawBoard();
}

function updateScore(){sheet.getRange(rows+2,1).setValue('Score: '+score);}
function isGameOver(){return board[0].some(function(c){return c;});}

function moveLeft(){playerMove(-1);}
function moveRight(){playerMove(1);}
function rotatePiece(){playerRotate();}
function dropPiece(){playerDrop();drawBoard();}
