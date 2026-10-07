import { network } from '../NetworkManager.js';

export class Phase2 extends Phaser.Scene {
    constructor() {
        super('Phase2');
    }

    create(data) {
        const { width, height } = this.scale;
        this.role = data.role || 'hider';
        this.itemsFound = data.itemsFound || 0;

        // Game state
        this.shrines = [];
        this.shrinesPlaced = 0;
        this.shrinesNeeded = 3;
        this.gameTime = 0;
        this.lightningInterval = 5000; // 5 seconds
        this.lightningDuration = 2500; // 2.5 seconds
        this.isLightningActive = false;
        this.flashlightAngle = 0;
        this.flashlightRange = 192; // 3 tiles (64px each)

        // Player
        this.player = null;
        this.seeker = null;
        this.playerSpeed = 150;
        this.runCooldown = 3000;
        this.canRun = true;

        // Power-ups
        this.powerUps = {
            rubberShoes: false,
            snowball: false,
            alarm: false,
            dummy: false
        };
        this.powerUpCooldowns = {
            snowball: 5000,
            alarm: 10000,
            dummy: 8000
        };
        this.canUsePowerUp = {
            snowball: true,
            alarm: true,
            dummy: true
        };

        // Background - night with rain
        this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

        // Rain effect
        this.createRain();

        // Generate map with shrines
        this.generateMap();

        // Spawn power-ups
        this.spawnPowerUps();

        // Create player
        this.createPlayer();

        // UI
        this.createUI();

        // Lightning system
        this.startLightningSystem();

        // Echolocation for seeker
        if (this.role === 'seeker') {
            this.setupEcholocation();
        }

        // Setup network handlers for multiplayer sync
        this.setupNetworkHandlers();
    }

    setupNetworkHandlers() {
        // Handle opponent position updates
        network.on('opponent_position', (data) => {
            if (this.role === 'seeker' && !this.seeker) {
                // Create opponent (hider) for seeker
                this.seeker = this.add.circle(data.x, data.y, 20, 0x4ade80);
            } else if (this.seeker) {
                // Update opponent position
                this.seeker.x = data.x;
                this.seeker.y = data.y;
            }
        });

        // Handle opponent power-up usage
        network.on('opponent_powerup', (data) => {
            this.showFloatingText(data.x, data.y, `${data.powerUp.toUpperCase()}!`, '#ef4444');
        });

        // Handle game over from server
        network.on('game_over', (data) => {
            this.lightningEvent.remove();
            this.scene.start('GameOver', { winner: data.winner });
        });
    }

