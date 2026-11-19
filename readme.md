# ⚡ SolarScope — Solar Panel Performance Intelligence & Energy Efficiency Analysis Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Standard](https://img.shields.io/badge/Compliance-IEC%2061724--1%3A2021-amber?style=for-the-badge)](https://www.iec.ch/)

---

## 📌 1. Project Overview

**SolarScope** is an enterprise-grade Solar PV Performance Intelligence and Energy Efficiency Analysis platform designed for solar plant operators, asset managers, and performance analysts. 

Traditional photovoltaic monitoring solutions often suffer from unverified calculations, uncalibrated irradiance planes, and raw CSV inconsistencies. SolarScope adheres to the **IEC 61724-1:2021 international standard**, introducing formula versioning, automatic timezone normalization, multi-interval resampling, sensor anomaly detection, and audit-proof PDF/CSV report generation.

### Key Objectives:
- **Certified IEC 61724 Calculations**: Transparent computation of Performance Ratio (PR Index), Specific Yield ($kWh/kWp$), Reference Yield ($H_{POA}$), and Thermal Derating without black-box approximations.
- **Robust Telemetry Ingestion**: Ingest multi-vendor inverter CSV logs with timezone conversion (`Asia/Kolkata` $\rightarrow$ `UTC`), header auto-mapping, and sensor range validation.
- **Deep Performance Analytics**: Resample 15-minute sensor intervals into diurnal tracking curves, daily energy bars, and thermal derating line series.
- **Automated Anomaly Diagnostics**: Continuous rule-based evaluation detecting low PR, inverter clipping, zero generation during peak daylight, and sensor drift.
- **Audit-Proof Compliance Exports**: Generates branded PDF performance certificates and high-resolution CSV datasets with reproducible formula snapshots.

---

## 🏗️ 2. System Architecture & Flow

```mermaid
flowchart TD
    subgraph Data Sources
        CSV["Inverter CSV Logs / Telemetry Files"]
        Sensors["Pyranometers & Thermocouples"]
    end

    subgraph Ingestion Layer
        WIZARD["8-Step Ingestion Wizard"]
        NORM["Timezone Normalization (IST -> UTC)"]
        VAL["Sensor Quality Range Validation"]
        CSV --> WIZARD --> NORM --> VAL
        Sensors -.-> WIZARD
    end

    subgraph Storage Layer
        DB[("MongoDB Atlas Database")]
        VAL -->|"Batch Bulk Write"| DB
    end

    subgraph Analytics & Intelligence Engine
        ENGINE["IEC 61724 Analytics Engine"]
        RESAMP["Resampling & Aggregation Service"]
        RULES["Sensor Diagnostic & Anomaly Engine"]
        DB --> ENGINE
        DB --> RESAMP
        DB --> RULES
    end

    subgraph Presentation & UI (Next.js 16)
        DASH["Executive Dashboard"]
        EXPLORER["Readings Explorer (Dual Mode)"]
        ANALYTICS["Performance Analytics (Radial Gauge & Curves)"]
        ALERTS["Anomalies & Alerts Center"]
        REPORTS["PDF & CSV Export Center (FPDF2)"]
        
        ENGINE --> DASH
        ENGINE --> ANALYTICS
        RESAMP --> EXPLORER
        RULES --> ALERTS
        ENGINE --> REPORTS
    end
```

---

## 🚀 3. Core Modules & Features

### 1. Executive Performance Dashboard (`/dashboard`)
- **Fleet KPIs**: Total Energy Generated ($kWh$), Fleet Performance Ratio ($PR$), Peak AC Power ($kW$), and Data Coverage (%).
- **Power Generation vs Solar Irradiance Curve**: Dual-area visualization tracking inverter AC output against incident sunlight.
- **Daily Energy Yield (Bar Chart)**: Daily bar charts tracking day-to-day power generation ($kWh$).
- **Thermal Impact**: Module temperature versus ambient temperature monitoring.
- **Environmental Equivalents**: Real-time $CO_2$ offset in tonnes, trees saved equivalent, and estimated tariff cost savings in INR ($\text{₹}$).

### 2. Solar Sites Management (`/sites`)
- Multi-site geographic plant hierarchy.
- Latitude, longitude, address, site capacity, and operational status tracking.
- Automatic creation of default solar arrays upon new site setup.

### 3. Solar Systems & Inverter Arrays (`/systems`)
- Configuration of solar PV arrays, inverter models, and string configurations.
- Electrical parameters: DC Fleet Capacity ($kWp$), AC Inverter Output ($kW$), Panel Count, Watt Rating ($W$), Tilt Angle ($0-90^\circ$), and Azimuth Orientation ($0-360^\circ$).

### 4. Telemetry Ingestion Wizard (`/imports`)
- Step-by-step upload flow for inverter log files.
- Header auto-detection and column mapping.
- Quality validation flags: `flagged_negative_power`, `flagged_night_generation`, `flagged_out_of_range`.
- Rollback support: Instantly purge an entire imported batch if faulty data was uploaded.

