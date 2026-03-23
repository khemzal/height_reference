# Implementation summary

Tento dokument shrnuje, co je v projektu aktuálně hotové, jak fungují hlavní části aplikace a jaké uživatelské změny byly během prototypování doplněné.

## Aktuální stav MVP

Aplikace je funkční desktopový prototyp pro porovnávání výšek postav při animaci.

Hotové části:

- Electron okno pro Windows-first overlay workflow
- React renderer pro editaci referencí
- import více obrázků najednou
- přesouvání obrázků po pracovní ploše
- ruční nastavení podlahové linky u každého obrázku
- zarovnání jedné reference nebo všech referencí na společnou podlahu
- vlastní horizontální výškové linky s názvem a barvou
- uložení a načtení projektu do `.hrp`
- `always-on-top`, `click-through` a řízení opacity okna
- horizontálně se rozšiřující pracovní plocha
- middle-mouse panning
- horní sticky menu
- možnost schovat a znovu ukázat menu
- scrollovatelné menu pro delší obsah
- `deselect` kliknutím do prázdné plochy
- zobrazení per-item baseline pouze pro právě vybraný obrázek

## Hlavní soubory

## Renderer

- [src/App.tsx](../src/App.tsx)
- [src/App.css](../src/App.css)

Renderer drží většinu editorového stavu:

- seznam referencí
- seznam výškových linek
- stav výběru
- stav panningu a drag operací
- stav pracovní plochy
- text status hlášek

Důležité interakce:

- klik na obrázek vybere obrázek
- klik na výškovou linku vybere linku
- klik mimo hitbox zruší výběr
- drag obrázku mění jeho pozici
- drag modré baseline mění floor line obrázku
- drag výškové linky mění její `y` pozici

## Main process

- [electron/main.ts](../electron/main.ts)
- [electron/preload.cts](../electron/preload.cts)

Main process řeší:

- vytvoření okna
- native nastavení okna
- globální zkratky
- save/load dialogy
- IPC handlery

Preload bridge pouští do rendereru jen potřebné funkce a nedává rendereru plný přístup k Node API.

## Data model

- [src/project/schema.ts](../src/project/schema.ts)

Projekt ukládá:

- rozměry pracovní plochy
- společnou baseline
- nastavení overlay okna
- reference obrázků
- vlastní výškové linky

Součástí je i jednoduchá runtime validace a backward compatibility pro starší varianty souboru.

## Důležité UX změny doplněné během iterací

## 1. Výškové linky

Byly doplněné:

- vlastní názvy linek
- vlastní barvy linek
- full-width vykreslení přes celou plochu
- sticky label logika při horizontálním scrollu

Výsledek:

- název linky začíná vlevo na linii
- při posunu mimo viewport se label přilepí k levému okraji viewportu

## 2. Menu

Menu bylo přesunuté z bočního layoutu do horní sticky lišty.

Byly doplněné:

- schování/zobrazení menu
- horizontální scroll panelů
- vertikální scroll celého menu pro dlouhý obsah

To umožňuje spravovat i větší počet linek nebo referencí bez ztráty přístupu k ovládání.

## 3. Výběr a deselect

Výběr byl upraven tak, aby byl předvídatelnější:

- aktivní může být buď reference, nebo výšková linka
- klik mimo aktivní hitbox provede `deselect`
- opakovaný klik na objekt ho znovu vybere
- baseline vybrané reference zmizí po zrušení výběru

## Omezení současného prototypu

- renderer je zatím soustředěný hlavně do [src/App.tsx](../src/App.tsx)
- board je DOM layout, ne canvas editor
- není undo/history
- není autosave
- není model `character` / `pose`
- `npm run dev` není zatím stejně spolehlivý jako `npm run start`

## Doporučené další kroky

- rozdělit renderer na menší komponenty a hooky
- přesunout editor state do samostatné vrstvy
- připravit datový model pro více póz jedné postavy
- zvážit canvas vrstvu pro přesnější editaci a lepší výkon
