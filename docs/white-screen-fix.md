# White screen fix

Tento dokument popisuje, proč Electron aplikace zobrazovala jen bílou obrazovku a jak byla opravená.

## Symptomy

- aplikace se spustila bez viditelného crash logu
- okno Electronu bylo bílé
- renderer se nenačetl správně při spuštění přes `npm run start`

## Hlavní příčiny

### 1. Vite build generoval absolutní cesty k assetům

V build výstupu v `dist/index.html` byly cesty ve tvaru:

- `/assets/...`
- `/favicon.svg`

To funguje ve webovém serveru, ale ne při načítání přes `file://` v Electronu. Výsledkem bylo, že produkční renderer nenačetl JavaScript ani CSS a okno zůstalo bílé.

### 2. Preload skript byl ve špatném formátu

Preload byl původně kompilovaný způsobem, který v Electron preload kontextu vedl k chybě typu:

- `Cannot use import statement outside a module`

To znamenalo, že bridge mezi main a renderer procesem nebyl spolehlivě načtený.

### 3. Electron chvíli mířil na nesprávné build cesty

Během stabilizace projektu bylo potřeba sjednotit:

- vstupní `main` soubor v `package.json`
- cestu k produkčnímu `index.html`
- cestu k preload souboru

## Co bylo opraveno

## Oprava 1: relativní asset cesty ve Vite

Ve [vite.config.ts](../vite.config.ts) bylo nastaveno:

```ts
base: './'
```

Díky tomu build generuje relativní odkazy:

- `./assets/...`
- `./favicon.svg`

To je správně pro Electron produkční načítání přes `file://`.

## Oprava 2: preload byl převeden na CommonJS výstup

Preload se nyní drží v souboru [electron/preload.cts](../electron/preload.cts), aby kompilace vytvořila CommonJS preload soubor `preload.cjs`.

V [electron/main.ts](../electron/main.ts) je pak preload načítaný takto:

```ts
preload: path.join(__dirname, 'preload.cjs')
```

To odstranilo problém s načítáním preload skriptu.

## Oprava 3: sjednocení produkčních cest

V [package.json](../package.json) byl opraven Electron entrypoint na:

- `dist-electron/electron/main.js`

V [electron/main.ts](../electron/main.ts) bylo upravené načítání rendereru na produkční `dist/index.html`.

## Aktuální očekávané chování

Po opravě:

- `npm run build` vytvoří správný produkční build
- `npm run start` otevře renderer bez bílé obrazovky
- preload bridge funguje pro `save/load` i nastavení overlay okna

## Pokud by se bílá obrazovka vrátila

Zkontrolovat v tomto pořadí:

1. že [vite.config.ts](../vite.config.ts) obsahuje `base: './'`
2. že [electron/main.ts](../electron/main.ts) používá `preload.cjs`
3. že [electron/preload.cts](../electron/preload.cts) existuje a builduje se do `dist-electron/electron/preload.cjs`
4. že [package.json](../package.json) ukazuje na `dist-electron/electron/main.js`
5. že `dist/index.html` obsahuje relativní cesty `./assets/...`

## Soubory, které se týkají opravy

- [vite.config.ts](../vite.config.ts)
- [electron/main.ts](../electron/main.ts)
- [electron/preload.cts](../electron/preload.cts)
- [package.json](../package.json)
- [dist/index.html](../dist/index.html)
