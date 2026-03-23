// src/app/api/admin/keys/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Serves Groq and Pexels API keys to the admin panel.
// Keys live in server-only env vars (no NEXT_PUBLIC_ prefix).
// Protected by the same ADMIN_PASSWORD as your existing auth route.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const pw = req.headers.get('x-admin-password');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || pw !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  const pexelsKey = process.env.PEXELS_API_KEY ?? '';

  return NextResponse.json({ groqKeys, pexelsKey });
}