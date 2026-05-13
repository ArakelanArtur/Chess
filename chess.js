(function() {
    // ---------- КОНСТАНТЫ ----------
    const BOARD_SIZE = 8;
    let board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    
    let currentTurn = 'white';
    let gameOver = false;
    let winner = null;
    let checkState = false;
    
    // Флаги рокировки
    let whiteKingMoved = false;
    let blackKingMoved = false;
    let whiteRookA1Moved = false;
    let whiteRookH1Moved = false;
    let blackRookA8Moved = false;
    let blackRookH8Moved = false;
    
    // Взятие на проходе
    let enPassantTarget = null;
    
    // Элементы DOM
    const canvas = document.getElementById('chessCanvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 480 / 8;
    let selectedCell = null;
    
    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    
    // ИСПРАВЛЕНО: Более надежное определение цвета для латинских букв
    function getPieceColor(piece) {
        if(!piece) return null;
        if (piece >= 'A' && piece <= 'Z') return 'white';
        if (piece >= 'a' && piece <= 'z') return 'black';
        return null;
    }
    
    function getPieceType(piece) {
        if(!piece) return null;
        const lower = piece.toLowerCase();
        if(lower === 'p') return 'pawn';
        if(lower === 'r') return 'rook';
        if(lower === 'n') return 'knight';
        if(lower === 'b') return 'bishop';
        if(lower === 'q') return 'queen';
        if(lower === 'k') return 'king';
        return null;
    }
    
    function inBoard(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }
    
    function copyBoard(boardState) {
        return boardState.map(row => [...row]);
    }
    
    function findKingPosition(color, boardState) {
        const target = (color === 'white') ? 'K' : 'k';
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                if(boardState[i][j] === target) return {x: i, y: j};
            }
        }
        return null;
    }
    
    // ---------- ПРОВЕРКА АТАКИ КЛЕТКИ ----------
    function isSquareAttacked(sqX, sqY, defenderColor, boardState) {
        const attackerColor = defenderColor === 'white' ? 'black' : 'white';
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                const piece = boardState[i][j];
                if(piece && getPieceColor(piece) === attackerColor) {
                    const moves = getPieceMoves(i, j, boardState, false, true);
                    if(moves.some(m => m.x === sqX && m.y === sqY)) return true;
                }
            }
        }
        return false;
    }
    
    // ---------- ПОЛУЧЕНИЕ ХОДОВ ДЛЯ ФИГУРЫ ----------
    function getPieceMoves(x, y, boardState, checkSelfCheck = true, forCheck = false) {
        const piece = boardState[x][y];
        if(!piece) return [];
        const color = getPieceColor(piece);
        const type = getPieceType(piece);
        let moves = [];
        
        if(type === 'pawn') {
            const dir = (color === 'white') ? -1 : 1;
            const startRow = (color === 'white') ? 6 : 1;
            
            const nx = x + dir;
            if(inBoard(nx, y) && !boardState[nx][y]) {
                moves.push({x: nx, y: y});
                if(x === startRow && inBoard(nx + dir, y) && !boardState[nx + dir][y]) {
                    moves.push({x: nx + dir, y: y});
                }
            }
            
            for(const dy of [-1, 1]) {
                const ny = y + dy;
                if(inBoard(nx, ny)) {
                    const target = boardState[nx][ny];
                    if(target && getPieceColor(target) !== color) {
                        moves.push({x: nx, y: ny});
                    }
                }
            }
            
            if(enPassantTarget) {
                for(const dy of [-1, 1]) {
                    const ny = y + dy;
                    if(inBoard(nx, ny) && enPassantTarget.x === nx && enPassantTarget.y === ny) {
                        moves.push({x: nx, y: ny, isEnPassant: true});
                    }
                }
            }
        }
        else if(type === 'knight') {
            const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for(let [dx, dy] of offsets) {
                const nx = x + dx, ny = y + dy;
                if(inBoard(nx, ny)) {
                    const target = boardState[nx][ny];
                    if(!target || getPieceColor(target) !== color) moves.push({x: nx, y: ny});
                }
            }
        }
        else if(type === 'king') {
            const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            for(let [dx, dy] of offsets) {
                const nx = x + dx, ny = y + dy;
                if(inBoard(nx, ny)) {
                    const target = boardState[nx][ny];
                    if(!target || getPieceColor(target) !== color) moves.push({x: nx, y: ny});
                }
            }
            
            if(!forCheck && !gameOver) {
                const row = (color === 'white') ? 7 : 0;
                const kingMoved = (color === 'white') ? whiteKingMoved : blackKingMoved;
                if(!kingMoved && !isSquareAttacked(row, 4, color, boardState)) {
                    const rookH = (color === 'white') ? whiteRookH1Moved : blackRookH8Moved;
                    if(!rookH && !boardState[row][5] && !boardState[row][6]) {
                        if(!isSquareAttacked(row, 5, color, boardState) && !isSquareAttacked(row, 6, color, boardState)) {
                            moves.push({x: row, y: 6, isCastle: 'short'});
                        }
                    }
                    const rookA = (color === 'white') ? whiteRookA1Moved : blackRookA8Moved;
                    if(!rookA && !boardState[row][1] && !boardState[row][2] && !boardState[row][3]) {
                        if(!isSquareAttacked(row, 2, color, boardState) && !isSquareAttacked(row, 3, color, boardState)) {
                            moves.push({x: row, y: 2, isCastle: 'long'});
                        }
                    }
                }
            }
        }
        else {
            let directions = [];
            if(type === 'rook') directions = [[-1,0],[1,0],[0,-1],[0,1]];
            else if(type === 'bishop') directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
            else if(type === 'queen') directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
            
            for(let [dx, dy] of directions) {
                let nx = x + dx, ny = y + dy;
                while(inBoard(nx, ny)) {
                    const target = boardState[nx][ny];
                    if(!target) {
                        moves.push({x: nx, y: ny});
                    } else {
                        if(getPieceColor(target) !== color) moves.push({x: nx, y: ny});
                        break;
                    }
                    nx += dx;
                    ny += dy;
                }
            }
        }
        
        if(checkSelfCheck && !forCheck) {
            moves = moves.filter(move => {
                return !doesMoveCauseSelfCheck(x, y, move.x, move.y, boardState, color, move.isCastle, move.isEnPassant);
            });
        }
        return moves;
    }
    
    function doesMoveCauseSelfCheck(fromX, fromY, toX, toY, boardState, playerColor, isCastle, isEnPassant) {
        const tempBoard = copyBoard(boardState);
        if(isCastle) {
            const row = (playerColor === 'white') ? 7 : 0;
            const king = tempBoard[row][4];
            if(isCastle === 'short') {
                tempBoard[row][4] = null; tempBoard[row][6] = king;
                const rook = tempBoard[row][7]; tempBoard[row][7] = null; tempBoard[row][5] = rook;
            } else {
                tempBoard[row][4] = null; tempBoard[row][2] = king;
                const rook = tempBoard[row][0]; tempBoard[row][0] = null; tempBoard[row][3] = rook;
            }
        } else {
            const piece = tempBoard[fromX][fromY];
            tempBoard[toX][toY] = piece;
            tempBoard[fromX][fromY] = null;
            if(isEnPassant) {
                const capX = (playerColor === 'white') ? toX + 1 : toX - 1;
                tempBoard[capX][toY] = null;
            }
        }
        const kingPos = findKingPosition(playerColor, tempBoard);
        return kingPos ? isSquareAttacked(kingPos.x, kingPos.y, playerColor, tempBoard) : true;
    }
    
    function applyMove(from, to, isCastle, isEnPassantCapture) {
        const fromX = from.x, fromY = from.y, toX = to.x, toY = to.y;
        const movingPiece = board[fromX][fromY];
        const movingColor = getPieceColor(movingPiece);
        const movingType = getPieceType(movingPiece);
        
        let newEnPassantTarget = null;
        
        if(isCastle) {
            const row = (movingColor === 'white') ? 7 : 0;
            board[row][4] = null;
            if(isCastle === 'short') {
                board[row][6] = movingPiece;
                board[row][5] = board[row][7]; board[row][7] = null;
            } else {
                board[row][2] = movingPiece;
                board[row][3] = board[row][0]; board[row][0] = null;
            }
            if(movingColor === 'white') whiteKingMoved = true; else blackKingMoved = true;
        } else {
            board[toX][toY] = movingPiece;
            board[fromX][fromY] = null;
            if(isEnPassantCapture) {
                const capX = (movingColor === 'white') ? toX + 1 : toX - 1;
                board[capX][toY] = null;
            }
            if(movingType === 'king') {
                if(movingColor === 'white') whiteKingMoved = true; else blackKingMoved = true;
            }
            if(movingType === 'rook') {
                if(fromX === 7 && fromY === 0) whiteRookA1Moved = true;
                if(fromX === 7 && fromY === 7) whiteRookH1Moved = true;
                if(fromX === 0 && fromY === 0) blackRookA8Moved = true;
                if(fromX === 0 && fromY === 7) blackRookH8Moved = true;
            }
            if(movingType === 'pawn') {
                if(toX === (movingColor === 'white' ? 0 : 7)) board[toX][toY] = (movingColor === 'white' ? 'Q' : 'q');
                if(Math.abs(toX - fromX) === 2) newEnPassantTarget = {x: (fromX + toX) / 2, y: toY};
            }
        }
        enPassantTarget = newEnPassantTarget;
    }
    
    function tryMove(from, to) {
        if(gameOver) return false;
        const moves = getPieceMoves(from.x, from.y, board, true, false);
        const validMove = moves.find(m => m.x === to.x && m.y === to.y);
        if(!validMove) return false;
        
        applyMove(from, to, validMove.isCastle, validMove.isEnPassant);
        currentTurn = (currentTurn === 'white') ? 'black' : 'white';
        updateGameStatus();
        return true;
    }
    
    function updateGameStatus() {
        const currentColor = currentTurn;
        const kingPos = findKingPosition(currentColor, board);
        checkState = kingPos ? isSquareAttacked(kingPos.x, kingPos.y, currentColor, board) : false;
        
        let hasLegalMoves = false;
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                if(board[i][j] && getPieceColor(board[i][j]) === currentColor) {
                    if(getPieceMoves(i, j, board, true, false).length > 0) { hasLegalMoves = true; break; }
                }
            }
            if(hasLegalMoves) break;
        }
        
        if(!hasLegalMoves) {
            gameOver = true;
            winner = checkState ? (currentColor === 'white' ? 'black' : 'white') : null;
        }
        drawBoard();
    }
    
    function initBoard() {
        board = Array(8).fill().map(() => Array(8).fill(null));
        for(let i = 0; i < 8; i++) { board[1][i] = 'p'; board[6][i] = 'P'; }
        const br = ['r','n','b','q','k','b','n','r'], wr = ['R','N','B','Q','K','B','N','R'];
        for(let i = 0; i < 8; i++) { board[0][i] = br[i]; board[7][i] = wr[i]; }
        whiteKingMoved = blackKingMoved = whiteRookA1Moved = whiteRookH1Moved = blackRookA8Moved = blackRookH8Moved = false;
        enPassantTarget = null; currentTurn = 'white'; gameOver = false; winner = null; checkState = false; selectedCell = null;
    }
    
    function drawBoard() {
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#f0d9b5' : '#b58863';
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                if(selectedCell && selectedCell.x === i && selectedCell.y === j) {
                    ctx.fillStyle = 'rgba(50, 205, 50, 0.5)';
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                }
            }
        }
        const pieceMap = {'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙','k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'};
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for(let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++) {
                const p = board[i][j];
                if(p) {
                    ctx.font = `${cellSize * 0.75}px Arial`;
                    ctx.fillStyle = (p === p.toUpperCase()) ? '#fff' : '#000';
                    ctx.shadowBlur = 2; ctx.shadowColor = "rgba(0,0,0,0.5)";
                    ctx.fillText(pieceMap[p], j * cellSize + cellSize/2, i * cellSize + cellSize/2);
                    ctx.shadowBlur = 0;
                }
            }
        }
        const statusDiv = document.getElementById('statusMsg');
        if(gameOver) statusDiv.innerHTML = winner ? `🏆 ПОБЕДА ${winner === 'white' ? 'БЕЛЫХ' : 'ЧЕРНЫХ'}!` : '🤝 ПАТ! Ничья.';
        else statusDiv.innerHTML = (checkState ? '⚠️ ШАХ! ' : '') + `Ход: ${currentTurn === 'white' ? '⚪ Белые' : '⚫ Черные'}`;
    }
    
    canvas.addEventListener('click', (e) => {
        if(gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / (rect.width / 8));
        const row = Math.floor((e.clientY - rect.top) / (rect.height / 8));
        if(selectedCell) {
            if(!tryMove(selectedCell, {x: row, y: col})) {
                const p = board[row][col];
                if(p && getPieceColor(p) === currentTurn) selectedCell = {x: row, y: col};
                else selectedCell = null;
            } else selectedCell = null;
        } else {
            const p = board[row][col];
            if(p && getPieceColor(p) === currentTurn) selectedCell = {x: row, y: col};
        }
        drawBoard();
    });
    
    initBoard();
    drawBoard();
})();