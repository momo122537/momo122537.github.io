/**
 * Othello / Reversi
 * 玩家：黑(1) 先手
 * 電腦：白(-1) 後手
 *
 *  邏輯不受動畫影響：
 * - board（邏輯盤面）一律立即更新 applyMove
 * - 動畫只做 UI：落子 → 逐顆翻面（90°才換顏色）
 */

const SIZE = 8;
const BLACK = 1;
const WHITE = -1;
const EMPTY = 0;
const FLIP_MS = 520;        // 必須跟 CSS flip2 的時間一致
const FLIP_HALF_MS = Math.floor(FLIP_MS / 2);

const DIRS = [
  [-1,-1],[-1,0],[-1,1],
  [0,-1],        [0,1],
  [1,-1],[1,0],[1,1]
];

let board, turn, busy;

let elBoard, elDiff, elHints, elRestart;
let elTurnPill, elStatusPill, elBlackCount, elWhiteCount, elLog;

document.addEventListener("DOMContentLoaded", () => {
  elBoard = document.getElementById("board");
  elDiff = document.getElementById("difficulty");
  elHints = document.getElementById("hints");
  elRestart = document.getElementById("restart");

  elTurnPill = document.getElementById("turnPill");
  elStatusPill = document.getElementById("statusPill");
  elBlackCount = document.getElementById("blackCount");
  elWhiteCount = document.getElementById("whiteCount");
  elLog = document.getElementById("log");

  elBoard.addEventListener("click", onBoardClick);
  elRestart.addEventListener("click", restartGame);
  elHints.addEventListener("change", () => render());
  elDiff.addEventListener("change", () => {
    setLog(`${elLog.textContent}\n已切換電腦棋力：${elDiff.value === "basic" ? "基本" : "進階"}。`);
  });

  restartGame();
});

function restartGame(){
  board = makeInitialBoard();
  turn = BLACK;
  busy = false;
  setLog("新的一局開始！你是黑棋先手 ");
  render();
}

function makeInitialBoard(){
  const b = Array.from({length: SIZE}, () => Array(SIZE).fill(EMPTY));
  b[3][3] = WHITE;
  b[3][4] = BLACK;
  b[4][3] = BLACK;
  b[4][4] = WHITE;
  return b;
}

function inBounds(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function cloneBoard(b){ return b.map(row => row.slice()); }
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

function getFlips(b, r, c, color){
  if (b[r][c] !== EMPTY) return [];
  let flips = [];
  for (const [dr,dc] of DIRS){
    let rr = r+dr, cc = c+dc;
    let line = [];
    while (inBounds(rr,cc) && b[rr][cc] === -color){
      line.push([rr,cc]);
      rr += dr; cc += dc;
    }
    if (line.length && inBounds(rr,cc) && b[rr][cc] === color){
      flips = flips.concat(line);
    }
  }
  return flips;
}

function getLegalMoves(b, color){
  const moves = [];
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      const flips = getFlips(b,r,c,color);
      if (flips.length) moves.push({r,c,flips});
    }
  }
  return moves;
}

function applyMove(b, move, color){
  const nb = cloneBoard(b);
  nb[move.r][move.c] = color;
  for (const [rr,cc] of move.flips) nb[rr][cc] = color;
  return nb;
}

function countPieces(b){
  let black=0, white=0;
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      if (b[r][c] === BLACK) black++;
      else if (b[r][c] === WHITE) white++;
    }
  }
  return {black, white};
}

function countEmpties(b){
  let e=0;
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (b[r][c]===EMPTY) e++;
  return e;
}

function setLog(text){ elLog.textContent = text; }
function coordToHuman(r,c){
  const col = String.fromCharCode("A".charCodeAt(0)+c);
  return `${col}${r+1}`;
}

/* ===== Render ===== */
function render(sourceBoard = board){
  elBoard.innerHTML = "";

  const {black, white} = countPieces(sourceBoard);
  elBlackCount.textContent = black;
  elWhiteCount.textContent = white;

  const legal = getLegalMoves(sourceBoard, turn);
  const showHints = (elHints.value === "on");

  elTurnPill.textContent = (turn===BLACK) ? "回合：玩家(黑)" : "回合：電腦(白)";
  elStatusPill.textContent = busy ? "狀態：思考中…" : ((turn===BLACK) ? "狀態：等待你落子" : "狀態：電腦行動");

  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      const v = sourceBoard[r][c];
      if (v === BLACK){
        cell.appendChild(makePiece("black"));
      } else if (v === WHITE){
        cell.appendChild(makePiece("white"));
      } else if (showHints && turn===BLACK){
        const m = legal.find(x => x.r===r && x.c===c);
        if (m){
          const h = document.createElement("div");
          h.className = "hint";
          cell.appendChild(h);
        }
      }

      if (!(turn===BLACK && !busy)) cell.classList.add("disabled");
      elBoard.appendChild(cell);
    }
  }
}

