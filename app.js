// Game State Variables
let gameSeq = [];
let userSeq = [];
let btns = ["yellow", "red", "purple", "green"];
let isStarted = false;
let level = 0;
let highScore = parseInt(localStorage.getItem('simonHighScore')) || 0;
let canClick = true;
let soundEnabled = true;
let volume = 0.3;
let difficulty = 'medium';
let currentStreak = 0;
let currentTheme = 'pink';

// Difficulty settings with progressive speed (decreases delay as level increases)
const difficultySettings = {
    easy: { baseDelay: 800, flashDuration: 400, speedReduction: 20 },
    medium: { baseDelay: 600, flashDuration: 300, speedReduction: 15 },
    hard: { baseDelay: 400, flashDuration: 200, speedReduction: 10 }
};

// Calculate progressive speed based on level
function getSequenceDelay() {
    const settings = difficultySettings[difficulty];
    const reduction = Math.min(level * settings.speedReduction, settings.baseDelay - 200);
    return Math.max(settings.baseDelay - reduction, 200);
}

function getFlashDuration() {
    const settings = difficultySettings[difficulty];
    const reduction = Math.min(level * 5, settings.flashDuration - 100);
    return Math.max(settings.flashDuration - reduction, 100);
}

// Statistics
let stats = {
    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed')) || 0,
    gamesWon: parseInt(localStorage.getItem('gamesWon')) || 0,
    totalScore: parseInt(localStorage.getItem('totalScore')) || 0,
    bestStreak: parseInt(localStorage.getItem('bestStreak')) || 0,
    totalPatterns: parseInt(localStorage.getItem('totalPatterns')) || 0
};

// DOM Elements
const h2 = document.querySelector("h2");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const resumeBtn = document.getElementById("resumeBtn");
const levelDisplay = document.getElementById("levelDisplay");
const highScoreDisplay = document.getElementById("highScore");
const body = document.body;
const allBtns = document.querySelectorAll(".btn");
const commentBox = document.getElementById("commentBox");
const commentText = document.getElementById("commentText");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const difficultySelect = document.getElementById("difficulty");
const themeSelect = document.getElementById("theme");
const statsBtn = document.getElementById("statsBtn");
const statsModal = document.getElementById("statsModal");
const closeStats = document.getElementById("closeStats");
const resetStatsBtn = document.getElementById("resetStats");
const guideBtn = document.getElementById("guideBtn");
const guideModal = document.getElementById("guideModal");
const closeGuide = document.getElementById("closeGuide");
const feedbackBtn = document.getElementById("feedbackBtn");
const feedbackModal = document.getElementById("feedbackModal");
const closeFeedback = document.getElementById("closeFeedback");
const cancelFeedback = document.getElementById("cancelFeedback");

// Initialize displays
highScoreDisplay.innerText = highScore;
volume = parseInt(localStorage.getItem('simonVolume')) || 30;
volumeSlider.value = volume;
volumeValue.innerText = volume + '%';
soundEnabled = localStorage.getItem('simonSound') !== 'false';
soundIcon.innerText = soundEnabled ? '🔊' : '🔇';
difficulty = localStorage.getItem('simonDifficulty') || 'medium';
difficultySelect.value = difficulty;
currentTheme = localStorage.getItem('simonTheme') || 'pink';
themeSelect.value = currentTheme;
if (currentTheme !== 'pink') {
    document.body.className = `theme-${currentTheme}`;
}

// Check for saved game
checkSavedGame();

// Sound Effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration = 300) {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const adjustedVolume = volume / 100;
    gainNode.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

// Sound frequencies for each color
const sounds = {
    red: 329.63,    // E4
    yellow: 392.00, // G4
    green: 261.63,  // C4
    purple: 440.00  // A4
};

function playErrorSound() {
    playSound(100, 500);
}

function playSuccessSound() {
    playSound(523.25, 200);
    setTimeout(() => playSound(659.25, 200), 150);
}

