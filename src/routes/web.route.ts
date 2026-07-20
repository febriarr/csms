import { Router } from 'express';
import homeController from '../controllers/home.controller.js';
import { NotFoundError } from '../shared/errors/not-found-error.js';

const router = Router();

router.get('/', homeController.index);

router.get('/test-error', () => {
  throw new Error('Unexpected error');
});

router.get('/test-not-found', () => {
  throw new NotFoundError('Device not found');
});

export default router;
