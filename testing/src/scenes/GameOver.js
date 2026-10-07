export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create(data) {
        const { width, height } = this.scale;
        this.winner = data.winner || 'unknown';

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Game Over text
        this.add.text(width / 2, height / 3, 'GAME OVER', {
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#e94560',
            stroke: '#16213e',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Winner announcement
        const winnerText = this.winner === 'hider' ? 'HIDER WINS!' : 'SEEKER WINS!';
        const winnerColor = this.winner === 'hider' ? '#4ade80' : '#ef4444';

        this.add.text(width / 2, height / 2, winnerText, {
            fontSize: '48px',
            fontStyle: 'bold',
            color: winnerColor
        }).setOrigin(0.5);

        // Play again button
        this.playAgainButton = this.add.text(width / 2, height * 0.65, 'PLAY AGAIN', {
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#e94560',
            padding: { x: 40, y: 20 }
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.start('Lobby');
        });

        // Return to lobby button
        this.lobbyButton = this.add.text(width / 2, height * 0.75, 'MAIN MENU', {
            fontSize: '28px',
            color: '#a0a0a0',
            backgroundColor: '#16213e',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.start('Lobby');
        });

        // Add some visual flair
        this.addParticles();
    }

    addParticles() {
        const { width, height } = this.scale;

        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const particle = this.add.circle(x, y, Phaser.Math.Between(2, 6), 0xe94560, 0.5);

            this.tweens.add({
                targets: particle,
                y: y - 100,
                alpha: 0,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1,
                onRepeat: () => {
                    particle.y = height + 10;
                    particle.x = Phaser.Math.Between(0, width);
                    particle.alpha = 0.5;
                }
            });
        }
    }
}
