import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

export function sanitizeQuery(req, res, next) {
  const dangerousPatterns = ['$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$regex', '$where', '$exists'];

  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (dangerousPatterns.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.query) sanitize(req.query);
  if (req.body) sanitize(req.body);
  next();
}
