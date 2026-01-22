/**
 * API Route: /api/metrics
 * Proxies system metrics from EDGE Gateway Health API
 */

import { NextResponse } from 'next/server';

const HEALTH_API_BASE = process.env.HEALTH_API_URL || 'http://localhost:8090';

export async function GET() {
  try {
    const response = await fetch(`${HEALTH_API_BASE}/metrics`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system metrics' },
      { status: 500 }
    );
  }
}
