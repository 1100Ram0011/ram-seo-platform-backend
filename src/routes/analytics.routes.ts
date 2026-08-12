import { Router } from 'express';
import { getGa4Overview, getGa4Properties, googleLogin, googleCallback } from '../controllers/analytics.controller';

const router = Router();

router.get('/auth/google', googleLogin);
router.get('/auth/google/callback', googleCallback);
router.post('/properties', getGa4Properties);
router.post('/report', getGa4Overview);

export default router;
