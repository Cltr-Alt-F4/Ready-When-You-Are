import { network } from '../NetworkManager.js';

export class Lobby extends Phaser.Scene {
    constructor() {
        super('Lobby');
    }

    async create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, height / 4, 'READY WHEN YOU ARE', {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#e94560',
            stroke: '#16213e',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height / 4 + 80, 'Asymmetric Horror Multiplayer', {
            fontSize: '24px',
            color: '#a0a0a0'
        }).setOrigin(0.5);

        // Connection status
        this.statusText = this.add.text(width / 2, height / 2, 'Connecting to server...', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Player count
        this.playerCount = this.add.text(width / 2, height / 2 + 50, 'Players: 0/2', {
            fontSize: '24px',
            color: '#ffd700'
        }).setOrigin(0.5);

        // Ready button
        this.readyButton = this.add.text(width / 2, height * 0.75, 'READY', {
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#666666',
            backgroundColor: '#333333',
            padding: { x: 40, y: 20 }
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (!this.isReady) {
                this.setReady(true);
            }
        });

        this.isReady = false;

        // Instructions
        this.add.text(width / 2, height - 50, 'Phase 1: Hide & Seek | Phase 2: Hunt or be Hunted', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);

        // Connect to WebSocket server
        try {
            await network.connect('ws://localhost:3000');
            this.statusText.setText('Connected! Waiting for players...');
            this.setupNetworkHandlers();
        } catch (error) {
            this.statusText.setText('Connection failed. Using offline mode.');
            console.error('WebSocket connection failed:', error);
            this.setupOfflineMode();
        }
    }

    setupNetworkHandlers() {
        // Handle player count updates
        network.on('player_count', (data) => {
            this.playerCount.setText(`Players: ${data.count}/2`);
            if (data.count >= 2) {
                this.statusText.setText('Ready to start!');
                this.readyButton.setStyle({ color: '#ffffff', backgroundColor: '#4ade80' });
            }
        });

        // Handle game start
        network.on('start_phase1_hide', () => {
            this.scene.start('Phase1_Hide', { playerRole: 'hider' });
        });
    }

    setupOfflineMode() {
        // Fallback to single-player mode for testing
        this.time.delayedCall(2000, () => {
            this.playerCount.setText('Players: 1/2 (Offline)');
            this.statusText.setText('Offline mode - single player');
            this.readyButton.setStyle({ color: '#ffffff', backgroundColor: '#e94560' });
            this.readyButton.setText('START');
        });

        this.readyButton.on('pointerdown', () => {
            this.scene.start('Phase1_Hide', { playerRole: 'hider' });
        });
    }

    setReady(ready) {
        this.isReady = ready;
        network.send({ type: 'ready', ready: ready });
        this.readyButton.setText(ready ? 'READY!' : 'READY');
        this.readyButton.setStyle({ color: ready ? '#4ade80' : '#ffffff' });
    }
}
