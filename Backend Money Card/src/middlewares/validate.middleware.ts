import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export interface RequestValidators {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: RequestValidators) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Record<string, any>;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, any>;
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorDetails = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        const primaryMessage = err.errors[0]?.message || 'Invalid request payload';
        return sendError(res, 400, 'VALIDATION_ERROR', primaryMessage, errorDetails);
      }
      return sendError(res, 400, 'VALIDATION_ERROR', 'Malformed request payload');
    }
  };
}
