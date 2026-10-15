# SymptomLog — Clinical Design System Specification (SRS v1.1 Section 11)

Author: Anubhav Choudhary (24BYB1090) — Date: October 2026

---

## 1. Design Intent & Principles

SymptomLog is designed strictly to read as a clinical record and patient portal, inspired by NHS digital service standards and GOV.UK design patterns:
1. **Clinical Utility First**: Dense, scannable layouts using 1px borders rather than heavy drop shadows.
2. **Neutral & Hedged Copy**: No exclamation marks, no emoji, and all predictive outputs use hedged phrasing ("may be consistent with", never diagnostic certainty — CLIN-4).
3. **Inclusive Accessibility**: WCAG 2.1 AA compliance across light and dark modes, explicit focus rings, keyboard navigability, and full screen-reader announcements.
4. **Self-Hosted Privacy**: No external font tracking or CDN dependencies. All typography is hosted locally through `@fontsource`.

---

## 2. Explicitly Prohibited Patterns (Section 11.2)

The frontend strictly enforces the exclusion of generic SaaS templates:
- **No glassmorphism**: No `backdrop-filter: blur()`.
- **No purple or indigo gradients**: Brand accents use NHS-inspired forest green `#1D5B4A` and slate borders `#DDD8CC`.
- **No emoji anywhere**: All iconography uses Lucide SVG icons (16–18px, 1.75 stroke) inline with descriptive text.
- **No floating device mockups or marketing hero strips**.
- **No default Tailwind/Material blue** as the brand primary.
- **No playful error copy or "Welcome back" greetings**.

---

## 3. Design Tokens

### 3.1 Typography
All font assets are installed locally via `@fontsource` and bundled within the production package:
- **Body & Interface**: `Source Sans 3` (`@fontsource/source-sans-3`), 400/600/700 weight.
- **Headings & Clinical Results**: `Source Serif 4` (`@fontsource/source-serif-4`), 600/700 weight.
- **Telemetry, IDs & Data**: `IBM Plex Mono` (`@fontsource/ibm-plex-mono`), 400/500 weight with `font-variant-numeric: tabular-nums`.

### 3.2 Light Mode Tokens (Normative)
| Token Variable | Hex Value | Purpose |
|---|---|---|
| `--bg-canvas` | `#F6F4EF` | Global canvas background |
| `--bg-surface` | `#FFFFFF` | Card & panel background |
| `--bg-surface-subtle` | `#F0ECE1` | Table headers & callout backgrounds |
| `--border-default` | `#DDD8CC` | Standard structural borders (1px) |
| `--border-muted` | `#E8E4DA` | Internal divider lines |
| `--text-primary` | `#1B2430` | High-contrast body & heading text |
| `--text-muted` | `#5B6572` | Secondary labels & hints |
| `--primary` | `#1D5B4A` | Clinical primary accent |
| `--primary-hover` | `#164838` | Hover state |
| `--caution-text` | `#8A5A00` | Moderate risk notices (on `#FFF4DB`) |
| `--danger-text` | `#A3262A` | Urgent/Emergency indicators (on `#FDECEC`) |
| `--success-text` | `#1D6B3A` | Completed/Compliant confirmations |
| `--focus-ring` | `2px solid #1D5B4A` | Keyboard focus ring (offset 2px) |

### 3.3 Dark Mode Tokens (Normative)
| Token Variable | Hex Value | Purpose |
|---|---|---|
| `--bg-canvas` | `#12171C` | Deep dark slate canvas |
| `--bg-surface` | `#1A2128` | Elevated panel background |
| `--bg-surface-subtle` | `#222B34` | Subdued header background |
| `--border-default` | `#2B343D` | Dark structural borders |
| `--text-primary` | `#E6E9EC` | High-contrast text |
| `--text-muted` | `#9AA5B1` | Subdued secondary text |
| `--primary` | `#6CC3A5` | Accessible pastel green primary |

### 3.4 8-Step Severity Ramp (Numerical Pairing)
Severity is never communicated via color alone (A11Y-3). It is always paired with the numeric value:
1. Severity 1–2: `#EFE6D2` / `#E8D2A0`
2. Severity 3–4: `#E0B96B` / `#D89A45`
3. Severity 5–6: `#C97A32` / `#B85A2A`
4. Severity 7–8: `#A0402A`
5. Severity 9–10: `#7F2D2A`

---

## 4. Key Component Standards

### 4.1 Responsive Navigation (UI-6)
- **Desktop (&ge; 1024px)**: 240px persistent left sidebar with exact textual labels: `Overview`, `Log a symptom`, `History`, `Insights`, `Medicines`, `Appointments`, `Reports`, `Sharing`.
- **Mobile / Tablet (&lt; 1024px)**: Fixed bottom tab bar with 48px touch targets, scrolling horizontally if necessary.

### 4.2 Overview Layout (UI-7, DASH-1..5)
- Header with long-form localized date (e.g. `Thursday, 16 October 2026`).
- Active Symptoms table displaying duration (`3 days`), segmented 10-block severity bar, and mini-trend arrow.
- Side rail containing next appointment card, "Why am I seeing this?" triage disclosure, and 7-day adherence gauge.

### 4.3 Log Symptom Intake & Body Map (UI-8, UI-9, UI-10)
- Single-column clinical intake with real-time "What we picked up" editable chip side rail.
- Toggleable front/back body map with 23 structured clinical anatomical regions, backed by an accessible HTML select dropdown fallback.
- Triage evaluation screen with left-ruled colored tier bar, distinct geometric icon shape, hedged advice, and pre-filled appointment booking button.

### 4.4 History & Trends (UI-11, UI-12, HIST-3..5, INSIGHTS-2..4)
- Dense clinical table with column sorting (Date, Symptom, Severity, Tier), pagination controls, and inline accordion expandable rows.
- Trend chart with fixed 0–10 Y-axis (preventing visual distortion of mild variations) and discrete vertical medication start/stop markers.

### 4.5 Medications & Dose Alarm (UI-13)
- Day dose timeline (Morning, Afternoon, Evening, Bedtime).
- Focus-trapping modal `role="alertdialog"` with audio chime and Taken / Skip (with reason) / Snooze actions.
- Prominent MED-4 disclaimer: *"SymptomLog does not provide dosage advice or check drug interactions."*

### 4.6 Public Unauthenticated Pages (UI-16)
- `Home` (`/`): Modest clinical overview with clear entry points.
- `How triage works` (`/how-triage-works`): Transparent explanation of the rule engine and ML confidence gating.
- `Privacy policy` (`/privacy`): Plain language disclosure of data retention and right to erasure.
- `Medical disclaimer` (`/medical-disclaimer`): Explicit statement of non-diagnostic software scope.
- `Help & contact` (`/help`): Clinical support channels and crisis hotlines.

---

## 5. Verification & Screenshots

Responsive verification screenshots across desktop (1280px), tablet (768px), and mobile (360px) viewport widths are archived in `docs/screenshots/`:
- `overview_desktop.png` / `overview_mobile.png`
- `intake_bodymap_desktop.png`
- `triage_result_desktop.png`
- `history_table_desktop.png`
- `insights_chart_desktop.png`
- `doctor_portal_desktop.png`
- `admin_lifecycle_desktop.png`
