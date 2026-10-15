// TEST-6: Frontend Component & Logic Unit Tests
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('TEST-6 / UI-9: Body region codes alignment with backend', () => {
  const logSymptomPath = path.resolve(__dirname, '../pages/LogSymptom.jsx');
  const content = fs.readFileSync(logSymptomPath, 'utf8');

  // Verify key clinical body regions exist in intake
  const requiredRegions = [
    'head_front',
    'chest',
    'abdomen',
    'arm_left',
    'arm_right',
    'leg_left_front',
    'leg_right_front',
    'upper_back',
    'lower_back'
  ];

  for (const reg of requiredRegions) {
    assert.ok(
      content.includes(`code: '${reg}'`),
      `Body region code ${reg} must be present in LogSymptom intake`
    );
  }
});

test('TEST-6 / Section 11: Clinical design system token compliance', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Must declare self-hosted fonts
  assert.ok(cssContent.includes('Source Sans 3'), 'Must use Source Sans 3 for body');
  assert.ok(cssContent.includes('Source Serif 4'), 'Must use Source Serif 4 for clinical headings');
  assert.ok(cssContent.includes('IBM Plex Mono'), 'Must use IBM Plex Mono for telemetry');

  // Must declare clinical tokens (#F6F4EF light, #1D5B4A primary)
  assert.ok(cssContent.includes('#F6F4EF') || cssContent.includes('#f6f4ef'), 'Must define NHS/GOV.UK light bg token #F6F4EF');
  assert.ok(cssContent.includes('#1D5B4A') || cssContent.includes('#1d5b4a'), 'Must define clinical primary token #1D5B4A');

  // Prohibited patterns check
  assert.ok(!cssContent.includes('backdrop-filter: blur(20px)'), 'Glassmorphism blur is prohibited by Section 11.2');
  assert.ok(!cssContent.includes('#4f46e5'), 'Indigo/purple brand gradient is prohibited by Section 11.2');
});

test('TEST-6 / CLIN-4: Hedged clinical phrasing validation', () => {
  const logSymptomCode = fs.readFileSync(path.resolve(__dirname, '../pages/LogSymptom.jsx'), 'utf8');
  const insightsCode = fs.readFileSync(path.resolve(__dirname, '../pages/Insights.jsx'), 'utf8');

  // LogSymptom must use hedged non-diagnostic disclaimer
  assert.ok(
    logSymptomCode.includes('may be consistent with'),
    'LogSymptom must use hedged copy "may be consistent with"'
  );

  // Insights must use hedged association wording ("may be associated with", never causal diagnosis)
  assert.ok(
    insightsCode.includes('may be associated with'),
    'Insights must use hedged association phrasing "may be associated with"'
  );

  // Ensure diagnostic certainty strings are NOT present
  assert.ok(!logSymptomCode.includes('You definitely have'));
  assert.ok(!insightsCode.includes('You definitely have'));
});

test('TEST-6 / A11Y-1..8: Accessibility attributes & ARIA roles', () => {
  const dashboardPath = path.resolve(__dirname, '../pages/Dashboard.jsx');
  const medicationsPath = path.resolve(__dirname, '../pages/Medications.jsx');
  const sidebarPath = path.resolve(__dirname, '../components/Sidebar.jsx');

  const dashContent = fs.readFileSync(dashboardPath, 'utf8');
  const medContent = fs.readFileSync(medicationsPath, 'utf8');
  const sideContent = fs.readFileSync(sidebarPath, 'utf8');

  // Check for proper ARIA roles
  assert.ok(medContent.includes('role="alertdialog"'), 'Medication alarm must use role="alertdialog" for focus trapping');
  assert.ok(sideContent.includes('aria-label="Primary navigation"'), 'Sidebar must provide primary navigation aria-label');
  assert.ok(dashContent.includes('aria-label="Active symptoms table"'), 'Dashboard must label active symptoms table');
});
