/**
 * API Route: /api/health
 * Proxies health check from EDGE Gateway Health API
 */

import { NextResponse } from 'next/server';

const HEALTH_API_BASE = process.env.HEALTH_API_URL || 'http://localhost:8090';

export async function GET() {
  try {
    const response = await fetch(`${HEALTH_API_BASE}/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch health:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Failed to connect to EDGE Gateway',
      },
      { status: 503 }
    );
  }
}
