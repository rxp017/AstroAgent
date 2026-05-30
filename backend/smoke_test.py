"""Quick smoke test for the ephem-based chart engine."""
import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from domain.chart_engine import compute_birth_chart, ChartEngineError

TEST_CASES = [
    {
        "name": "Mumbai India",
        "date": "1970-06-19",
        "time": "14:30",
        "lat": 19.0760,
        "lon": 72.8777,
        "tz": "Asia/Kolkata",
    },
    {
        "name": "New York Midnight",
        "date": "2000-01-01",
        "time": "00:00",
        "lat": 40.7128,
        "lon": -74.0060,
        "tz": "America/New_York",
    },
    {
        "name": "Sydney Australia",
        "date": "1985-06-21",
        "time": "23:15",
        "lat": -33.8688,
        "lon": 151.2093,
        "tz": "Australia/Sydney",
    },
]

print("=" * 60)
print("  AstroAgent -- chart_engine.py Smoke Test")
print("=" * 60)

all_passed = True
for tc in TEST_CASES:
    print(f"\n>> {tc['name']}")
    try:
        result_json = compute_birth_chart(
            tc["date"], tc["time"], tc["lat"], tc["lon"], tc["tz"]
        )
        result = json.loads(result_json)
        asc = result["ascendant"]["sign"]
        sun = result["planets"]["Sun"]["sign"]
        moon = result["planets"]["Moon"]["sign"]
        dom = result["dominant_sign"]
        elems = result["element_balance"]
        retro_planets = [k for k, v in result["planets"].items() if v.get("retrograde")]
        print(f"  Sun:       {sun}")
        print(f"  Moon:      {moon}")
        print(f"  Ascendant: {asc}")
        print(f"  Dominant:  {dom}")
        print(f"  Elements:  {elems}")
        print(f"  Retrograde: {retro_planets if retro_planets else 'None'}")
        print(f"  [PASSED]")
    except ChartEngineError as e:
        print(f"  [FAILED] ChartEngineError: {e}")
        all_passed = False
    except Exception as e:
        print(f"  [FAILED] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        all_passed = False

print("\n" + "=" * 60)
print(f"  Result: {'ALL PASSED' if all_passed else 'SOME FAILURES'}")
print("=" * 60)
sys.exit(0 if all_passed else 1)
