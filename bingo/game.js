class BingoGame {
    constructor() {
        this.roomId = null;
        this.playerId = null;
        this.playerName = null;
        this.currentTurn = null;
        this.board = [];
        this.drawnNumbers = new Set();
        
        // Add input validation for room ID
        const roomIdInput = document.getElementById('room-id');
        if (roomIdInput) {
            roomIdInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }
        
        this.initializeEventListeners();
        console.log('BingoGame initialized');
    }

    initializeEventListeners() {
        const createRoomBtn = document.getElementById('create-room');
        const joinRoomBtn = document.getElementById('join-room');
        const drawNumberBtn = document.getElementById('draw-number');
        const copyRoomIdBtn = document.getElementById('copy-room-id');

        if (!createRoomBtn || !joinRoomBtn || !drawNumberBtn) {
            console.error('Could not find required buttons');
            return;
        }

        createRoomBtn.addEventListener('click', () => {
            console.log('Create room button clicked');
            this.createRoom().catch(error => {
                console.error('Error creating room:', error);
                alert('Failed to create room. Please try again.');
            });
        });

        joinRoomBtn.addEventListener('click', () => {
            console.log('Join room button clicked');
            this.joinRoom().catch(error => {
                console.error('Error joining room:', error);
                alert('Failed to join room. Please try again.');
            });
        });

        drawNumberBtn.addEventListener('click', () => {
            console.log('Draw number button clicked');
            this.drawNumber().catch(error => {
                console.error('Error drawing number:', error);
                alert('Failed to draw number. Please try again.');
            });
        });

        if (copyRoomIdBtn) {
            copyRoomIdBtn.addEventListener('click', () => {
                const roomIdInput = document.getElementById('new-room-id');
                roomIdInput.select();
                document.execCommand('copy');
                copyRoomIdBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyRoomIdBtn.textContent = 'Copy';
                }, 2000);
            });
        }
    }

    generateRoomNumber() {
        // Generate a random 8-digit number
        const min = 10000000;
        const max = 99999999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async createRoom() {
        try {
            console.log('Creating new room...');
            
            // Generate a unique 8-digit room number
            let roomNumber;
            let isUnique = false;
            let attempts = 0;
            const maxAttempts = 10;

            while (!isUnique && attempts < maxAttempts) {
                roomNumber = this.generateRoomNumber();
                const roomRef = database.ref(`rooms/${roomNumber}`);
                const snapshot = await roomRef.once('value');
                
                if (!snapshot.exists()) {
                    isUnique = true;
                } else {
                    attempts++;
                }
            }

            if (!isUnique) {
                throw new Error('Could not generate unique room number');
            }

            this.roomId = roomNumber.toString();
            this.playerId = 'player1';
            this.playerName = 'Player 1';

            console.log('Setting up room data...');
            const roomRef = database.ref(`rooms/${this.roomId}`);
            await roomRef.set({
                players: {
                    player1: {
                        name: 'Player 1',
                        board: this.generateBoard()
                    }
                },
                currentTurn: 'player1',
                drawnNumbers: [],
                status: 'waiting'
            });

            console.log('Room created successfully:', this.roomId);
            
            // Show room ID
            const roomCreatedDiv = document.getElementById('room-created');
            const newRoomIdInput = document.getElementById('new-room-id');
            newRoomIdInput.value = this.roomId;
            roomCreatedDiv.classList.remove('hidden');

            this.showGameScreen();
            this.initializeGame();
        } catch (error) {
            console.error('Error in createRoom:', error);
            throw error;
        }
    }

    async joinRoom() {
        try {
            const roomId = document.getElementById('room-id').value.trim();
            console.log('Attempting to join room:', roomId);

            if (!roomId) {
                alert('Please enter a room ID');
                return;
            }

            const roomRef = database.ref(`rooms/${roomId}`);
            console.log('Checking room existence...');
            
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();
            console.log('Room data:', roomData);

            if (!roomData) {
                console.error('Room not found in database');
                alert('Room not found. Please check the Room ID and try again.');
                return;
            }

            if (!roomData.players) {
                console.error('Room data is missing players object');
                alert('Invalid room data. Please try creating a new room.');
                return;
            }

            if (Object.keys(roomData.players).length >= 2) {
                console.log('Room is full');
                alert('Room is full');
                return;
            }

            console.log('Joining room as player 2...');
            this.roomId = roomId;
            this.playerId = 'player2';
            this.playerName = 'Player 2';

            // Use the same board as player 1
            const player1Board = roomData.players.player1.board;

            await roomRef.update({
                players: {
                    ...roomData.players,
                    player2: {
                        name: 'Player 2',
                        board: player1Board // Use the same board
                    }
                },
                status: 'playing'
            });

            console.log('Successfully joined room');
            this.showGameScreen();
            this.initializeGame();
        } catch (error) {
            console.error('Error in joinRoom:', error);
            alert('Failed to join room. Please try again.');
        }
    }

    generateBoard() {
        const board = [];
        const columnRanges = [
            { min: 1, max: 15 },
            { min: 16, max: 30 },
            { min: 31, max: 45 },
            { min: 46, max: 60 },
            { min: 61, max: 75 }
        ];
        
        for (let i = 0; i < 5; i++) {
            const row = [];
            for (let j = 0; j < 5; j++) {
                const range = columnRanges[j];
                const availableNumbers = Array.from(
                    { length: range.max - range.min + 1 },
                    (_, i) => range.min + i
                );
                const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                row.push(availableNumbers.splice(randomIndex, 1)[0]);
            }
            board.push(row);
        }

        // Center cell is free
        board[2][2] = 0;

        return board;
    }

    showGameScreen() {
        document.getElementById('join-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('current-room').textContent = this.roomId;
        document.getElementById('player-name').textContent = this.playerName;
    }

    async initializeGame() {
        try {
            const roomRef = database.ref(`rooms/${this.roomId}`);
            
            roomRef.on('value', (snapshot) => {
                try {
                    const roomData = snapshot.val();
                    if (!roomData) {
                        console.error('Room data is null');
                        return;
                    }

                    this.currentTurn = roomData.currentTurn;
                    this.drawnNumbers = new Set(roomData.drawnNumbers || []);
                    
                    document.getElementById('current-turn').textContent = 
                        roomData.players[roomData.currentTurn]?.name || 'Unknown';
                    
                    if (roomData.players[this.playerId]?.board) {
                        this.updateBoard(roomData.players[this.playerId].board);
                    }
                    
                    this.updateLastNumber(roomData.drawnNumbers || []);
                    
                    if (this.checkWinner(roomData.players[this.playerId]?.board || [])) {
                        alert('Congratulations! You won!');
                        roomRef.update({ status: 'finished' });
                    }
                } catch (error) {
                    console.error('Error in Firebase value listener:', error);
                }
            });
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    updateBoard(board) {
        if (!board || !Array.isArray(board)) {
            console.error('Invalid board data');
            return;
        }

        const grid = document.getElementById('bingo-grid');
        grid.innerHTML = '';

        board.forEach((row, i) => {
            row.forEach((number, j) => {
                const cell = document.createElement('div');
                cell.className = 'bingo-cell';
                cell.textContent = number;
                
                // Only mark cells that are 0 (already marked)
                if (number === 0) {
                    cell.classList.add('marked');
                }

                grid.appendChild(cell);
            });
        });
    }

    updateLastNumber(drawnNumbers) {
        if (!Array.isArray(drawnNumbers)) {
            console.error('Invalid drawnNumbers data');
            document.getElementById('last-number').textContent = '-';
            return;
        }

        const lastNumber = drawnNumbers[drawnNumbers.length - 1];
        document.getElementById('last-number').textContent = lastNumber || '-';
        
        // Update the visual state of all cells based on drawn numbers
        const grid = document.getElementById('bingo-grid');
        const cells = grid.getElementsByClassName('bingo-cell');
        Array.from(cells).forEach(cell => {
            const number = parseInt(cell.textContent);
            // Only mark cells that are 0 (already marked)
            if (number === 0) {
                cell.classList.add('marked');
            } else {
                cell.classList.remove('marked');
            }
        });
    }

    async drawNumber() {
        try {
            if (!this.roomId) {
                console.error('No room ID found');
                return;
            }

            const roomRef = database.ref(`rooms/${this.roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            if (!roomData) {
                console.error('Room data not found');
                return;
            }

            // Check if it's our turn
            if (roomData.currentTurn !== this.playerId) {
                console.log('Not your turn');
                return;
            }

            // Ensure drawnNumbers is an array
            const drawnNumbers = roomData.drawnNumbers || [];

            // Generate a random number between 1 and 75 that hasn't been drawn
            const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
                .filter(num => !drawnNumbers.includes(num));

            if (availableNumbers.length === 0) {
                console.log('All numbers have been drawn');
                return;
            }

            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const drawnNumber = availableNumbers[randomIndex];

            // Update everything in a single atomic operation
            const updates = {
                drawnNumbers: [...drawnNumbers, drawnNumber],
                currentTurn: this.playerId === 'player1' ? 'player2' : 'player1'
            };

            // Update both players' boards
            ['player1', 'player2'].forEach(playerId => {
                if (roomData.players[playerId]?.board) {
                    const board = roomData.players[playerId].board;
                    const updatedBoard = board.map(row => 
                        row.map(cell => cell === drawnNumber ? 0 : cell)
                    );
                    updates[`players/${playerId}/board`] = updatedBoard;
                }
            });

            // Perform all updates at once
            await roomRef.update(updates);

            console.log('Number drawn:', drawnNumber);
        } catch (error) {
            console.error('Error in drawNumber:', error);
            alert('Failed to draw number. Please try again.');
        }
    }

    checkWinner(board) {
        if (!board || !Array.isArray(board)) {
            return false;
        }

        // Check rows
        for (let i = 0; i < 5; i++) {
            if (this.checkLine(board[i])) {
                this.animateWinningCells(board, 'row', i);
                return true;
            }
        }

        // Check columns
        for (let j = 0; j < 5; j++) {
            const column = board.map(row => row[j]);
            if (this.checkLine(column)) {
                this.animateWinningCells(board, 'column', j);
                return true;
            }
        }

        // Check main diagonal
        const mainDiagonal = board.map((row, i) => row[i]);
        if (this.checkLine(mainDiagonal)) {
            this.animateWinningCells(board, 'diagonal', 0);
            return true;
        }

        // Check other diagonal
        const otherDiagonal = board.map((row, i) => row[4 - i]);
        if (this.checkLine(otherDiagonal)) {
            this.animateWinningCells(board, 'diagonal', 1);
            return true;
        }

        return false;
    }

    checkLine(line) {
        return line.every(cell => cell === 0 || this.drawnNumbers.has(cell));
    }

    animateWinningCells(board, type, index) {
        const grid = document.getElementById('bingo-grid');
        const cells = grid.getElementsByClassName('bingo-cell');
        
        // Remove any existing winning animations
        Array.from(cells).forEach(cell => cell.classList.remove('winning'));

        // Add winning animation to the appropriate cells
        if (type === 'row') {
            for (let j = 0; j < 5; j++) {
                cells[index * 5 + j].classList.add('winning');
            }
        } else if (type === 'column') {
            for (let i = 0; i < 5; i++) {
                cells[i * 5 + index].classList.add('winning');
            }
        } else if (type === 'diagonal') {
            if (index === 'main') {
                for (let i = 0; i < 5; i++) {
                    cells[i * 5 + i].classList.add('winning');
                }
            } else {
                for (let i = 0; i < 5; i++) {
                    cells[i * 5 + (4 - i)].classList.add('winning');
                }
            }
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new BingoGame();
}); 