// Samsung (Tizen): config.xml mit der Version aus package.json neben den Build legen und
// WebOS-Dateien entfernen. Das Signieren macht Tizen Studio bzw. die Tizen-Befehlszeile (README).
import { readFileSync, writeFileSync, rmSync, existsSync, copyFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const out = 'dist-tizen'
const config = readFileSync('tizen/config.xml', 'utf8').replace(/(<widget[^>]*\sversion=")[^"]*(")/, `$1${pkg.version}$2`)
writeFileSync(`${out}/config.xml`, config)
for (const file of ['appinfo.json', 'largeIcon.png', 'splash.png']) {
  if (existsSync(`${out}/${file}`)) rmSync(`${out}/${file}`)
}
// Samsung zeigt die Kachel sehr groß (bis ca. 500 px) – das 80-px-Symbol von webOS wäre verpixelt
copyFileSync('assets/quallenkino-icon-512.png', `${out}/icon.png`)
// Samsung-Geräte-APIs (webapis.avinfo für die HDR-Erkennung): Tizen löst $WEBAPIS selbst auf; vor dem App-Skript laden
const html = readFileSync(`${out}/index.html`, 'utf8')
// Tizen löst $WEBAPIS zu einer lokalen Datei des Fernsehers auf (file:) – die liegt nicht unter 'self', deshalb
// erlauben die Inhaltsrichtlinien (hier und in config.xml) zusätzlich Skripte von file:
let tizenHtml = html.replace("script-src 'self';", "script-src 'self' file:;")
if (!tizenHtml.includes('$WEBAPIS')) tizenHtml = tizenHtml.replace('<script', '<script src="$WEBAPIS/webapis/webapis.js"></script>\n    <script')
writeFileSync(`${out}/index.html`, tizenHtml)
console.log(`config.xml (Tizen): Version ${pkg.version}, Symbol 512 px`)
