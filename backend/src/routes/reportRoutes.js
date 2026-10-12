const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../config/db');
const { authenticateToken, authenticatePatientOrDoctor } = require('../middleware/auth');
const { validateBody, reportGenerateSchema, REPORT_SECTIONS } = require('../middleware/validate');
const { generateDoctorReport } = require('../services/pdfService');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

function sha256File(absolutePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

// GET /api/reports - List user generated reports (API-3, PERF-5)
//
// A reports row can outlive its PDF on disk (manual cleanup, a restored
// database backup without the matching uploads folder, etc.). Serving a
// download link for a file that's actually gone means the browser lands on
// a bare "Cannot GET /uploads/..." 404 page -- which reads as a blank page
// with an error stamped on it, not as a failed download. Filtering those
// rows out here means the UI only ever offers links that will work.
// Note: `total` reflects DB rows before the on-disk existence filter, since
// that filter runs per-page; it is therefore an upper bound, not an exact
// count of downloadable reports.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query('SELECT COUNT(*) as total FROM reports WHERE user_id = $1', [
      req.user.id
    ]);
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const result = await query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY generated_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    const reports = result.rows
      .filter((r) => {
        const absolutePath = path.join(__dirname, '../../', r.file_url);
        return fs.existsSync(absolutePath);
      })
      .map((r) => ({ ...r, download_url: `/api/reports/${r.id}/file` }));

    res.json(paginatedResponse('reports', reports, total, { limit, offset }));
  } catch (err) {
    req.log?.error({ err: err.message }, 'get reports failed');
    sendError(res, 500, 'Failed to fetch reports');
  }
});

// POST /api/reports/generate - Generate new clinical PDF report
router.post(
  '/generate',
  authenticateToken,
  validateBody(reportGenerateSchema),
  async (req, res) => {
    try {
      const {
        start_date,
        end_date,
        title = 'Patient Clinical Symptom Summary',
        sections = REPORT_SECTIONS
      } = req.body;

      // end_date arrives as a bare YYYY-MM-DD date; used as-is it would act as
      // midnight at the start of that day and silently exclude every entry
      // logged later that same day. Push it to the end of the day so "to
      // October 8th" actually includes October 8th.
      const endOfDay = `${end_date}T23:59:59.999`;

      // REPORT-3: only fetch (and therefore only include) the sections the
      // patient asked for. pdfService already renders a section as empty
      // when given [], so excluding one is just never querying for it.
      let entries = [];
      if (sections.includes('symptoms')) {
        const entriesRes = await query(
          `SELECT se.*, s.name as symptom_name, s.category as symptom_category
         FROM symptom_entries se
         JOIN symptoms s ON se.symptom_id = s.id
         WHERE se.user_id = $1 AND se.started_at >= $2 AND se.started_at <= $3
         ORDER BY se.started_at DESC`,
          [req.user.id, start_date, endOfDay]
        );
        entries = entriesRes.rows;
      }

      let medications = [];
      if (sections.includes('medications')) {
        const medsRes = await query(
          'SELECT * FROM medications WHERE user_id = $1 AND (active = 1 OR active = true)',
          [req.user.id]
        );
        medications = medsRes.rows;
      }

      let appointments = [];
      if (sections.includes('appointments')) {
        const apptsRes = await query(
          `SELECT * FROM appointments
         WHERE user_id = $1 AND scheduled_at >= $2 AND scheduled_at <= $3
         ORDER BY scheduled_at DESC`,
          [req.user.id, start_date, endOfDay]
        );
        appointments = apptsRes.rows;
      }

      // Generate PDF
      const { fileUrl } = await generateDoctorReport({
        user: req.user,
        entries,
        medications,
        appointments,
        startDate: start_date,
        endDate: end_date,
        title
      });

      // REPORT-4: a content checksum, computed once right after the file
      // is written, so later tampering (or corruption) on disk can be
      // detected by comparing against this stored value.
      const uploadsDir = path.join(__dirname, '../../uploads');
      const checksum = sha256File(path.join(uploadsDir, 'reports', path.basename(fileUrl)));

      const insertRes = await query(
        `INSERT INTO reports (user_id, file_url, title, date_range_start, date_range_end, sections, checksum)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.id, fileUrl, title, start_date || null, end_date || null, JSON.stringify(sections), checksum]
      );

      let report = insertRes.rows[0];
      if (!report) {
        const fetchR = await query(
          'SELECT * FROM reports WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
          [req.user.id]
        );
        report = fetchR.rows[0];
      }

      report.download_url = `/api/reports/${report.id}/file`;
      res.status(201).json({
        message: 'Doctor-ready PDF report generated successfully',
        report,
        download_url: report.download_url
      });
    } catch (err) {
      console.error('[Generate report error]:', err);
      sendError(res, 500, 'Failed to generate PDF report');
    }
  }
);

// GET /api/reports/:id/file - SEC-16: the only way to read a report's PDF
// bytes. REPORT-5: permitted for the owning patient, or a physician who
// has an active (non-cancelled) appointment with that patient -- not any
// physician, and not a lapsed relationship (same DOCTOR_ACCESS_LOOKBACK_DAYS
// idea as DOC-12, applied here to report access specifically).
router.get('/:id/file', authenticatePatientOrDoctor, async (req, res) => {
  try {
    const reportRes = await query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = reportRes.rows[0];
    if (!report) {
      return sendError(res, 404, 'Report not found');
    }

    if (req.user) {
      if (report.user_id !== req.user.id) {
        return sendError(res, 404, 'Report not found');
      }
    } else if (req.doctor) {
      const lookbackCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const link = await query(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND user_id = $2 AND status != 'cancelled' AND scheduled_at >= $3
         LIMIT 1`,
        [req.doctor.id, report.user_id, lookbackCutoff]
      );
      if (link.rows.length === 0) {
        return sendError(res, 403, 'You do not have an active appointment with this patient', {
          code: 'NO_ACTIVE_APPOINTMENT_LINK'
        });
      }
    } else {
      return sendError(res, 401, 'Access token required');
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    const fileName = path.basename(report.file_url);
    const absolutePath = path.join(uploadsDir, 'reports', fileName);
    if (!absolutePath.startsWith(uploadsDir) || !fs.existsSync(absolutePath)) {
      return sendError(res, 404, 'Report file is missing');
    }

    // REPORT-4: verify the stored checksum still matches before serving.
    // A mismatch means the file on disk was altered or corrupted after
    // generation -- that is a hard failure, not something to serve anyway.
    if (report.checksum) {
      const currentChecksum = sha256File(absolutePath);
      if (currentChecksum !== report.checksum) {
        req.log?.error({ reportId: report.id }, 'report file checksum mismatch -- refusing to serve');
        return sendError(res, 409, 'This report file has changed since it was generated and cannot be verified.', {
          code: 'REPORT_CHECKSUM_MISMATCH'
        });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(report.title || 'report')}.pdf"`
    );
    res.sendFile(absolutePath);
  } catch (err) {
    console.error('[Report download error]:', err);
    sendError(res, 500, 'Failed to retrieve report');
  }
});

module.exports = router;
