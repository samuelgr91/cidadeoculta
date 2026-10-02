import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Expected dev, build or start.');
if (command === 'build' && process.env.NETLIFY) {
  rmSync(new URL('../.next/cache', import.meta.url), { recursive: true, force: true });
}
const cli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const result = spawnSync(process.execPath, [cli, command, ...args], {
  stdio: 'inherit',
  env: { ...process.env, CO_RUNTIME: 'node' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
