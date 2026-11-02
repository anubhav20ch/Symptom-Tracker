# SymptomLog — Demo Account Credentials

Complete reference for demo logins across the **Patient Application**, **Physician Portal**, **Admin Control Center**, and **Caregiver Share Views**.

---

## 1. Patient Application (`http://localhost:5173/login`)

| Patient Name | Primary Email | Password | Clinical Profile | Supported Aliases |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Chen** *(Primary Demo)* | `demo@symptomlog.com` | `password123` | Migraine & Asthma | `sarah@symptomlog.com`, `sarah.chen@symptomlog.com` |
| **Marcus Brody** | `marcus@symptomlog.com` | `password123` | Hypertension & Lower Back Pain | `marcus@example.com` |
| **Elena Rostova** | `elena@symptomlog.com` | `password123` | Dermatology & Eczema | `elena@example.com` |

> 💡 **Quick Fill**: Click any of the **👤 Sarah**, **👤 Marcus**, or **👤 Elena** quick-fill buttons on the login screen to sign in instantly.

---

## 2. Physician Portal (`http://localhost:5173/doctor/login`)

| Physician Name | Specialty | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Dr. Jennifer Vance, MD** | Neurology (`NPI-1023456789`) | `jennifer.vance@symptomlog.com` | `doctor123` |
| **Dr. Robert Sterling, MD** | Pulmonology (`NPI-1098765432`) | `robert.sterling@symptomlog.com` | `doctor123` |
| **Dr. Amelia Ferreira, MD** | Dermatology (`NPI-1076543210`) | `amelia.ferreira@symptomlog.com` | `doctor123` |

> 💡 **Doctor Quick Fill**: Click **🩺 Dr. Vance**, **🩺 Dr. Sterling**, or **🩺 Dr. Ferreira** on the physician login screen for 1-click access.

---

## 3. Admin Control Center (`http://localhost:5173/admin/login`)

| Role | Administrator Name | Email Address | Master Password |
| :--- | :--- | :--- | :--- |
| **Chief Administrator** | Chief System Administrator | `admin@symptomlog.com` | `admin123` |

---

## 4. Caregiver Public Share View

| Linked Patient | Share Token | Direct Access Link | Status |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `demo-caregiver-share-sarah-2026` | [View Caregiver Summary](http://localhost:5173/share/demo-caregiver-share-sarah-2026) | Active (30-day token) |
