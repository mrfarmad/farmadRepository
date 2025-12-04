import { Router } from 'express';
import { deviceStore } from '../store/deviceStore.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    uptime: process.uptime(),
    devices: deviceStore.all().length,
    timestamp: new Date().toISOString()
  });
});

export default router;