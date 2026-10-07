import { network } from '../NetworkManager.js';

export class Phase1_Hide extends Phaser.Scene {
    constructor() {
        super('Phase1_Hide');
    }

    create(data) {
        const { width, height } = this.scale;
        this.playerRole = data.playerRole || 'hider';

        // Game state
        this.itemsToHide = 3;
        this.itemsHidden = 0;
        this.timeLimit = 90; // 1:30 minutes
        this.hidingSpots = [];
        this.selectedItems = [];

        // Background - dark forest theme
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Generate map with hiding spots
        this.generateMap();

        // UI
        this.createUI();

        // Timer
        this.startTimer();
    }

    generateMap() {
        const { width, height } = this.scale;
        const tileSize = 64;
        const cols = Math.floor(width / tileSize);
        const rows = Math.floor(height / tileSize);

        // Create grid of hiding spots
        const spotPositions = [
            { x: 100, y: 100 }, { x: 300, y: 150 }, { x: 500, y: 100 },
            { x: 700, y: 150 }, { x: 900, y: 100 }, { x: 1100, y: 150 },
            { x: 150, y: 300 }, { x: 350, y: 350 }, { x: 550, y: 300 },
            { x: 750, y: 350 }, { x: 950, y: 300 }, { x: 1150, y: 350 },
            { x: 100, y: 500 }, { x: 300, y: 550 }, { x: 500, y: 500 },
            { x: 700, y: 550 }, { x: 900, y: 500 }, { x: 1100, y: 550 }
        ];

        spotPositions.forEach((pos, index) => {
            const spot = this.add.rectangle(pos.x, pos.y, 50, 50, 0x2d4a3e)
                .setStrokeStyle(2, 0x4a7c59)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.handleSpotClick(spot, index));

            spot.setData('id', index);
            spot.setData('hasItem', false);
            this.hidingSpots.push(spot);

            // Add visual indicator
            this.add.text(pos.x, pos.y, '?', {
                fontSize: '24px',
                color: '#4a7c59'
            }).setOrigin(0.5);
        });
    }

    handleSpotClick(spot, index) {
        if (this.itemsHidden >= this.itemsToHide) return;
        if (spot.getData('hasItem')) {
            // Remove item from this spot
            spot.setData('hasItem', false);
            spot.setFillStyle(0x2d4a3e);
            this.itemsHidden--;
            this.updateUI();
            return;
        }

        // Place item in this spot
        spot.setData('hasItem', true);
        spot.setFillStyle(0xe94560);
        this.itemsHidden++;
        this.updateUI();

        if (this.itemsHidden >= this.itemsToHide) {
            this.time.delayedCall(1000, () => {
                this.transitionToSeek();
            });
        }
    }

    createUI() {
        const { width } = this.scale;

        // Timer display
        this.timerText = this.add.text(width / 2, 30, `Time: ${this.timeLimit}s`, {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#16213e',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Items counter
        this.itemsText = this.add.text(width / 2, 70, `Items Hidden: ${this.itemsHidden}/${this.itemsToHide}`, {
            fontSize: '24px',
            color: '#ffd700'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(width / 2, this.scale.height - 30, 'Click hiding spots to place your 3 items', {
            fontSize: '18px',
            color: '#a0a0a0'
        }).setOrigin(0.5);
    }

    updateUI() {
        this.itemsText.setText(`Items Hidden: ${this.itemsHidden}/${this.itemsToHide}`);
    }

    startTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLimit--;
                this.timerText.setText(`Time: ${this.timeLimit}s`);

                if (this.timeLimit <= 0) {
                    this.transitionToSeek();
                }
            },
            loop: true
        });
    }

    transitionToSeek() {
        this.timerEvent.remove();
        // Collect hidden item positions for the seeker phase
        const hiddenItemPositions = this.hidingSpots
            .filter(spot => spot.getData('hasItem'))
            .map(spot => ({ x: spot.x, y: spot.y, id: spot.getData('id') }));

        // Send to server
        network.send({
            type: 'phase1_hide_complete',
            hiddenItems: hiddenItemPositions
        });

        // Wait for opponent's data (handled by network)
        network.on('start_phase1_seek', (data) => {
            this.scene.start('Phase1_Seek', {
                hiddenItems: data.hiddenItems,
                timeLimit: 120
            });
        });
    }
}
