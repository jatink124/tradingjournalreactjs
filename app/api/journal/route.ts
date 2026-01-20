import { NextResponse } from 'next/server';
import { createConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await createConnection();
    // Select all columns, including the new 'market_trend'
    const [rows] = await db.query('SELECT * FROM journal_entries ORDER BY id DESC');
    await db.end();
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db = await createConnection();
    
    // Check if ID exists to decide between INSERT or UPDATE
    const [existing]: any = await db.query("SELECT id FROM journal_entries WHERE id = ?", [data.id]);
    
    // safe defaults
    const mistakes = JSON.stringify(data.mistakes || []);
    const images = JSON.stringify(data.images || []);
    const notes = data.notes || '';
    const entry_price = data.entry_price || 0;
    const exit_price = data.exit_price || 0;
    const lots = data.lots || 0;
    const pnl = data.pnl || 0;
    const market_trend = data.market_trend || 'Sideways'; // Default if missing

    if (existing.length > 0) {
      // UPDATE existing entry
      await db.execute(
        `UPDATE journal_entries SET 
            asset=?, focus_area=?, notes=?, mistakes=?, neg_notes=?, 
            plan_bias=?, key_level=?, plan_notes=?, images=?, 
            entry_price=?, exit_price=?, lots=?, pnl=?, market_trend=? 
            WHERE id=?`,
        [
            data.asset, data.focus_area, notes, mistakes, data.neg_notes, 
            data.plan_bias, data.key_level, data.plan_notes, images, 
            entry_price, exit_price, lots, pnl, market_trend, data.id
        ]
      );
    } else {
      // INSERT new entry
      await db.execute(
        `INSERT INTO journal_entries 
            (id, entry_type, asset, timestamp_str, focus_area, notes, mistakes, neg_notes, plan_bias, key_level, plan_notes, images, entry_price, exit_price, lots, pnl, market_trend) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.id, data.entry_type, data.asset, data.timestamp_str, data.focus_area, notes, mistakes, data.neg_notes, data.plan_bias, data.key_level, data.plan_notes, images, entry_price, exit_price, lots, pnl, market_trend
        ]
      );
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
    await db.execute("DELETE FROM journal_entries WHERE id = ?", [id]);
    await db.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}