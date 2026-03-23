# Architecture overview

Tento dokument shrnuje aktuální technickou architekturu projektu `height_reference`.

## Cíl aplikace

Aplikace je Windows-first desktop overlay nástroj pro porovnávání výšek postav při animaci.

Aktuální MVP umí:

- importovat obrázky postav
- posouvat je po pracovní ploše
- nastavit pro každou referenci vlastní floor line
- zarovnat reference na jednu společnou baseline
- vytvářet vlastní pojmenované a barevné výškové linky
- rušit výběr klikem do prázdné plochy
- uložit a načíst projekt
- držet okno `always-on-top`
- přepínat `click-through`

## Stack

- Electron
- React
- TypeScript
- Vite

## Architektura aplikace

Projekt je rozdělený na 3 hlavní části.

## 1. Main process

Soubor:

- [electron/main.ts](../electron/main.ts)

Zodpovědnost:

- vytvoření Electron okna
- nastavení `alwaysOnTop`
- přepínání `click-through`
- změna opacity okna
- globální zkratky
- dialogy pro uložení a načtení projektu
- IPC handlery mezi rendererem a main processem

Main process je jediná část, která komunikuje přímo s desktop API Electronu a se souborovým systémem.

## 2. Preload bridge

Soubor:

- [electron/preload.cts](../electron/preload.cts)

Zodpovědnost:

- bezpečně vystavit omezené API do rendereru přes `contextBridge`
- zabránit přímému přístupu rendereru k Node/Electron API

Aktuálně vystavené funkce:

- `getWindowState()`
- `setAlwaysOnTop()`
- `setClickThrough()`
- `setOpacity()`
- `saveProject()`
- `loadProject()`

## 3. Renderer

Hlavní soubor:

- [src/App.tsx](../src/App.tsx)

Zodpovědnost:

- UI aplikace
- seznam referencí
- inspector vybrané reference
- pracovní plocha
- interakce s referencemi
- volání preload API
- serializace a načítání projektu

Renderer je zatím implementovaný jako jeden větší React komponent. To je v pořádku pro prototyp, ale další krok bude rozdělení na menší části.

Renderer navíc řeší i několik důležitých UX pravidel:

- mutual exclusive selection mezi referencí a výškovou linkou
- scroll-aware vykreslení názvu výškových linek
- zobrazení per-item baseline jen pro aktivní referenci
- rozšiřování boardu pouze doprava

## Datový model

Soubor:

- [src/project/schema.ts](../src/project/schema.ts)

Aktuální model zahrnuje:

## `OverlayState`

Ukládá stav okna:

- `alwaysOnTop`
- `clickThrough`
- `opacity`

## `ReferenceItem`

Jedna vizuální reference na ploše:

- `id`
- `name`
- `src`
- `width`
- `height`
- `x`
- `y`
- `scale`
- `opacity`
- `baselineY`

## `HeightReferenceProject`

Uložitelný projekt:

- `version`
- `savedAt`
- `board`
- `overlayState`
- `items`
- `guideLines`

Součástí souboru je i validace načítaného JSON formátu.

## Uložení a načítání projektu

Tok ukládání:

1. renderer sestaví `HeightReferenceProject`
2. renderer zavolá `saveProject()` přes preload
3. main process otevře save dialog
4. main process zapíše JSON na disk

Tok načítání:

1. renderer zavolá `loadProject()`
2. main process otevře open dialog
3. main process načte soubor
4. renderer provede `parseProject()`
5. renderer aktualizuje stav aplikace

## Aktuální limity architektury

- [src/App.tsx](../src/App.tsx) je příliš velký
- board je zatím DOM prototyp, ne canvas editor
- není ještě `character` / `pose` model
- není autosave ani recent files
- není oddělený store pro editor data

## Doporučený další refaktor

### 1. Rozdělit renderer

Navržené budoucí soubory:

- [src/components/Sidebar.tsx](../src/components/Sidebar.tsx)
- [src/components/Workspace.tsx](../src/components/Workspace.tsx)
- [src/components/Inspector.tsx](../src/components/Inspector.tsx)
- [src/hooks/useProjectState.ts](../src/hooks/useProjectState.ts)

### 2. Zavést aplikační store

Doporučený další krok:

- mít jeden centrální editor state
- oddělit data od UI vrstvy

### 3. Připravit `character` a `pose`

Budoucí směr modelu:

- `Character`
- `Pose`
- `activePoseId`
- skupinové přepínání obrázků podle aktivní pózy

### 4. Přechod na canvas

Po stabilizaci datového modelu dává smysl přejít na canvas vrstvu, pravděpodobně přes `Fabric.js`.

## Shrnutí

Aktuální architektura je vhodná pro funkční prototyp. Pro další rozvoj bude potřeba:

- rozdělit renderer na menší celky
- stabilizovat datový model pro postavy a pózy
- postupně nahradit DOM board canvas editorem
