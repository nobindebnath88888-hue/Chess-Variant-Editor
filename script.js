// Paste your Firebase Config here from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBxHSDUiSWNf-0wiLMUHTYVYd-HhyjjZZw",
    authDomain: "chess-variant-editor.firebaseapp.com",
    projectId: "chess-variant-editor",
    storageBucket: "chess-variant-editor.firebasestorage.app",
    messagingSenderId: "548297225938",
    appId: "1:548297225938:web:91af0f0aeaea3358069f0b",
    measurementId: "G-2Z9P9KZQWM"
  };



firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==================== CONSTANTS ====================
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
};
const BLOCK_TYPE = 'BLK';
const BLOCK_SYMBOL = '⬛'; // black large square
const BLOCK_COLOR = '#666';

// ==================== GLOBAL STATE ====================
let state = {
    size: 14,
    selectedPiece: 'P',
    selectedColor: 'white',
    boardData: {},        // { "x,y": { type, color } }  (type can be piece key or BLOCK_TYPE)
    teamMode: false,
    userId: '',
    inGame: false,
    roomId: null,
    playerColor: null,
    gameBoardData: {},
    currentTurn: 'white',
    selectedSquare: null,
};

// ==================== INITIALIZATION ====================
function init() {
    let uid = localStorage.getItem('chessVariantUserId');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chessVariantUserId', uid);
    }
    state.userId = uid;

    const container = document.getElementById('piece-tools');
    Object.keys(PIECES).forEach(key => {
        const div = document.createElement('div');
        div.className = `piece-tool ${key === 'P' ? 'active' : ''}`;
        div.id = `tool-${key}`;
        div.textContent = PIECES[key];
        div.onclick = () => selectTool(key);
        container.appendChild(div);
    });

    loadVariantList();
    renderBoard();
}

