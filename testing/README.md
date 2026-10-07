# Ready When You Are

An asymmetric horror multiplayer web game built with Phaser 3 and WebSockets.

## Game Concept

**Ready When You Are** is a 2-phase competitive game for 2 players:

### Phase 1: Hide & Seek
- **Hide Phase (1:30 min)**: Both players hide 3 items in their own map with 15 hiding spots
- **Seek Phase (2 min)**: Players swap maps and must find the opponent's hidden items by digging
- First player to find all 3 items wins Phase 1

### Phase 2: Hunt or be Hunted
- **Night Map**: Dark environment with constant rain
- **Hider (Phase 1 Winner)**: Must place found items in 3 randomly spawned shrines
  - Has a flashlight (3-tile vision cone)
  - Can run with cooldown
  - Power-ups: Snowball, Alarm, Dummy
- **Seeker (Phase 1 Loser)**: Must catch the hider
  - Blind by default, but lightning strikes every 5 seconds reveal hider for 2-3 seconds
  - Echolocation ability with cooldown
  - Power-ups: Snowball, Rubber Shoes

### Power-ups
- **Rubber Shoes 👟**: Seeker can hear hider's footsteps
- **Snowball ❄️**: Throw to slow down opponent
- **Alarm 🚨**: Reveals hider position with screen shake
- **Dummy 🎭**: Creates a decoy to mislead seeker

## Tech Stack

- **Frontend**: Phaser 4.2.1
- **Backend**: Node.js with WebSocket (ws library)
- **Language**: JavaScript (ES6 modules)
- **Style**: Pixel art aesthetic

## Setup Instructions

### Prerequisites
- Node.js installed
- Modern web browser

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Game

**Terminal 1 - Start WebSocket Server:**
```bash
node server.js
```
The server will run on port 3000.

**Terminal 2 - Start HTTP Server:**
```bash
python -m http.server 8080
```
Or use any other HTTP server.

**Play the Game:**
1. Open two browser tabs to `http://localhost:8080`
2. Both players will connect to the WebSocket server
3. Click "READY" when both players are connected
4. Game starts automatically when both are ready

### Offline Mode

If the WebSocket server is not running, the game will automatically fall back to single-player offline mode for testing.

## Controls

### Phase 1 (Hide & Seek)
- **Mouse**: Click hiding spots to place/remove items (Hide phase)
- **Mouse**: Click spots to dig for items (Seek phase)

### Phase 2 (Hider)
- **Arrow Keys**: Move
- **SPACE**: Run (with cooldown)
- **1**: Throw Snowball
- **2**: Activate Alarm
- **3**: Place Dummy

### Phase 2 (Seeker)
- **Arrow Keys**: Move
- **E**: Echolocation (reveals hider position)
- **1**: Throw Snowball

## Project Structure

```
HelloWorld/
├── src/
│   ├── main.js              # Phaser game config
│   ├── NetworkManager.js    # WebSocket client
│   └── scenes/
│       ├── Lobby.js         # Player lobby and connection
│       ├── Phase1_Hide.js   # Hide phase logic
│       ├── Phase1_Seek.js   # Seek phase logic
│       ├── Phase2.js        # Final chase phase
│       └── GameOver.js      # End game screen
├── server.js               # WebSocket server
├── index.html              # Game entry point
└── package.json            # Dependencies
```

## Game Rules Summary

1. **Phase 1 Hide**: Place 3 items in 90 seconds
2. **Phase 1 Seek**: Find opponent's 3 items in 120 seconds
3. **Phase 2**: Winner of Phase 1 becomes Hider, loser becomes Seeker
4. **Hider wins**: Place all items in shrines
5. **Seeker wins**: Catch the hider

## Features

- ✅ Real-time multiplayer synchronization via WebSockets
- ✅ Two-phase asymmetric gameplay
- ✅ Dynamic map generation
- ✅ Power-up system with cooldowns
- ✅ Atmospheric effects (rain, lightning, flashlight)
- ✅ Mobile and PC responsive design
- ✅ Offline fallback mode for testing

## Competition Requirements Met

- ✅ Web-based game (HTML/CSS/JS)
- ✅ Mobile and PC compatible
- ✅ 2-player competitive multiplayer
- ✅ WebSocket synchronization
- ✅ Asymmetric horror theme
- ✅ Pixel art style

## Development

The game is designed for a 1-month development timeline. Current implementation includes all core mechanics and multiplayer infrastructure.

## License

Built for competition purposes.
