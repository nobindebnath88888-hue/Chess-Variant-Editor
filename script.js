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

// Map piece letters to Font Awesome icon classes
const PIECES = {
    'K': 'fa-chess-king',
    'Q': 'fa-chess-queen',
    'R': 'fa-chess-rook',
    'B': 'fa-chess-bishop',
    'N': 'fa-chess-knight',
    'P': 'fa-chess-pawn'
};

let state = {
    size: 14,
    selectedPiece: 'P',
    selectedColor: 'white',
    boardData: {},
    teamMode: false
};

function init() {
    const container = document.getElementById('piece-tools');
    Object.keys(PIECES).forEach(key => {
        const div = document.createElement('div');
        div.className = `piece-tool ${key === 'P' ? 'active' : ''}`;
        div.id = `tool-${key}`;
        // Use Font Awesome icon
        div.innerHTML = `<i class="fas ${PIECES[key]}"></i>`;
        div.onclick = () => selectTool(key);
        container.appendChild(div);
    });
    renderBoard();
}

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
                    // Render Font Awesome icon with color
                    sq.innerHTML = `<i class="fas ${PIECES[data.type]}" style="color: ${getColor(data.color)}"></i>`;
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
    if (state.selectedPiece === 'eraser') {
        delete state.boardData[`${x},${y}`];
    } else {
        state.boardData[`${x},${y}`] = { type: state.selectedPiece, color: state.selectedColor };
    }
    renderBoard();
}

function selectTool(type) {
    state.selectedPiece = type;

    document.querySelectorAll('.piece-tool').forEach(t => t.classList.remove('active'));
    const eraserBtn = document.getElementById('btn-eraser');
    if (eraserBtn) eraserBtn.classList.remove('btn-eraser-active');

    if (type === 'eraser') {
        if (eraserBtn) eraserBtn.classList.add('btn-eraser-active');
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
    console.log('Team mode:', state.teamMode);
}

function clearBoard() {
    state.boardData = {};
    renderBoard();
}

function saveToFirebase() {
    const variantRef = db.ref('variants').push();
    variantRef.set({
        grid: state.boardData,
        size: state.size,
        teamMode: state.teamMode,
        timestamp: Date.now()
    }).then(() => {
        alert("Variant deployed! ID: " + variantRef.key);
    }).catch(error => {
        alert("Error: " + error.message);
    });
}

init();
