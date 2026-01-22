/**
 * API Route: /api/devices
 * Fetches and updates device configuration from config/devices.yaml
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_PATH = path.join(process.cwd(), '..', 'config', 'devices.yaml');

interface DeviceConfigPayload {
  devices: Array<{
    device_id: number;
    device_type: string;
    slave_id?: number;
    name: string;
    description?: string;
    enabled?: boolean;
    location?: string;
    room?: string;
    poll_interval?: number;
    priority?: string;
  }>;
}

async function loadDevicesFile(): Promise<DeviceConfigPayload> {
  const fileContents = await fs.readFile(CONFIG_PATH, 'utf8');
  const parsed = yaml.load(fileContents) as DeviceConfigPayload | undefined;
  return {
    devices: parsed?.devices ?? [],
  };
}

export async function GET() {
  try {
    const data = await loadDevicesFile();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as DeviceConfigPayload;
    const devices = Array.isArray(body.devices) ? body.devices : [];
    const updatedPayload: DeviceConfigPayload = { devices };

    const yamlContent = yaml.dump(updatedPayload, {
      lineWidth: 120,
      noRefs: true,
    });

    await fs.writeFile(CONFIG_PATH, yamlContent, 'utf8');

    return NextResponse.json({ success: true, devices });
  } catch (error) {
    console.error('Failed to update devices:', error);
    return NextResponse.json(
      { error: 'Failed to update devices' },
      { status: 500 }
    );
  }
}
