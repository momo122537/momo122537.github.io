/* jshint esversion: 6 */
/* jshint loopfunc: true */

let board = Array(9).fill(null);
let current = 'X';
let active = true;

const HUMAN = 'X';
const AI = 'O';

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// 偏好順序
const PREFERENCE = [4, 0, 2, 6, 8, 1, 3, 5, 7];

function init() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  board = Array(9).fill(null);
  active = true;
  current = HUMAN;

  document.getElementById('status').innerText = '玩家 (X) 先手';

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');

    // 避免 W083：用 data-index 綁定
    cell.dataset.index = String(i);
    cell.onclick = function () {
      playerMove(parseInt(this.dataset.index, 10));
    };

    boardEl.appendChild(cell);
  }
  updateBoard();
}

function playerMove(i) {
  if (!active || board[i] || current !== HUMAN) return;

  board[i] = HUMAN;
  updateBoard();

  if (checkWin(board, HUMAN)) {
    endGame('玩家 (X) 勝利');
    return;
  }
  if (isFull(board)) {
    endGame('平手！');
    return;
  }

  current = AI;
  document.getElementById('status').innerText = '電腦思考中...';
  setTimeout(computerMove, 500);
}

function computerMove() {
  if (!active || current !== AI) return;

  // 先做「立刻贏 / 立刻擋」
  let move = findWinningMove(board, AI);
  if (move === null) move = findWinningMove(board, HUMAN);

  // 進階：用minimax找不敗最佳步
  if (move === null) move = bestMoveMinimax(board);

  // 保護
  if (move === null) move = firstEmpty(board);

  board[move] = AI;
  updateBoard();

  if (checkWin(board, AI)) {
    endGame('電腦 (O) 勝利！');
    return;
  }
  if (isFull(board)) {
    endGame('平手！');
    return;
  }

  current = HUMAN;
  document.getElementById('status').innerText = '輪到玩家 (X)';
}

//Minimax (Alpha-Beta)

function bestMoveMinimax(bd) {
  let bestScore = -Infinity;
  let bestIdx = null;

  
  for (const i of PREFERENCE) {
    if (bd[i] !== null) continue;

    bd[i] = AI;
    const score = minimax(bd, 0, false, -Infinity, Infinity);
    bd[i] = null;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// 回傳分數
function minimax(bd, depth, isMaximizing, alpha, beta) {
  if (checkWin(bd, AI)) return 10 - depth;
  if (checkWin(bd, HUMAN)) return depth - 10;
  if (isFull(bd)) return 0;

  if (isMaximizing) {
    let best = -Infinity;

    for (const i of PREFERENCE) {
      if (bd[i] !== null) continue;

      bd[i] = AI;
      const val = minimax(bd, depth + 1, false, alpha, beta);
      bd[i] = null;

      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break; // alpha-beta pruning
    }
    return best;
  } else {
    let best = Infinity;

    for (const i of PREFERENCE) {
      if (bd[i] !== null) continue;

      bd[i] = HUMAN;
      const val = minimax(bd, depth + 1, true, alpha, beta);
      bd[i] = null;

      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break; // alpha-beta pruning
    }
    return best;
  }
}

// ======= 工具函式 =======

function findWinningMove(bd, player) {
  for (const [a, b, c] of WINS) {
    const line = [bd[a], bd[b], bd[c]];
    if (line.filter(v => v === player).length === 2 && line.includes(null)) {
      return [a, b, c][line.indexOf(null)];
    }
  }
  return null;
}

function checkWin(bd, player) {
  return WINS.some(([a, b, c]) => bd[a] === player && bd[b] === player && bd[c] === player);
}

function isFull(bd) {
  return bd.every(cell => cell !== null);
}

function firstEmpty(bd) {
  for (let i = 0; i < 9; i++) if (bd[i] === null) return i;
  return null;
}

function updateBoard() {
  const cells = document.getElementsByClassName('cell');
  for (let i = 0; i < 9; i++) {
    cells[i].innerText = board[i] || '';
  }
}

function endGame(message) {
  document.getElementById('status').innerText = message;
  active = false;
}

function resetGame() {
  init();
}

init();
