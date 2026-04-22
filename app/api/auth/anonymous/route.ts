import { NextResponse } from 'next/server';

// Anonymous sessions are no longer supported.
// Redirect to login for any residual links.

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  return NextResponse.redirect(new URL('/login', baseUrl));
}

export async function POST() {
  return NextResponse.json(
    { error: 'Anonymous sessions are no longer supported. Please sign in.' },
    { status: 410 },
  );
}
