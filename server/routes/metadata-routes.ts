import express from 'express';
import { metadataController } from '../controllers/metadata-controller';

const router = express.Router();

// Routes pour les métadonnées
router.get('/metadata', metadataController.getMetadata.bind(metadataController));
router.get('/metadata/coaches', metadataController.getCoaches.bind(metadataController));
router.get('/metadata/levels', metadataController.getLevels.bind(metadataController));

export default router;
