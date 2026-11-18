"""
PDF report generator using fpdf2.

Generates a professional performance report with:
  - Executive summary (site, system, period, KPIs)
  - System configuration
  - Performance metrics table
  - Data quality summary
  - Methodology and disclaimer

CRITICAL: All KPI values come from the PERSISTED analysis_run document.
          Never recalculate values during report generation.
"""
from __future__ import annotations
from datetime import datetime, timezone
from fpdf import FPDF
import unicodedata


def _safe(text: str) -> str:
    """Strip non-Latin1 characters so fpdf2 (Helvetica/Latin-1) doesn't crash."""
    return unicodedata.normalize("NFKD", str(text)).encode("latin-1", "replace").decode("latin-1")

# ── Brand colours (approximate as RGB) ───────────────────────────────
C_DEEP_TEAL   = (18, 50, 71)
C_SOLAR_GREEN = (43, 167, 132)
C_MUTED       = (97, 117, 128)
C_BORDER      = (217, 227, 231)
C_CANVAS      = (243, 247, 248)
C_WHITE       = (255, 255, 255)
C_TEXT        = (32, 50, 61)
C_WARNING     = (217, 145, 54)
C_DANGER      = (200, 79, 85)


class ReportPDF(FPDF):
    def header(self):
        self.set_fill_color(*C_DEEP_TEAL)
        self.rect(0, 0, 210, 12, "F")
        self.set_text_color(*C_WHITE)
        self.set_font("Helvetica", "B", 9)
        self.set_y(3)
        self.cell(0, 6, "SolarScope  |  Solar Performance Intelligence", align="L")
        self.set_text_color(*C_MUTED)
        self.set_font("Helvetica", "", 7)
        self.set_y(3)
        self.cell(0, 6, "CONFIDENTIAL", align="R")
        self.ln(10)

    def footer(self):
        self.set_y(-12)
        self.set_draw_color(*C_BORDER)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*C_MUTED)
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        self.cell(0, 5, f"Generated: {ts}  |  Page {self.page_no()}", align="C")


def _metric_row(pdf: FPDF, label: str, value: str, unit: str, method: str = "",
                has_warning: bool = False):
    pdf.set_font("Helvetica", "", 9)
    if has_warning:
        pdf.set_text_color(*C_WARNING)
    else:
        pdf.set_text_color(*C_TEXT)
    pdf.cell(70, 7, _safe(label))
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*C_SOLAR_GREEN if not has_warning else C_WARNING)
    pdf.cell(50, 7, _safe(value))
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(30, 7, _safe(unit))
    if method:
        pdf.set_font("Helvetica", "I", 7)
        pdf.cell(0, 7, _safe(method[:45]))
    pdf.ln()
    pdf.set_draw_color(*C_BORDER)
    pdf.set_line_width(0.1)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())


def _section_title(pdf: FPDF, title: str):
    pdf.ln(3)
    pdf.set_fill_color(*C_CANVAS)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*C_DEEP_TEAL)
    pdf.cell(0, 8, f"  {title}", fill=True, ln=True)
    pdf.ln(2)


def _fmt(val, decimals: int = 2) -> str:
    if val is None:
        return "N/A"
    try:
        return f"{float(val):.{decimals}f}"
    except (TypeError, ValueError):
        return str(val)


