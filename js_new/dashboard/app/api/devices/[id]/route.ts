/**
 * API Route: /api/devices/[id]
 * Fetches specific device configuration
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_PATH = path.join(process.cwd(), '..', 'config', 'devices.yaml');

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = Number(params.id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device id' },
        { status: 400 }
      );
    }

    const fileContents = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(fileContents) as { devices?: Array<Record<string, unknown>> };
    const devices = parsed?.devices ?? [];
    const device = devices.find(
      (item) => Number(item.device_id) === deviceId
    );

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error(`Failed to fetch device ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch device data' },
      { status: 500 }
    );
  }
}
