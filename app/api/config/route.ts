import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  });
}