import express from 'express';
import * as deviceController from '../controllers/deviceController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', auth, deviceController.registerDevice);
router.get('/my-devices', auth, deviceController.getMyDevices);
router.put('/:id', auth, deviceController.updateDevice);
router.post('/deactivate/:id', auth, deviceController.deactivateDevice);
router.post('/verify', auth, deviceController.verifyDevice);

export default router;
