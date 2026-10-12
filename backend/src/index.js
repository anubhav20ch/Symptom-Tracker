const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { validateEnv } = require('./config/env');
const config = validateEnv();

const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const axios = require('axios');

const { initDB, getDbMode, getPool, getSqlite } = require('./config/db');
const { authLimiter, nlpLimiter } = require('./middleware/rateLimit');

// Route imports
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const entryRoutes = require('./routes/entryRoutes');
const nlpRoutes = require('./routes/nlpRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const reportRoutes = require('./routes/reportRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const caregiverRoutes = require('./routes/caregiverRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pushRoutes = require('./routes/pushRoutes');
const { startReminderScheduler } = require('./services/reminderScheduler');

const app = express();

// Security hardening: HTTP security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
// CSP is opt-in via ENABLE_CSP once a policy tailored to the frontend's asset
// origins has been defined, so it doesn't break the SPA by default.
app.use(
  helmet({
    contentSecurityPolicy: process.env.ENABLE_CSP === 'true' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Strict CORS allowlist (required for credentialed refresh-token cookies to work)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
    },
    credentials: true
  })
);

app.use(cookieParser());
// SEC-19: a tighter limit on JSON bodies than on multipart uploads (which
// set their own, larger limits per-route via multer, e.g. adminRoutes.js).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// Brute-force protection on auth & NLP endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/nlp', nlpLimiter);

// Static uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// OpenAPI documentation (API-2)
const openapiDoc = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

// Liveness probe (OBS-2): always 200 while the process is up. Checks
// nothing else — use /api/ready for dependency checks.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SymptomLog Backend API',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (OBS-2): 200 only if the database and ML microservice are
// both reachable. Used by orchestration to gate traffic, not just liveness.
app.get('/api/ready', async (req, res) => {
  const checks = { database: false, mlService: false };

  try {
    if (getDbMode() === 'postgres' && getPool()) {
      await getPool().query('SELECT 1');
    } else {
      getSqlite().prepare('SELECT 1').get();
    }
    checks.database = true;
  } catch (err) {
    req.log.warn({ err: err.message }, 'readiness check: database unreachable');
  }

  try {
    await axios.get(`${config.mlServiceUrl}/health`, { timeout: 2000 });
    checks.mlService = true;
  } catch (err) {
    req.log.warn({ err: err.message }, 'readiness check: ML service unreachable');
  }

  const ready = checks.database && checks.mlService;
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? 'ready' : 'not_ready', checks, db_mode: getDbMode() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/nlp', nlpRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/push', pushRoutes);

// Global 404 handler for API (API-1 envelope)
app.use('/api/*', notFoundHandler);

// Global error handler (API-1 envelope) — must be registered last
app.use(errorHandler);

// Server Initialization
async function startServer() {
  try {
    await initDB();
    startReminderScheduler();
    app.listen(config.port, () => {
      logger.info(
        { port: config.port, dbMode: getDbMode(), nodeEnv: config.nodeEnv },
        'SymptomLog backend started'
      );
    });
  } catch (err) {
    logger.fatal({ err: err.message }, 'failed to start server');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
