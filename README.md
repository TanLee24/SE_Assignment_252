# 🚗 IoT-SPMS — Smart Parking Management System
### *"Kinetic Pulse" — CO3001 Software Engineering Assignment, Semester 252 (2025–2026)*

> **Ho Chi Minh City University of Technology (HCMUT)**  
> Faculty of Computer Science and Engineering  
> Supervisor: **Mai Đức Trung**

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Team Members](#team-members)
- [System Architecture](#system-architecture)
- [Features & Subsystems](#features--subsystems)
- [Project Structure](#project-structure)
- [Data Schema](#data-schema)
- [Running the Web App](#running-the-web-app)
- [Building the Report (LaTeX)](#building-the-report-latex)
- [Demo Accounts](#demo-accounts)
- [AI Tools Used](#ai-tools-used)
- [References](#references)

---

## 📖 Project Overview

**IoT-SPMS** (Internet of Things – Smart Parking Management System) is a university campus parking solution designed to **automate and optimize** the entire vehicle management lifecycle — from entry and exit access control to real-time slot monitoring, intelligent traffic navigation, and automated fee collection.

### 🎯 Problem Statement

University campuses face significant parking challenges:
- **Traffic congestion** at entry/exit gates during peak hours.
- **Wasted parking space** due to drivers having no visibility into slot availability.
- **Lack of real-time monitoring** — no central dashboard for staff to track occupancy.
- **Fragmented fee management** — manual collection leads to accounting errors and audit difficulties.

### ✅ Solution

IoT-SPMS resolves these problems by integrating:
- **IoT sensor networks** for real-time slot status tracking.
- **RFID/NFC card-based** automated barrier control for internal users.
- **Temporary ticket system** for guests.
- **LED signage** for dynamic traffic guidance.
- **Automated billing** integrated with the university's **BKPay** payment gateway.
- **Role-based web dashboard** for Admins, Guards, and regular Users.

---

## 👥 Team Members

| # | Full Name | Student ID | Class | Responsibilities |
|---|-----------|------------|-------|-----------------|
| 1 | **Lê Hoàng Tân** | 2313050 | L02 | System Administration & Integration; Overall Use-case Diagram |
| 2 | **Đỗ Đăng Khoa** | 2311581 | L02 | Access Control Management; Non-interactive Functional Requirements |
| 3 | **Vòng Lương Thái Tuấn** | 2313767 | L01 | IoT Monitoring & Parking Status; Non-interactive Functional Requirements |
| 4 | **Trương Hoàng Nam** | 2312202 | L01 | Traffic Navigation (Dynamic Guidance); Non-functional Requirements |
| 5 | **Nguyễn Minh Trí** | 2313602 | L02 | Billing & Payment Management; Non-functional Requirements |

---

## 🏗️ System Architecture

The system is composed of three integrated layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                        │
│              HCMUT_SSO (Auth)    HCMUT_DATACORE (User DB)      │
│                         BKPay (Payments)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ API Integration
┌──────────────────────────▼──────────────────────────────────────┐
│                       WEB APPLICATION                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │  Admin   │  │  Guard   │  │   User   │  │   Dynamic    │  │
│   │ Dashboard│  │Interface │  │  Portal  │  │  Guidance    │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Data Layer (JSON)
┌──────────────────────────▼──────────────────────────────────────┐
│                        IoT LAYER                                │
│   ┌───────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│   │  IoT Gateways │  │  Sensors    │  │  LED Signage Boards  │ │
│   │  (RFID/NFC)   │  │ (Ultrasonic)│  │  (Entry/Intersection)│ │
│   └───────────────┘  └─────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key Integration Points:**
- **HCMUT_SSO**: Single Sign-On for authentication (OAuth token-based).
- **HCMUT_DATACORE**: Read-only sync of user identity and roles.
- **BKPay**: University payment gateway with HMAC-signed webhook callbacks.

---

## ⚙️ Features & Subsystems

The system is organized into **5 major subsystems**:

### 1. 🔐 System Administration & Integration
Manages user authentication, role-based access control (RBAC), and audit logging.

| Feature | Description |
|---------|-------------|
| **SSO Login** | Authenticate via HCMUT_SSO using university email credentials |
| **User Sync** | Pull user data (read-only) from HCMUT_DATACORE |
| **Role Assignment** | Admin can assign/modify roles: `admin`, `guard`, `user` |
| **Audit Logs** | Full activity log for all sensitive operations |
| **Analytics** | Visual reports on system usage and revenue |

**Web pages:** `admin/admin_dashboard.html`, `admin/users.html`, `admin/sync.html`, `admin/logs.html`, `admin/analytics.html`

---

### 2. 🚧 Access Control Management
Automates vehicle entry/exit using RFID/NFC cards and camera-based license plate recognition (ANPR).

| Feature | Description |
|---------|-------------|
| **Card Entry** | Scan ID card → verify with HCMUT_SSO → open barrier → log session |
| **Card Exit** | Scan card → match session → verify plate → close session |
| **Guest Tickets** | Issue temporary QR-code tickets for visitors at kiosks |
| **Offline Mode** | Fallback to local cached data when network is unavailable; auto-sync when reconnected |
| **Guard Dashboard** | Manual barrier override, camera monitoring, exception handling |

**Web pages:** `admin/access_control.html`, `guard/dashboard.html`, `guard/status.html`, `guard/signage.html`

---

### 3. 📡 IoT Monitoring & Parking Status
Collects real-time data from ultrasonic sensors via IoT Gateways to track slot occupancy.

| Feature | Description |
|---------|-------------|
| **Real-time Map** | 2D floor plan with color-coded slots: 🟢 Free / 🔴 Occupied / ⚫ Fault |
| **Device Health Check** | Periodic heartbeat pings to all Gateways (configurable interval, e.g., 60s) |
| **Fault Isolation** | Automatically marks slots as "Unknown" when their Gateway goes offline; prevents false data |
| **Auto-recovery** | When a Gateway comes back online, the system re-syncs slot states |

**Web pages:** `iot_monitoring/parking.html`, `admin/iot_monitoring.html`

---

### 4. 🛣️ Dynamic Traffic Guidance
Analyzes parking capacity and broadcasts real-time navigation instructions to LED signboards.

| Feature | Description |
|---------|-------------|
| **Status Display** | Shows zone status (Available / Nearly Full / Full) on LED boards at gates |
| **Smart Routing** | Calculates and displays directional arrows to the nearest available zone |
| **Signboard Config** | Admin can add, edit, and toggle signboards (location, content, status) |
| **Manual Override** | Admin can push custom announcements for special events |
| **Global/Local Display** | Separate views for campus-wide and zone-specific signage |

**Web pages:** `dynamic_guidance/launcher.html`, `dynamic_guidance/global-display.html`, `dynamic_guidance/local-display.html`, `dynamic_guidance/admin-control.html`

---

### 5. 💳 Billing & Payment Management
Automates fee calculation per user/role and integrates with BKPay for secure payment processing.

| Feature | Description |
|---------|-------------|
| **Pricing Policy Config** | Admin sets fee schedules per user type (student, staff, guest) and time window |
| **Automated Billing** | Batch job runs at end-of-cycle (e.g., midnight, end of month) to generate invoices |
| **BKPay Integration** | Redirect user to BKPay → receive HMAC-signed webhook → update invoice status |
| **Transaction History** | Users can view all past invoices and transactions |
| **Debt Tracking** | System tracks unpaid invoices and updates status upon successful payment |

**Non-functional constraints:** Batch must handle 30,000+ users within 2 hours; runs at off-peak hours (01:00–03:00 AM). All BKPay API logs retained for 12 months.

**Web pages:** `pricing/payment.html`, `pricing/bkpay.html`, `user/billing.html`, `user/history.html`

---

### 🔄 Non-Interactive Background Processes

| Process | Description |
|---------|-------------|
| **Auto Data Sync** | IoT Gateway pulls updated card identities from HCMUT_DATACORE every 30 minutes |
| **Status Auto-Update** | Continuous sensor data ingestion to update slot states in near real-time (≤5s delay) |
| **Billing Batch Job** | Scheduled fee computation triggered at end of billing cycle |

---

## 📁 Project Structure

```
BTL/
├── src/                            # Source code
│   ├── iot/                        # IoT-side code (hardware abstraction)
│   │   └── README.md
│   └── web_app/                    # Web application (pure HTML/JS/CSS + TailwindCSS)
│       ├── public/                 # All frontend pages
│       │   ├── index.html          # Landing page (Kinetic Pulse)
│       │   ├── login.html          # Login page (HCMUT_SSO simulation)
│       │   ├── parking_status.html # Public parking status board
│       │   ├── theme.css           # Global theme overrides
│       │   ├── theme.js            # Dark/light mode toggle
│       │   ├── admin/              # Admin portal (10 pages)
│       │   │   ├── admin_dashboard.html
│       │   │   ├── access_control.html
│       │   │   ├── users.html
│       │   │   ├── sync.html
│       │   │   ├── logs.html
│       │   │   ├── analytics.html
│       │   │   ├── iot_monitoring.html
│       │   │   ├── dynamic_guidance.html
│       │   │   ├── pricing_config.html
│       │   │   ├── shared.js       # Shared admin logic
│       │   │   └── sync.html
│       │   ├── guard/              # Guard (operator) portal
│       │   │   ├── dashboard.html
│       │   │   ├── status.html
│       │   │   ├── signage.html
│       │   │   └── shared.js
│       │   ├── user/               # End-user portal (student/staff)
│       │   │   ├── dashboard.html
│       │   │   ├── status.html
│       │   │   ├── billing.html
│       │   │   ├── history.html
│       │   │   └── shared.js
│       │   ├── iot_monitoring/     # IoT map visualization
│       │   │   └── parking.html
│       │   ├── dynamic_guidance/   # LED signboard management
│       │   │   ├── launcher.html
│       │   │   ├── global-display.html
│       │   │   ├── local-display.html
│       │   │   └── admin-control.html
│       │   └── pricing/            # Payment portal
│       │       ├── payment.html
│       │       └── bkpay.html
│       └── data/                   # Simulated JSON database
│           ├── users.json          # User accounts & roles
│           ├── sessions.json       # Parking session logs
│           ├── transactions.json   # Payment transaction records
│           └── audit_log.json      # System audit trail
└── latex/                          # Project report (LaTeX)
    ├── main.tex                    # Main document entry point
    ├── main.pdf                    # Compiled PDF report
    ├── build.ps1                   # Windows build script
    ├── build.sh                    # Linux/macOS build script
    ├── sections/                   # Report chapters
    │   ├── prj_description.tex     # Project overview & scope
    │   ├── func_req.tex            # Functional requirements (use-cases)
    │   ├── non_func_req.tex        # Non-functional requirements
    │   ├── UI_mockup.tex           # UI mockup screenshots
    │   ├── act_diagram.tex         # Activity diagrams
    │   ├── seq_diagram.tex         # Sequence diagrams
    │   ├── statechart_diagram.tex  # State machine diagrams
    │   ├── class_diagram.tex       # Class diagrams
    │   ├── deployment_view.tex     # Deployment view (4+1 architecture)
    │   ├── implementation_view.tex # Implementation view
    │   ├── testcase.tex            # Test cases
    │   ├── src_code.tex            # Source code reference
    │   ├── ai.tex                  # AI tools usage
    │   ├── ref.tex                 # References
    │   └── phancong.tex            # Team task assignment table
    └── pictures/                   # Figures & diagrams
```

---

## 🗄️ Data Schema

The web app uses **JSON files** as a simulated flat-file database (no backend server required).

### `users.json` — User Accounts
```json
{
  "id": "USR-001",
  "username": "admin",
  "password": "admin123",
  "role": "admin",          // "admin" | "guard" | "user"
  "fullName": "Nguyễn Văn An",
  "email": "an.nguyen@hcmut.edu.vn",
  "cardId": "CARD-A006"
}
```

### `sessions.json` — Parking Sessions
```json
{
  "id": "SES-2026050200181",
  "cardId": "CARD-B002",
  "plateNumber": "65V-76393",
  "vehicleType": "car",       // "car" | "motorbike"
  "zone": "B",                // Parking zone: A, B, or C
  "spotId": "B-44",
  "entryTime": "2026-05-01T20:13:57.590+07:00",
  "exitTime": "2026-05-01T22:21:57.590+07:00",
  "status": "completed",      // "completed" | "active" | "error"
  "feeVnd": 20000,
  "paymentMethod": "bkpay",   // "bkpay" | "cash"
  "processedBy": "USR-004"
}
```

### `transactions.json` — Payment Records
Stores BKPay transaction outcomes linked to parking sessions.

### `audit_log.json` — System Audit Trail
Tracks all admin actions: role changes, sync operations, pricing policy edits.

---

## 🚀 Running the Web App

The web application is **purely static** — no Node.js, no backend, no build step required.

### Option 1: Open directly in Browser
Simply open `src/web_app/public/index.html` in any modern browser (Chrome, Edge, Firefox).

> ⚠️ **Note:** Some browsers block `fetch()` calls to local JSON files due to CORS policy when opening files directly (`file://`). Use Option 2 if data does not load.

### Option 2: Use a Local HTTP Server (Recommended)

**With Python (built-in):**
```bash
cd src/web_app/public
python -m http.server 8080
# Then open: http://localhost:8080
```

**With Node.js `serve` package:**
```bash
npx serve src/web_app/public
```

**With VS Code Live Server Extension:**
Right-click `index.html` → **Open with Live Server**.

---

## 📄 Building the Report (LaTeX)

The report is written in LaTeX and located in the `latex/` folder.

### Prerequisites
- A LaTeX distribution: **MiKTeX** (Windows) or **TeX Live** (Linux/macOS).
- `pdflatex` must be available in your system PATH.

### Build Commands (Windows PowerShell)

```powershell
# Navigate to the latex directory
cd latex

# Standard build (3-pass for correct TOC and references)
.\build.ps1

# Clean build (removes all auxiliary files first, then rebuilds)
.\build.ps1 -Clean
```

### Build Commands (Linux / macOS)

```bash
cd latex
chmod +x build.sh
./build.sh
```

The compiled PDF will be saved as `latex/main.pdf`.

---

## 🔑 Demo Accounts

Use these credentials to log in to the web application at `login.html`:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| **Admin** | `admin` | `admin123` | Full system access: user management, analytics, pricing config |
| **Admin** | `tandz` | `tandz123` | Full admin access (project lead account) |
| **Guard** | `bvhung` | `guard123` | Operator view: barrier control, live status, signage |
| **Guard** | `nvlinh` | `guard456` | Operator view |
| **User** | `ptmai` | `user123` | Standard user: view status, billing, history |
| **User** | `2153029` | `stu123` | Student account |
| **User** | `2152048` | `stu456` | Student account |

---

## 🤖 AI Tools Used

The team leveraged Google's generative AI tools during the UI design phase:

- **[Google Gemini](https://gemini.google.com)** — Used to rapidly generate and iterate on UI wireframes and mockups from natural language descriptions, ensuring visual consistency across all modules.
- **[Google Stitch](https://stitch.withgoogle.com)** — Used to convert conceptual designs into interactive prototypes, helping the team align on design decisions quickly.

---

## 🔒 Non-Functional Requirements Summary

| Category | Requirement |
|----------|-------------|
| **Real-time Performance** | Slot status updates ≤ 5 seconds; LED board updates ≤ 3 seconds |
| **Reliability** | Last-known-state fallback when IoT Gateways disconnect |
| **Scalability** | Must support hundreds of sensors and LED boards without performance degradation |
| **Security (IoT)** | All Gateway ↔ Server communication via MQTT over TLS or HTTPS |
| **Security (Payment)** | HMAC digital signatures on all BKPay communication; no card data stored locally |
| **Batch Performance** | Fee calculation for 30,000+ users completed within 2 hours |
| **Auditability** | Pricing policy change logs retained; BKPay API logs retained for ≥ 12 months |
| **Data Integrity** | Full database transaction rollback if billing step fails at any point |

---

## 📚 References

1. Ian Sommerville. *Software Engineering*, 10th ed. Pearson, 2015.
2. Roger S. Pressman and Bruce R. Maxim. *Software Engineering: A Practitioner's Approach*, 8th ed. McGraw-Hill, 2014.
3. Erich Gamma et al. *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley, 1994.
4. Grady Booch et al. *The Unified Modeling Language User Guide*. Addison-Wesley, 1999.
5. ISO/IEC/IEEE 12207:2017. *Systems and software engineering — Software life cycle processes*.
6. Roy T. Fielding. *Architectural Styles and the Design of Network-based Software Architectures* (Dissertation). UC Irvine, 2000.
7. Arshdeep Bahga & Vijay Madisetti. *Internet of Things: A Hands-On Approach*. Universities Press, 2014.
8. OASIS. *MQTT Version 3.1.1*. http://mqtt.org
9. OWASP Foundation. *OWASP Top Ten*. https://owasp.org/www-project-top-ten/
10. Boris Beizer. *Software Testing Techniques*, 2nd ed. Van Nostrand Reinhold, 1990.
11. IEEE Std 830-1998. *Recommended Practice for Software Requirements Specifications*.

---

## 📜 License

This project was developed as an academic assignment for the course **CO3001 – Software Engineering** at Ho Chi Minh City University of Technology (HCMUT), Semester 252, Academic Year 2025–2026. It is intended for educational purposes only.

---

<div align="center">
  <sub>© 2026 IoT-SPMS Team — HCMUT, Faculty of Computer Science and Engineering</sub>
</div>
