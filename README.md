# Fotbollsklubbens Schema

Det här projektet är en enkel schemalösning för fyra fotbollsplaner på Ringvallen. Systemet innehåller:

- en publik TV-vy för måndag till söndag
- stöd för halvplan och helplan
- admininloggning
- uppladdning av Excel-fil för veckans schema
- nedladdningsbar Excel-mall

## Kom igång lokalt

1. Installera beroenden:

```bash
npm install
```

2. Skapa `.env.local` i projektroten. Använd `.env.example` som mall.

3. Starta utvecklingsservern:

```bash
npm run dev
```

4. Öppna i webbläsaren:

- Publikt schema: http://localhost:3000
- Admin: http://localhost:3000/admin

## Excel-format för uppladdning

Vecka och veckostart anges i adminformuläret. Excel-filen behöver därför bara innehålla själva bokningsraderna.

### Kolumner och vad de betyder

- Dag: Vilken veckodag bokningen tillhör, till exempel Måndag eller Tisdag.
- Tid: Starttid för bokningen, till exempel 18:00.
- Sluttid: När bokningen slutar, till exempel 19:00.
- Plan: Vilken plan bokningen gäller, till exempel Ringvallen 1.
- Användning: Anger om bokningen gäller Halv A, Halv B, Helplan eller Match. Om du bara skriver Halv tolkas det som Halv A.
- Lag 1: Första lagets namn.
- Lag 2: Valfritt. Andra lagets namn vid matcher eller dubbelbokningar. Lämna tomt för träning.
- Omklädningsrum Lag 1: Omklädningsrum som tillhör Lag 1.
- Omklädningsrum Lag 2: Valfritt. Omklädningsrum som tillhör Lag 2. Lämna tomt för träning.
- Notering: Valfri extra information, till exempel halv A, halv B eller match.

Importen accepterar också vanliga engelska eller alternativa kolumnnamn, men den nedladdningsbara mallen använder svenska rubriker.

### Exempel på kolumner i mallen

- Dag
- Tid
- Sluttid
- Plan
- Användning
- Lag 1
- Lag 2
- Omklädningsrum Lag 1
- Omklädningsrum Lag 2
- Notering

## Excel-mall

Mallen kan hämtas från:

- `/api/template`

Mallen innehåller:

- ett blad som heter `Schema`
- ett blad som heter `Läs mig` med instruktioner direkt i Excel-filen
- dropdown-listor för `Dag`, `Plan`, `Användning` och båda kolumnerna för `Omklädningsrum`

Du kan också hämta mallen via knappen `Ladda ner Excel-mall` på adminsidan.
