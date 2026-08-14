/** dsh-kit client bundle config (mirrors the official preset, minimal). */
import { defineConfig } from 'tsdown'

const ID = 'dsh-kit'

export default defineConfig(({ env }) => ({
  // Host pass (the tsc build in package.json emits lib/*.js already); the
  // dev-web tooling only needs the browser bundle. Keep it self-contained for
  // this standalone repo.
  name: `${ID}/client`,
  entry: env?.DSH_BUILD_FACE === 'host' ? '' : { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  clean: false,
  sourcemap: true,
  // react and cordis services are provided by the loader's module table at
  // runtime — never bundled.
  external: ['react', /^@deepseek-ai\//],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}))
