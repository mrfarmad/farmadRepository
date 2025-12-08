const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

function loadConfig({ root, overrideHealthPort } = {}) {
  const baseDir = root || path.join(__dirname, '..');
  const appConfigPath = path.join(baseDir, 'config', 'app_config.yaml');
  const devicesPath = path.join(baseDir, 'config', 'devices.yaml');
  const appConfig = loadYaml(appConfigPath);
  const devices = loadYaml(devicesPath);

  const healthApi = appConfig.health_api || {};
  if (overrideHealthPort) {
    healthApi.port = overrideHealthPort;
  }

  return {
    ...appConfig,
    devices,
    health_api: healthApi,
  };
}

module.exports = { loadConfig };