    createRain() {
        const { width, height } = this.scale;

        // Create rain particles
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const rain = this.add.rectangle(x, y, 2, 15, 0x4a5568);

            this.tweens.add({
                targets: rain,
                y: height + 20,
                duration: Phaser.Math.Between(500, 1000),
                repeat: -1,
                onRepeat: () => {
                    rain.y = -20;
                    rain.x = Phaser.Math.Between(0, width);
                }
            });
        }
    }

    generateMap() {
        const { width, height } = this.scale;

        // Random shrine positions
        const shrinePositions = [];
        while (shrinePositions.length < 3) {
            const x = Phaser.Math.Between(100, width - 100);
            const y = Phaser.Math.Between(100, height - 100);

            // Check distance from other shrines
            const tooClose = shrinePositions.some(pos => {
                const dist = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
                return dist < 200;
            });

            if (!tooClose) {
                shrinePositions.push({ x, y });
            }
        }

        // Create shrines
        shrinePositions.forEach((pos, index) => {
            const shrine = this.add.rectangle(pos.x, pos.y, 60, 60, 0x6b21a8)
                .setStrokeStyle(3, 0xa855f7);

            this.add.text(pos.x, pos.y, '⛩', {
                fontSize: '32px'
            }).setOrigin(0.5);

            shrine.setData('id', index);
            shrine.setData('hasItem', false);
            shrine.setInteractive({ useHandCursor: true });

            if (this.role === 'hider') {
                shrine.on('pointerdown', () => this.placeItemAtShrine(shrine));
            }

            this.shrines.push(shrine);
        });
    }

    spawnPowerUps() {
        const { width, height } = this.scale;
        const powerUpTypes = ['rubberShoes', 'snowball', 'alarm', 'dummy'];
        const icons = {
            rubberShoes: '👟',
            snowball: '❄️',
            alarm: '🚨',
            dummy: '🎭'
        };
        const colors = {
            rubberShoes: 0xf59e0b,
            snowball: 0x60a5fa,
            alarm: 0xef4444,
            dummy: 0xa855f7
        };

        // Spawn 4 random power-ups
        for (let i = 0; i < 4; i++) {
            const type = powerUpTypes[i];
            const x = Phaser.Math.Between(100, width - 100);
            const y = Phaser.Math.Between(100, height - 100);

            const powerUp = this.add.circle(x, y, 25, colors[type])
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.collectPowerUp(powerUp, type));

            this.add.text(x, y, icons[type], {
                fontSize: '24px'
            }).setOrigin(0.5);

            // Floating animation
            this.tweens.add({
                targets: powerUp,
                y: y - 10,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut'
            });
        }
    }

    collectPowerUp(powerUp, type) {
        if (this.powerUps[type]) return; // Already collected

        this.powerUps[type] = true;
        powerUp.destroy();

        this.showFloatingText(powerUp.x, powerUp.y, `${type.toUpperCase()}!`, '#ffd700');
        this.updatePowerUpUI();
    }

    createPlayer() {
        const { width, height } = this.scale;

        if (this.role === 'hider') {
            // Hider with flashlight
            this.player = this.add.circle(width / 2, height / 2, 20, 0x4ade80);

            // Flashlight cone
            this.flashlight = this.add.graphics();
            this.updateFlashlight();

            // Controls
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-SPACE', () => this.useRun());
            this.input.keyboard.on('keydown-ONE', () => this.useSnowball());
            this.input.keyboard.on('keydown-TWO', () => this.useAlarm());
            this.input.keyboard.on('keydown-THREE', () => this.useDummy());
        } else {
            // Seeker (blind by default)
            this.player = this.add.circle(width / 2, height / 2, 20, 0xef4444);

            // Controls
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-E', () => this.useEcholocation());
            this.input.keyboard.on('keydown-ONE', () => this.useSnowball());
        }
    }

    updateFlashlight() {
        this.flashlight.clear();

        if (!this.player) return;

        const angle = this.flashlightAngle;
        const range = this.flashlightRange;
        const coneAngle = Math.PI / 4; // 45 degrees

        this.flashlight.fillStyle(0xffff00, 0.3);
        this.flashlight.beginPath();
        this.flashlight.moveTo(this.player.x, this.player.y);

        const startAngle = angle - coneAngle / 2;
        const endAngle = angle + coneAngle / 2;

        for (let a = startAngle; a <= endAngle; a += 0.1) {
            const x = this.player.x + Math.cos(a) * range;
            const y = this.player.y + Math.sin(a) * range;
            this.flashlight.lineTo(x, y);
        }

        this.flashlight.closePath();
        this.flashlight.fillPath();
    }

    update() {
        if (!this.player) return;

        const speed = this.canRun ? this.playerSpeed * 2 : this.playerSpeed;

        // Movement
        if (this.cursors.left.isDown) {
            this.player.x -= speed * 0.016;
            this.flashlightAngle = Math.PI;
        }
        if (this.cursors.right.isDown) {
            this.player.x += speed * 0.016;
            this.flashlightAngle = 0;
        }
        if (this.cursors.up.isDown) {
            this.player.y -= speed * 0.016;
            this.flashlightAngle = -Math.PI / 2;
        }
        if (this.cursors.down.isDown) {
            this.player.y += speed * 0.016;
            this.flashlightAngle = Math.PI / 2;
        }

        // Update flashlight for hider
        if (this.role === 'hider') {
            this.updateFlashlight();
        }

        // Boundary check
        this.player.x = Phaser.Math.Clamp(this.player.x, 20, this.scale.width - 20);
        this.player.y = Phaser.Math.Clamp(this.player.y, 20, this.scale.height - 20);

        // Send position to opponent
        network.send({
            type: 'phase2_update',
            x: this.player.x,
            y: this.player.y
        });

        // Check win/lose conditions
        this.checkGameEnd();
    }

    startLightningSystem() {
        this.lightningEvent = this.time.addEvent({
            delay: this.lightningInterval,
            callback: () => {
                this.triggerLightning();
            },
            loop: true
        });
    }

    triggerLightning() {
        this.isLightningActive = true;

        // Flash effect
        this.cameras.main.flash(500, 255, 255, 255);

        // During lightning, seeker can see hider
        if (this.role === 'seeker' && this.seeker) {
            this.seeker.setVisible(true);
        }

        // Speed boost during lightning
        this.playerSpeed = 250;

        this.time.delayedCall(this.lightningDuration, () => {
            this.isLightningActive = false;
            this.playerSpeed = 150;

            if (this.role === 'seeker' && this.seeker) {
                this.seeker.setVisible(false);
            }
        });
    }

    setupEcholocation() {
        this.echolocationCooldown = 8000; // 8 seconds
        this.canUseEcholocation = true;
    }

    useEcholocation() {
        if (!this.canUseEcholocation || this.role !== 'seeker') return;

        this.canUseEcholocation = false;

        // Show hider's approximate location
        if (this.seeker) {
            const indicator = this.add.circle(this.seeker.x, this.seeker.y, 50, 0xef4444, 0.5);
            this.tweens.add({
                targets: indicator,
                scale: 3,
                alpha: 0,
                duration: 2000,
                onComplete: () => indicator.destroy()
            });
        }

        this.time.delayedCall(this.echolocationCooldown, () => {
            this.canUseEcholocation = true;
        });
    }

    useRun() {
        if (!this.canRun) return;

        this.canRun = false;
        this.playerSpeed = 300;

        this.time.delayedCall(this.runCooldown, () => {
            this.canRun = true;
            this.playerSpeed = 150;
        });
    }

    useSnowball() {
        if (!this.canUsePowerUp.snowball || this.role === 'hider' && !this.powerUps.snowball) return;
        if (this.role === 'seeker' && !this.powerUps.snowball) return;

        this.canUsePowerUp.snowball = false;

        // Create snowball projectile
        const snowball = this.add.circle(this.player.x, this.player.y, 15, 0x60a5fa);

        // Direction towards opponent (simplified - throws forward)
        const targetX = this.player.x + (this.cursors.right.isDown ? 200 : this.cursors.left.isDown ? -200 : 0);
        const targetY = this.player.y + (this.cursors.down.isDown ? 200 : this.cursors.up.isDown ? -200 : 0);

        this.tweens.add({
            targets: snowball,
            x: targetX || this.player.x + 200,
            y: targetY || this.player.y,
            duration: 500,
            onComplete: () => {
                snowball.destroy();
                // In multiplayer, this would slow down the opponent
                this.showFloatingText(snowball.x, snowball.y, 'SLOW!', '#60a5fa');
                network.send({
                    type: 'phase2_powerup',
                    powerUp: 'snowball',
                    x: snowball.x,
                    y: snowball.y
                });
            }
        });

        this.time.delayedCall(this.powerUpCooldowns.snowball, () => {
            this.canUsePowerUp.snowball = true;
        });
    }

    useAlarm() {
        if (!this.canUsePowerUp.alarm || !this.powerUps.alarm) return;

        this.canUsePowerUp.alarm = false;

        // Alarm effect - reveals hider position temporarily
        const alarmRing = this.add.circle(this.player.x, this.player.y, 50, 0xef4444, 0.5);
        this.cameras.main.shake(500, 0.01);

        this.tweens.add({
            targets: alarmRing,
            scale: 5,
            alpha: 0,
            duration: 2000,
            onComplete: () => alarmRing.destroy()
        });

        this.showFloatingText(this.player.x, this.player.y - 50, 'ALARM!', '#ef4444');

        this.time.delayedCall(this.powerUpCooldowns.alarm, () => {
            this.canUsePowerUp.alarm = true;
        });
    }

    useDummy() {
        if (!this.canUsePowerUp.dummy || !this.powerUps.dummy) return;

        this.canUsePowerUp.dummy = false;

        // Create dummy at player position
        const dummy = this.add.circle(this.player.x, this.player.y, 20, 0xa855f7);
        this.add.text(this.player.x, this.player.y, '🎭', {
            fontSize: '24px'
        }).setOrigin(0.5);

        // Dummy lasts for 5 seconds then disappears
        this.time.delayedCall(5000, () => {
            dummy.destroy();
        });

        this.showFloatingText(this.player.x, this.player.y - 30, 'DUMMY!', '#a855f7');

        this.time.delayedCall(this.powerUpCooldowns.dummy, () => {
            this.canUsePowerUp.dummy = true;
        });
    }

    placeItemAtShrine(shrine) {
        if (this.shrinesPlaced >= this.shrinesNeeded) return;
        if (shrine.getData('hasItem')) return;

        shrine.setData('hasItem', true);
        shrine.setFillStyle(0x4ade80);
        this.shrinesPlaced++;

        this.updateUI();

        if (this.shrinesPlaced >= this.shrinesNeeded) {
            this.time.delayedCall(1500, () => {
                network.send({
                    type: 'phase2_win',
                    winner: 'hider'
                });
                this.scene.start('GameOver', { winner: 'hider' });
            });
        }
    }

    createUI() {
        const { width } = this.scale;

        // Role indicator
        this.add.text(width / 2, 30, this.role === 'hider' ? 'ROLE: HIDER' : 'ROLE: SEEKER', {
            fontSize: '28px',
            color: this.role === 'hider' ? '#4ade80' : '#ef4444',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        if (this.role === 'hider') {
            // Shrines placed counter
            this.shrinesText = this.add.text(width / 2, 70, `Shrines: ${this.shrinesPlaced}/${this.shrinesNeeded}`, {
                fontSize: '24px',
                color: '#ffd700'
            }).setOrigin(0.5);

            // Run cooldown
            this.runText = this.add.text(100, 30, 'RUN: Ready (SPACE)', {
                fontSize: '18px',
                color: '#4ade80'
            });

            // Power-up inventory
            this.powerUpText = this.add.text(width - 150, 30, 'Power-ups:', {
                fontSize: '16px',
                color: '#a0a0a0'
            });

            this.updatePowerUpUI();

            // Instructions
            this.add.text(width / 2, this.scale.height - 30, 'Place items at shrines to win | SPACE to run | 1: Snowball | 2: Alarm | 3: Dummy', {
                fontSize: '16px',
                color: '#a0a0a0'
            }).setOrigin(0.5);
        } else {
            // Echolocation cooldown
            this.echoText = this.add.text(100, 30, 'ECHO: Ready (E)', {
                fontSize: '18px',
                color: '#4ade80'
            });

            // Power-up inventory
            this.powerUpText = this.add.text(width - 150, 30, 'Power-ups:', {
                fontSize: '16px',
                color: '#a0a0a0'
            });

            this.updatePowerUpUI();

            // Instructions
            this.add.text(width / 2, this.scale.height - 30, 'Catch the hider to win | E for echolocation | 1: Snowball', {
                fontSize: '16px',
                color: '#a0a0a0'
            }).setOrigin(0.5);
        }
    }

    updatePowerUpUI() {
        if (!this.powerUpText) return;

        const icons = {
            rubberShoes: '👟',
            snowball: '❄️',
            alarm: '🚨',
            dummy: '🎭'
        };

        let powerUpString = '';
        Object.keys(this.powerUps).forEach(key => {
            if (this.powerUps[key]) {
                powerUpString += icons[key] + ' ';
            }
        });

        this.powerUpText.setText(`Power-ups: ${powerUpString || 'None'}`);
    }

    updateUI() {
        if (this.role === 'hider') {
            this.shrinesText.setText(`Shrines: ${this.shrinesPlaced}/${this.shrinesNeeded}`);
        }
    }

    checkGameEnd() {
        // Check if seeker caught hider (collision)
        if (this.role === 'seeker' && this.seeker) {
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                this.seeker.x, this.seeker.y
            );

            if (dist < 40) {
                this.lightningEvent.remove();
                network.send({
                    type: 'phase2_win',
                    winner: 'seeker'
                });
                this.scene.start('GameOver', { winner: 'seeker' });
            }
        }
    }
}
