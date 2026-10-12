const { z } = require('zod');
const { sendError } = require('../utils/apiError');
const { BODY_REGION_CODES } = require('../utils/bodyRegions');

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

// AUTH-12: minimum length 10, at least one letter and one digit. Shared by
// registration and password change so the two can never drift apart.
const passwordPolicy = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

// AUTH-18: validated by asking the runtime's own ICU time zone database to
// accept it -- Intl.DateTimeFormat throws for a genuinely invalid zone but,
// unlike Intl.supportedValuesOf('timeZone'), also accepts legacy aliases
// the canonical list doesn't enumerate (e.g. "Asia/Kolkata", which some
// ICU builds only list as "Asia/Calcutta").
function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().trim().email('A valid email address is required').max(255),
  password: passwordPolicy,
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  chronic_conditions: z.any().optional(),
  user_tier: z.string().max(50).optional(),
  timezone: z
    .string()
    .max(100)
    .refine(isValidTimeZone, { message: 'Unrecognized IANA time zone' })
    .optional()
});

const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

// AUTH-15: change password while authenticated.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordPolicy
});

// AUTH-13: request a password reset by email. Always accepted (no
// enumeration signal either way -- see authRoutes.js forgot-password).
const forgotPasswordSchema = z.object({
  email: z.string().trim().email('A valid email address is required')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordPolicy
});

// AUTH-18: dedicated endpoint for changing the profile time zone post-registration.
const timezoneSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, { message: 'Unrecognized IANA time zone' })
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

// ENTRY-11: server-side validation of every symptom-entry field,
// independent of whatever the client already checked. ENTRY-8 (body
// region) and ENTRY-10 (follow-up link) are enforced here as field shape;
// ENTRY-10's ownership check (the linked entry must belong to the same
// patient) happens in the route handler, since Zod has no DB access.
const scoreField = (max = 10) => z.coerce.number().min(0).max(max).optional();

const entryFields = {
  symptom_id: z.coerce.number().int().positive().optional(),
  symptom_name: z.string().trim().min(1).max(255).optional(),
  symptom_category: z.string().trim().max(100).optional(),
  description: z.string().max(5000).optional(),
  severity: z.coerce.number().int().min(1, 'Severity must be between 1 and 10').max(10, 'Severity must be between 1 and 10'),
  body_location: z.string().trim().max(150).optional(),
  body_region_code: z
    .string()
    .refine((v) => BODY_REGION_CODES.has(v), { message: 'Unrecognized body region code' })
    .optional(),
  trigger: z.string().trim().max(255).optional(),
  started_at: z.coerce.date().optional(),
  ended_at: z.coerce.date().optional(),
  follow_up_to_entry_id: z.coerce.number().int().positive().optional(),
  emotion_score: scoreField(),
  energy_level: scoreField(),
  stress_level: scoreField(),
  sleep_quality: scoreField(),
  functional_impairment: scoreField(),
  urgency_score: scoreField(100)
};

const entryBaseSchema = z.object(entryFields);

const entryCreateSchema = entryBaseSchema
  .refine((data) => data.symptom_id || data.symptom_name, {
    message: 'Either symptom_id or symptom_name is required',
    path: ['symptom_name']
  })
  .refine((data) => !data.started_at || !data.ended_at || data.ended_at >= data.started_at, {
    message: 'ended_at must be on or after started_at',
    path: ['ended_at']
  });

const entryUpdateSchema = entryBaseSchema.partial();

// APPT-7: future-only booking. A grace window (5 minutes) absorbs the
// gap between the patient picking "now" in the UI and the request
// actually reaching the server, rather than rejecting a booking the
// patient made in good faith a few seconds ago.
const FUTURE_BOOKING_GRACE_MS = 5 * 60 * 1000;
const appointmentCreateSchema = z.object({
  entry_id: z.coerce.number().int().positive().optional().nullable(),
  doctor_name: z.string().trim().max(255).optional(),
  doctor_id: z.coerce.number().int().positive().optional().nullable(),
  specialty: z.string().trim().max(255).optional(),
  scheduled_at: z.coerce.date().refine((d) => d.getTime() >= Date.now() - FUTURE_BOOKING_GRACE_MS, {
    message: 'Appointments can only be booked for a future date and time'
  }),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional()
});

const appointmentUpdateSchema = z.object({
  entry_id: z.coerce.number().int().positive().optional().nullable(),
  doctor_name: z.string().trim().max(255).optional(),
  doctor_id: z.coerce.number().int().positive().optional().nullable(),
  specialty: z.string().trim().max(255).optional(),
  scheduled_at: z.coerce
    .date()
    .refine((d) => d.getTime() >= Date.now() - FUTURE_BOOKING_GRACE_MS, {
      message: 'Appointments can only be rescheduled to a future date and time'
    })
    .optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional()
});

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  timezoneSchema,
  reminderSchema,
  reportGenerateSchema,
  isValidTimeZone,
  entryCreateSchema,
  entryUpdateSchema,
  appointmentCreateSchema,
  appointmentUpdateSchema
};
