from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Any

import ephem
import pytz
import structlog

log: structlog.BoundLogger = structlog.get_logger(__name__)

ZODIAC_SIGNS: list[str] = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

ZODIAC_GLYPHS: dict[str, str] = {
    "Aries": "♈", "Taurus": "♉", "Gemini": "♊", "Cancer": "♋",
    "Leo": "♌", "Virgo": "♍", "Libra": "♎", "Scorpio": "♏",
    "Sagittarius": "♐", "Capricorn": "♑", "Aquarius": "♒", "Pisces": "♓",
}

PLANET_GLYPHS: dict[str, str] = {
    "Sun": "☀", "Moon": "☽", "Mercury": "☿", "Venus": "♀",
    "Mars": "♂", "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅",
    "Neptune": "♆", "Pluto": "♇", "North Node": "☊",
}

ELEMENT_MAP: dict[str, str] = {
    "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
    "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
    "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
    "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water",
}

MODALITY_MAP: dict[str, str] = {
    "Aries": "Cardinal", "Cancer": "Cardinal", "Libra": "Cardinal", "Capricorn": "Cardinal",
    "Taurus": "Fixed", "Leo": "Fixed", "Scorpio": "Fixed", "Aquarius": "Fixed",
    "Gemini": "Mutable", "Virgo": "Mutable", "Sagittarius": "Mutable", "Pisces": "Mutable",
}


class ChartEngineError(Exception):
    pass


def _validate_timezone(tz_name: str) -> pytz.BaseTzInfo:
    try:
        return pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError as exc:
        raise ChartEngineError(f"Unknown timezone: {tz_name!r}") from exc


def _to_utc_naive(date_str: str, time_str: str, tz_name: str) -> datetime:
    try:
        local_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    except ValueError as exc:
        raise ChartEngineError(
            f"Cannot parse date/time '{date_str} {time_str}': {exc}"
        ) from exc
    tz = _validate_timezone(tz_name)
    localized = tz.localize(local_dt)
    return localized.astimezone(pytz.utc).replace(tzinfo=None)


def _lon_to_zodiac(lon_deg: float) -> tuple[str, float]:
    lon_deg = lon_deg % 360.0
    sign_idx = int(lon_deg / 30)
    sign_name = ZODIAC_SIGNS[sign_idx]
    sign_deg = lon_deg - sign_idx * 30.0
    return sign_name, round(sign_deg, 4)


def _datetime_to_julian(dt: datetime) -> float:
    return ephem.Date(dt.strftime("%Y/%m/%d %H:%M:%S"))


def _compute_north_node(jd: float) -> float:
    T = (float(jd) - 2415020.0) / 36525.0
    node_lon = (
        259.183275
        - 1934.142008 * T
        + 0.002078 * T * T
        + T * T * T / 327270.0
    ) % 360.0
    return node_lon if node_lon >= 0.0 else node_lon + 360.0


def _compute_obliquity(jd: float) -> float:
    T = (float(jd) - 2415020.0) / 36525.0
    obl_deg = (
        23.452294
        - 0.0130125 * T
        - 0.00000164 * T * T
        + 0.000000503 * T * T * T
    )
    return math.radians(obl_deg)


def _compute_ascendant(lst_rad: float, lat_rad: float, obl_rad: float) -> float:
    cos_lst = math.cos(lst_rad)
    sin_lst = math.sin(lst_rad)
    cos_obl = math.cos(obl_rad)
    sin_obl = math.sin(obl_rad)
    tan_lat = math.tan(lat_rad)

    asc_rad = math.atan2(
        -cos_lst,
        sin_lst * cos_obl + tan_lat * sin_obl,
    )
    asc_deg = math.degrees(asc_rad) % 360.0
    return asc_deg


