import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync } from 'node:fs'
import { flexGapFallback } from './src/platform/flexGap'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
// Samsung Tizen 5.5 (2020) hat Chromium 69, webOS ab 6 Chromium 79
const tizen = process.env.VITE_PLATFORM === 'tizen'

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

const tizenFlexGap = {
  name: 'qk-tizen-flex-gap',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    return id.endsWith('.css') ? flexGapFallback(code) : null
  },
}

export default defineConfig({
  base: './',
  plugins: [preact(), classicScript, tizenFlexGap],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: tizen ? 'chrome69' : 'chrome79',
    // Tizen: CSS als eigene Datei (nicht per Skript eingebettet) – übersteht auch eine strenge style-src-Richtlinie
    cssCodeSplit: !tizen,
    outDir: tizen ? 'dist-tizen' : 'dist',
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife' },
    },
  },
  test: {
    environment: 'node',
  },
})
