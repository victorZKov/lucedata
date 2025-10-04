'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const progressPath = path.resolve(__dirname, 'progress.json');

function read() {
  return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
}

function write(obj) {
  obj.lastUpdated = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(obj, null, 2));
}

function status() {
  const p = read();
  console.log(`Feature: ${p.feature}`);
  console.log(`Current phase: ${p.currentPhase}`);
  p.phases.forEach(ph => {
    console.log(`${ph.id}: ${ph.name} - ${ph.status}`);
  });
}

function next() {
  const p = read();
  const cur = p.currentPhase;
  const phase = p.phases.find(x => x.id === cur);
  if (!phase) {
    console.error('No current phase found');
    process.exit(1);
  }
  if (phase.status !== 'in_progress' && phase.status !== 'pending') {
    console.error(`Current phase ${cur} is not in progress/pending`);
    process.exit(1);
  }
  phase.status = 'done';
  p.currentPhase = cur + 1;
  const nextPhase = p.phases.find(x => x.id === p.currentPhase);
  if (nextPhase) nextPhase.status = 'in_progress';
  write(p);
  console.log(`Advanced to phase ${p.currentPhase}`);
}

function help() {
  console.log('Usage: node controller.js <status|next|goto|reset>');
}

if (process.argv[1] && process.argv[1].endsWith('controller.js')) {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'status':
      status();
      break;
    case 'next':
      next();
      break;
    case 'reset': {
      fs.copyFileSync(path.resolve(__dirname, 'progress.json'), path.resolve(__dirname, 'progress.backup.json'));
      const p = read();
      p.phases.forEach(x => x.status = 'pending');
      p.phases[0].status = 'done';
      if (p.phases[1]) p.phases[1].status = 'in_progress';
      p.currentPhase = 1;
      write(p);
      console.log('reset to initial state');
      break;
    }
    case 'goto': {
      const id = parseInt(process.argv[3], 10);
      if (Number.isNaN(id)) { help(); break; }
      const p2 = read();
      if (!p2.phases.find(x => x.id === id)) { console.error('invalid id'); break; }
      p2.currentPhase = id;
      p2.phases.forEach(x => x.status = x.id < id ? 'done' : (x.id === id ? 'in_progress' : 'pending'));
      write(p2);
      console.log(`Moved to ${id}`);
      break;
    }
    default:
      help();
  }
}
