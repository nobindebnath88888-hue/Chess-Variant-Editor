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

const PIECES = { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' };
let state = {
    size: 14,
    selectedPiece: 'P',
    selectedColor: 'white',
    boardData: {}
};

function init() {
    const container = document.getElementById('piece-tools');
    Object.keys(PIECES).forEach(key => {
        const div = document.createElement('div');
        div.className = `piece-tool ${key === 'P' ? 'active' : ''}`;
        div.id = `tool-${key}`;
        div.innerHTML = PIECES[key];
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
                    sq.innerHTML = `<span style="color: ${getColor(data.color)}">${PIECES[data.type]}</span>`;
                }
                sq.onclick = () => paintPiece(x, y);
            }
            board.appendChild(sq);
        }
    }
}

function isDeadZone(x, y) {
    const d = 3; const s = state.size;
    return (x < d && y < d) || (x < d && y >= s-d) || (x >= s-d && y < d) || (x >= s-d && y >= s-d);
}

function paintPiece(x, y) {
    if (state.selectedPiece === 'eraser') delete state.boardData[`${x},${y}`];
    else state.boardData[`${x},${y}`] = { type: state.selectedPiece, color: state.selectedColor };
    renderBoard();
}

function selectTool(type) {
    state.selectedPiece = type;
    document.querySelectorAll('.piece-tool').forEach(t => t.classList.remove('active'));
    if(type !== 'eraser') document.getElementById(`tool-${type}`).classList.add('active');
}

function selectColor(color) {
    state.selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${color}`).classList.add('active');
}

function getColor(c) {
    return { white: '#fff', silver: '#c0c0c0', black: '#000', gold: '#ffd700' }[c];
}

function changeSize(val) {
    state.size = parseInt(val);
    document.getElementById('dim-label').innerText = `${val} x ${val}`;
    state.boardData = {}; renderBoard();
}

// --- FIREBASE DEPLOY LOGIC ---
function saveToFirebase() {
    const variantID = "test-variant-1"; // You can make this dynamic later
    db.ref('variants/' + variantID).set({
        grid: state.boardData,
        size: state.size,
        timestamp: Date.now()
    }).then(() => alert("Variant Deployed to Firebase!"));
}

init();
