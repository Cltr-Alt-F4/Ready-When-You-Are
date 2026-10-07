import { Lobby } from './scenes/Lobby.js';
import { Phase1_Hide } from './scenes/Phase1_Hide.js';
import { Phase1_Seek } from './scenes/Phase1_Seek.js';
import { Phase2 } from './scenes/Phase2.js';
import { GameOver } from './scenes/GameOver.js';

const config = {
    type: Phaser.AUTO,
    title: 'Ready When You Are',
    description: 'Asymmetric Horror Multiplayer Game',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#0a0a0a',
    pixelArt: true,
    scene: [
        Lobby,
        Phase1_Hide,
        Phase1_Seek,
        Phase2,
        GameOver
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
}

new Phaser.Game(config);
            