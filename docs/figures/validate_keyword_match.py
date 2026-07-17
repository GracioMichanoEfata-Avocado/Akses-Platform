"""
Validation of AKSES's voice-command keyword matcher (lib/voice/keyword-match.ts),
ported faithfully from source, tested against a constructed corpus of realistic
Indonesian Web-Speech-API-style transcripts (no punctuation, as the real STT
output never includes it -- see useVoiceNavigation.ts's normalisasiUcapan()
comment for why).
"""
import re, json

def matches_keyword(transcript, keyword, match_type="includes"):
    lower = transcript.lower()
    kw = keyword.lower().strip()
    if not kw:
        return False
    if match_type == "includes":
        return kw in lower
    escaped = re.escape(kw)
    pattern = r'(^|[^\w])' + escaped + r'($|[^\w])'
    return re.search(pattern, lower, re.UNICODE) is not None

# ---- Corpus: (transcript, keyword, match_type, expected) ----
# Drawn from realistic STT outputs for AKSES's actual command vocabulary
# (lib/hooks/useVoiceNavigation.ts STATIC_COMMANDS, lib/hooks/useQuizVoice.ts).
corpus = [
    # Exact single-word answer commands (quiz A-E), 'word' mode -- must not
    # false-positive on short keywords appearing inside unrelated words.
    ("a", "a", "word", True),
    ("saya pilih a", "a", "word", True),
    ("apa", "a", "word", False),          # 'a' must NOT match inside 'apa'
    ("aduh", "a", "word", False),
    ("pilihan a", "a", "word", True),
    ("baca", "a", "word", False),         # trailing 'a' inside 'baca'
    ("b", "b", "word", True),
    ("saya rasa be", "be", "word", True),
    ("beranda", "be", "word", False),     # 'be' must not match inside 'beranda'
    # Menu navigation, 'includes' mode (legacy substring behaviour) -- realistic
    # multi-word STT transcripts.
    ("tolong buka beranda dong", "beranda", "includes", True),
    ("aku mau ke halaman belajar sekarang", "belajar", "includes", True),
    ("buka kelas live nya", "kelas live", "includes", True),
    ("ada notifikasi baru gak", "notifikasi", "includes", True),
    ("mau lihat profil saya", "profil", "includes", True),
    # Stop keywords -- must trigger on natural phrasing variants.
    ("stop dulu", "stop", "includes", True),
    ("berhenti sebentar", "berhenti", "includes", True),
    ("tolong diam dulu", "diam", "includes", True),
    ("hentikan videonya", "hentikan", "includes", True),
    # Help / read-page triggers -- natural variants.
    ("bantuan dong", "bantuan", "includes", True),
    ("apa aja perintahnya", "apa aja", "includes", True),
    ("bacakan halaman ini", "bacakan halaman", "includes", True),
    # Negative controls: keyword should NOT match unrelated transcript.
    ("saya mau belajar matematika", "beranda", "includes", False),
    ("lanjut ke soal berikutnya", "ulangi", "word", False),
    ("ulangi soal ini", "ulangi", "word", True),
    ("saya pilih jawaban c", "jawaban c", "includes", True),
    ("c", "c", "word", True),
    ("se", "c", "word", False),  # phonetic 'se' transcript should not match letter 'c' pattern directly
]

print("=== Keyword-matcher validation corpus (Indonesian voice commands) ===")
passed = 0
for transcript, kw, mtype, expected in corpus:
    got = matches_keyword(transcript, kw, mtype)
    ok = got == expected
    passed += ok
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] transcript={transcript!r:40} keyword={kw!r:12} mode={mtype:9} expected={expected!s:5} got={got!s:5}")

print(f"\n{passed}/{len(corpus)} cases matched expected behaviour ({passed/len(corpus)*100:.1f}%)")

with open("C:/Users/MicxD/AppData/Local/Temp/claude/C--Users-MicxD-OneDrive-Dokumen-AKSES/fc0615e3-c8ed-405a-aaca-dea42bf758a9/scratchpad/figures/keyword_match_validation.json", "w") as f:
    json.dump({
        "total": len(corpus), "passed": int(passed),
        "cases": [{"transcript": t, "keyword": k, "mode": m, "expected": e,
                   "got": matches_keyword(t, k, m)} for t, k, m, e in corpus]
    }, f, indent=2)
print("Saved keyword_match_validation.json")
