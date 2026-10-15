"""
scoring.py — Tính chỉ số DBI cho 5 ngân hàng theo docs/methodology.md

Luồng:
    data/raw/evidence/*.xlsx (sheet "Chấm điểm") + data/raw/DBI_criteria.xlsx
    → Z = (Mức − 1) / 4 × 100
    → điểm nhóm = TB Z trong nhóm → điểm trụ cột = TB các nhóm → DBI = Σ(W × trụ cột) / ΣW
    → Cách A (bỏ N/A) và Cách B (N/A = Mức 1), 4 kịch bản trọng số (config/weights.yaml)
    → xếp hạng, Spearman, mô phỏng Dirichlet

Đầu ra:
    web/data.js(.json)    dữ liệu cho website tĩnh (không có cột Ghi chú / người nhập)
    outputs/ranking.xlsx  bảng xếp hạng, điểm trụ cột, điểm nhóm, độ vững

Chạy:  python src/scoring.py
"""
from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "data" / "raw" / "evidence"
CRITERIA_FILE = ROOT / "data" / "raw" / "DBI_criteria.xlsx"
WEIGHTS_FILE = ROOT / "config" / "weights.yaml"
WEB_DATA = ROOT / "web" / "data.json"
WEB_DATA_JS = ROOT / "web" / "data.js"
RANKING_XLSX = ROOT / "outputs" / "ranking.xlsx"

SHEET = "Chấm điểm"
WAYS = ("A", "B")

# Thứ tự hiển thị ngân hàng (giữ ổn định cho màu sắc trên web)
BANK_ORDER = ["Vietcombank", "BIDV", "VietinBank", "MB", "TPBank"]


# ---------------------------------------------------------------- đọc dữ liệu
def load_criteria() -> pd.DataFrame:
    c = pd.read_excel(CRITERIA_FILE)
    c = c.rename(columns={
        "Mã trụ cột": "pillar", "Trụ cột": "pillar_name", "Mã nhóm": "group",
        "Nhóm tiêu chí": "group_name", "Mã": "code", "Tiêu chí": "name",
    })
    c["pillar"] = c["pillar"].astype(int)
    c["group"] = c["group"].astype(str)
    c["code"] = c["code"].astype(str).str.strip()
    return c


