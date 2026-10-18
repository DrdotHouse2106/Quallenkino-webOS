// Version aus package.json in appinfo.json übernehmen (eine Quelle für die Versionsnummer)
import { readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const path = 'dist/appinfo.json'
const info = JSON.parse(readFileSync(path, 'utf8'))
info.version = pkg.version
writeFileSync(path, JSON.stringify(info, null, 2) + '\n')
console.log(`appinfo.json: Version ${pkg.version}`)
