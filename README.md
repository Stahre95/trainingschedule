# Football Club Schedule

Simple weekly schedule app for 4 football pitches (Ringvallen 1-4), with:

- Public Monday-Sunday schedule view
- Half-pitch and full-pitch booking visualization
- Admin login/logout
- Admin Excel upload to refresh the week
- Downloadable Excel template

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root and copy values from `.env.example`.

3. Start dev server:

```bash
npm run dev
```

4. Open:

- Public schedule: http://localhost:3000
- Admin: http://localhost:3000/admin

## Admin Credentials

Set these in `.env.local`:

```env
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=Ringvallen1930!
ADMIN_SESSION_SECRET=your-long-random-secret
```

## Excel Upload Format

Vecka och veckostart anges i adminformuläret, så Excel-filen behöver bara innehålla själva bokningsraderna.

### Kolumner och vad de betyder

- Dag: Vilken veckodag bokningen tillhör, till exempel Måndag eller Tisdag.
- Tid: Starttid för bokningen, till exempel 18:00.
- Sluttid: När bokningen slutar, till exempel 19:00.
- Plan: Vilken plan bokningen gäller, till exempel Ringvallen 1.
- Användning: Om det är halvplan eller helplan. Exempel: halv, hel, match, dubbel.
- Användning: Om det är halvplan eller helplan. Skriv Halv A eller Halv B för halvplansbokningar. Om du bara skriver Halv tolkas det som Halv A.
- Lag 1: Första lagets namn.
- Lag 2: Valfritt. Andra lagets namn vid matcher eller dubbelbokningar. Lämna tomt för träning.
- Omklädningsrum Lag 1: Omklädningsrum som tillhör Lag 1.
- Omklädningsrum Lag 2: Valfritt. Omklädningsrum som tillhör Lag 2. Lämna tomt för träning.
- Notering: Valfri extra information, till exempel halv A, halv B eller match.

Kolumnnamn kan även skrivas med vanliga engelska/alternativa varianter i importen, men mallen använder svenska rubriker.

### Exempel på tillåtna kolumner i importen

- Dag
- Tid
- Sluttid
- Plan
- Användning (`halv`, `enkel`, `hel`, `dubbel`, `match`)
- Användning (`Halv A`, `Halv B`, `enkel`, `hel`, `dubbel`, `match`)
- Lag 1
- Lag 2 (valfri för träning)
- Omklädningsrum Lag 1
- Omklädningsrum Lag 2 (valfri)
- Notering (valfri)

You can download a ready template from:

- `/api/template`

The template also contains a separate "Läs mig" sheet with the same instructions directly inside the workbook.

The "Schema" sheet also includes dropdowns for Dag, Plan, Användning and Omklädningsrum columns so the file is easier to fill out correctly.

Or from the admin page button "Ladda ner Excel-mall".