def _compute_midheaven(lst_rad: float, obl_rad: float) -> float:
    mc_rad = math.atan2(math.tan(lst_rad), math.cos(obl_rad))
    mc_deg = math.degrees(mc_rad) % 360.0
    lst_deg = math.degrees(lst_rad) % 360.0
    if lst_deg > 180.0:
        mc_deg = (mc_deg + 180.0) % 360.0
    return mc_deg


def _get_planet_ecliptic_lon(body: ephem.Body, observer: ephem.Observer) -> float:
    body.compute(observer)
    ecl = ephem.Ecliptic(body, epoch=ephem.J2000)
    return math.degrees(float(ecl.lon)) % 360.0


def _get_planet_speed(body_class: type, observer: ephem.Observer) -> float:
    dt_seconds = 86400.0
    obs_before = ephem.Observer()
    obs_before.lat = observer.lat
    obs_before.lon = observer.lon
    obs_before.elevation = observer.elevation
    obs_before.pressure = 0
    obs_before.date = ephem.Date(float(observer.date) - 1.0)

    b1 = body_class()
    b1.compute(obs_before)
    ecl1 = ephem.Ecliptic(b1, epoch=ephem.J2000)
    lon1 = math.degrees(float(ecl1.lon)) % 360.0

    b2 = body_class()
    b2.compute(observer)
    ecl2 = ephem.Ecliptic(b2, epoch=ephem.J2000)
    lon2 = math.degrees(float(ecl2.lon)) % 360.0

    delta = lon2 - lon1
    if delta > 180.0:
        delta -= 360.0
    elif delta < -180.0:
        delta += 360.0

    return round(delta, 6)


BODY_CLASSES: dict[str, type] = {
    "Sun": ephem.Sun,
    "Moon": ephem.Moon,
    "Mercury": ephem.Mercury,
    "Venus": ephem.Venus,
    "Mars": ephem.Mars,
    "Jupiter": ephem.Jupiter,
    "Saturn": ephem.Saturn,
    "Uranus": ephem.Uranus,
    "Neptune": ephem.Neptune,
    "Pluto": ephem.Pluto,
}


def _serialize_planet(
    planet_id: str,
    lon_deg: float,
    lon_speed: float,
) -> dict[str, Any]:
    sign, sign_lon = _lon_to_zodiac(lon_deg)
    retrograde = lon_speed < 0.0
    return {
        "id": planet_id,
        "sign": sign,
        "glyph": ZODIAC_GLYPHS.get(sign, ""),
        "planet_glyph": PLANET_GLYPHS.get(planet_id, ""),
        "longitude": round(lon_deg, 4),
        "longitude_speed": lon_speed,
        "retrograde": retrograde,
        "sign_longitude": sign_lon,
        "house": "—",
    }


