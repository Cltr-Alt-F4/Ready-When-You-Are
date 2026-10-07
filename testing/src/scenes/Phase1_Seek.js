import { network } from '../NetworkManager.js';

export class Phase1_Seek extends Phaser.Scene {
    constructor() {
        super('Phase1_Seek');
    }

    create(data) {
        const { width, height } = this.scale;
        this.hiddenItems = data.hiddenItems || [];
        this.timeLimit = data.timeLimit || 120;
        this.itemsFound = 0;
        this.itemsToFind = 3;
        this.digCooldown = 3000; // 3 seconds
        this.canDig = true;

        // Background - same map as hide phase but different perspective
        this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f1a);

        // Recreate map with hiding spots (without showing which have items)
        this.generateMap();

        // UI
        this.createUI();

        // Timer
        this.startTimer();
    }

    generateMap() {
        const spotPositions = [
            { x: 100, y: 100 }, { x: 300, y: 150 }, { x: 500, y: 100 },
            { x: 700, y: 150 }, { x: 900, y: 100 }, { x: 1100, y: 150 },
            { x: 150, y: 300 }, { x: 350, y: 350 }, { x: 550, y: 300 },
            { x: 750, y: 350 }, { x: 950, y: 300 }, { x: 1150, y: 350 },
            { x: 100, y: 500 }, { x: 300, y: 550 }, { x: 500, y: 500 },
            { x: 700, y: 550 }, { x: 900, y: 500 }, { x: 1100, y: 550 }
        ];

        spotPositions.forEach((pos, index) => {
            const spot = this.add.rectangle(pos.x, pos.y, 50, 50, 0x2d2d3e)
                .setStrokeStyle(2, 0x3d3d4e)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.handleDig(spot, index));

            spot.setData('id', index);
            spot.setData('dug', false);

            // Shovel icon
            this.add.text(pos.x, pos.y, '⛏', {
                fontSize: '24px'
            }).setOrigin(0.5);
        });
    }

    handleDig(spot, index) {
        if (!this.canDig || spot.getData('dug')) return;

        this.canDig = false;
        spot.setData('dug', true);

        // Check if this spot has an item
        const hasItem = this.hiddenItems.some(item => item.id === index);

        if (hasItem) {
            spot.setFillStyle(0x4ade80); // Green for found
            this.itemsFound++;
            this.showFloatingText(spot.x, spot.y, 'FOUND!', '#4ade80');
        } else {
            spot.setFillStyle(0x6b6b7a); // Gray for empty
            this.showFloatingText(spot.x, spot.y, 'Empty', '#6b6b7a');
        }

        this.updateUI();

        // Check win condition
        if (this.itemsFound >= this.itemsToFind) {
            this.time.delayedCall(1500, () => {
                this.phase1Complete(true);
            });
            return;
        }

        // Cooldown visual
        this.showCooldown();

        // Reset dig after cooldown
        this.time.delayedCall(this.digCooldown, () => {
            this.canDig = true;
        });
    }

    showFloatingText(x, y, text, color) {
        const floatText = this.add.text(x, y - 30, text, {
            fontSize: '20px',
            color: color,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: floatText,
            y: y - 80,
            alpha: 0,
            duration: 1000,
            onComplete: () => floatText.destroy()
        });
    }

    showCooldown() {
        const { width, height } = this.scale;
        const cooldownBar = this.add.rectangle(width / 2, height - 100, 200, 20, 0x333333);
        const fillBar = this.add.rectangle(width / 2 - 100, height - 100, 200, 20, 0xe94560)
            .setOrigin(0, 0.5);

        this.tweens.add({
            targets: fillBar,
            width: 0,
            duration: this.digCooldown,
            onComplete: () => {
                cooldownBar.destroy();
                fillBar.destroy();
            }
        });
    }

    createUI() {
        const { width } = this.scale;

        // Timer
        this.timerText = this.add.text(width / 2, 30, `Time: ${this.timeLimit}s`, {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#16213e',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Items found counter
        this.itemsText = this.add.text(width / 2, 70, `Items Found: ${this.itemsFound}/${this.itemsToFind}`, {
            fontSize: '24px',
            color: '#ffd700'
        }).setOrigin(0.5);

        // Dig cooldown indicator
        this.cooldownText = this.add.text(width - 100, 30, 'Ready', {
            fontSize: '20px',
            color: '#4ade80'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(width / 2, this.scale.height - 30, 'Click spots to dig (3s cooldown)', {
            fontSize: '18px',
            color: '#a0a0a0'
        }).setOrigin(0.5);
    }

    updateUI() {
        this.itemsText.setText(`Items Found: ${this.itemsFound}/${this.itemsToFind}`);
    }

    startTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLimit--;
                this.timerText.setText(`Time: ${this.timeLimit}s`);

                if (this.timeLimit <= 0) {
                    this.phase1Complete(false);
                }
            },
            loop: true
        });
    }

    phase1Complete(won) {
        this.timerEvent.remove();

        // Send result to server
        network.send({
            type: 'phase1_seek_complete',
            itemsFound: this.itemsFound,
            won: won
        });

        // Wait for server to determine phase 2 roles
        network.on('start_phase2', (data) => {
            this.scene.start('Phase2', { role: data.role, itemsFound: this.itemsFound });
        });
    }
}
