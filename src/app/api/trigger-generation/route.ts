import { NextRequest, NextResponse } from 'next/server';

// This is a server-side proxy so the CRON_SECRET is never exposed to the browser.
// SchedulerPanel calls this route, which forwards the request to generate-history
// with the Authorization header added securely on the server.

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 
                  (req.headers.get('origin') ?? 'https://hiddenhistoryfacts.com');

  const res = await fetch(`${baseUrl}/api/cron/generate-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({ ...body, manual: true }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}