// Comment Box Function
function showComment(message, type = 'info') {
    commentText.innerText = message;
    commentBox.className = 'comment-box ' + type;
}

// Flash Animation Functions
function gameFlash(btn) {
    btn.classList.add("flash");
    const color = btn.getAttribute("id");
    const flashDuration = getFlashDuration();
    playSound(sounds[color], flashDuration);
    
    setTimeout(() => {
        btn.classList.remove("flash");
    }, flashDuration);
}

function userFlash(btn) {
    btn.classList.add("userFlash");
    const color = btn.getAttribute("id");
    playSound(sounds[color], 200);
    
    setTimeout(() => {
        btn.classList.remove("userFlash");
    }, 200);
}

// Game Logic Functions
function levelUp() {
    userSeq = [];
    level++;
    levelDisplay.innerText = level;
    h2.innerText = `Level ${level} - Watch the pattern!`;
    showComment(`Level ${level} starting! Watch carefully...`, 'playing');
    canClick = false;
    
    // Fixed bug: was Math.random() * 3, should be * 4 to include all colors
    let randIdx = Math.floor(Math.random() * 4);
    let randColor = btns[randIdx];
    let randBtn = document.querySelector(`.${randColor}`);
    
    gameSeq.push(randColor);
    
    // Save game state
    saveGameState();
    
    // Play the entire sequence with delays
    setTimeout(() => {
        playSequence();
    }, 500);
}

function playSequence() {
    let i = 0;
    const sequenceDelay = getSequenceDelay();
    const interval = setInterval(() => {
        if (i < gameSeq.length) {
            let btn = document.querySelector(`.${gameSeq[i]}`);
            gameFlash(btn);
            stats.totalPatterns++;
            i++;
        } else {
            clearInterval(interval);
            canClick = true;
            h2.innerText = `Level ${level} - Your turn!`;
            showComment(`Speed: ${sequenceDelay}ms - Getting faster!`, 'info');
        }
    }, sequenceDelay);
}

function checkAns(index) {
    if (userSeq[index] === gameSeq[index]) {
        if (userSeq.length === gameSeq.length) {
            canClick = false;
            currentStreak++;
            if (currentStreak > stats.bestStreak) {
                stats.bestStreak = currentStreak;
                localStorage.setItem('bestStreak', stats.bestStreak);
            }
            h2.innerText = "Correct! Get ready...";
            showComment('🎉 Perfect! Moving to next level...', 'success');
            playSuccessSound();
            setTimeout(levelUp, 1000);
        } else {
            showComment(`${userSeq.length}/${gameSeq.length} correct so far!`, 'success');
        }
    } else {
        gameOver();
    }
}

function gameOver() {
    playErrorSound();
    h2.innerHTML = `Game Over! Your score: <b>${level}</b>`;
    showComment('❌ Wrong pattern! Try again...', 'error');
    body.classList.add("game-over");
    
    // Update statistics
    stats.gamesPlayed++;
    stats.totalScore += level;
    if (level >= 10) stats.gamesWon++;
    currentStreak = 0;
    saveStats();
    
    // Update high score
    if (level > highScore) {
        highScore = level;
        highScoreDisplay.innerText = highScore;
        localStorage.setItem('simonHighScore', highScore);
        h2.innerHTML += `<br><span style="color: #ffd700;">🏆 New High Score!</span>`;
        showComment('🏆 NEW HIGH SCORE! Amazing!', 'warning');
    }
    
    setTimeout(() => {
        body.classList.remove("game-over");
    }, 300);
    
    disableButtons();
    reset();
}

function btnPress() {
    if (!canClick || !isStarted) return;
    
    let btn = this;
    userFlash(btn);
    
    let userColor = btn.getAttribute("id");
    userSeq.push(userColor);
    
    checkAns(userSeq.length - 1);
}

