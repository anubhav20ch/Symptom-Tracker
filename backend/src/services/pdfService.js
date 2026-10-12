const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { MEDICAL_DISCLAIMER } = require('./classificationEngine');

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Generates a clean, doctor-ready PDF report from patient symptom entries and medications.
 */
async function generateDoctorReport({
  user,
  entries,
  medications,
  appointments = [],
  startDate,
  endDate,
  title = 'Patient Clinical Symptom Summary'
}) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `report_${user.id}_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      const fileUrl = `/uploads/reports/${fileName}`;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: title,
          Author: 'SymptomLog Clinical Report Generator',
          Subject: `Symptom report for ${user.name}`
        }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- HEADER ---
      doc.rect(40, 40, 515, 60).fill('#0f172a');

      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('SymptomLog Clinical Summary', 55, 52);

      doc
        .fillColor('#94a3b8')
        .fontSize(10)
        .font('Helvetica')
        .text('Comprehensive Patient Longitudinal Symptom History & Trigger Report', 55, 76);

      doc.moveDown(3);

      // --- PATIENT PROFILE CARD ---
      let y = 115;
      doc.rect(40, y, 515, 75).fill('#f8fafc');
      doc.rect(40, y, 515, 75).stroke('#cbd5e1');

      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Patient Demographics:', 55, y + 10);

      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(`Name: ${user.name}`, 55, y + 28);
      doc.text(
        `Age: ${user.age || 'Not specified'} | Gender: ${user.gender || 'Not specified'}`,
        55,
        y + 43
      );
      doc.text(`Email: ${user.email}`, 55, y + 58);

      let chronicList = 'None documented';
      try {
        const parsed =
          typeof user.chronic_conditions === 'string'
            ? JSON.parse(user.chronic_conditions)
            : user.chronic_conditions;
        if (Array.isArray(parsed) && parsed.length > 0) chronicList = parsed.join(', ');
      } catch (e) {
        chronicList = user.chronic_conditions || 'None documented';
      }

      doc.text(
        `Report Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'All time'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`,
        280,
        y + 28
      );
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 280, y + 43);
      doc
        .fillColor('#b91c1c')
        .font('Helvetica-Bold')
        .text(`Chronic Conditions: `, 280, y + 58, { continued: true });
      doc.fillColor('#334155').font('Helvetica').text(chronicList);

      y += 90;

      // --- SUMMARY METRICS ---
      doc.rect(40, y, 515, 45).fill('#f1f5f9');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);

      const totalEntries = entries.length;
      const avgSev =
        totalEntries > 0
          ? (entries.reduce((sum, e) => sum + e.severity, 0) / totalEntries).toFixed(1)
          : 0;
      const urgentCount = entries.filter((e) => e.classification_type === 'urgent').length;
      const recurringCount = entries.filter((e) => e.classification_type === 'recurring').length;

      doc.text(`Total Entries: ${totalEntries}`, 55, y + 10);
      doc.text(`Avg Severity: ${avgSev} / 10`, 180, y + 10);
      doc.text(`Recurring Alerts: ${recurringCount}`, 300, y + 10);
      doc.text(`Urgent Red Flags: ${urgentCount}`, 420, y + 10);

      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b');
      doc.text(
        'Entries categorized by automated clinical rule engine and natural language analysis.',
        55,
        y + 28
      );

      y += 60;

      // --- ACTIVE MEDICATIONS ---
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Current Medications & Regimen', 40, y);
      y += 18;

      if (medications && medications.length > 0) {
        medications.forEach((m) => {
          doc
            .fillColor('#1e293b')
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(`• ${m.name}`, 50, y, { continued: true });
          doc
            .font('Helvetica')
            .fillColor('#475569')
            .text(
              ` — ${m.dosage || ''} (${m.frequency || ''}) [Started: ${m.started_at ? new Date(m.started_at).toLocaleDateString() : 'N/A'}]`
            );
          y += 14;
        });
      } else {
        doc
          .fillColor('#64748b')
          .font('Helvetica-Oblique')
          .fontSize(9)
          .text('No active medications recorded.', 50, y);
        y += 14;
      }

      y += 15;

      // --- DOCTOR VISIT & APPOINTMENT HISTORY ---
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Doctor Visit & Appointment History', 40, y);
      y += 18;

      const pastAppointments = (appointments || []).filter((a) => a.status !== 'scheduled');
      const upcomingAppointments = (appointments || []).filter((a) => a.status === 'scheduled');

      if (pastAppointments.length === 0 && upcomingAppointments.length === 0) {
        doc
          .fillColor('#64748b')
          .font('Helvetica-Oblique')
          .fontSize(9)
          .text('No appointment history recorded for this period.', 50, y);
        y += 14;
      } else {
        pastAppointments.forEach((appt) => {
          if (y > 710) {
            doc.addPage();
            y = 50;
          }

          const dateStr = new Date(appt.scheduled_at).toLocaleDateString();
          const statusLabel = (appt.status || 'completed').toUpperCase();
          const statusColor = appt.status === 'cancelled' ? '#dc2626' : '#15803d';

          doc
            .fillColor('#1e293b')
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(`${dateStr} — ${appt.doctor_name || 'Unspecified Physician'}`, 50, y, {
              continued: true
            });
          doc
            .font('Helvetica')
            .fillColor('#475569')
            .text(`  (${appt.specialty || 'General'})  `, { continued: true });
          doc.font('Helvetica-Bold').fillColor(statusColor).text(statusLabel);
          y += 12;

          if (appt.notes) {
            doc
              .font('Helvetica')
              .fillColor('#475569')
              .fontSize(8.5)
              .text(appt.notes, 58, y, { width: 480 });
            y += doc.heightOfString(appt.notes, { width: 480 }) + 8;
          } else {
            y += 8;
          }
        });

        if (upcomingAppointments.length > 0) {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          y += 4;
          doc
            .fillColor('#0369a1')
            .font('Helvetica-Bold')
            .fontSize(9)
            .text('Upcoming Scheduled Visits:', 50, y);
          y += 13;
          upcomingAppointments.forEach((appt) => {
            const dateStr = new Date(appt.scheduled_at).toLocaleDateString();
            doc
              .font('Helvetica')
              .fillColor('#334155')
              .fontSize(8.5)
              .text(
                `• ${dateStr} — ${appt.doctor_name || 'Unspecified Physician'} (${appt.specialty || 'General'})${appt.notes ? ': ' + appt.notes : ''}`,
                58,
                y,
                { width: 480 }
              );
            y +=
              doc.heightOfString(
                `• ${dateStr} — ${appt.doctor_name || 'Unspecified Physician'} (${appt.specialty || 'General'})${appt.notes ? ': ' + appt.notes : ''}`,
                { width: 480 }
              ) + 6;
          });
        }
      }

      y += 15;

      // --- SYMPTOM EPISODES TABLE ---
      if (y > 680) {
        doc.addPage();
        y = 50;
      }
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Logged Symptom Episodes', 40, y);
      y += 20;

      // Table Header
      doc.rect(40, y, 515, 20).fill('#e2e8f0');
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5);
      doc.text('Date', 45, y + 5);
      doc.text('Symptom', 105, y + 5);
      doc.text('Sev.', 200, y + 5);
      doc.text('Location / Trigger', 230, y + 5);
      doc.text('Classification & Notes', 360, y + 5);

      y += 24;

      // Table Rows
      entries.slice(0, 20).forEach((entry, idx) => {
        // Page break if needed
        if (y > 720) {
          doc.addPage();
          y = 50;
        }

        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.rect(40, y - 2, 515, 26).fill('#f8fafc');
        }

        const dateStr = new Date(entry.started_at).toLocaleDateString();
        const sevColor =
          entry.severity >= 8 ? '#dc2626' : entry.severity >= 5 ? '#d97706' : '#16a34a';

        doc.fillColor('#334155').font('Helvetica').fontSize(8);
        doc.text(dateStr, 45, y + 2);

        doc
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(entry.symptom_name || entry.name || 'Symptom', 105, y + 2, {
            width: 90,
            ellipsis: true
          });

        doc
          .fillColor(sevColor)
          .font('Helvetica-Bold')
          .text(`${entry.severity}/10`, 200, y + 2);

        const locTrig = `${entry.body_location || 'General'} | ${entry.trigger || 'No trigger'}`;
        doc
          .fillColor('#475569')
          .font('Helvetica')
          .text(locTrig, 230, y + 2, { width: 125, ellipsis: true });

        const typeLabel = `[${(entry.classification_type || 'acute').toUpperCase()}] `;
        doc
          .fillColor('#0369a1')
          .font('Helvetica-Bold')
          .text(typeLabel, 360, y + 2, { continued: true });
        doc
          .fillColor('#475569')
          .font('Helvetica')
          .text(entry.description || entry.recommendation || '', {
            width: 140,
            height: 22,
            ellipsis: true
          });

        y += 26;
      });

      // --- MEDICAL DISCLAIMER FOOTER ---
      if (y > 720) {
        doc.addPage();
        y = 50;
      } else {
        y += 20;
      }

      doc.rect(40, y, 515, 45).fill('#fef2f2');
      doc.rect(40, y, 515, 45).stroke('#fca5a5');
      doc
        .fillColor('#991b1b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('IMPORTANT MEDICAL DISCLAIMER:', 50, y + 8);
      doc
        .font('Helvetica')
        .fillColor('#7f1d1d')
        .fontSize(7.5)
        .text(
          `${MEDICAL_DISCLAIMER} This automated summary is generated strictly for patient tracking and doctor review assistance. Always seek the advice of a qualified physician with any questions you may have regarding a medical condition.`,
          50,
          y + 20,
          { width: 495 }
        );

      doc.end();

      stream.on('finish', () => {
        resolve({ filePath, fileUrl, fileName });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateDoctorReport
};
