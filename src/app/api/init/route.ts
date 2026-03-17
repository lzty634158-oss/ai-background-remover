import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    initializeDatabase();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
