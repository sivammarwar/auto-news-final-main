// src/app/api/admin/auth/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Login password check ONLY. Called by src/app/admin/login/page.tsx.
// AdminPanel's GET/POST calls go to /api/admin (route.ts one level up).
//
// FIX: Previously this file contained ALL admin logic (GET + POST), but it
// lived at /api/admin/auth — so AdminPanel's calls to /api/admin were 404-ing.
// Now this file only handles the login handshake.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  // ADD THESE TWO LINES temporarily:
  console.log('Received password:', JSON.stringify(password));
  console.log('Expected password:', JSON.stringify(adminPassword));

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}