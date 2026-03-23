# TODO

Seznam věcí pro další návrat k projektu.

## Priorita pro příště

### 1. Deformace obrázku nezávisle na poměru stran

Cíl:

- umožnit upravovat výšku a šířku obrázku odděleně podle potřeby

Navržené kroky:

- rozšířit datový model `ReferenceItem` o samostatné hodnoty pro šířku a výšku, případně `scaleX` a `scaleY`
- upravit renderer v [src/App.tsx](src/App.tsx), aby se reference vykreslovaly s odděleným horizontálním a vertikálním měřítkem
- přidat ovládání do inspectoru pro změnu šířky a výšky zvlášť
- zkontrolovat chování floor line při deformaci obrázku
- uložit nové hodnoty do projektu v [src/project/schema.ts](src/project/schema.ts)
- otestovat kompatibilitu se staršími `.hrp` soubory

Otázky k rozhodnutí:

- stačí dva slidery `šířka` a `výška`, nebo je lepší přidat i rohové resize handlery přímo na ploše?
- má být možné zamknout poměr stran a přepínat mezi lock/unlock?

### 2. Kontextové menu na pravý klik místo trvale viditelného menu

Cíl:

- přesunout hlavní ovládání do menu otevřeného pravým klikem na pracovní ploše

Navržené kroky:

- navrhnout strukturu kontextového menu podle stavu výběru:
  - bez výběru
  - vybraný obrázek
  - vybraná výšková linka
- rozhodnout, které akce zůstanou stále viditelné a které budou jen v pravém kliknutí
- přidat obsluhu pravého kliknutí nad pracovní plochou v [src/App.tsx](src/App.tsx)
- vytvořit samostatnou komponentu pro kontextové menu, aby se zmenšila velikost [src/App.tsx](src/App.tsx)
- doplnit zavírání menu klikem mimo menu a klávesou `Escape`
- zajistit, aby menu fungovalo správně i při panningu a při scrollu pracovní plochy
- případně zachovat malý horní toolbar jen pro nejdůležitější akce

Otázky k rozhodnutí:

- má pravé kliknutí úplně nahradit současné horní menu, nebo má být horní menu jen zjednodušené?
- mají být položky menu jiné pro obrázek a jiné pro referenční linku?

## Doporučené pořadí

1. nejdřív vyřešit nový datový model pro deformaci obrázků
2. potom upravit UI inspectoru a render reference
3. až potom řešit nový způsob ovládání přes pravý klik
4. nakonec aktualizovat dokumentaci a uložit kompatibilitu projektu
