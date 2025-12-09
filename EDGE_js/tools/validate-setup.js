#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..');
const configPath = path.join(base, 'config', 'app_config.yaml');
if (fs.existsSync(configPath)) {
  console.log('✅ Configuration found');
} else {
  console.log('❌ Missing configuration');
}
