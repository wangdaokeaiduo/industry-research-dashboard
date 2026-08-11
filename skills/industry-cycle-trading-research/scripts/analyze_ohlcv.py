#!/usr/bin/env python3
"""Compute reproducible OHLCV diagnostics from a CSV using the standard library."""
import argparse
import csv
import json
import math
from pathlib import Path


def ema(values, period):
    alpha = 2 / (period + 1)
    out = []
    current = values[0]
    for value in values:
        current = alpha * value + (1 - alpha) * current
        out.append(current)
    return out


def sma(values, period):
    return sum(values[-period:]) / period if len(values) >= period else None


def rsi(values, period=14):
    if len(values) <= period:
        return None
    changes = [values[i] - values[i - 1] for i in range(1, len(values))][-period:]
    gains = sum(max(x, 0) for x in changes) / period
    losses = sum(max(-x, 0) for x in changes) / period
    return 100.0 if losses == 0 else 100 - 100 / (1 + gains / losses)


def atr(rows, period=14):
    if len(rows) <= period:
        return None
    trs = []
    for i in range(1, len(rows)):
        high, low, prev = rows[i]["high"], rows[i]["low"], rows[i - 1]["close"]
        trs.append(max(high - low, abs(high - prev), abs(low - prev)))
    return sum(trs[-period:]) / period


def swings(rows, width=2):
    points = []
    for i in range(width, len(rows) - width):
        window = rows[i - width:i + width + 1]
        if rows[i]["high"] == max(x["high"] for x in window):
            points.append({"date": rows[i]["date"], "type": "high", "price": rows[i]["high"]})
        if rows[i]["low"] == min(x["low"] for x in window):
            points.append({"date": rows[i]["date"], "type": "low", "price": rows[i]["low"]})
    return points[-12:]


def load_csv(path):
    required = {"date", "open", "high", "low", "close", "volume"}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fields = {x.lower() for x in (reader.fieldnames or [])}
        if not required.issubset(fields):
            raise ValueError(f"CSV requires columns: {sorted(required)}")
        rows = []
        for raw in reader:
            item = {str(k).lower(): v for k, v in raw.items()}
            rows.append({"date": item["date"], **{k: float(item[k]) for k in required - {"date"}}})
    rows.sort(key=lambda x: x["date"])
    if len(rows) < 30:
        raise ValueError("At least 30 rows are required; 250+ are recommended")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--lookback", type=int, default=120)
    args = parser.parse_args()
    rows = load_csv(args.csv_path)
    closes = [x["close"] for x in rows]
    volumes = [x["volume"] for x in rows]
    fast, slow = ema(closes, 12), ema(closes, 26)
    macd_line = [a - b for a, b in zip(fast, slow)]
    signal = ema(macd_line, 9)
    subset = rows[-min(args.lookback, len(rows)):]
    high, low = max(x["high"] for x in subset), min(x["low"] for x in subset)
    span = high - low
    obv = 0
    for i in range(1, len(rows)):
        obv += volumes[i] if closes[i] > closes[i - 1] else -volumes[i] if closes[i] < closes[i - 1] else 0
    result = {
        "as_of": rows[-1]["date"], "rows": len(rows), "close": closes[-1],
        "returns_pct": {str(n): round((closes[-1] / closes[-n - 1] - 1) * 100, 3) if len(closes) > n else None for n in (5, 20, 60, 120, 250)},
        "sma": {str(n): round(sma(closes, n), 4) if sma(closes, n) is not None else None for n in (20, 60, 120, 250)},
        "volume_ratio_20": round(volumes[-1] / sma(volumes, 20), 3) if sma(volumes, 20) else None,
        "rsi14": round(rsi(closes), 3) if rsi(closes) is not None else None,
        "atr14": round(atr(rows), 4) if atr(rows) is not None else None,
        "atr_pct": round(atr(rows) / closes[-1] * 100, 3) if atr(rows) is not None and closes[-1] else None,
        "macd": {"line": round(macd_line[-1], 4), "signal": round(signal[-1], 4), "histogram": round(macd_line[-1] - signal[-1], 4)},
        "obv": obv,
        "lookback_range": {"sessions": len(subset), "high": high, "low": low},
        "fib_retracement_from_high": {str(level): round(high - span * level, 4) for level in (0.236, 0.382, 0.5, 0.618, 0.786)},
        "recent_fractal_swings": swings(subset),
        "warnings": ["Indicators are descriptive, not standalone trade signals.", "Confirm adjustment method and data source before comparing instruments."],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()