function makePiece(kind, extraClass){
  const p = document.createElement("div");
  p.className = "piece " + kind + (extraClass ? " " + extraClass : "");
  return p;
}

function getCellEl(r,c){
  return elBoard.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

/* ===== Visual move (drop + flip with mid-color swap) ===== */
async function animateMoveVisual(prevBoard, move, color){
  // 先回到落子前畫面
  render(prevBoard);

  // 落子（drop）
  const dropCell = getCellEl(move.r, move.c);
  if (dropCell){
    dropCell.innerHTML = "";
    dropCell.appendChild(makePiece(color === BLACK ? "black" : "white", "drop"));
  }
  await sleep(120); // 落子後停一下

  // 逐顆翻：90°時才換色
  for (let i=0; i<move.flips.length; i++){
    const [rr, cc] = move.flips[i];
    const fromColor = prevBoard[rr][cc]; // 翻前顏色
    const toColor = color;              // 翻後顏色
    await flipPieceWithColorSwap(rr, cc, fromColor, toColor);
    await sleep(60); // 每顆翻完停一下（像真人接著翻）
  }
}

async function flipPieceWithColorSwap(r, c, fromColor, toColor){
  const cell = getCellEl(r,c);
  if (!cell) return;

  cell.innerHTML = "";
  const p = makePiece(fromColor === BLACK ? "black" : "white", "flip2");
  cell.appendChild(p);

  // flip2 總長 780ms，半程換色（90°）
  await sleep(FLIP_HALF_MS);
  p.classList.remove(fromColor === BLACK ? "black" : "white");
  p.classList.add(toColor === BLACK ? "black" : "white");

  await sleep(FLIP_HALF_MS);
}

/* ===== Game flow ===== */
function isGameOver(b){
  return getLegalMoves(b, BLACK).length === 0 && getLegalMoves(b, WHITE).length === 0;
}

function finishIfOver(){
  if (!isGameOver(board)) return false;
  const {black, white} = countPieces(board);
  let msg = `遊戲結束！\n黑(你)：${black}  白(電腦)：${white}\n`;
  if (black > white) msg += "你贏了";
  else if (white > black) msg += "電腦贏了";
  else msg += "平手";
  setLog(msg);
  busy = false;
  render();
  return true;
}

function nextTurn(){
  if (finishIfOver()) return;

  const legal = getLegalMoves(board, turn);
  if (legal.length === 0){
    const who = (turn===BLACK) ? "你(黑)" : "電腦(白)";
    setLog(`${elLog.textContent}\n${who} 無合法步，PASS。`);
    turn = -turn;
    render();
    if (turn === WHITE) requestComputerMove();
    return;
  }

  if (turn === WHITE) requestComputerMove();
  else { busy = false; render(); }
}

/* ===== Player click (event delegation) ===== */
async function onBoardClick(e){
  if (busy || turn !== BLACK) return;

  const cell = e.target.closest(".cell");
  if (!cell) return;

  const r = Number(cell.dataset.r);
  const c = Number(cell.dataset.c);

  const flips = getFlips(board, r, c, BLACK);
  if (!flips.length) return;

  busy = true;
  const move = {r,c,flips};
  const prev = cloneBoard(board);

  // 邏輯盤面立即更新
  board = applyMove(board, move, BLACK);

  setLog(`你下在 ${coordToHuman(r,c)}。\n（翻轉 ${flips.length} 顆）`);
  turn = WHITE;

  // 動畫只動 UI
  await animateMoveVisual(prev, move, BLACK);

  render();
  nextTurn();
}

/* ===== AI: Basic ===== */
function aiBasicChooseMove(b, color){
  const moves = getLegalMoves(b, color);
  if (!moves.length) return null;

  let best = [];
  let bestScore = -Infinity;
  for (const m of moves){
    const score = m.flips.length;
    if (score > bestScore){
      bestScore = score;
      best = [m];
    } else if (score === bestScore){
      best.push(m);
    }
  }
  return best[Math.floor(Math.random()*best.length)];
}

/* ===== AI: Advanced ===== */
const WEIGHTS = [
  [120,-20, 20,  5,  5, 20,-20,120],
  [-20,-40, -5, -5, -5, -5,-40,-20],
  [ 20, -5, 15,  3,  3, 15, -5, 20],
  [  5, -5,  3,  3,  3,  3, -5,  5],
  [  5, -5,  3,  3,  3,  3, -5,  5],
  [ 20, -5, 15,  3,  3, 15, -5, 20],
  [-20,-40, -5, -5, -5, -5,-40,-20],
  [120,-20, 20,  5,  5, 20,-20,120],
];

function evaluate(b, perspectiveColor){
  let pos = 0, my = 0, opp = 0;

  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      if (b[r][c] === perspectiveColor){ pos += WEIGHTS[r][c]; my++; }
      else if (b[r][c] === -perspectiveColor){ pos -= WEIGHTS[r][c]; opp++; }
    }
  }

  const mob = getLegalMoves(b, perspectiveColor).length - getLegalMoves(b, -perspectiveColor).length;

  const corners = [[0,0],[0,7],[7,0],[7,7]];
  let cornerScore = 0;
  for (const [r,c] of corners){
    if (b[r][c] === perspectiveColor) cornerScore += 25;
    else if (b[r][c] === -perspectiveColor) cornerScore -= 25;
  }

  const total = my + opp;
  let pieceScore = 0;
  if (total > 54) pieceScore = (my - opp) * 2;

  return pos + mob*4 + cornerScore + pieceScore;
}

