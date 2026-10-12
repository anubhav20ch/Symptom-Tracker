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

// SEC-14: HTTP security headers, including a CSP tailored to what this
// process itself actually serves -- the API's own JSON responses (which
// need no script/style allowance at all) and the Swagger UI page at
// /api/docs (which bundles its own same-origin JS but injects inline
// <style> at runtime, hence style-src 'unsafe-inline'). This is a
// different, narrower policy than the one the frontend SPA needs, which
// is set independently by nginx (see frontend/nginx.conf) since nginx --
// not this process -- is what serves the SPA's HTML document.
// ENABLE_CSP=false remains available as an escape hatch, not the default.
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.ENABLE_CSP === 'false'
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              // This app isn't served over TLS yet (see docs known
              // limitations); upgrading subresources to https here would
              // be premature, not protective.
              upgradeInsecureRequests: null
            }
          },
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

// SEC-16: uploads are never served statically. Every attachment and report
// file is read only through its authenticated, ownership-checked route
// (GET /api/entries/:id/attachments/:attachmentId/file and
// GET /api/reports/:id/file) -- this just ensures the directory exists for
// multer/pdfkit to write into.
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
