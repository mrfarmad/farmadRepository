import { Router } from 'express';
import { deviceStore } from '../store/deviceStore.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ devices: deviceStore.all() });
});

router.post('/', (req, res) => {
  const { id, name, location, firmware } = req.body;
  if (!id || !name) {
    return res.status(400).json({ message: 'id and name are required' });
  }

  const device = deviceStore.upsert({ id, name, location, firmware });
  res.status(201).json({ device });
});

export default router;