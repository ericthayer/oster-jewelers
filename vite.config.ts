import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
// Build helpers run in Node, not in the browser application.
import { prepareData, TOKEN_FILE } from './tools/lib/build-data.mjs';

const root = import.meta.dirname;
// Every folder under concepts/ with an index.html is a concept Home page.
const concepts = readdirSync(join(root, 'concepts'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(root, 'concepts', entry.name, 'index.html')))
  .map(entry => `concepts/${entry.name}/index.html`).sort();
const pages = ['index.html', 'concepts/index.html', ...concepts, 'brandkit/index.html'];

function projectData(): Plugin {
  return {
    name: 'project-data',
    buildStart() { prepareData(); },
    configureServer(server) {
      prepareData();
      server.watcher.add(TOKEN_FILE);
    },
    handleHotUpdate({ file, server, timestamp }) {
      if (file !== TOKEN_FILE) return;
      prepareData();
      for (const generated of ['tokens.css', 'icons.ts']) {
        for (const module of server.moduleGraph.getModulesByFile(join(root, 'src/generated', generated)) || []) {
          server.moduleGraph.invalidateModule(module, undefined, timestamp, true);
        }
      }
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [projectData()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, open: '/concepts/' },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    outDir: 'dist',
    rolldownOptions: { input: pages.map(page => resolve(root, page)) },
  },
});