"""Unit conversion helpers — pure functions, no side effects."""


def kw_to_w(kw: float) -> float:
    return kw * 1000


def w_to_kw(w: float) -> float:
    return w / 1000


def kwh_to_wh(kwh: float) -> float:
    return kwh * 1000


def wh_to_kwh(wh: float) -> float:
    return wh / 1000


def kwh_to_mwh(kwh: float) -> float:
    return kwh / 1000


def celsius_to_fahrenheit(c: float) -> float:
    return (c * 9 / 5) + 32


def fahrenheit_to_celsius(f: float) -> float:
    return (f - 32) * 5 / 9


def interval_to_hours(interval: str) -> float:
    """Convert interval string to decimal hours."""
    mapping = {"5m": 5 / 60, "15m": 15 / 60, "30m": 0.5, "1h": 1.0, "1d": 24.0}
    return mapping.get(interval, 0.25)  # default 15 minutes


def interval_to_minutes(interval: str) -> int:
    mapping = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "1d": 1440}
    return mapping.get(interval, 15)


def format_energy(kwh: float) -> str:
    if kwh >= 1000:
        return f"{kwh / 1000:.2f} MWh"
    return f"{kwh:.2f} kWh"


def format_power(kw: float) -> str:
    if kw >= 1000:
        return f"{kw / 1000:.2f} MW"
    return f"{kw:.2f} kW"
