import { NextResponse } from 'next/server';
import { createConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await createConnection();
    const [rows] = await db.query('SELECT * FROM checklist_rules ORDER BY id ASC');
    await db.end();
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { rule_text } = await req.json();
    const db = await createConnection();
    await db.execute('INSERT INTO checklist_rules (rule_text, is_checked) VALUES (?, 0)', [rule_text]);
    await db.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, is_checked, rule_text } = body;
    const db = await createConnection();

    // Dynamically build the update query
    const updates = [];
    const values = [];

    if (is_checked !== undefined) {
        updates.push('is_checked = ?');
        values.push(is_checked ? 1 : 0);
    }
    if (rule_text !== undefined) {
        updates.push('rule_text = ?');
        values.push(rule_text);
    }

    if (updates.length > 0) {
        values.push(id); // Add ID for the WHERE clause
        const sql = `UPDATE checklist_rules SET ${updates.join(', ')} WHERE id = ?`;
        await db.execute(sql, values);
    }
    
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
    await db.execute('DELETE FROM checklist_rules WHERE id = ?', [id]);
    await db.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}