/**
 * API Route: /api/devices
 * Fetches all devices and their current status
 */

import { NextResponse } from 'next/server';

const HEALTH_API_BASE = process.env.HEALTH_API_URL || 'http://localhost:8090';

export async function GET() {
  try {
    const response = await fetch(`${HEALTH_API_BASE}/stats`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}
