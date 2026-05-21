let answer = "";
let currentRow = 0, currentCol = 0, gameOver = false;
const grid = Array.from({ length: 6 }, () => Array(5).fill(""));

// 1. FETCH WORD BEFORE GAME STARTS
async function initGame() {
  showMsg("Loading word...");
  try {
    const response = await fetch("https://random-word-api.herokuapp.com/word?length=5&number=1");
    const data = await response.json();
    answer = data[0].toUpperCase();
    showMsg(""); // Clear loading message
  } catch (e) {
    showMsg("Failed to load word. Refresh page.");
  }
}

// 2. BUILD BOARD array
const board = document.getElementById("board");
const tiles = [];
for (let r = 0; r < 6; r++) {
  const row = document.createElement("div");
  row.className = "row";
  const rowTiles = [];
  for (let c = 0; c < 5; c++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    row.appendChild(tile);
    rowTiles.push(tile);
  }
  board.appendChild(row);
  tiles.push(rowTiles);
}

// 3. BUILD KEYBOARD
const keys = {};
const rows = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["Enter","z","x","c","v","b","n","m","⌫"]
];
const kb = document.getElementById("keyboard");
rows.forEach(rowKeys => {
  const rowEl = document.createElement("div");
  rowEl.className = "kb-row";
  rowKeys.forEach(k => {
    const btn = document.createElement("button");
    btn.className = "key";
    btn.textContent = k;
    btn.style.minWidth = k.length > 1 ? "56px" : "36px";
    btn.addEventListener("click", () => handleKey(k));
    rowEl.appendChild(btn);
    keys[k.toUpperCase()] = btn;
  });
  kb.appendChild(rowEl);
});

// 4. HANDLE INPUT
document.addEventListener("keydown", e => {
  if (e.key === "Enter") handleKey("Enter");
  else if (e.key === "Backspace") handleKey("⌫");
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
});

function handleKey(key) {
  if (gameOver || !answer) return; // Prevent input if word isn't loaded
  
  const upperKey = key.toUpperCase();
  
  if (upperKey === "⌫" || upperKey === "BACKSPACE") {
    if (currentCol > 0) { 
      currentCol--; 
      grid[currentRow][currentCol] = ""; 
      tiles[currentRow][currentCol].textContent = ""; 
    }
  } else if (upperKey === "ENTER") {
    if (currentCol < 5) { showMsg("Not enough letters"); return; }
    submitGuess();
  } else if (currentCol < 5 && /^[A-Z]$/.test(upperKey)) {
    grid[currentRow][currentCol] = upperKey;
    tiles[currentRow][currentCol].textContent = upperKey;
    currentCol++;
  }
}

// 5. SUBMIT & VALIDATE via Dictionary API
async function submitGuess() {
  const word = grid[currentRow].join("").toLowerCase();
  showMsg("Checking...");

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) { showMsg("Not a valid word!"); return; }
  } catch (e) { 
    showMsg("Network error checking dictionary"); 
    return; 
  }

  showMsg("");
  colorRow(word.toUpperCase());

  if (word.toUpperCase() === answer) {
    showMsg("🎉 You got it!"); 
    gameOver = true;
  } else if (currentRow === 5) {
    showMsg(`Answer: ${answer}`); 
    gameOver = true;
  } else {
    currentRow++; 
    currentCol = 0;
  }
}

// 6. COLOR TILES (Fixed key overwrite bug)
function colorRow(guess) {
  const answerArr = answer.split("");
  const result = Array(5).fill("absent");
  const used = Array(5).fill(false);

  // Green pass
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answerArr[i]) { 
      result[i] = "correct"; 
      used[i] = true; 
    }
  }
  // Yellow pass
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answerArr[j]) { 
        result[i] = "present"; 
        used[j] = true; 
        break; 
      }
    }
  }

  result.forEach((state, i) => {
    tiles[currentRow][i].classList.add(state);
    const k = keys[guess[i]];
    if (k) {
      // Only upgrade key color, never downgrade
      if (state === "correct") {
        k.className = "key correct";
      } else if (state === "present" && !k.classList.contains("correct")) {
        k.className = "key present";
      } else if (state === "absent" && !k.classList.contains("correct") && !k.classList.contains("present")) {
        k.className = "key absent";
      }
    }
  });
}

function showMsg(msg) { document.getElementById("message").textContent = msg; }

// Start the game initialization
initGame();