### 5. Readings Explorer (`/readings`)
- Visual multi-mode inspection: **Combined View**, **Charts View**, and **Table View**.
- Interactive sorting, filtering by date, quality, site, and inverter system.
- Reading detail drawer with complete sensor metrics and JSON inspector.

### 6. Performance Analytics Engine (`/analytics`)
- Certified IEC 61724 benchmark engine with reproducible formula versioning (`v1.0`).
- **Performance Ratio Radial Gauge**: Visual arc meter categorizing fleet health (**Optimal >75%**, **Moderate**, **Underperforming**).
- **Daily Energy Bar Chart** and **Power vs Irradiance Tracking Curves**.
- **Historical Runs Archive**: Re-inspect previous analysis snapshots with 1-click loading.

### 7. Automated Anomaly Diagnostics & Alerts (`/alerts`)
- Continuous diagnostics evaluating telemetry against solar physical models.
- Diagnostic rules:
  - Low Performance Ratio ($PR < 60\%$) during peak sunlight.
  - Inverter clipping detection (power saturated at rated capacity).
  - Daytime zero generation while irradiance $> 200 \, W/m^2$.
  - Thermal overheating ($T_{module} - T_{ambient} > 35^\circ C$).
- Status workflow: `open` $\rightarrow$ `acknowledged` $\rightarrow$ `resolved`.

### 8. Compliance Reports & Export Center (`/reports`)
- Branded, publication-ready PDF performance reports using `fpdf2`.
- Raw filtered telemetry CSVs and calculated metric snapshots.
- Authenticated blob file streaming preventing unauthorized token leaks.

### 9. Authentication & Workspace Tenancy (`/login`, `/register`)
- Multi-tenant architecture with JWT stateless tokens.
- Modern neumorphic split-panel interface with **1-Click Demo Login credentials**.

---

## 🛠️ 4. Technology Stack

### Frontend:
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Next.js** | 16.4.6 | Full-stack React framework (App Router architecture) |
| **React** | 19.3.0 | Modern declarative UI component library |
| **TypeScript** | 5.x | End-to-end static type safety |
| **Tailwind CSS** | v4.3.3 | Modern CSS design tokens & responsive utilities |
| **TanStack Query** | v5.108 | Server state management, auto-polling, caching |
| **Recharts** | v3.11 | Responsive SVG charting (Area, Bar, Line) |
| **Lucide Icons** | v1.74 | Unified SVG icon system |
| **Axios** | v1.21 | HTTP client with JWT interceptors |

### Backend:
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.12+ | Core programming language |
| **FastAPI** | 0.115+ | High-performance async REST API framework |
| **Pydantic** | v2.x | Data validation and schema enforcement |
| **Motor** | 3.7+ | Asynchronous MongoDB driver for asyncio |
| **PyJWT** | 2.10+ | Stateless JSON Web Token authentication |
| **Passlib / Bcrypt**| 1.7+ | Cryptographic password hashing |
| **FPDF2** | 2.8+ | Vector PDF document generation engine |
| **Pytest** | 9.x | Comprehensive test suite for analytical formulas |

### Database & Storage:
- **MongoDB Atlas**: Cloud document database with compound indexing on `(workspace_id, system_id, timestamp_utc)`.
- **Local / Volume Storage**: Structured upload directory for incoming telemetry logs and generated compliance PDFs.

---

## 📊 5. Mathematical Methodology (IEC 61724 Standard)

SolarScope enforces rigorous engineering formulas defined by **IEC 61724-1**:

### 1. Total AC Energy ($E_{AC}$)
When interval meter data is available:
$$E_{AC} = \sum E_{interval} \quad [kWh]$$
Fallback to time-integration of active inverter power:
$$E_{AC} = \sum \left( P_{AC, i} \times \Delta t_h \right) \quad [kWh]$$

### 2. Specific Yield ($Y_f$)
Yield normalized by the nameplate DC capacity of the array:
$$Y_f = \frac{E_{AC}}{P_{STC}} \quad [kWh / kWp]$$

### 3. Plane-of-Array Solar Irradiation ($H_{POA}$)
Time-integrated solar irradiance received on the array plane:
$$H_{POA} = \frac{\sum \left( G_{POA, i} \times \Delta t_h \right)}{1000} \quad [kWh / m^2]$$

### 4. Performance Ratio ($PR$)
The primary health index of the photovoltaic system:
$$PR = \frac{Y_f}{Y_r} = \frac{E_{AC} / P_{STC}}{H_{POA} / G_{ref}} \times 100\%$$
*(Where $G_{ref} = 1.0 \, kW/m^2$ standard test condition reference irradiance)*

### 5. Thermal Impact ($\Delta T$)
Measures module overheating causing silicon efficiency loss:
$$\Delta T = T_{module} - T_{ambient} \quad [^\circ C]$$

---

