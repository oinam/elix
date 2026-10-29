// `npm run dev` / `mise run dev`: Wrangler's local server, on 8787 if it's
// free, or else the next free port, so another project's server on 8787
// doesn't stop this one. Wrangler prints the address it ends up on.
//
//   npm run dev                  # 8787, 8788, … whichever is free first
//   npm run dev -- --port 9000   # a port of your own; no search
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIRST = 8787;
const args = process.argv.slice(2);

// Free on one address: we can listen there. A machine without IPv6 can't
// listen on ::1 at all, which doesn't count as taken.
const freeOn = (port, host) => new Promise((resolve) => {
  const server = createServer();
  server.once('error', (error) => resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT'));
  server.listen(port, host, () => server.close(() => resolve(true)));
});

// localhost can mean either address, so a port must be free on both.
const free = async (port) => (await freeOn(port, '127.0.0.1')) && (await freeOn(port, '::1'));

if (!args.some((a) => a === '--port' || a.startsWith('--port='))) {
  let port = FIRST;
  while (!(await free(port))) port++;
  if (port !== FIRST) console.log(`Port ${FIRST} is busy, so ELIx is on ${port}.`);
  args.push('--port', String(port));
}

const wrangler = spawn(join(ROOT, 'node_modules', '.bin', 'wrangler'), ['dev', ...args], { cwd: ROOT, stdio: 'inherit' });
wrangler.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));
// Ctrl-C reaches Wrangler on its own; wait for it to shut down. A kill
// meant for this script is passed on.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => wrangler.kill('SIGTERM'));
