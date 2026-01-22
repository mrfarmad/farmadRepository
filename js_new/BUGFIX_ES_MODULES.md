# Bug Fix: ES Module Syntax in Launcher Scripts

## Issue

Both `start.js` and `start-dashboard.js` had mixed CommonJS and ES module syntax, causing errors:

```
ReferenceError: require is not defined in ES module scope
```

**Root Cause:** The project's `package.json` contains `"type": "module"`, which makes all `.js` files use ES module syntax by default. The launcher scripts were initially written with CommonJS syntax (`require`, `module.exports`, `__dirname`), which is incompatible with ES modules.

## Files Fixed

1. ✅ `start.js` - Gateway launcher
2. ✅ `start-dashboard.js` - Dashboard launcher

## Changes Made

### 1. Import Statements

**Before (CommonJS):**
```javascript
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
```

**After (ES Modules):**
```javascript
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
```

### 2. __dirname Replacement

**Problem:** ES modules don't have `__dirname` available.

**Solution:** Create it from `import.meta.url`:
```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3. Entry Point Detection

**Before (CommonJS):**
```javascript
if (require.main === module) {
  main();
}
```

**After (ES Modules):**
```javascript
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
```

### 4. Export Syntax

**Before (CommonJS):**
```javascript
module.exports = { main, parseArgs };
```

**After (ES Modules):**
```javascript
export { main, parseArgs };
```

## Testing

### Test start.js

```bash
cd js_new
node start.js --help
```

**Expected Output:**
```
EDGE Gateway - Universal Launcher

Usage:
  node start.js [options]

Options:
  --offline, --offline-mode     Run in offline mode (no Modbus hardware)
  --disable-telegram            Disable Telegram bot
  --disable-websocket           Disable WebSocket server
  --help, -h                    Show this help message
...
```

### Test start-dashboard.js

```bash
cd js_new
node start-dashboard.js
```

**Expected Behavior:**
- Checks for dashboard directory
- Installs dependencies if needed
- Starts Next.js development server

## Technical Details

### Why package.json has "type": "module"

The backend TypeScript code compiles to ES modules (`.js` files with `import`/`export` syntax). Setting `"type": "module"` in `package.json` tells Node.js to treat all `.js` files as ES modules.

### Alternative Solutions Considered

1. **Rename to .cjs** - Could rename launcher scripts to `.cjs` to use CommonJS
   - ❌ Not chosen: Less elegant, requires updating documentation

2. **Remove "type": "module"** - Could remove from package.json
   - ❌ Not chosen: Would break compiled TypeScript output

3. **Use ES modules** - Convert launchers to ES module syntax
   - ✅ Chosen: Consistent with project, modern approach

### Cross-Platform Compatibility

The entry point detection works on both Windows and Unix systems:

```javascript
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
```

- `process.argv[1]` - Path to executed script
- `path.resolve()` - Normalizes path separators (\ on Windows, / on Unix)
- `__filename` - Absolute path to current file

## Status

✅ **Fixed and Tested**

Both launcher scripts now work correctly with ES module syntax and can be executed directly:

```bash
# Gateway
node start.js
node start.js --offline
node start.js --help

# Dashboard
node start-dashboard.js
```

## Related Files

- `js_new/package.json` - Contains `"type": "module"`
- `js_new/tsconfig.json` - TypeScript config (compiles to ES modules)
- `js_new/dist/index.js` - Compiled ES module entry point

## Date

2026-01-22
