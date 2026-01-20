import { NextResponse } from 'next/server';
import { createConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await createConnection();
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    await db.end();
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const db = await createConnection();
    await db.execute('INSERT INTO categories (name) VALUES (?)', [name]);
    await db.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const db = await createConnection();
    await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    await db.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}