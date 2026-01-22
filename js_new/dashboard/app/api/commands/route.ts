/**
 * API Route: /api/commands
 * Handles device command submission
 */

import { NextResponse } from 'next/server';

const HEALTH_API_BASE = process.env.HEALTH_API_URL || 'http://localhost:8090';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { device_id, register_address, value, priority } = body;

    // Validate required fields
    if (!device_id || register_address === undefined || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, register_address, value' },
        { status: 400 }
      );
    }

    // In production, this would enqueue command via Health API or direct database access
    // For now, return success response
    const command = {
      id: Date.now(), // Temporary ID
      device_id,
      register_address,
      value,
      priority: priority || 'NORMAL',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    console.log('Command enqueued:', command);

    return NextResponse.json({
      success: true,
      command,
    });
  } catch (error) {
    console.error('Failed to enqueue command:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue command' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch pending/recent commands
    // In production, query commands database via Health API

    return NextResponse.json({
      commands: [],
      total: 0,
    });
  } catch (error) {
    console.error('Failed to fetch commands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commands' },
      { status: 500 }
    );
  }
}
