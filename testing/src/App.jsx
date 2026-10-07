import { useState } from 'react';
import Game from './Game';

function App() {
  const [connected, setConnected] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [roomFull, setRoomFull] = useState(false);
  const [roomId, setRoomId] = useState(null);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a2e',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        marginBottom: '20px',
        padding: '15px 30px',
        backgroundColor: '#2d4a3e',
        borderRadius: '8px',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '10px' }}>
          Status: <span style={{ 
            color: connected ? '#4ade80' : '#e94560',
            fontWeight: 'bold'
          }}>
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        {connected && roomId && (
          <div style={{ marginBottom: '10px' }}>
            Room: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{roomId}</span>
          </div>
        )}
        {connected && (
          <div>
            Players: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{playerCount}</span>/2
            {playerCount < 2 && (
              <div style={{ fontSize: '14px', marginTop: '5px', color: '#fbbf24' }}>
                Waiting for another player...
              </div>
            )}
          </div>
        )}
      </div>

      {roomFull ? (
        <div style={{
          padding: '40px',
          backgroundColor: '#e94560',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Room Full</h2>
          <p>The game room is already full (2 players).</p>
          <p>Please try again later.</p>
        </div>
      ) : (
        <>
          <Game 
            onConnectionChange={setConnected}
            onPlayerCountChange={setPlayerCount}
            onRoomFull={setRoomFull}
            onRoomChange={setRoomId}
          />
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
            Controls: WASD or Arrow Keys to move
          </div>
        </>
      )}
    </div>
  );
}

export default App;
