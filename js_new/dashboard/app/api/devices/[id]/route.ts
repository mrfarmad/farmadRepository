/**
 * API Route: /api/devices/[id]
 * Fetches specific device data and history
 */

import { NextResponse } from 'next/server';

const HEALTH_API_BASE = process.env.HEALTH_API_URL || 'http://localhost:8090';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;

    // In production, this would fetch from the database via Health API
    // For now, return a structured response
    const response = await fetch(`${HEALTH_API_BASE}/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health API returned ${response.status}`);
    }

    const healthData = await response.json();

    // Return device-specific data structure
    return NextResponse.json({
      device_id: parseInt(deviceId),
      status: healthData.status,
      timestamp: healthData.timestamp,
      // Additional device data would come from database queries
    });
  } catch (error) {
    console.error(`Failed to fetch device ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch device data' },
      { status: 500 }
    );
  }
}
