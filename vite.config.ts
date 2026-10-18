import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

// Quallenkino für webOS: relative Pfade (die App läuft per file:// aus dem IPK),
// Ziel Chromium der webOS-Versionen ab 6 (webOS 23 hat einen deutlich neueren)
/**
 * webOS lädt die App über file:// – dort blockiert Chromium <script type="module">. Deshalb ein
 * klassisches Skript (IIFE) ohne crossorigin.
 */
const classicScript = {
  name: 'qk-classic-script',
  enforce: 'post' as const,
  transformIndexHtml(html: string) {
    return html
      .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
      .replace(/ crossorigin/g, '')
  },
}

export default defineConfig({
  base: './',
  plugins: [preact(), classicScript],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'chrome79',
    outDir: 'dist',
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
  test: {
    environment: 'node',
  },
})
