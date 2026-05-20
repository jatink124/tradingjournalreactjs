import { NextResponse } from 'next/server';
import { createConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await createConnection();
    await db.end();
    return NextResponse.json({ 
      status: 'ok',
      message: 'Database connection successful'
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Database connection failed',
      details: error.message
    }, { status: 503 });
  }
}
