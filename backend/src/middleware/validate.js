const { z } = require('zod');
const { sendError } = require('../utils/apiError');

// Wraps a Zod schema into Express middleware: on failure, responds 400 with
// every validation issue (field path + message only — never the submitted
// value, so health content never ends up in an error response or log)
// instead of letting bad input reach a route handler that only checks
// truthiness (e.g. a malformed email or an out-of-range age silently
// stored as-is).
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message
      }));
      return sendError(res, 400, 'Validation failed', { code: 'VALIDATION_ERROR', details });
    }
    req.body = result.data;
    next();
  };
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().trim().email('A valid email address is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  chronic_conditions: z.any().optional(),
  user_tier: z.string().max(50).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

const reminderSchema = z.object({
  scheduled_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'scheduled_time must be in 24h HH:MM format, e.g. 09:00'),
  label: z.string().trim().min(1).max(255).optional(),
  medication_id: z.coerce.number().int().positive().optional().nullable(),
  reminder_type: z.string().max(50).optional(),
  duration_days: z.coerce.number().int().positive().max(3650).optional().nullable(),
  sound_alarm: z.boolean().optional()
});

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// start_date/end_date are required rather than optional: a report silently
// generated for "all time" when no range was picked looked like it had
// respected the (empty) form, when it had actually ignored it.
const reportGenerateSchema = z
  .object({
    start_date: z.string().regex(DATE_ONLY, 'A start date is required (YYYY-MM-DD)'),
    end_date: z.string().regex(DATE_ONLY, 'An end date is required (YYYY-MM-DD)'),
    title: z.string().trim().min(1).max(255).optional()
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: 'Start date must be on or before the end date',
    path: ['start_date']
  });

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  reminderSchema,
  reportGenerateSchema
};
