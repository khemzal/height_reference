# Height Reference

První prototyp desktopové aplikace pro porovnávání výšek postav při animaci. Projekt je postavený na Electronu, Reactu a TypeScriptu a zatím řeší základ workflow: import obrázků, ruční nastavení podlahové linky a zarovnání všech referencí na společnou baseline.

## Co už umí

- always-on-top okno pro referenci přes jiné programy
- import více obrázků najednou
- posouvání referencí po pracovní ploše
- per-item měřítko a opacity
- ručně tažená podlahová linka pro každou referenci
- vlastní pojmenované a obarvené horizontální referenční linky přes celou šířku plochy
- rychlé zarovnání všech referencí na společnou podlahu
- uložení a načtení projektu do JSON souboru
- globální přepnutí `click-through` režimu přes `Ctrl+Shift+Space`

## Spuštění

```bash
npm install
npm run dev
```

Vývojový režim spustí zároveň Vite renderer, watch build pro Electron soubory a samotné Electron okno.

Produkční build:

```bash
npm run build
```

Pak lze aplikaci spustit přes:

```bash
npm run start
```

## Další plán

- nahradit DOM prototyp canvas editorem
- uložit projekt do JSON souboru
- přidat `character` elementy s více pózami
- přidat tray menu a lepší overlay režim

## Poznámky k Electron buildu

- dokumentace k opravě bílé obrazovky je v [docs/white-screen-fix.md](docs/white-screen-fix.md)

## Další dokumentace

- technický přehled architektury: [docs/architecture-overview.md](docs/architecture-overview.md)
- uživatelský návod: [docs/user-guide.md](docs/user-guide.md)