function startGame() {
    if (isStarted) return;
    
    console.log("Game started");
    showComment('🎮 Game started! Good luck!', 'info');
    isStarted = true;
    gameSeq = [];
    userSeq = [];
    level = 0;
    currentStreak = 0;
    
    startBtn.disabled = true;
    startBtn.innerText = "Playing...";
    resumeBtn.style.display = 'none';
    enableButtons();
    
    levelUp();
}

function resetGame() {
    console.log("Game reset");
    reset();
    h2.innerText = "Press Start to begin";
    showComment('Ready to play? Hit Start!', 'info');
    levelDisplay.innerText = "0";
    startBtn.disabled = false;
    startBtn.innerText = "Start";
    disableButtons();
    body.classList.remove("game-over");
}

function reset() {
    isStarted = false;
    gameSeq = [];
    userSeq = [];
    level = 0;
    canClick = false;
    currentStreak = 0;
    startBtn.disabled = false;
    startBtn.innerText = "Start";
    clearGameState();
}

function enableButtons() {
    allBtns.forEach(btn => btn.classList.remove("disabled"));
}

function disableButtons() {
    allBtns.forEach(btn => btn.classList.add("disabled"));
}

// Save and Load Functions
function saveGameState() {
    const gameState = {
        gameSeq,
        level,
        difficulty,
        timestamp: Date.now()
    };
    localStorage.setItem('simonGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('simonGameState');
    if (saved) {
        const state = JSON.parse(saved);
        // Only load if less than 1 hour old
        if (Date.now() - state.timestamp < 3600000) {
            gameSeq = state.gameSeq;
            level = state.level;
            difficulty = state.difficulty;
            difficultySelect.value = difficulty;
            levelDisplay.innerText = level;
            return true;
        }
    }
    return false;
}

function clearGameState() {
    localStorage.removeItem('simonGameState');
}

function checkSavedGame() {
    const saved = localStorage.getItem('simonGameState');
    if (saved) {
        const state = JSON.parse(saved);
        if (Date.now() - state.timestamp < 3600000 && state.level > 0) {
            resumeBtn.style.display = 'inline-block';
            showComment('Previous game found! Click Resume to continue.', 'info');
        }
    }
}

function resumeGame() {
    if (loadGameState()) {
        isStarted = true;
        userSeq = [];
        startBtn.disabled = true;
        startBtn.innerText = "Playing...";
        resumeBtn.style.display = 'none';
        enableButtons();
        showComment(`Resuming from Level ${level}!`, 'playing');
        setTimeout(() => {
            playSequence();
        }, 1000);
    }
}

function saveStats() {
    localStorage.setItem('gamesPlayed', stats.gamesPlayed);
    localStorage.setItem('gamesWon', stats.gamesWon);
    localStorage.setItem('totalScore', stats.totalScore);
    localStorage.setItem('bestStreak', stats.bestStreak);
    localStorage.setItem('totalPatterns', stats.totalPatterns);
}

function updateStatsDisplay() {
    document.getElementById('gamesPlayed').innerText = stats.gamesPlayed;
    document.getElementById('gamesWon').innerText = stats.gamesWon;
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    document.getElementById('winRate').innerText = winRate + '%';
    const avgScore = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
    document.getElementById('avgScore').innerText = avgScore;
    document.getElementById('bestStreak').innerText = stats.bestStreak;
    document.getElementById('totalPatterns').innerText = stats.totalPatterns;
}

// Event Listeners
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);
resumeBtn.addEventListener("click", resumeGame);

// Sound Toggle
soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundIcon.innerText = soundEnabled ? '🔊' : '🔇';
    localStorage.setItem('simonSound', soundEnabled);
    showComment(soundEnabled ? 'Sound ON' : 'Sound OFF', 'info');
});

// Volume Control
volumeSlider.addEventListener("input", (e) => {
    volume = e.target.value;
    volumeValue.innerText = volume + '%';
    localStorage.setItem('simonVolume', volume);
});

// Difficulty Change
difficultySelect.addEventListener("change", (e) => {
    if (isStarted) {
        showComment('Finish current game to change difficulty!', 'warning');
        e.target.value = difficulty;
        return;
    }
    difficulty = e.target.value;
    localStorage.setItem('simonDifficulty', difficulty);
    showComment(`Difficulty set to ${difficulty.toUpperCase()}`, 'info');
});