def parse_level(v):
    """Trả về số 1–5, hoặc None nếu N/A / để trống / không hợp lệ."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v).strip().upper()
    if s in ("", "N/A", "NA", "NAN"):
        return None
    try:
        x = float(s)
    except ValueError:
        return None
    return int(x) if x in (1, 2, 3, 4, 5) else None


def clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def load_evidence(criteria: pd.DataFrame) -> pd.DataFrame:
    rows = []
    files = sorted(EVIDENCE_DIR.glob("*.xlsx"))
    if not files:
        raise FileNotFoundError(f"Không thấy file Excel nào trong {EVIDENCE_DIR}")
    for f in files:
        bank = f.stem
        df = pd.read_excel(f, sheet_name=SHEET)
        df["Mã"] = df["Mã"].astype(str).str.strip()
        for _, r in df.iterrows():
            rows.append({
                "bank": bank,
                "code": r["Mã"],
                "level": parse_level(r.get("Level")),
                "evidence": clean(r.get("Minh chứng")),
                "source": clean(r.get("Nguồn")),
                "page": clean(r.get("Trang")),
                "year": clean(r.get("Năm")),
                # Cố ý KHÔNG lấy "Ghi chú" để không lộ ghi chú nội bộ lên web public
            })
    ev = pd.DataFrame(rows)
    missing = set(criteria["code"]) - set(ev["code"])
    if missing:
        print(f"[Cảnh báo] Thiếu {len(missing)} mã tiêu chí trong file minh chứng: {sorted(missing)[:5]}…")
    ev = ev.merge(criteria[["code", "pillar", "group"]], on="code", how="inner")
    return ev


def load_weights() -> dict:
    with open(WEIGHTS_FILE, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh)
    return cfg


# ---------------------------------------------------------------- tính điểm
def z_score(level, way: str):
    if level is None or pd.isna(level):
        return 0.0 if way == "B" else None   # Cách B: N/A = Mức 1 → Z = 0
    return (level - 1) / 4 * 100


def aggregate(ev: pd.DataFrame, way: str):
    """Trả về (group_scores, pillar_scores) dạng DataFrame bank × mã."""
    e = ev.copy()
    e["z"] = [z_score(l, way) for l in e["level"]]
    e = e.dropna(subset=["z"])
    g = e.groupby(["bank", "group"])["z"].mean().unstack()           # TB tiêu chí trong nhóm
    grp_pillar = ev.drop_duplicates("group").set_index("group")["pillar"]
    p = {}
    for pil in sorted(grp_pillar.unique()):
        cols = [c for c in g.columns if grp_pillar[c] == pil]
        p[pil] = g[cols].mean(axis=1, skipna=True)                  # TB các nhóm có điểm
    pillar = pd.DataFrame(p)
    return g, pillar


def dbi(pillar: pd.DataFrame, weights: dict) -> pd.Series:
    w = pd.Series({int(k): float(v) for k, v in weights.items()})
    out = {}
    for bank, row in pillar.iterrows():
        mask = row.notna()
        ww = w[row.index[mask]]
        out[bank] = float((row[mask] * ww).sum() / ww.sum()) if ww.sum() > 0 else float("nan")
    return pd.Series(out)


def rank_desc(s: pd.Series) -> pd.Series:
    """Xếp hạng giảm dần, ngang điểm thì cùng hạng (kiểu 1,2,2,4)."""
    return s.round(6).rank(ascending=False, method="min").astype(int)


def spearman(a: pd.Series, b: pd.Series) -> float:
    ra, rb = a.rank(), b.rank()
    ra, rb = ra.align(rb, join="inner")
    if ra.std() == 0 or rb.std() == 0:
        return 1.0
    return float(np.corrcoef(ra, rb)[0, 1])


def dirichlet_sim(pillar: pd.DataFrame, runs: int, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    banks = list(pillar.index)
    counts = {b: [0] * len(banks) for b in banks}
    for _ in range(runs):
        w = rng.dirichlet(np.ones(pillar.shape[1]))
        s = dbi(pillar, dict(zip(pillar.columns, w)))
        r = rank_desc(s)
        for b in banks:
            counts[b][r[b] - 1] += 1
    return {b: [c / runs for c in counts[b]] for b in banks}


# ---------------------------------------------------------------- xuất dữ liệu
def r1(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 2)


def main():
    criteria = load_criteria()
    ev = load_evidence(criteria)
    cfg = load_weights()
    scenarios = cfg["scenarios"]

    banks = [b for b in BANK_ORDER if b in ev["bank"].unique()] + \
            sorted(set(ev["bank"]) - set(BANK_ORDER))

    results = {}          # results[way][scenario] = {...}
    pillars_by_way, groups_by_way = {}, {}
    for way in WAYS:
        g, p = aggregate(ev, way)
        g, p = g.reindex(banks), p.reindex(banks)
        groups_by_way[way], pillars_by_way[way] = g, p
        results[way] = {}
        for sc, spec in scenarios.items():
            d = dbi(p, spec["weights"])
            results[way][sc] = {"dbi": d, "rank": rank_desc(d)}

    # Coverage = số tiêu chí có điểm / 140
    cov = ev.groupby("bank")["level"].apply(lambda s: s.notna().sum())
    cov_pillar = ev.groupby(["bank", "pillar"])["level"].apply(lambda s: s.notna().sum()).unstack()
    n_pillar = criteria.groupby("pillar")["code"].count()

    # Độ vững: Spearman so với kịch bản cơ sở, Cách A
    base = results["A"]["base"]["dbi"]
    robust = []
    for way in WAYS:
        for sc in scenarios:
            d = results[way][sc]["dbi"]
            changed = [b for b in banks
                       if results[way][sc]["rank"][b] != results["A"]["base"]["rank"][b]]
            robust.append({"way": way, "scenario": sc, "label": scenarios[sc]["label"],
                           "rho": round(spearman(base, d), 3), "changed": changed})

    dcfg = cfg.get("dirichlet", {}) or {}
    sim = dirichlet_sim(pillars_by_way["A"], int(dcfg.get("runs", 1000)), int(dcfg.get("seed", 42)))

    # ---------- JSON cho web
    pillar_meta = (criteria.drop_duplicates("pillar")[["pillar", "pillar_name"]]
                   .sort_values("pillar"))
    group_meta = criteria.drop_duplicates("group")[["group", "group_name", "pillar"]]
    payload = {
        "meta": {
            "title": "Digital Banking Index",
            "generated": date.today().isoformat(),
            "period": "FY2025",
            "n_criteria": int(len(criteria)),
            "n_records": int(len(ev)),
            "banks": banks,
            "pillars": [{"id": int(r.pillar), "name": r.pillar_name,
                         "short": r.pillar_name.split("Trụ cột")[-1].strip(),
                         "n": int(n_pillar[r.pillar])} for r in pillar_meta.itertuples()],
            "groups": [{"id": r.group, "name": r.group_name, "pillar": int(r.pillar)}
                       for r in group_meta.itertuples()],
            "scenarios": [{"id": k, "label": v["label"],
                           "weights": {str(a): b for a, b in v["weights"].items()}}
                          for k, v in scenarios.items()],
        },
        "scores": {
            way: {
                "pillar": {b: {str(k): r1(v) for k, v in pillars_by_way[way].loc[b].items()} for b in banks},
                "group": {b: {k: r1(v) for k, v in groups_by_way[way].loc[b].items()} for b in banks},
                "dbi": {sc: {b: r1(results[way][sc]["dbi"][b]) for b in banks} for sc in scenarios},
                "rank": {sc: {b: int(results[way][sc]["rank"][b]) for b in banks} for sc in scenarios},
            } for way in WAYS
        },
        "coverage": {b: {"total": int(cov[b]),
                         "pillar": {str(k): int(v) for k, v in cov_pillar.loc[b].items()}} for b in banks},
        "robustness": robust,
        "dirichlet": {"runs": int(dcfg.get("runs", 1000)), "prob": sim},
        "criteria": [{"code": r.code, "name": r.name, "pillar": int(r.pillar), "group": r.group,
                      "levels": [clean(getattr(r, f"_{i}")) for i in range(7, 12)]}
                     for r in criteria.itertuples()],
        "records": [{"bank": r.bank, "code": r.code,
                     "level": None if r.level is None or (isinstance(r.level, float) and math.isnan(r.level)) else int(r.level), "evidence": r.evidence,
                     "source": r.source, "page": r.page, "year": r.year}
                    for r in ev.itertuples()],
    }
    WEB_DATA.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    WEB_DATA.write_text(raw, encoding="utf-8")
    # data.js để mở index.html trực tiếp (double-click) không cần server
    WEB_DATA_JS.write_text("window.DBI_DATA=" + raw + ";", encoding="utf-8")

    # ---------- Excel
    RANKING_XLSX.parent.mkdir(parents=True, exist_ok=True)
    pname = {int(r.pillar): r.pillar_name for r in pillar_meta.itertuples()}
    with pd.ExcelWriter(RANKING_XLSX) as xw:
        for way in WAYS:
            t = pd.DataFrame({
                "Ngân hàng": banks,
                "DBI": [r1(results[way]["base"]["dbi"][b]) for b in banks],
                "Hạng": [int(results[way]["base"]["rank"][b]) for b in banks],
                "Coverage": [f"{int(cov[b])}/{len(criteria)}" for b in banks],
            })
            for sc in scenarios:
                if sc != "base":
                    t[f"DBI {sc}"] = [r1(results[way][sc]["dbi"][b]) for b in banks]
                    t[f"Hạng {sc}"] = [int(results[way][sc]["rank"][b]) for b in banks]
            t.sort_values("Hạng").to_excel(xw, sheet_name=f"Xếp hạng Cách {way}", index=False)
            pp = pillars_by_way[way].rename(columns=pname).round(2)
            pp.index.name = "Ngân hàng"
            pp.to_excel(xw, sheet_name=f"Trụ cột Cách {way}")
            gg = groups_by_way[way].round(2)
            gg.index.name = "Ngân hàng"
            gg.to_excel(xw, sheet_name=f"Nhóm Cách {way}")
        pd.DataFrame([{**r, "changed": ", ".join(r["changed"])} for r in robust]) \
            .rename(columns={"way": "Cách", "scenario": "Kịch bản", "label": "Mô tả",
                             "rho": "Spearman vs cơ sở A", "changed": "Ngân hàng đổi hạng"}) \
            .to_excel(xw, sheet_name="Độ vững", index=False)
        pd.DataFrame({b: [round(x * 100, 1) for x in v] for b, v in sim.items()},
                     index=[f"Hạng {i+1} (%)" for i in range(len(banks))]).T \
            .to_excel(xw, sheet_name="Dirichlet")

    # ---------- tóm tắt ra màn hình
    print("DBI (Cách A, cơ sở):")
    s = results["A"]["base"]["dbi"].sort_values(ascending=False)
    for b, v in s.items():
        print(f"  {results['A']['base']['rank'][b]}. {b:<12} {v:6.2f}   coverage {cov[b]}/{len(criteria)}")
    print(f"→ {WEB_DATA.relative_to(ROOT)}  ({WEB_DATA.stat().st_size/1024:.0f} KB)")
    print(f"→ {RANKING_XLSX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