function minimax(b, depth, toMove, perspectiveColor, alpha, beta){
  if (depth === 0 || isGameOver(b)) return evaluate(b, perspectiveColor);

  const moves = getLegalMoves(b, toMove);
  if (moves.length === 0) return minimax(b, depth-1, -toMove, perspectiveColor, alpha, beta);

  moves.sort((a,b2) => (b2.flips.length - a.flips.length));
  const maximizing = (toMove === perspectiveColor);

  if (maximizing){
    let value = -Infinity;
    for (const m of moves){
      const nb = applyMove(b, m, toMove);
      value = Math.max(value, minimax(nb, depth-1, -toMove, perspectiveColor, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of moves){
      const nb = applyMove(b, m, toMove);
      value = Math.min(value, minimax(nb, depth-1, -toMove, perspectiveColor, alpha, beta));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function aiAdvancedChooseMove(b, color){
  const moves = getLegalMoves(b, color);
  if (!moves.length) return null;

  const empties = countEmpties(b);
  const depth = empties <= 14 ? 6 : (empties <= 26 ? 5 : 4);

  let bestMove = moves[0];
  let bestVal = -Infinity;
  let alpha = -Infinity, beta = Infinity;

  const ordered = moves.slice().sort((a,b2) => (b2.flips.length - a.flips.length));

  for (const m of ordered){
    const nb = applyMove(b, m, color);
    const val = minimax(nb, depth-1, -color, color, alpha, beta);
    if (val > bestVal){
      bestVal = val;
      bestMove = m;
    }
    alpha = Math.max(alpha, bestVal);
  }
  return bestMove;
}

/* ===== Computer move ===== */
function requestComputerMove(){
  if (turn !== WHITE) return;
  busy = true;
  render();

  setTimeout(async () => {
    let move = null;
    if (elDiff.value === "basic") move = aiBasicChooseMove(board, WHITE);
    else move = aiAdvancedChooseMove(board, WHITE);

    if (!move){
      setLog(`${elLog.textContent}\n電腦(白) 無合法步，PASS。`);
      turn = BLACK;
      busy = false;
      render();
      nextTurn();
      return;
    }

    const prev = cloneBoard(board);

    //  邏輯盤面立即更新
    board = applyMove(board, move, WHITE);

    setLog(`${elLog.textContent}\n電腦下在 ${coordToHuman(move.r, move.c)}。\n（翻轉 ${move.flips.length} 顆）`);
    turn = BLACK;

    //  動畫只動 UI（翻到一半才換色）
    await animateMoveVisual(prev, move, WHITE);

    busy = false;
    render();
    nextTurn();
  }, 220);
}
