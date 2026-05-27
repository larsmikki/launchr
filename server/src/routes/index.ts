import { Router } from 'express';
import settings from './settings.js';
import groups from './groups.js';
import shortcuts from './shortcuts.js';
import data from './data.js';

const router = Router();

router.use(settings);
router.use(groups);
router.use(shortcuts);
router.use(data);

export default router;
