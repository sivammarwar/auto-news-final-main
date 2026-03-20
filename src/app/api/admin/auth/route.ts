import { NextRequest, NextResponse } from 'next/server';

// Password lives in environment variable — never in client bundle
// Add ADMIN_PASSWORD to your .env.local and Vercel/hosting env vars
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (password === adminPassword) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Small delay on wrong password to slow brute force attempts
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}