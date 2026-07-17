"""
Fuzz-style robustness validation of AKSES's LLM-output JSON extractor
(lib/materi/extract-json.ts), ported faithfully from source. Tests the
realistic classes of malformed output Gemini is documented (in this
project's own code comments) to sometimes produce.
"""
import json, re

def extract_json(raw):
    teks = (raw or "").strip()
    if not teks:
        raise ValueError("Respons AI kosong.")
    tanpa_pagar = re.sub(r"```json", "", teks, flags=re.IGNORECASE)
    tanpa_pagar = tanpa_pagar.replace("```", "").strip()
    try:
        return json.loads(tanpa_pagar)
    except Exception:
        pass
    mulai = tanpa_pagar.find("{")
    selesai = tanpa_pagar.rfind("}")
    if mulai == -1 or selesai == -1 or selesai <= mulai:
        raise ValueError("Tidak ada objek JSON dalam respons AI.")
    return json.loads(tanpa_pagar[mulai:selesai + 1])


cases = [
    # (name, raw_input, should_succeed, expected_value_check)
    ("clean JSON", '{"judul": "Fotosintesis", "kuis": []}', True, lambda r: r["judul"] == "Fotosintesis"),
    ("markdown-fenced ```json", '```json\n{"judul": "Fotosintesis"}\n```', True, lambda r: r["judul"] == "Fotosintesis"),
    ("markdown-fenced bare ```", '```\n{"judul": "Fotosintesis"}\n```', True, lambda r: r["judul"] == "Fotosintesis"),
    ("leading prose before JSON", 'Berikut adalah hasilnya:\n{"judul": "Fotosintesis"}', True, lambda r: r["judul"] == "Fotosintesis"),
    ("trailing prose after JSON", '{"judul": "Fotosintesis"}\nSemoga membantu!', True, lambda r: r["judul"] == "Fotosintesis"),
    ("prose + fence + prose", 'Ini dia:\n```json\n{"judul": "Sel Hewan"}\n```\nSelesai.', True, lambda r: r["judul"] == "Sel Hewan"),
    ("nested braces in string value", '{"judul": "Bab {1}: Pengenalan"}', True, lambda r: r["judul"] == "Bab {1}: Pengenalan"),
    ("empty string", "", False, None),
    ("whitespace only", "   \n\n  ", False, None),
    ("no JSON object at all", "Maaf, saya tidak bisa membuat materi ini.", False, None),
    ("truncated JSON (token limit cutoff)", '{"judul": "Fotosintesis", "kuis": [{"pertanyaan": "Apa itu', False, None),
    # NOTE: extractJson<T>() performs NO top-level shape validation -- a
    # syntactically valid JSON array parses successfully (json.loads succeeds
    # on any valid JSON value, not only objects). Structural validation is the
    # CALLER's responsibility (e.g. generate-materi/route.ts's explicit
    # Array.isArray(parsed.kuis) check) -- confirmed here rather than assumed.
    ("array instead of object at top level (no shape check at this layer)", '[{"judul": "a"}]', True, lambda r: isinstance(r, list)),
]

print("=== extract-json robustness fuzz corpus ===")
passed = 0
for name, raw, should_succeed, check in cases:
    try:
        result = extract_json(raw)
        ok = should_succeed and (check is None or check(result))
        outcome = "PARSED"
    except Exception as e:
        ok = not should_succeed
        outcome = f"RAISED ({type(e).__name__})"
    passed += ok
    print(f"  [{'PASS' if ok else 'FAIL'}] {name:38} -> {outcome}")

print(f"\n{passed}/{len(cases)} cases behaved as specified ({passed/len(cases)*100:.1f}%)")
