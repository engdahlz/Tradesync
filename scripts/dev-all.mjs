import { spawn } from 'child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const project = process.env.FIREBASE_PROJECT || 'tradesync-ai-prod';
const emulators = process.env.FIREBASE_EMULATORS || 'functions:default';
const host = process.env.VITE_HOST || '0.0.0.0';
const port = process.env.VITE_PORT || '5173';

let shuttingDown = false;
const children = [];

function spawnProcess(label, command, args) {
  const child = spawn(command, args, { stdio: 'inherit' });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev:all] ${label} exited (code=${code ?? 'null'} signal=${signal ?? 'null'}). Shutting down...`);
    shutdown(typeof code === 'number' ? code : 0);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(code);
  }, 4000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev:all] Starting Vite + Functions emulator...');
console.log(`[dev:all] Vite: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
console.log(`[dev:all] Firebase project: ${project} (emulators: ${emulators})`);

spawnProcess('vite', npmCmd, ['run', 'dev', '--', '--host', host, '--port', port]);
spawnProcess('functions', npxCmd, ['firebase-tools', 'emulators:start', '--only', emulators, '--project', project]);
