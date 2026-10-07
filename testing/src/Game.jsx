import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from './phaser/GameScene';

function Game({ onConnectionChange, onPlayerCountChange, onRoomFull, onRoomChange }) {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      backgroundColor: '#0a0a0a',
      pixelArt: true,
      scene: [GameScene],
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
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Pass callbacks to the scene
    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene');
      if (scene) {
        scene.onConnectionChange = onConnectionChange;
        scene.onPlayerCountChange = onPlayerCountChange;
        scene.onRoomFull = onRoomFull;
        scene.onRoomChange = onRoomChange;
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [onConnectionChange, onPlayerCountChange, onRoomFull, onRoomChange]);

  return (
    <div 
      id="game-container" 
      style={{
        width: '800px',
        height: '600px',
        border: '3px solid #4a4a5a',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    ></div>
  );
}

export default Game;
