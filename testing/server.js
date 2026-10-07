const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server running');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const gameState = {
    players: {},
    phase: 'lobby',
    phase1HideData: {},
    phase1SeekData: {},
    phase2Data: {}
};

// Player management
let playerIdCounter = 0;

wss.on('connection', (ws) => {
    const playerId = `player_${playerIdCounter++}`;
    console.log(`Player connected: ${playerId}`);

    // Send player their ID
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId
    }));

    // Add player to game state
    gameState.players[playerId] = {
        ws: ws,
        ready: false,
        role: null
    };

    // Broadcast player count
    broadcastPlayerCount();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(playerId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        delete gameState.players[playerId];
        broadcastPlayerCount();
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

function handleMessage(playerId, data) {
    const player = gameState.players[playerId];
    if (!player) return;

    switch (data.type) {
        case 'ready':
            player.ready = data.ready;
            checkAllReady();
            break;

        case 'phase1_hide_complete':
            gameState.phase1HideData[playerId] = data.hiddenItems;
            checkPhase1Complete();
            break;

        case 'phase1_seek_complete':
            gameState.phase1SeekData[playerId] = {
                itemsFound: data.itemsFound,
                won: data.won
            };
            checkPhase1SeekComplete();
            break;

        case 'phase2_update':
            // Broadcast player position to opponent
            broadcastToOpponent(playerId, {
                type: 'opponent_position',
                x: data.x,
                y: data.y
            });
            break;

        case 'phase2_powerup':
            // Broadcast power-up usage
            broadcastToOpponent(playerId, {
                type: 'opponent_powerup',
                powerUp: data.powerUp,
                x: data.x,
                y: data.y
            });
            break;

        case 'phase2_win':
            broadcast({
                type: 'game_over',
                winner: data.winner
            });
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function broadcastPlayerCount() {
    const count = Object.keys(gameState.players).length;
    broadcast({
        type: 'player_count',
        count: count
    });
}

function checkAllReady() {
    const players = Object.values(gameState.players);
    const allReady = players.length >= 2 && players.every(p => p.ready);

    if (allReady) {
        // Assign roles and start phase 1
        const playerIds = Object.keys(gameState.players);
        gameState.players[playerIds[0]].role = 'hider';
        gameState.players[playerIds[1]].role = 'hider';

        broadcast({
            type: 'start_phase1_hide'
        });
    }
}

function checkPhase1Complete() {
    const players = Object.keys(gameState.phase1HideData);
    if (players.length >= 2) {
        // Both players have hidden their items
        // Send each player the opponent's hidden items
        players.forEach(playerId => {
            const opponentId = players.find(id => id !== playerId);
            gameState.players[playerId].ws.send(JSON.stringify({
                type: 'start_phase1_seek',
                hiddenItems: gameState.phase1HideData[opponentId]
            }));
        });
    }
}

function checkPhase1SeekComplete() {
    const players = Object.keys(gameState.phase1SeekData);
    if (players.length >= 2) {
        // Determine winner of phase 1
        const p1 = gameState.phase1SeekData[players[0]];
        const p2 = gameState.phase1SeekData[players[1]];

        let winner, loser;
        if (p1.won && !p2.won) {
            winner = players[0];
            loser = players[1];
        } else if (p2.won && !p1.won) {
            winner = players[1];
            loser = players[0];
        } else {
            // Tie - random winner
            winner = Math.random() > 0.5 ? players[0] : players[1];
            loser = players.find(id => id !== winner);
        }

        // Start phase 2
        gameState.players[winner].ws.send(JSON.stringify({
            type: 'start_phase2',
            role: 'hider'
        }));

        gameState.players[loser].ws.send(JSON.stringify({
            type: 'start_phase2',
            role: 'seeker'
        }));
    }
}

function broadcast(data) {
    Object.values(gameState.players).forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(data));
        }
    });
}

function broadcastToOpponent(playerId, data) {
    const playerIds = Object.keys(gameState.players);
    const opponentId = playerIds.find(id => id !== playerId);

    if (opponentId && gameState.players[opponentId]) {
        gameState.players[opponentId].ws.send(JSON.stringify(data));
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});
