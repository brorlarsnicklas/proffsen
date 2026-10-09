# NHL-dagen – Vue 3 + TypeScript

En fristående turneringssida för 2–16 personer, med valet **1 eller 2 spelare per lag**. Varje deltagande lag får ett slumpat NHL-lag. Välj **1 eller 2 matcher mot varje lag**.

- Sex personer, en per lag: sex lag och 15 matcher.
- Sex personer, två per lag: tre lag och tre matcher med ett möte, eller sex matcher med två möten.
- Två möten ger en hemmamatch och en bortamatch mot varje motståndarlag.
- Formuläret visar både totalt antal matcher och matcher per lag.
- Två per lag kräver ett jämnt antal personer och minst fyra. Lagkamraterna slumpas vid lottningen.

Tabell och resultat tillhör laget. Båda lagkamraternas namn visas i tabellen och matchschemat. Valet i formuläret gäller nästa lottning; den pågående turneringen ändras först när ni bekräftar omlottning.

## Kom igång

Använd Node.js 22.18+ i 22-serien eller 24.12+ (Node 24 rekommenderas för projektet).

```bash
npm ci
npm run dev
```

Öppna adressen som Vite skriver i terminalen.

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

`npm run build` kör typkontroll och skapar de statiska filerna i `dist/`. Projektet använder Vue 3, TypeScript och Vite samt vanlig CSS. Det behöver varken router eller backend.

## Filer att börja med

- `src/App.vue`: sidans layout, spelarformulär och tabell.
- `src/components/MatchRow.vue`: en matchs inmatningsfält; osparade mål påverkar inte tabellen.
- `src/composables/useTournament.ts`: reaktivt turneringstillstånd, resultat, lokal lagring och import/export.
- `src/lib/tournament.ts`: lottning, alla-mot-alla-schema, tabellberäkning och validering av importerad JSON.
- `src/lib/teams.ts`: NHL-lagen som kan väljas i lottningen.
- `src/types.ts`: gemensamma TypeScript-typer.
- `src/style.css`: responsiv styling.

## Regler

3 poäng för vinst, 1 för oavgjort och 0 för förlust. Om ni spelar förlängning registrerar ni det avgjorda slutresultatet. Tabellordning: poäng, målskillnad, gjorda mål. Vid fortsatt lika delas placeringen; namnet används endast för visningsordningen.

Schemat använder cirkelmetoden. Varje lag möter alla andra lag en eller två gånger enligt valt upplägg och spelar högst en match per omgång. Vid två möten spelas en första serie och därefter returmöten med växlad hemma/borta. Vid udda antal lag står ett lag över varje omgång. Omgångarna och matcherna inom dem slumpas. Ni spelar matcherna uppifrån och ned på en gemensam konsol. Matcherna kan ge samma spelare två matcher i följd vid en omgångsgräns.

## Lagring

Resultaten sparas i webbläsarens `localStorage` när ni trycker Spara eller Uppdatera. Rensa tar bort ett enskilt matchresultat. Nollställ tar bort hela turneringen efter bekräftelse.

Det finns ingen synkning mellan datorer eller mobiler. Använd en gemensam dator under dagen, och exportera JSON som säkerhetskopia. Äldre exporter med en spelare per lag kan fortfarande importeras. Den nya Vue-versionen kan också exportera och importera turneringar med två spelare per lag. Äldre filer utan antal möten tolkas som ett möte per motståndare. Exporter med två spelare per lag eller två möten ska importeras i den uppdaterade Vue-versionen. Sparade resultat tillhör den aktuella webbläsaren och sidans origin; de följer inte automatiskt med vid byte av hosting.

## GitHub Pages

1. Skapa ett GitHub-repository, till exempel `nhl-dagen`.
2. Lägg hela projektet i repositoryts rot och pusha till `main`.
3. Under Settings → Pages väljer du **GitHub Actions** som källa.
4. Den medföljande `.github/workflows/deploy.yml` installerar från låsfilen, testar, bygger och publicerar `dist/` vid varje push till `main`.
5. Adressen blir normalt `https://DITT-ANVANDARNAMN.github.io/nhl-dagen/`.

`base: './'` i `vite.config.ts` ger relativa asset-sökvägar, så samma build fungerar även i en repository-undermapp. Ingen router används.

När du ändrar dependencies: kör `npm install` och committa både `package.json` och `package-lock.json`. GitHub-pipelinen använder `npm ci` och behöver båda. Byggverktygen ligger i `devDependencies` och ska installeras i byggsteget. Bara `dist/` publiceras.

## Kontroller

38 Vitest-tester kontrollerar bland annat alla-mot-alla för 2–16 spelare, unika möten, inga dubbelmatcher per omgång, tabellberäkning, ändrade resultat, delade placeringar och felaktiga importer. Projektet har kontrollerats med `vue-tsc` och byggts med Vite. Ingen automatisk webbläsartestning ingår.

Inofficiell kompisapp utan koppling till NHL. Lagpoolen är en lokal lista som ni kan ändra.
