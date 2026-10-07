import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Create HTTP server
const httpServer = createServer();
const port = process.env.PORT || 2567;

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Game state
const rooms = {};
let playerCounter = 0;
let roomCounter = 0;

wss.on('connection', (ws) => {
    const playerId = `player_${playerCounter++}`;
    console.log(`Client connected: ${playerId}`);

    // Find or create an available room
    let roomId = null;
    for (const [id, room] of Object.entries(rooms)) {
        if (Object.keys(room.players).length < 2) {
            roomId = id;
            break;
        }
    }
    
    // If no room available, create a new one
    if (!roomId) {
        roomId = `room_${roomCounter++}`;
        rooms[roomId] = { players: {} };
        console.log(`Created new room: ${roomId}`);
    }

    const room = rooms[roomId];
    const currentPlayers = Object.keys(room.players).length;

    // Automatically assign player based on connection order in this room
    const playerNumber = currentPlayers === 0 ? 1 : 2;
    room.players[playerId] = {
        id: playerId,
        playerNumber: playerNumber,
        x: playerNumber === 1 ? 100 : 700,
        y: 350,
        color: playerNumber === 1 ? 'blue' : 'red',
        roomId: roomId
    };

    // Store roomId in ws for easy access
    ws.roomId = roomId;

    console.log(`Player ${playerId} assigned to ${roomId} as Player ${playerNumber} (${room.players[playerId].color})`);
    console.log(`Room ${roomId} players:`, room.players);

    // Send player assignment with room info
    ws.send(JSON.stringify({
        type: 'player_assigned',
        playerId: playerId,
        player: room.players[playerId],
        players: room.players,
        roomId: roomId
    }));

    // Broadcast to all clients in the same room
    broadcastToRoom(roomId, {
        type: 'player_joined',
        playerId: playerId,
        player: room.players[playerId]
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received from ${playerId}:`, data);

            if (data.type === 'move') {
                const room = rooms[ws.roomId];
                if (room && room.players[playerId]) {
                    const player = room.players[playerId];
                    player.x = data.x;
                    player.y = data.y;
                    // Broadcast movement to all clients in the same room
                    broadcastToRoom(ws.roomId, {
                        type: 'player_moved',
                        playerId: playerId,
                        x: data.x,
                        y: data.y
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        
        // Find and remove player from their room
        for (const [roomId, room] of Object.entries(rooms)) {
            if (room.players[playerId]) {
                const player = room.players[playerId];
                delete room.players[playerId];
                
                // Broadcast to remaining players in the room
                broadcastToRoom(roomId, {
                    type: 'player_left',
                    playerId: playerId,
                    playerNumber: player.playerNumber
                });
                
                // Clean up empty rooms
                if (Object.keys(room.players).length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted (empty)`);
                }
                
                break;
            }
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

function broadcastToRoom(roomId, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.roomId === roomId) { // WebSocket.OPEN
            client.send(JSON.stringify(data));
        }
    });
}

// Start the server
httpServer.listen(port, () => {
    console.log(`=== SIMPLE WEBSOCKET SERVER ===`);
    console.log(`WebSocket server listening on port ${port}`);
    console.log(`Auto-assigning players: 1st = Blue, 2nd = Red`);
});
