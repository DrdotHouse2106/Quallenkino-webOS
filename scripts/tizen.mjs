// Samsung (Tizen): config.xml mit der Version aus package.json neben den Build legen und
// WebOS-Dateien entfernen. Das Signieren macht Tizen Studio bzw. die Tizen-Befehlszeile (README).
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const out = 'dist-tizen'
const config = readFileSync('tizen/config.xml', 'utf8').replace(/(<widget[^>]*\sversion=")[^"]*(")/, `$1${pkg.version}$2`)
writeFileSync(`${out}/config.xml`, config)
for (const file of ['appinfo.json', 'largeIcon.png', 'splash.png']) {
  if (existsSync(`${out}/${file}`)) rmSync(`${out}/${file}`)
}
console.log(`config.xml (Tizen): Version ${pkg.version}`)
