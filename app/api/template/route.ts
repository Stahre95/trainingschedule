import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  // Mallen visar bara raddata; vecka och startdatum anges nu i adminformuläret.
  const rows = [
    {
      Dag: 'Måndag',
      Tid: '18:00',
      Sluttid: '19:00',
      Plan: 'Ringvallen 1',
      Användning: 'Halv A',
      'Lag 1': 'FC West',
      'Lag 2': '',
      'Omklädningsrum Lag 1': 'Rum 1',
      'Omklädningsrum Lag 2': '',
      Notering: 'Halvplans träning',
    },
    {
      Dag: 'Tisdag',
      Tid: '19:00',
      Sluttid: '20:30',
      Plan: 'Ringvallen 2',
      Användning: 'Match',
      'Lag 1': 'North Stars',
      'Lag 2': 'City United',
      'Omklädningsrum Lag 1': 'Rum 3',
      'Omklädningsrum Lag 2': 'Rum 4',
      Notering: 'Helplans match',
    },
  ];

  const instructions = [
    ['Läs mig'],
    ['Den här mallen innehåller två blad: Schema och Läs mig.'],
    ['Vecka och veckostart anges i adminformuläret, inte på varje rad i Excel-filen.'],
    ['Fyll bara i själva bokningsraderna på bladet Schema.'],
    [''],
    ['Kolumner och vad de betyder'],
    ['Dag', 'Vilken veckodag bokningen tillhör, till exempel Måndag eller Tisdag.'],
    ['Tid', 'Starttid för bokningen, till exempel 18:00.'],
    ['Sluttid', 'När bokningen slutar, till exempel 19:00.'],
    ['Plan', 'Vilken plan bokningen gäller, till exempel Ringvallen 1.'],
    ['Användning', 'Om det är halvplan eller helplan. Skriv Halv A eller Halv B för träning på en halva. Om du bara skriver Halv tolkas det som Halv A. Exempel: Halv A, Halv B, hel, match, dubbel.'],
    ['Lag 1', 'Första lagets namn.'],
    ['Lag 2', 'Valfritt. Andra lagets namn vid matcher eller dubbelbokningar. Lämna tomt för träning.'],
    ['Omklädningsrum Lag 1', 'Omklädningsrum som tillhör Lag 1.'],
    ['Omklädningsrum Lag 2', 'Valfritt. Omklädningsrum som tillhör Lag 2. Lämna tomt för träning.'],
    ['Notering', 'Valfri extra information, till exempel halv A, halv B eller match.'],
    [''],
    ['Tillåtna kolumnnamn i importen'],
    ['Dag / Day'],
    ['Tid / Time'],
    ['Sluttid / End time'],
    ['Plan / Pitch'],
    ['Användning / Usage / Usage type (skriv Halv A eller Halv B för halvplan)'],
    ['Lag 1 / Team 1'],
    ['Lag 2 / Team 2 (valfritt för träning)'],
    ['Omklädningsrum Lag 1 / Locker room Team 1'],
    ['Omklädningsrum Lag 2 / Locker room Team 2 (valfritt, Rum 1-12)'],
    ['Notering / Notes'],
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'trainingschedule';
  workbook.created = new Date();

  const schemaSheet = workbook.addWorksheet('Schema');
  const instructionSheet = workbook.addWorksheet('Läs mig');

  schemaSheet.columns = [
    { header: 'Dag', key: 'Dag', width: 14 },
    { header: 'Tid', key: 'Tid', width: 12 },
    { header: 'Sluttid', key: 'Sluttid', width: 12 },
    { header: 'Plan', key: 'Plan', width: 16 },
    { header: 'Användning', key: 'Användning', width: 16 },
    { header: 'Lag 1', key: 'Lag 1', width: 20 },
    { header: 'Lag 2', key: 'Lag 2', width: 20 },
    { header: 'Omklädningsrum Lag 1', key: 'Omklädningsrum Lag 1', width: 22 },
    { header: 'Omklädningsrum Lag 2', key: 'Omklädningsrum Lag 2', width: 22 },
    { header: 'Notering', key: 'Notering', width: 24 },
  ];

  schemaSheet.addRows(rows);
  schemaSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F99C9' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  schemaSheet.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  instructions.forEach((row) => instructionSheet.addRow(row));
  instructionSheet.getColumn(1).width = 36;
  instructionSheet.getColumn(2).width = 90;

  const addListValidation = (column: string, values: string[]) => {
    for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
      schemaSheet.getCell(`${column}${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${values.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Ogiltigt värde',
        error: 'Välj ett värde från dropdown-listan.',
      };
    }
  };

  const dayValues = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
  const pitchValues = ['Ringvallen 1', 'Ringvallen 2', 'Ringvallen 3', 'Ringvallen 4'];
  const usageValues = ['Halv A', 'Halv B', 'Helplan', 'Match'];
  const lockerValues = Array.from({ length: 12 }, (_, index) => `Rum ${index + 1}`);

  addListValidation('A', dayValues);
  addListValidation('D', pitchValues);
  addListValidation('E', usageValues);
  addListValidation('H', lockerValues);
  addListValidation('I', lockerValues);

  const content = await workbook.xlsx.writeBuffer();

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="schema-mall.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