## 💻 6. How to Run the Project Locally

### Prerequisites:
- **Node.js** v20.x or v22.x
- **Python** v3.11 or v3.12
- **Git**
- Active Internet connection (for MongoDB Atlas cloud database connection)

---

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd "SolarScope – Solar Panel Performance Intelligence & Energy Efficiency Analysis"
```

---

### Step 2: Backend Setup & Execution

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Verify or configure environment variables in `backend/.env`:
   ```env
   APP_ENV=development
   APP_NAME=SolarScope API
   MONGODB_URI=mongodb+srv://emp:zTx8C5ofa9DOrqMY@cluster0.hsiv1qu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DATABASE=SolarScope
   JWT_SECRET=SolarScope_JWT_Secret_2026_College_Project_Min64Chars_DoNotShare!
   DEFAULT_TIMEZONE=Asia/Kolkata
   ```

5. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *FastAPI will start running at `http://localhost:8000`. You can access interactive Swagger API documentation at `http://localhost:8000/docs`.*

---

### Step 3: Frontend Setup & Execution

1. Open a second terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be live at `http://localhost:3000`.*

---

### Step 4: Login & Quick Demo Testing

1. Open your browser and navigate to:
   ```
   http://localhost:3000/login
   ```
2. **1-Click Demo Login**:
   Click the **"Admin Account"** or **"Analyst Account"** card at the bottom of the sign-in form. It will automatically populate the credentials:
   - **Email**: `admin@gmail.com`
   - **Password**: `password123`
3. Click **"SIGN IN"** to enter the workspace.

---

### Step 5: Testing Ingestion with Sample Datasets

Two pre-validated 7-day solar telemetry CSV datasets are provided in the [`sample_data/`](file:///d:/gokul/collage-python-project/SolarScope%20–%20Solar%20Panel%20Performance%20Intelligence%20&%20Energy%20Efficiency%20Analysis/sample_data) folder:

| File Name | Description | Period |
| :--- | :--- | :--- |
| `01_solar_telemetry_normal_chennai_7days.csv` | Clean 15-minute telemetry for a 25 kWp array in Chennai, India. Health PR ~81.4%. | Nov 1, 2026 – Nov 7, 2026 |
| `02_solar_telemetry_with_anomalies_7days.csv` | Telemetry with deliberate anomalies (inverter clipping, zero power at noon, overheating) to trigger alerts. | Nov 1, 2026 – Nov 7, 2026 |

**To test upload:**
1. Navigate to **Imports Ingestion** (`/imports`) $\rightarrow$ Click **"Upload CSV"**.
2. Select your Site and Array System.
3. Upload `01_solar_telemetry_normal_chennai_7days.csv` and click through the wizard to ingest 672 readings.
4. Navigate to **Performance Analytics** (`/analytics`), select **"Nov 1 – Nov 7"**, and click **"Run Analysis"** to view the charts!

---

## 📡 7. API Reference Overview

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/login` | `POST` | Public | Authenticates credentials and issues JWT token |
| `/api/v1/auth/register` | `POST` | Public | Registers a new tenant user and initial workspace |
| `/api/v1/sites` | `GET/POST` | Site Manager | Lists or creates solar PV plant installations |
| `/api/v1/systems` | `GET/POST` | Site Manager | Lists or creates inverter array systems |
| `/api/v1/imports/preview` | `POST` | Analyst | Parses uploaded CSV and returns preview & column mapping |
| `/api/v1/imports/commit` | `POST` | Analyst | Validates, normalizes, and commits readings to DB |
| `/api/v1/readings` | `GET` | Analyst | Filters, sorts, and paginates high-resolution telemetry |
| `/api/v1/dashboard/summary` | `GET` | Analyst | Returns KPI aggregates for selected date range |
| `/api/v1/dashboard/series` | `GET` | Analyst | Returns resampled time-series data for Recharts curves |
| `/api/v1/analytics/runs` | `POST` | Analyst | Executes full IEC 61724 analysis run & saves snapshot |
| `/api/v1/alerts` | `GET` | Analyst | Lists triggered anomalies and sensor warnings |
| `/api/v1/reports` | `POST` | Analyst | Queues background generation of PDF/CSV compliance report |
| `/api/v1/reports/{id}/download` | `GET` | Analyst | Downloads completed compliance PDF or CSV file |

---

## 🧪 8. Automated Testing

Run the analytical formula test suite using pytest:
```bash
cd backend
python -m pytest backend/tests/test_analytics.py -v
```

Run TypeScript compilation check for the frontend:
```bash
cd frontend
node node_modules/typescript/bin/tsc --noEmit
```

---

## 👥 Authors & Academic Credits
- **Project**: SolarScope — Solar Panel Performance Intelligence & Energy Efficiency Analysis
- **Developer**: Gokul (Analyst & Workspace Admin)
- **Standard Reference**: IEC 61724-1:2021 Photovoltaic System Performance Monitoring
