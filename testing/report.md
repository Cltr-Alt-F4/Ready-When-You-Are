# Room-Based Multiplayer System Report

## Overview
This multiplayer game uses a WebSocket-based room system that allows multiple independent game sessions to run simultaneously. Each room supports up to 2 players, and players are automatically assigned to available rooms.

## Architecture

### Server Side (`server.js`)
The WebSocket server manages multiple game rooms independently:

- **Room Structure**: `rooms = { 'room_0': { players: {} }, 'room_1': { players: {} }, ... }`
- **Auto-Assignment**: When a new player connects, the server:
  1. Searches for the first room with < 2 players
  2. If no room is available, creates a new room (`room_N`)
  3. Assigns the player to that room
  4. Stores the `roomId` in the WebSocket connection for efficient routing

- **Player Assignment**:
  - First player in a room → Player 1 (Blue, starts at x=100)
  - Second player in a room → Player 2 (Red, starts at x=700)

- **Room-Based Broadcasting**: Messages are only sent to players in the same room using `broadcastToRoom(roomId, data)`

- **Cleanup**: Empty rooms are automatically deleted when all players disconnect

### Client Side

#### GameScene (`src/phaser/GameScene.js`)
- Maintains WebSocket connection to server
- Receives and displays assigned `roomId`
- Shows room ID at the top of the game canvas
- Handles player movement and position updates
- Only receives updates from players in the same room

#### App UI (`src/App.jsx`)
- Displays connection status
- Shows current room ID (e.g., "Room: room_0")
- Shows player count within the room (e.g., "Players: 1/2")
- Passes room change callbacks to the game scene

#### Game Component (`src/Game.jsx`)
- Initializes Phaser game instance
- Bridges React callbacks to Phaser scene
- Passes `onRoomChange` callback to GameScene

## How It Works

### Connection Flow
1. **Player opens browser tab** → React app loads
2. **GameScene creates WebSocket connection** to `ws://localhost:2567`
3. **Server assigns player to room**:
   - Tab 1 → `room_0` (Player 1, Blue)
   - Tab 2 → `room_0` (Player 2, Red)
   - Tab 3 → `room_1` (Player 1, Blue)
   - Tab 4 → `room_1` (Player 2, Red)
   - And so on...
4. **Server sends player assignment** with room ID and player info
5. **Client displays room ID** in UI and game canvas
6. **Players can move** using WASD or Arrow keys
7. **Movement broadcasts** only to players in the same room

### Message Types

#### Server → Client
- **`player_assigned`**: Initial assignment with player data, room ID, and all players in room
- **`player_joined`**: Notifies when a new player joins the room
- **`player_left`**: Notifies when a player disconnects from the room
- **`player_moved`**: Updates player position from other players

#### Client → Server
- **`move`**: Sends player's new position (x, y)

### Room Isolation
- Each room maintains its own player state
- Movement in `room_0` does not affect `room_1`
- Players in different rooms cannot see or interact with each other
- Multiple game sessions can run simultaneously

## Running the Application

### Start the Servers
```bash
# Terminal 1: Start WebSocket server
npm run server

# Terminal 2: Start Vite dev server
npm run dev
```

### Access the Game
Open `http://localhost:5174` in your browser.

### Testing with Multiple Tabs
1. **Tab 1**: Opens → Assigned to `room_0`, shows "Players: 1/2"
2. **Tab 2**: Opens → Assigned to `room_0`, shows "Players: 2/2"
3. **Tab 3**: Opens → Assigned to `room_1`, shows "Players: 1/2"
4. **Tab 4**: Opens → Assigned to `room_1`, shows "Players: 2/2"

Each pair of tabs forms an independent game session.

## Important Notes

### React.StrictMode Issue
The application does not use `React.StrictMode` because it causes double component rendering in development mode, which would create duplicate WebSocket connections. This was removed from `src/main.jsx` to ensure each tab creates exactly one WebSocket connection.

### Server Ports
- **WebSocket Server**: `ws://localhost:2567`
- **Dev Server**: `http://localhost:5174` (may vary if port is in use)

### Player Colors & Positions
- **Player 1 (Blue)**: Starts at x=100, y=350
- **Player 2 (Red)**: Starts at x=700, y=350

### Controls
- **WASD** or **Arrow Keys** to move your player

## File Structure
```
testing/
├── server.js                    # WebSocket server with room management
├── src/
│   ├── main.jsx                # React entry point (no StrictMode)
│   ├── App.jsx                 # Main UI component with room display
│   ├── Game.jsx                # Phaser game wrapper
│   └── phaser/
│       └── GameScene.js        # Game logic with room handling
```

## Troubleshooting

### "Address already in use" error
The WebSocket server port (2567) may be in use. Kill the process:
```bash
netstat -ano | findstr :2567
taskkill /F /PID <process_id>
```

### Shows 2 players with only 1 tab
This was caused by React.StrictMode creating double connections. Ensure `src/main.jsx` does not wrap the app in `<React.StrictMode>`.

### Players not seeing each other
Ensure both tabs are connected to the same room (check the room ID displayed in the UI).
