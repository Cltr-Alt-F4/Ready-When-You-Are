import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.ws = null;
    this.myPlayerId = null;
    this.roomId = null;
    this.myPlayer = null;
    this.opponentPlayer = null;
    this.cursors = null;
    this.wasd = null;
    this.players = {};
    this.onConnectionChange = null;
    this.onPlayerCountChange = null;
    this.onRoomFull = null;
    this.onRoomChange = null;
  }

  preload() {
    // No assets to preload for simple test
  }

  async create() {
    // Create rectangle map background
    this.add.rectangle(400, 300, 800, 600, 0x2d4a3e);

    // Create player blocks (initially hidden)
    this.myPlayer = this.add.rectangle(100, 300, 50, 50, 0x666666);
    this.opponentPlayer = this.add.rectangle(700, 300, 50, 50, 0xff0000);
    this.opponentPlayer.setVisible(false);

    // Add labels
    this.add.text(100, 250, 'YOU', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add.text(700, 250, 'OPPONENT', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    // Add room display
    this.roomText = this.add.text(400, 30, 'Connecting...', { 
      fontSize: '20px', 
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Set up keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Connect to Colyseus server
    await this.connectToServer();
  }

  connectToServer() {
    try {
      this.ws = new WebSocket('ws://localhost:2567');
      console.log('Connecting to WebSocket server...');

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (this.onConnectionChange) {
          this.onConnectionChange(true);
        }
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);

        if (data.type === 'room_full') {
          console.log('Room full:', data.message);
          if (this.onRoomFull) {
            this.onRoomFull(true);
          }
          this.ws.close();
        } else if (data.type === 'player_assigned') {
          console.log('Player assigned:', data);
          this.myPlayerId = data.playerId;
          this.roomId = data.roomId;
          this.players = data.players || {};
          
          // Update room display
          this.roomText.setText(`Room: ${this.roomId}`);
          if (this.onRoomChange) {
            this.onRoomChange(this.roomId);
          }
          
          if (this.onPlayerCountChange) {
            this.onPlayerCountChange(Object.keys(this.players).length);
          }
          // Immediately update my player position from server data
          if (this.players[this.myPlayerId]) {
            const myData = this.players[this.myPlayerId];
            this.myPlayer.setPosition(myData.x, myData.y);
            this.myPlayer.setFillStyle(myData.color === 'blue' ? 0x0000ff : 0xff0000);
            this.myPlayer.setVisible(true);
          }
          this.updatePlayers();
        } else if (data.type === 'player_joined') {
          console.log('Player joined:', data);
          this.players[data.playerId] = data.player;
          if (this.onPlayerCountChange) {
            this.onPlayerCountChange(Object.keys(this.players).length);
          }
          this.updatePlayers();
        } else if (data.type === 'player_left') {
          console.log('Player left:', data);
          delete this.players[data.playerId];
          if (this.onPlayerCountChange) {
            this.onPlayerCountChange(Object.keys(this.players).length);
          }
          this.updatePlayers();
        } else if (data.type === 'player_moved') {
          console.log('Player moved:', data);
          if (this.players[data.playerId]) {
            this.players[data.playerId].x = data.x;
            this.players[data.playerId].y = data.y;
            this.updatePlayers();
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.onConnectionChange) {
          this.onConnectionChange(false);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (this.onConnectionChange) {
          this.onConnectionChange(false);
        }
      };

    } catch (error) {
      console.error('Failed to connect to server:', error);
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    }
  }

  updatePlayers() {
    console.log('My player ID:', this.myPlayerId);
    console.log('All players:', this.players);

    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId];
      console.log(`Player ${playerId}:`, player);

      if (playerId === this.myPlayerId) {
        // This is my player
        console.log('Updating MY player to:', player.x, player.y, player.color);
        this.myPlayer.setPosition(player.x, player.y);
        this.myPlayer.setFillStyle(player.color === 'blue' ? 0x0000ff : 0xff0000);
        this.myPlayer.setVisible(true);
      } else {
        // This is the opponent
        console.log('Updating OPPONENT player to:', player.x, player.y, player.color);
        this.opponentPlayer.setPosition(player.x, player.y);
        this.opponentPlayer.setVisible(true);
        this.opponentPlayer.setFillStyle(player.color === 'blue' ? 0x0000ff : 0xff0000);
      }
    });

    // If my player is not in the players list yet, hide them
    if (this.myPlayerId && !this.players[this.myPlayerId]) {
      this.myPlayer.setVisible(false);
    }
  }

  update() {
    if (!this.ws || !this.myPlayer || !this.myPlayerId) return;

    // Only update position if this player exists in the server
    if (!this.players[this.myPlayerId]) return;

    const speed = 5;
    let moved = false;
    let newX = this.myPlayer.x;
    let newY = this.myPlayer.y;

    // Movement controls (WASD or Arrow keys)
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      newX -= speed;
      moved = true;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      newX += speed;
      moved = true;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      newY -= speed;
      moved = true;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      newY += speed;
      moved = true;
    }

    // Clamp position to game bounds
    newX = Phaser.Math.Clamp(newX, 25, 775);
    newY = Phaser.Math.Clamp(newY, 25, 575);

    // Update local position
    this.myPlayer.setPosition(newX, newY);

    // Send movement to server if moved
    if (moved) {
      this.ws.send(JSON.stringify({
        type: 'move',
        x: newX,
        y: newY
      }));
    }
  }
}