def generate_pdf_report(
    analysis_run: dict,
    system: dict,
    site: dict,
) -> bytes:
    """
    Generate a PDF performance report from a persisted analysis_run.
    All KPI values come from the saved run — never recalculated.
    """
    pdf = ReportPDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(10, 15, 10)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    metrics = analysis_run.get("metrics", {})
    snap = analysis_run.get("filter_snapshot", {})
    warnings = analysis_run.get("warnings", [])

    def m(key: str) -> dict:
        return metrics.get(key) or {}

    # ── Title / Executive Summary ─────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*C_DEEP_TEAL)
    pdf.cell(0, 10, "Performance Report", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*C_MUTED)
    start_str = snap.get("start", "")[:10]
    end_str   = snap.get("end", "")[:10]
    pdf.cell(0, 6, _safe(f"{site.get('name', 'Unknown Site')}  --  {system.get('name', 'Unknown System')}"), ln=True)
    pdf.cell(0, 6, _safe(f"Period: {start_str} to {end_str}  |  Formula: {analysis_run.get('formula_version', 'v1.0')}"), ln=True)
    pdf.cell(0, 6, _safe(f"Run ID: {analysis_run.get('id', '')[:16]}..."), ln=True)
    pdf.ln(4)

    # ── KPI Highlights ────────────────────────────────────────────────
    _section_title(pdf, "Key Performance Indicators")

    rows = [
        ("Total Energy",         m("energy_kwh"),        2, "kWh"),
        ("Specific Yield",       m("specific_yield"),    3, "kWh/kWp"),
        ("Performance Ratio",    m("performance_ratio"), 1, "%"),
        ("Peak Power",           m("peak_power_kw"),     2, "kW"),
        ("Data Coverage",        m("data_coverage"),     1, "%"),
        ("Avg Ambient Temp",     m("avg_ambient_temp_c"),1, "deg C"),
        ("Avg Module Temp",      m("avg_module_temp_c"), 1, "deg C"),
    ]
    for label, met, dec, unit in rows:
        has_warn = bool(met.get("warnings"))
        _metric_row(
            pdf, label,
            _fmt(met.get("value"), dec),
            unit,
            met.get("method", "")[:35],
            has_warning=has_warn,
        )

    pdf.ln(3)

    # ── System Configuration ──────────────────────────────────────────
    _section_title(pdf, "System Configuration")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*C_TEXT)
    cfg = [
        ("DC Capacity",        f"{system.get('dc_capacity_kwp', 'N/A')} kWp"),
        ("AC Capacity",        f"{system.get('ac_capacity_kw', 'N/A')} kW"),
        ("Panel Count",        str(system.get("panel_count", "N/A"))),
        ("Panel Rating",       f"{system.get('panel_rating_w', 'N/A')} W"),
        ("Tilt / Azimuth",     f"{system.get('tilt_degrees', 'N/A')} deg / {system.get('azimuth_degrees', 'N/A')} deg"),
        ("Inverter",           system.get("inverter_make") or "N/A"),
        ("Commissioning",      system.get("commissioning_date") or "N/A"),
        ("Site Timezone",      site.get("timezone", "N/A")),
    ]
    for label, val in cfg:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*C_MUTED)
        pdf.cell(60, 6, _safe(label))
        pdf.set_text_color(*C_TEXT)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 6, _safe(str(val)), ln=True)
    pdf.ln(3)

    # ── Data Quality ──────────────────────────────────────────────────
    _section_title(pdf, "Data Quality")
    cov = m("data_coverage")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*C_TEXT)
    pdf.cell(0, 6, _safe(f"Readings used: {analysis_run.get('sample_count', 0):,}"), ln=True)
    pdf.cell(0, 6, _safe(f"Coverage: {_fmt(cov.get('value'), 1)}% of expected intervals"), ln=True)
    if cov.get("warnings"):
        pdf.set_text_color(*C_WARNING)
        for w in cov["warnings"][:2]:
            pdf.cell(0, 5, _safe(f"  [!]  {w[:90]}"), ln=True)
    pdf.ln(3)

    # ── Methodology ───────────────────────────────────────────────────
    _section_title(pdf, "Methodology & Disclaimer")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_MUTED)
    methodology_lines = [
        f"Formula version: {analysis_run.get('formula_version', 'v1.0')}",
        "Energy: sum of interval_energy_kwh for valid readings.",
        "Irradiation: Sum(G x dt_hours)/1000  [kWh/m2]",
        "Performance Ratio: AC_energy / (P_STC x H_POA / G_ref=1kW/m2). Requires POA irradiance.",
        "Specific Yield: Total energy / DC capacity (kWp).",
        "Temperature: arithmetic mean of ambient_temp_c and module_temp_c respectively.",
        "",
        "DISCLAIMER: This report is generated from sensor data and formula-based calculations.",
        "Values represent measured or estimated performance, not certified equipment output.",
        "Performance Ratio labelled 'indicative' if sensor plane (POA vs GHI) is unconfirmed.",
    ]
    for line in methodology_lines:
        pdf.multi_cell(190, 5, _safe(line))

    if warnings:
        pdf.ln(2)
        pdf.set_text_color(*C_WARNING)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(0, 5, "Analysis Warnings:", ln=True)
        pdf.set_font("Helvetica", "", 8)
        for w in warnings[:5]:
            pdf.multi_cell(190, 5, _safe(f"  - {w[:100]}"))

    return bytes(pdf.output())