// Theme Change
themeSelect.addEventListener("change", (e) => {
    currentTheme = e.target.value;
    localStorage.setItem('simonTheme', currentTheme);
    
    // Remove all theme classes
    document.body.className = '';
    
    // Add new theme class (except for default pink)
    if (currentTheme !== 'pink') {
        document.body.classList.add(`theme-${currentTheme}`);
    }
    
    showComment(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
});

// Mobile Touch Support
allBtns.forEach(btn => {
    // Touch events for mobile
    btn.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent double-firing on mobile
        if (!canClick || !isStarted) return;
        this.click();
    });
    
    // Visual feedback for touch
    btn.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
    });
    
    btn.addEventListener('touchend', function() {
        this.style.opacity = '1';
    });
});

// Statistics Modal
statsBtn.addEventListener("click", () => {
    updateStatsDisplay();
    statsModal.classList.add('show');
});

closeStats.addEventListener("click", () => {
    statsModal.classList.remove('show');
});

statsModal.addEventListener("click", (e) => {
    if (e.target === statsModal) {
        statsModal.classList.remove('show');
    }
});

resetStatsBtn.addEventListener("click", () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
        stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            bestStreak: 0,
            totalPatterns: 0
        };
        saveStats();
        updateStatsDisplay();
        showComment('Statistics reset!', 'success');
    }
});

// How to Play Modal
guideBtn.addEventListener("click", () => {
    guideModal.classList.add('show');
});

closeGuide.addEventListener("click", () => {
    guideModal.classList.remove('show');
});

guideModal.addEventListener("click", (e) => {
    if (e.target === guideModal) {
        guideModal.classList.remove('show');
    }
});

// Feedback Modal
feedbackBtn.addEventListener("click", () => {
    // Populate hidden fields with game stats
    document.getElementById('hiddenHighScore').value = highScore;
    document.getElementById('hiddenGamesPlayed').value = stats.gamesPlayed;
    document.getElementById('hiddenDifficulty').value = difficulty;
    feedbackModal.classList.add('show');
});

// Character counter for message textarea
const messageTextarea = document.getElementById('message');
const charCount = document.getElementById('charCount');

if (messageTextarea && charCount) {
    messageTextarea.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 450) {
            charCount.style.color = '#ff6b6b';
        } else {
            charCount.style.color = '#999';
        }
    });
}

closeFeedback.addEventListener("click", () => {
    feedbackModal.classList.remove('show');
});

cancelFeedback.addEventListener("click", () => {
    feedbackModal.classList.remove('show');
});

feedbackModal.addEventListener("click", (e) => {
    if (e.target === feedbackModal) {
        feedbackModal.classList.remove('show');
    }
});

// Handle feedback form submission via Web3Forms
const feedbackForm = document.getElementById('feedbackForm');
const feedbackSuccess = document.getElementById('feedbackSuccess');

feedbackForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    const formData = new FormData(feedbackForm);
    
    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            feedbackForm.style.display = 'none';
            feedbackSuccess.style.display = 'block';
            showComment('✅ Feedback sent successfully!', 'success');
            
            // Reset and close after 3 seconds
            setTimeout(() => {
                feedbackModal.classList.remove('show');
                feedbackForm.style.display = 'block';
                feedbackSuccess.style.display = 'none';
                feedbackForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 3000);
        } else {
            throw new Error(data.message || 'Submission failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showComment('❌ Failed to send. Please try again.', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Keyboard support (original feature)
document.addEventListener("keypress", function(e) {
    if (e.key === " " || e.key === "Enter") {
        if (!isStarted) {
            startGame();
        }
    }
});

// Button click listeners
for (let btn of allBtns) {
    btn.addEventListener("click", btnPress);
}

// Initialize buttons as disabled
disableButtons();
