import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const levels = {
  easy: Array.from({ length: 25 }, (_, i) => ({
    name: `Level ${i + 1}`,
    speed: 1.15 + i * 0.05,
    spawn: Math.max(1200 - i * 30, 520),
    target: 500 + i * 120,
    lanes: 3,
  })),
  medium: Array.from({ length: 25 }, (_, i) => ({
    name: `Level ${i + 1}`,
    speed: 1.55 + i * 0.07,
    spawn: Math.max(1050 - i * 25, 420),
    target: 800 + i * 180,
    lanes: 4,
  })),
  hard: Array.from({ length: 25 }, (_, i) => ({
    name: `Level ${i + 1}`,
    speed: 1.9 + i * 0.09,
    spawn: Math.max(900 - i * 20, 300),
    target: 1100 + i * 250,
    lanes: 5,
  })),
};

const busTypes = [
  { label: 'Mini', points: 10, width: 52, height: 30, color: '#ffd166' },
  { label: 'City', points: 20, width: 64, height: 34, color: '#06d6a0' },
  { label: 'Express', points: 35, width: 78, height: 36, color: '#118ab2' },
];

function App() {
  const [mode, setMode] = React.useState('menu');
  const [difficulty, setDifficulty] = React.useState('easy');
  const [levelIndex, setLevelIndex] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [best, setBest] = React.useState(() => Number(localStorage.getItem('bus-fever-best') || 0));
  const [buses, setBuses] = React.useState([]);
  const [cars, setCars] = React.useState([]);
  const [paused, setPaused] = React.useState(false);
  const [message, setMessage] = React.useState('Select a difficulty and start the rush.');
  const gameRef = React.useRef(null);
  const rafRef = React.useRef(0);
  const lastSpawnRef = React.useRef(0);
  const lastFrameRef = React.useRef(0);
  const lanePositions = React.useMemo(() => ({
    3: [120, 290, 460],
    4: [90, 210, 330, 450],
    5: [70, 165, 260, 355, 450],
  }), []);
  const level = levels[difficulty][levelIndex];

  React.useEffect(() => {
    localStorage.setItem('bus-fever-best', String(best));
  }, [best]);

  React.useEffect(() => {
    if (mode !== 'playing' || paused) return;
    const tick = (t) => {
      const dt = Math.min((t - (lastFrameRef.current || t)) / 16.67, 2.2);
      lastFrameRef.current = t;
      const spawnGap = level.spawn;
      if (t - lastSpawnRef.current > spawnGap) {
        lastSpawnRef.current = t;
        const laneCount = level.lanes;
        const lane = Math.floor(Math.random() * laneCount);
        const type = busTypes[Math.floor(Math.random() * busTypes.length)];
        setBuses((prev) => [...prev, {
          id: crypto.randomUUID(), lane, x: -100, y: lanePositions[laneCount][lane],
          w: type.width, h: type.height, speed: level.speed * (0.9 + Math.random() * 0.5),
          points: type.points, color: type.color, label: type.label,
        }]);
      }
      setBuses((prev) => prev.map(b => ({ ...b, x: b.x + b.speed * 3.1 * dt })).filter(b => b.x < 900));
      setCars((prev) => prev.map(c => ({ ...c, x: c.x + c.speed * dt })).filter(c => c.x < 900));
      setScore((s) => s);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, paused, level, lanePositions]);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (mode !== 'playing' || paused) return;
      setCars((prev) => [...prev, { id: crypto.randomUUID(), x: -120, y: 520, speed: 4.4 + Math.random() * 2.8 }]);
    }, 1200);
    return () => clearInterval(id);
  }, [mode, paused]);

  React.useEffect(() => {
    if (mode !== 'playing') return;
    const hit = setInterval(() => {
      setBuses((prev) => {
        let removed = 0;
        const remaining = prev.filter(bus => {
          const crash = cars.some(car => Math.abs(car.x - bus.x) < 52 && Math.abs(car.y - bus.y) < 42);
          if (crash) { removed += 1; return false; }
          return true;
        });
        if (removed) {
          setLives(v => {
            const next = Math.max(0, v - removed);
            if (next === 0) endGame('Traffic chaos. Game over.');
            return next;
          });
          setMessage(removed > 1 ? `Multiple collisions! -${removed} life` : 'Collision! Avoid the lane jam.');
        }
        return remaining;
      });
    }, 120);
    return () => clearInterval(hit);
  }, [mode, cars]);

  function startGame(diff) {
    setDifficulty(diff);
    setLevelIndex(0);
    setScore(0);
    setLives(3);
    setBuses([]);
    setCars([]);
    setPaused(false);
    setMessage(`Running ${diff} mode. Finish Level 1 to unlock the next.`);
    lastSpawnRef.current = performance.now();
    lastFrameRef.current = performance.now();
    setMode('playing');
  }

  function endGame(msg) {
    setMode('menu');
    setPaused(false);
    setMessage(msg);
    setBest((b) => Math.max(b, score));
  }

  function levelUp() {
    const gained = level.target;
    const nextScore = score + gained;
    setScore(nextScore);
    setBuses([]);
    setCars([]);
    if (nextScore > best) setBest(nextScore);
    if (levelIndex >= 24) {
      setMessage(`You cleared all 25 levels on ${difficulty}.`);
      endGame('Victory. All routes cleared.');
    } else {
      setLevelIndex(i => i + 1);
      setMessage(`Level cleared. Next: ${levels[difficulty][levelIndex + 1].name}`);
      lastSpawnRef.current = performance.now();
    }
  }

  React.useEffect(() => {
    if (mode !== 'playing') return;
    const timer = setTimeout(() => {
      if (buses.length > 8 + levelIndex / 3) levelUp();
    }, 2600);
    return () => clearTimeout(timer);
  }, [buses, levelIndex, mode]);

  return <div className="app">
    <header><h1>Bus Traffic Fever</h1><p>Keep buses moving, dodge traffic, and clear 25 levels on each difficulty.</p></header>
    {mode === 'menu' ? <section className="menu">
      <button onClick={() => startGame('easy')}>Easy</button>
      <button onClick={() => startGame('medium')}>Medium</button>
      <button onClick={() => startGame('hard')}>Hard</button>
    </section> : <section className="hud">
      <div>Difficulty: {difficulty}</div><div>{level.name}</div><div>Score: {score}</div><div>Best: {best}</div><div>Lives: {lives}</div>
      <button onClick={() => setPaused(p => !p)}>{paused ? 'Resume' : 'Pause'}</button>
      <button onClick={() => endGame('Back to menu.')}>Exit</button>
    </section>}
    <p className="message">{message}</p>
    <main ref={gameRef} className="road">
      {[...Array(level.lanes)].map((_, i) => <div key={i} className="lane" style={{ top: lanePositions[level.lanes][i] }} />)}
      {buses.map(bus => <div key={bus.id} className="bus" style={{ left: bus.x, top: bus.y, width: bus.w, height: bus.h, background: bus.color }}><span>{bus.label}</span></div>)}
      {cars.map(car => <div key={car.id} className="car" style={{ left: car.x, top: car.y }} />)}
    </main>
    <footer>Progressive difficulty, 25 levels, and simple arcade scoring.</footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