def compute_birth_chart(
    date_str: str,
    time_str: str,
    latitude: float,
    longitude: float,
    timezone: str,
) -> str:
    log.info(
        "compute_birth_chart.start",
        date=date_str,
        time=time_str,
        lat=latitude,
        lon=longitude,
        tz=timezone,
    )

    if not (-90.0 <= latitude <= 90.0):
        raise ChartEngineError(f"Latitude {latitude} out of range [-90, 90]")
    if not (-180.0 <= longitude <= 180.0):
        raise ChartEngineError(f"Longitude {longitude} out of range [-180, 180]")

    utc_naive = _to_utc_naive(date_str, time_str, timezone)

    observer = ephem.Observer()
    observer.lat = str(latitude)
    observer.lon = str(longitude)
    observer.elevation = 0
    observer.pressure = 0
    observer.epoch = ephem.J2000
    observer.date = utc_naive.strftime("%Y/%m/%d %H:%M:%S")

    jd = float(observer.date)

    planets_data: dict[str, Any] = {}
    for planet_id, body_class in BODY_CLASSES.items():
        try:
            body = body_class()
            lon_deg = _get_planet_ecliptic_lon(body, observer)
            lon_speed = _get_planet_speed(body_class, observer)
            planets_data[planet_id] = _serialize_planet(planet_id, lon_deg, lon_speed)
        except Exception as exc:
            log.warning("planet_parse_failed", planet=planet_id, error=str(exc))
            planets_data[planet_id] = {"id": planet_id, "error": str(exc)}

    try:
        node_lon = _compute_north_node(jd)
        sign, sign_lon = _lon_to_zodiac(node_lon)
        planets_data["North Node"] = {
            "id": "North Node",
            "sign": sign,
            "glyph": ZODIAC_GLYPHS.get(sign, ""),
            "planet_glyph": "☊",
            "longitude": round(node_lon, 4),
            "longitude_speed": -0.053,
            "retrograde": True,
            "sign_longitude": sign_lon,
            "house": "—",
        }
    except Exception as exc:
        log.warning("north_node_failed", error=str(exc))
        planets_data["North Node"] = {"id": "North Node", "error": str(exc)}

    obl_rad = _compute_obliquity(jd)
    lst_rad = float(observer.sidereal_time())
    lat_rad = math.radians(latitude)

    try:
        asc_lon = _compute_ascendant(lst_rad, lat_rad, obl_rad)
        asc_sign, asc_sign_lon = _lon_to_zodiac(asc_lon)
        ascendant_data: dict[str, Any] = {
            "id": "Ascendant",
            "sign": asc_sign,
            "glyph": ZODIAC_GLYPHS.get(asc_sign, ""),
            "planet_glyph": "AC",
            "longitude": round(asc_lon, 4),
            "sign_longitude": asc_sign_lon,
        }
    except Exception as exc:
        log.warning("ascendant_failed", error=str(exc))
        ascendant_data = {"error": str(exc)}

    try:
        mc_lon = _compute_midheaven(lst_rad, obl_rad)
        mc_sign, mc_sign_lon = _lon_to_zodiac(mc_lon)
        mc_data: dict[str, Any] = {
            "id": "Midheaven",
            "sign": mc_sign,
            "glyph": ZODIAC_GLYPHS.get(mc_sign, ""),
            "planet_glyph": "MC",
            "longitude": round(mc_lon, 4),
            "sign_longitude": mc_sign_lon,
        }
    except Exception as exc:
        log.warning("midheaven_failed", error=str(exc))
        mc_data = {"error": str(exc)}

    result: dict[str, Any] = {
        "input": {
            "date": date_str,
            "time": time_str,
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
            "utc_equivalent": utc_naive.isoformat() + "Z",
        },
        "ascendant": ascendant_data,
        "midheaven": mc_data,
        "planets": planets_data,
        "dominant_sign": _compute_dominant_sign(planets_data),
        "element_balance": _compute_element_balance(planets_data),
        "modality_balance": _compute_modality_balance(planets_data),
    }

    log.info("compute_birth_chart.done", planets_computed=len(planets_data))
    return json.dumps(result, ensure_ascii=False, indent=2)


def _compute_dominant_sign(planets_data: dict[str, Any]) -> str:
    sign_counts: dict[str, int] = {}
    for obj in planets_data.values():
        sign = obj.get("sign")
        if sign:
            sign_counts[sign] = sign_counts.get(sign, 0) + 1
    if not sign_counts:
        return "Unknown"
    return max(sign_counts, key=sign_counts.__getitem__)


def _compute_element_balance(planets_data: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {"Fire": 0, "Earth": 0, "Air": 0, "Water": 0}
    for obj in planets_data.values():
        sign = obj.get("sign", "")
        element = ELEMENT_MAP.get(sign)
        if element:
            counts[element] += 1
    return counts


def _compute_modality_balance(planets_data: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {"Cardinal": 0, "Fixed": 0, "Mutable": 0}
    for obj in planets_data.values():
        sign = obj.get("sign", "")
        modality = MODALITY_MAP.get(sign)
        if modality:
            counts[modality] += 1
    return counts
