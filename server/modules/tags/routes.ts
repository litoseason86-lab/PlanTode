import {Router} from 'express';

import {handleHttpError} from '../../shared/http/handleHttpError';
import {getUserContext} from '../../shared/http/userContext';
import {parseTagBody, parseTagId} from './schemas';
import {TagsService} from './service';

export function buildTagRoutes(service: TagsService): Router {
  const router = Router();

  router.get('/tags', (_req, res) => {
    try {
      const {userId} = getUserContext();
      res.json(service.list(userId));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.post('/tags', (req, res) => {
    try {
      const {userId} = getUserContext();
      const body = parseTagBody(req.body);
      res.status(201).json(service.create({userId, name: body.name}));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.patch('/tags/:id', (req, res) => {
    try {
      const {userId} = getUserContext();
      const tagId = parseTagId(req.params.id);
      const body = parseTagBody(req.body);
      res.json(service.update({tagId, userId, name: body.name}));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.delete('/tags/:id', (req, res) => {
    try {
      const {userId} = getUserContext();
      const tagId = parseTagId(req.params.id);
      service.delete(tagId, userId);
      res.status(204).send();
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  return router;
}
