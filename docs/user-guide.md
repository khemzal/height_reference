# User guide

Tento dokument popisuje, jak aktuální prototyp aplikace používat.

## Spuštění aplikace

Produkční spuštění:

```bash
npm run build
npm run start
```

Pokud už build existuje, stačí:

```bash
npm run start
```

## Co aplikace aktuálně umí

- zobrazit hlavní možnosti nahoře ve vodorovném menu
- přidat více obrázků
- posouvat reference po ploše
- upravit floor line pro každou referenci
- přidat vlastní vodorovné referenční linky
- měnit scale vybrané reference
- měnit opacity vybrané reference
- zarovnat reference na společnou baseline
- posouvat pracovní plochu podržením kolečka myši
- nechat pracovní plochu průběžně rozšiřovat pouze do šířky
- uložit projekt
- načíst projekt
- přepínat overlay režim okna
- schovat a znovu ukázat levé menu s možnostmi

## Základní workflow

## Horní menu

Možnosti aplikace jsou teď zobrazené nahoře ve vodorovném menu.

Najdeš tam sekce pro:

- projekt
- overlay okno
- výškové linky
- vybranou referenci
- seznam referencí

Menu můžeš schovat a znovu ukázat.

## 1. Přidej obrázky

V levém panelu klikni na:

- `Přidat obrázky`

Vyber jeden nebo více obrázků postav.

Po importu se reference objeví na pracovní ploše a v seznamu referencí.

## 2. Posuň reference na plochu

Na pracovní ploše klikni na referenci a táhni ji myší.

Takto si postavy rozložíš vedle sebe.

## 3. Nastav floor line

Každá reference má modrou vodorovnou linku.

Tuto linku táhni nahoru nebo dolů tak, aby odpovídala místu, kde se postava dotýká podlahy.

To je základ pro přesné porovnání výšky.

## 4. Zarovnej reference

Máš dvě možnosti:

- `Zarovnat vybranou`
- `Zarovnat vše`

Aplikace posune reference tak, aby jejich floor line seděla na společné baseline.

## Vlastní výškové linky

V sekci `Výškové linky` můžeš přidat vlastní vodorovnou referenční čáru.

U každé linky můžeš nastavit:

- název
- barvu
- výšku

Linku můžeš také chytit přímo v pracovní ploše a táhnout nahoru nebo dolů.

To je užitečné například pro referenční výšku hlavní postavy, očí, ramen nebo jiné důležité úrovně. Linka se zobrazuje přes celou šířku pracovní plochy stejně jako společná podlaha.

## 5. Uprav vybranou referenci

V panelu `Vybraná reference` lze měnit:

- `Měřítko`
- `Opacity obrázku`

To je užitečné pro jemné porovnávání a překrývání referencí.

## Pohyb po pracovní ploše

Pokud se chceš po ploše posouvat, podrž stisknuté kolečko myši a táhni.

Tím posouváš viewport po pracovní ploše.

Když se dostaneš blízko pravého kraje, plocha se automaticky rozšíří dál do šířky.

Výška pracovní plochy zůstává fixní, společná podlaha zůstává na stejné linii a už umístěné reference zůstávají na svém místě.

## 6. Ulož projekt

Klikni na:

- `Uložit projekt`

Projekt se uloží do souboru s příponou `.hrp`.

Do projektu se ukládá:

- seznam referencí
- jejich pozice
- scale
- opacity
- baseline nastavení
- stav overlay okna

## 7. Načti projekt

Klikni na:

- `Načíst projekt`

Vyber dříve uložený `.hrp` soubor.

Aplikace obnoví stav projektu.

## Overlay ovládání

V panelu `Overlay okno` lze nastavit:

- `Vždy nahoře`
- `Click-through režim`
- `Průhlednost okna`

## Schování a zobrazení menu

Horní menu s možnostmi můžeš schovat tlačítkem `Schovat`.

Když je menu skryté, nahoře v pracovní ploše se objeví tlačítko `Ukázat menu`, kterým ho zase otevřeš.

To je užitečné hlavně ve chvíli, kdy chceš mít pro reference co nejvíc místa.

Horní menu navíc zůstává připnuté nahoře i při pohybu po pracovní ploše, takže se k možnostem dostaneš bez vracení nahoru.

## Globální zkratky

Aktuálně je důležitá hlavně tato:

- `Ctrl+Shift+Space` — přepne `click-through`

To je důležité hlavně ve chvíli, kdy je okno neklikatelné.

## Tipy pro použití

- nejdřív nastav floor line u všech postav
- až potom používej `Zarovnat vše`
- pokud chceš přesnější porovnání, sniž opacity některé reference
- průběžně si ukládej projekt

## Aktuální omezení

- board je zatím prototyp, ne finální canvas editor
- není ještě systém postav s více pózami
- není autosave
- není history/undo

## Doporučený způsob práce

1. importuj reference
2. rozlož je po ploše
3. nastav každé floor line
4. zarovnej je na baseline
5. dolaď scale a opacity
6. ulož projekt

## Související dokumentace

- [docs/architecture-overview.md](architecture-overview.md)
- [docs/white-screen-fix.md](white-screen-fix.md)
