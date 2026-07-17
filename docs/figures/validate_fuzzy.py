"""
Real, executed validation of AKSES's remedial fuzzy-logic system.
Faithful line-by-line port of lib/utils/fuzzyLogic.ts (read directly from source,
not reconstructed from memory) -- see the trapesium()/hitungFuzzyRemedial()
translation below. Cross-validated against the exact assertions in
lib/utils/fuzzyLogic.test.ts (the project's own real unit tests) before any
figure is generated, so a mismatch would be caught rather than silently plotted.
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import json

# ---- Faithful port of lib/utils/fuzzyLogic.ts ----

def trapesium(x, a, b, c, d):
    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a < x < b:
        return (x - a) / (b - a)
    if c < x < d:
        return (d - x) / (d - c)
    return 0.0

def hitung_fuzzy_remedial(nilai):
    gagal_parah = trapesium(nilai, 0, 0, 25, 45)
    gagal       = trapesium(nilai, 30, 45, 55, 65)
    hampir_lulus = trapesium(nilai, 55, 62, 69, 70)
    max_derajat = max(gagal_parah, gagal, hampir_lulus)

    if max_derajat == gagal_parah and gagal_parah > 0:
        tingkat = "sangat_mudah"
    elif max_derajat == hampir_lulus and hampir_lulus > 0:
        tingkat = "sedang"
    else:
        tingkat = "mudah"
    return {
        "tingkat": tingkat,
        "gagalParah": gagal_parah,
        "gagal": gagal,
        "hampirLulus": hampir_lulus,
    }

# ---- Step 1: cross-validate against lib/utils/fuzzyLogic.test.ts (real assertions) ----
checks = [
    (0, "sangat_mudah"),
    (10, "sangat_mudah"),
    (35, "sangat_mudah"),
    (50, "mudah"),
    (65, "sedang"),
    (69, "sedang"),
]
print("=== Cross-validation against lib/utils/fuzzyLogic.test.ts ===")
all_pass = True
for nilai, expected in checks:
    r = hitung_fuzzy_remedial(nilai)
    ok = r["tingkat"] == expected
    all_pass &= ok
    print(f"  score={nilai:>3} -> got={r['tingkat']:<13} expected={expected:<13} {'OK' if ok else 'MISMATCH'}")

# membership-degree bounds check (mirrors the test's 0<=degree<=1 sweep, step 5)
bounds_ok = True
for nilai in range(0, 101, 5):
    r = hitung_fuzzy_remedial(nilai)
    for k in ("gagalParah", "gagal", "hampirLulus"):
        if not (0 <= r[k] <= 1):
            bounds_ok = False
print(f"  membership degrees in [0,1] for all scores 0..100 step 5: {'OK' if bounds_ok else 'FAIL'}")
print(f"\nALL CROSS-VALIDATION CHECKS PASSED: {all_pass and bounds_ok}\n")

if not (all_pass and bounds_ok):
    raise SystemExit("Port does not match source behaviour -- aborting figure generation.")

# ---- Step 2: fine-grained sweep for figures + boundary detection ----
xs = np.arange(0, 100.01, 0.1)
gp = np.array([trapesium(x, 0, 0, 25, 45) for x in xs])
g  = np.array([trapesium(x, 30, 45, 55, 65) for x in xs])
hl = np.array([trapesium(x, 55, 62, 69, 70) for x in xs])
tiers = np.array([hitung_fuzzy_remedial(x)["tingkat"] for x in xs])

# find exact decision-boundary crossover points
boundaries = []
for i in range(1, len(xs)):
    if tiers[i] != tiers[i-1]:
        boundaries.append((xs[i-1], tiers[i-1], tiers[i]))
print("=== Detected decision boundaries (tier transitions) ===")
for x, a, b in boundaries:
    print(f"  score ~= {x:5.1f}: {a} -> {b}")

# ---- Step 3: Figure -- membership functions + decision regions ----
fig, ax = plt.subplots(figsize=(9, 5))
region_colors = {"sangat_mudah": "#fde2e2", "mudah": "#fff3cd", "sedang": "#d4edda"}
region_labels = {"sangat_mudah": "sangat_mudah (very easy)", "mudah": "mudah (easy)", "sedang": "sedang (medium)"}
start_idx = 0
drawn = set()
for i in range(1, len(xs)):
    if tiers[i] != tiers[i-1] or i == len(xs) - 1:
        lbl = region_labels[tiers[i-1]] if tiers[i-1] not in drawn else None
        ax.axvspan(xs[start_idx], xs[i], color=region_colors[tiers[i-1]], alpha=0.6, label=lbl)
        drawn.add(tiers[i-1])
        start_idx = i

ax.plot(xs, gp, label="Gagal Parah  (a=0,b=0,c=25,d=45)", color="#c0392b", linewidth=2)
ax.plot(xs, g,  label="Gagal  (a=30,b=45,c=55,d=65)",       color="#e67e22", linewidth=2)
ax.plot(xs, hl, label="Hampir Lulus  (a=55,b=62,c=69,d=70)", color="#27ae60", linewidth=2)
ax.axvline(70, color="black", linestyle="--", linewidth=1, alpha=0.7)
ax.text(70.5, 0.95, "PASSING_GRADE = 70", rotation=90, va="top", fontsize=8)

for x, a, b in boundaries:
    ax.axvline(x, color="grey", linestyle=":", linewidth=1)

ax.set_xlabel("Initial quiz score (0-100)")
ax.set_ylabel("Membership degree $\\mu(x)$")
ax.set_title("Figure 8. Trapezoidal membership functions and resulting\nmaximum-membership decision regions -- AKSES remedial difficulty selector\n(lib/utils/fuzzyLogic.ts, executed and cross-validated against its own unit tests)")
ax.set_xlim(0, 100)
ax.set_ylim(0, 1.05)
handles, labels = ax.get_legend_handles_labels()
by_label = dict(zip(labels, handles))
ax.legend(by_label.values(), by_label.keys(), loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=2, fontsize=8)
fig.tight_layout()
fig.savefig("C:/Users/MicxD/AppData/Local/Temp/claude/C--Users-MicxD-OneDrive-Dokumen-AKSES/fc0615e3-c8ed-405a-aaca-dea42bf758a9/scratchpad/figures/figure8_fuzzy_membership.png", dpi=300)
print("\nSaved figure8_fuzzy_membership.png")

# ---- Step 4: representative value table (real, computed, not placeholder) ----
table_scores = [0, 5, 10, 20, 25, 30, 35, 40, 44, 45, 46, 50, 54, 55, 56, 60, 62, 65, 68, 69, 70, 80, 100]
rows = []
for s in table_scores:
    r = hitung_fuzzy_remedial(s)
    rows.append({
        "score": s,
        "gagalParah": round(r["gagalParah"], 3),
        "gagal": round(r["gagal"], 3),
        "hampirLulus": round(r["hampirLulus"], 3),
        "tingkat": r["tingkat"],
        "perluRemedial": s < 70,
    })

print("\n=== Table VII data (representative scores) ===")
print(f"{'score':>5} {'gagalParah':>11} {'gagal':>7} {'hampirLulus':>12} {'tingkat':>13} {'remedial?':>10}")
for row in rows:
    print(f"{row['score']:>5} {row['gagalParah']:>11} {row['gagal']:>7} {row['hampirLulus']:>12} {row['tingkat']:>13} {str(row['perluRemedial']):>10}")

with open("C:/Users/MicxD/AppData/Local/Temp/claude/C--Users-MicxD-OneDrive-Dokumen-AKSES/fc0615e3-c8ed-405a-aaca-dea42bf758a9/scratchpad/figures/fuzzy_table.json", "w") as f:
    json.dump({"boundaries": [(float(x), a, b) for x, a, b in boundaries], "rows": rows}, f, indent=2)
print("\nSaved fuzzy_table.json")
