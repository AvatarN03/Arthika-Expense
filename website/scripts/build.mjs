import { copyFile, cp, mkdir } from 'node:fs/promises';

// An explicit file list keeps app source, scripts, and documentation out of hosting.
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await mkdir(new URL('src/', output), { recursive: true });
for (const file of ['index.html', 'src/styles.css', 'src/main.js']) {
  await copyFile(new URL(file, root), new URL(file, output));
}
await cp(new URL('assets/', root), new URL('assets/', output), { recursive: true });
console.log('Website built in website/dist. No Expo files were read or changed.');