// ==================== EDITOR FUNCTIONS ====================
function renderBoard() {
    const board = document.getElementById('chess-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${state.size}, 45px)`;

    for (let y = state.size - 1; y >= 0; y--) {
        for (let x = 0; x < state.size; x++) {
            const sq = document.createElement('div');
            const dead = isDeadZone(x, y);
            sq.className = `square ${(x + y) % 2 === 0 ? 'sq-dark' : 'sq-light'} ${dead ? 'sq-dead' : ''}`;
            
            if (!dead) {
                const data = state.boardData[`${x},${y}`];
                if (data) {
                    let symbol, color;
                    if (data.type === BLOCK_TYPE) {
                        symbol = BLOCK_SYMBOL;
                        color = BLOCK_COLOR;
                    } else {
                        symbol = PIECES[data.type];
                        color = getColor(data.color);
                    }
                    sq.innerHTML = `<span style="color: ${color}">${symbol}</span>`;
                }
                sq.onclick = () => paintPiece(x, y);
            }
            board.appendChild(sq);
        }
    }
}

function isDeadZone(x, y) {
    const d = 3;
    const s = state.size;
    return (x < d && y < d) || (x < d && y >= s-d) || (x >= s-d && y < d) || (x >= s-d && y >= s-d);
}

function paintPiece(x, y) {
    const key = `${x},${y}`;
    if (state.selectedPiece === 'eraser') {
        delete state.boardData[key];
    } else if (state.selectedPiece === 'block') {
        // Toggle block: if block exists, remove it; else set block (and remove any piece)
        if (state.boardData[key] && state.boardData[key].type === BLOCK_TYPE) {
            delete state.boardData[key];
        } else {
            state.boardData[key] = { type: BLOCK_TYPE };
        }
    } else {
        // Place a piece (overwrites whatever was there)
        state.boardData[key] = { type: state.selectedPiece, color: state.selectedColor };
    }
    renderBoard();
}

function selectTool(type) {
    state.selectedPiece = type;
    document.querySelectorAll('.piece-tool').forEach(t => t.classList.remove('active'));
    const eraserBtn = document.getElementById('btn-eraser');
    const blockBtn = document.getElementById('btn-block');
    if (eraserBtn) eraserBtn.classList.remove('btn-eraser-active');
    if (blockBtn) blockBtn.classList.remove('btn-block-active');

    if (type === 'eraser') {
        if (eraserBtn) eraserBtn.classList.add('btn-eraser-active');
    } else if (type === 'block') {
        if (blockBtn) blockBtn.classList.add('btn-block-active');
    } else {
        const tool = document.getElementById(`tool-${type}`);
        if (tool) tool.classList.add('active');
    }
}

function selectColor(color) {
    state.selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${color}`).classList.add('active');
}

function getColor(c) {
    return { white: '#fff', silver: '#c0c0c0', black: '#222', gold: '#ffd700' }[c];
}

function changeSize(val) {
    state.size = parseInt(val);
    document.getElementById('dim-label').innerText = `${val} x ${val}`;
    state.boardData = {};
    renderBoard();
}

function toggleTeamMode() {
    state.teamMode = document.getElementById('team-mode').checked;
}

function clearBoard() {
    state.boardData = {};
    renderBoard();
}

// ==================== VARIANT MANAGEMENT ====================
function saveVariant() {
    const name = document.getElementById('variant-name').value.trim() || 'Unnamed';
    const variantData = {
        name: name,
        size: state.size,
        boardData: state.boardData,
        teamMode: state.teamMode,
        userId: state.userId,
        timestamp: Date.now()
    };

    const variantRef = db.ref('variants').push();
    variantRef.set(variantData).then(() => {
        alert('Variant saved!');
        loadVariantList();
    }).catch(err => alert('Error: ' + err.message));
}

function loadVariantList() {
    const listDiv = document.getElementById('variant-list');
    listDiv.innerHTML = 'Loading...';

    db.ref('variants').orderByChild('userId').equalTo(state.userId).once('value', snapshot => {
        listDiv.innerHTML = '';
        const variants = [];
        snapshot.forEach(child => {
            variants.push({ id: child.key, ...child.val() });
        });

        if (variants.length === 0) {
            listDiv.innerHTML = '<div style="padding:5px;">No saved variants</div>';
            return;
        }

        variants.sort((a,b) => b.timestamp - a.timestamp);

        variants.forEach(v => {
            const item = document.createElement('div');
            item.className = 'variant-item';
            item.innerHTML = `
                <span>${v.name}</span>
                <div>
                    <button onclick="loadVariant('${v.id}')" title="Load">📂</button>
                    <button onclick="deleteVariant('${v.id}')" title="Delete">🗑️</button>
                </div>
            `;
            listDiv.appendChild(item);
        });
    });
}

function loadVariant(id) {
    db.ref('variants/' + id).once('value', snapshot => {
        const v = snapshot.val();
        if (!v) return;
        state.size = v.size;
        state.boardData = v.boardData || {};
        state.teamMode = v.teamMode || false;

        document.getElementById('team-mode').checked = state.teamMode;
        document.getElementById('dim-label').innerText = `${state.size} x ${state.size}`;
        document.getElementById('variant-name').value = v.name;

        renderBoard();
    });
}

function deleteVariant(id) {
    if (confirm('Delete this variant?')) {
        db.ref('variants/' + id).remove().then(() => {
            loadVariantList();
        });
    }
}

// ==================== ROOM / GAMEPLAY ====================
function createRoom() {
    if (Object.keys(state.boardData).length === 0) {
        alert('Please design a variant first!');
        return;
    }

    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const roomRef = db.ref('rooms/' + roomId);

    roomRef.set({
        variant: {
            size: state.size,
            boardData: state.boardData,
            teamMode: state.teamMode
        },
        players: {
            white: state.userId,
            black: null
        },
        gameState: {
            board: state.boardData,
            turn: 'white',
            lastMove: null
        },
        createdAt: Date.now()
    }).then(() => {
        state.roomId = roomId;
        state.playerColor = 'white';
        state.inGame = true;
        state.gameBoardData = JSON.parse(JSON.stringify(state.boardData));
        state.currentTurn = 'white';

        enterGameMode(roomId);
        listenToRoom(roomId);

        document.getElementById('room-info').innerHTML = `
            Room created!<br>
            <strong>${roomId}</strong><br>
            Share this code with a friend.
        `;
    });
}

function joinRoom() {
    const roomId = document.getElementById('room-code').value.trim().toUpperCase();
    if (!roomId) return;

    const roomRef = db.ref('rooms/' + roomId);
    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) {
            alert('Room not found');
            return;
        }
        if (room.players.black) {
            alert('Room is full');
            return;
        }

        roomRef.child('players/black').set(state.userId).then(() => {
            state.roomId = roomId;
            state.playerColor = 'black';
            state.inGame = true;
            state.gameBoardData = JSON.parse(JSON.stringify(room.gameState.board));
            state.currentTurn = room.gameState.turn;

            enterGameMode(roomId);
            listenToRoom(roomId);

            document.getElementById('room-info').innerHTML = `Joined room ${roomId} as Black.`;
        });
    });
}

function enterGameMode(roomId) {
    document.getElementById('chess-board').classList.add('hidden');
    document.getElementById('game-board').classList.remove('hidden');
    document.getElementById('game-board').style.pointerEvents = 'auto';
    renderGameBoard();
}

function exitGameMode() {
    document.getElementById('chess-board').classList.remove('hidden');
    document.getElementById('game-board').classList.add('hidden');
    document.getElementById('game-board').style.pointerEvents = 'none';

    if (state.roomId) {
        db.ref('rooms/' + state.roomId).off();
    }

    state.inGame = false;
    state.roomId = null;
    state.playerColor = null;
    state.selectedSquare = null;
    document.getElementById('room-info').innerHTML = '';
}

function renderGameBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${state.size}, 45px)`;

    for (let y = state.size - 1; y >= 0; y--) {
        for (let x = 0; x < state.size; x++) {
            const sq = document.createElement('div');
            const dead = isDeadZone(x, y);
            sq.className = `square ${(x + y) % 2 === 0 ? 'sq-dark' : 'sq-light'} ${dead ? 'sq-dead' : ''}`;
            sq.dataset.x = x;
            sq.dataset.y = y;
            
            if (!dead) {
                const data = state.gameBoardData[`${x},${y}`];
                if (data) {
                    let symbol, color;
                    if (data.type === BLOCK_TYPE) {
                        symbol = BLOCK_SYMBOL;
                        color = BLOCK_COLOR;
                    } else {
                        symbol = PIECES[data.type];
                        color = getColor(data.color);
                    }
                    sq.innerHTML = `<span style="color: ${color}">${symbol}</span>`;
                }

                sq.onclick = () => handleGameSquareClick(x, y);
            }
            board.appendChild(sq);
        }
    }

    let indicator = document.getElementById('turn-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'turn-indicator';
        indicator.className = 'turn-indicator';
        document.getElementById('board-container').appendChild(indicator);
    }
    indicator.textContent = `Turn: ${state.currentTurn === 'white' ? 'White' : 'Black'}`;
    if (state.playerColor === state.currentTurn) {
        indicator.innerHTML += ' (Your turn)';
    } else {
        indicator.innerHTML += ' (Opponent\'s turn)';
    }
}

function handleGameSquareClick(x, y) {
    if (!state.inGame) return;
    if (state.playerColor !== state.currentTurn) return;

    const squareKey = `${x},${y}`;
    const piece = state.gameBoardData[squareKey];

    if (state.selectedSquare === null) {
        // Select a piece if it belongs to current player and is not a block
        if (piece && piece.color === state.playerColor && piece.type !== BLOCK_TYPE) {
            state.selectedSquare = squareKey;
            highlightSquare(x, y, true);
        }
    } else {
        // Attempt to move from selectedSquare to (x,y)
        const [fromX, fromY] = state.selectedSquare.split(',').map(Number);
        const fromPiece = state.gameBoardData[state.selectedSquare];

        // Basic move: destination must be empty or opponent piece (capture) and NOT a block
        const destPiece = state.gameBoardData[squareKey];
        if (destPiece && destPiece.type === BLOCK_TYPE) {
            // Cannot move onto a block
            clearHighlight();
            state.selectedSquare = null;
            return;
        }

        if (fromPiece) {
            // Remove old piece, place at new location (capturing any opponent piece)
            delete state.gameBoardData[state.selectedSquare];
            state.gameBoardData[squareKey] = { ...fromPiece };

            // Update turn
            state.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';

            clearHighlight();
            state.selectedSquare = null;

            // Update Firebase
            const updates = {};
            updates[`rooms/${state.roomId}/gameState/board`] = state.gameBoardData;
            updates[`rooms/${state.roomId}/gameState/turn`] = state.currentTurn;
            db.ref().update(updates);

            renderGameBoard();
        } else {
            clearHighlight();
            state.selectedSquare = null;
        }
    }
}

function highlightSquare(x, y, isSelected) {
    document.querySelectorAll('#game-board .square').forEach(sq => {
        if (sq.dataset.x == x && sq.dataset.y == y) {
            sq.style.outline = isSelected ? '3px solid var(--accent)' : '';
        }
    });
}

function clearHighlight() {
    document.querySelectorAll('#game-board .square').forEach(sq => {
        sq.style.outline = '';
    });
}

function listenToRoom(roomId) {
    const roomRef = db.ref('rooms/' + roomId);
    roomRef.on('value', snapshot => {
        const room = snapshot.val();
        if (!room) {
            alert('Room closed');
            exitGameMode();
            return;
        }

        state.gameBoardData = room.gameState.board || {};
        state.currentTurn = room.gameState.turn || 'white';
        renderGameBoard();
    });
}

// ==================== LEGACY ====================
function saveToFirebase() {
    alert('Use SAVE VARIANT instead');
}

init();
