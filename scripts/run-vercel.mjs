import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Expected dev, build or start.');
const cli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const result = spawnSync(process.execPath, [cli, command, ...(command === 'build' ? [] : ['-p', '3000']), ...args], {
  stdio: 'inherit',
  env: { ...process.env, CO_RUNTIME: 'vercel' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
