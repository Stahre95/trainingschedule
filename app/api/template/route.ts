import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'veckomall.xlsx');
    const content = await readFile(templatePath);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="veckomall.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Mallfilen kunde inte laddas.' }, { status: 500 });
  }
}
