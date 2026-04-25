/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.4;
const JUMP_STRENGTH = -7;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_RATE = 1500; // ms
const PIPE_GAP = 160;
const BIRD_SIZE = 30;

type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game Refs (to avoid re-renders during loop)
  const birdY = useRef(CANVAS_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const lastPipeTime = useRef(0);
  const frameId = useRef<number>(0);
  const bgX = useRef(0);

  // Initialize High Score
  useEffect(() => {
    const saved = localStorage.getItem('neon_flappy_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const spawnPipe = useCallback(() => {
    const minHeight = 50;
    const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    pipes.current.push({ x: CANVAS_WIDTH, topHeight, passed: false });
  }, []);

  const resetGame = () => {
    birdY.current = CANVAS_HEIGHT / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    lastPipeTime.current = performance.now();
    setScore(0);
    setGameState('PLAYING');
  };

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameState === 'START' || gameState === 'GAMEOVER') {
      resetGame();
    }
  }, [gameState]);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') jump();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Main Game Loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      // Clear Canvas
      ctx.fillStyle = '#0a051a'; // Deep space purple
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background Parallax
      bgX.current = (bgX.current - 0.5) % CANVAS_WIDTH;
      ctx.strokeStyle = '#1e1b4b';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
          ctx.moveTo(x + bgX.current + (i * CANVAS_WIDTH), CANVAS_HEIGHT);
          ctx.lineTo(x + bgX.current + (i * CANVAS_WIDTH), CANVAS_HEIGHT - 100);
        }
        ctx.stroke();
      }

      if (gameState === 'PLAYING') {
        // Physics
        birdVelocity.current += GRAVITY;
        birdY.current += birdVelocity.current;

        // Pipe Spawn
        if (time - lastPipeTime.current > PIPE_SPAWN_RATE) {
          spawnPipe();
          lastPipeTime.current = time;
        }

        // Pipe Movement & Collision
        pipes.current.forEach((pipe, index) => {
          pipe.x -= PIPE_SPEED;

          // Score detection
          if (!pipe.passed && pipe.x < CANVAS_WIDTH / 4 - BIRD_SIZE) {
            pipe.passed = true;
            setScore(s => s + 1);
          }

          // Collision detection
          const birdX = CANVAS_WIDTH / 4;
          const hitPipe = (
            birdX + BIRD_SIZE > pipe.x && 
            birdX < pipe.x + 60 && 
            (birdY.current < pipe.topHeight || birdY.current + BIRD_SIZE > pipe.topHeight + PIPE_GAP)
          );

          if (hitPipe || birdY.current < 0 || birdY.current + BIRD_SIZE > CANVAS_HEIGHT) {
            setGameState('GAMEOVER');
          }
        });

        // Cleanup old pipes
        pipes.current = pipes.current.filter(p => p.x > -100);
      }

      // Draw Pipes
      pipes.current.forEach(pipe => {
        const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + 60, 0);
        gradient.addColorStop(0, '#ff0080'); // Hot pink
        gradient.addColorStop(1, '#7928ca'); // Purple
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0080';
        
        // Top Pipe
        ctx.fillRect(pipe.x, 0, 60, pipe.topHeight);
        // Bottom Pipe
        ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, 60, CANVAS_HEIGHT - (pipe.topHeight + PIPE_GAP));
        
        ctx.shadowBlur = 0;
      });

      // Draw Bird
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 4 + BIRD_SIZE / 2, birdY.current + BIRD_SIZE / 2);
      ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.1)));
      
      // Bird Body (Glow)
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f2ff'; // Cyan glow
      ctx.fillStyle = '#00f2ff';
      ctx.beginPath();
      ctx.roundRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE, 8);
      ctx.fill();
      
      // Bird Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(4, -8, 6, 6);
      
      ctx.restore();

      frameId.current = requestAnimationFrame(loop);
    };

    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState, spawnPipe]);

  // Update High Score
  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('neon_flappy_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return (
    <div className="min-h-screen bg-[#02010a] flex items-center justify-center p-4 font-sans overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff0080] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00f2ff] blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-[400px] aspect-[2/3] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-[#1e1b4b]">
        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          className="w-full h-full cursor-pointer"
          id="game-canvas"
        />

        {/* HUD: Score */}
        {gameState !== 'START' && (
          <div className="absolute top-8 left-0 w-full text-center pointer-events-none" id="hud-score">
            <span className="text-5xl font-black text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              {score}
            </span>
          </div>
        )}

        {/* UI Overlay */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
              id="start-screen"
            >
              <Zap className="w-16 h-16 text-[#00f2ff] mb-4 animate-pulse" />
              <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter uppercase underline decoration-[#ff0080] decoration-4 underline-offset-8">
                NEON FLIGHT FLAPPY
              </h1>
              <p className="text-[#00f2ff]/60 text-sm mb-8 uppercase tracking-widest font-bold">
                Jump through the neon grid
              </p>
              
              <button
                onClick={resetGame}
                className="group relative px-8 py-3 bg-[#00f2ff] text-black font-black uppercase tracking-wider rounded-xl transition-transform active:scale-95"
                id="btn-play"
              >
                <div className="absolute inset-0 bg-[#00f2ff] blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <Play className="fill-black" size={20} /> Start Game
                </span>
              </button>
              
              <div className="mt-12 flex items-center gap-2 text-[#ff0080]/80">
                <Trophy size={20} />
                <span className="text-sm font-bold uppercase tracking-tighter">High Score: {highScore}</span>
              </div>
              
              <p className="mt-8 text-white/30 text-xs uppercase font-bold">Press SPACE or TAP to jump</p>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
              id="game-over-screen"
            >
              <h1 className="text-6xl font-black text-[#ff0080] mb-2 italic tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(255,0,128,0.5)]">
                CRASHED
              </h1>
              
              <div className="bg-[#1e1b4b]/30 p-6 rounded-3xl border border-[#ff0080]/30 mb-8 w-full">
                <div className="flex flex-col gap-1 mb-4">
                  <span className="text-[#00f2ff] text-xs font-black uppercase tracking-widest">Score</span>
                  <span className="text-4xl font-black text-white">{score}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#ff0080] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1">
                    <Trophy size={12} /> Record
                  </span>
                  <span className="text-2xl font-black text-white/80">{highScore}</span>
                </div>
              </div>

              <button
                onClick={resetGame}
                className="group relative px-10 py-4 bg-[#ff0080] text-white font-black uppercase tracking-wider rounded-xl transition-transform active:scale-95"
                id="btn-restart"
              >
                <div className="absolute inset-0 bg-[#ff0080] blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <RotateCcw size={20} /> Try Again
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
