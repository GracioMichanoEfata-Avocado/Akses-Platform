"""
Exhaustive state-space validation of AKSES's live-session access-control
function. Faithful port of lib/live/room-access.ts's authorizeRoomAccess(),
read directly from source. The state space is small enough to enumerate
completely (not sample) -- every equivalence class of input is tested, which
is a stronger validation standard than the project's own 15 unit tests
(which are example-based, not exhaustive).
"""
import itertools
import json

# ---- Faithful port of lib/live/room-access.ts ----

def authorize_room_access(session, user_id, peran):
    if session is None:
        return False, "Ruang tidak ditemukan"

    if peran == "teacher":
        return (True, "") if session["guru_id"] == user_id else (False, "Anda bukan pengajar sesi ini")

    if session["status"] != "live":
        return False, "Sesi belum dimulai"

    if session["tipe"] == "kelas":
        return True, ""

    if session["student_id"] and session["student_id"] == user_id:
        return True, ""
    return False, "Sesi ini khusus siswa lain"


# ---- Exhaustive enumeration of equivalence classes ----
# session=None is one class on its own.
# For session != None, the relevant equivalence classes are:
#   role in {teacher, student}
#   requester relationship to guru_id: {is_owner, not_owner}  (only matters for teacher path)
#   status in {scheduled, live, ended}
#   tipe in {kelas, privat}
#   student_id relation to user_id: {null, matches_user, other_student}  (only matters for student+privat path)

USER = "user-under-test"
GURU_OWNER = USER
GURU_OTHER = "other-teacher"
STUDENT_MATCH = USER
STUDENT_OTHER = "other-student"

results = []

# Class 0: session is None
allowed, reason = authorize_room_access(None, USER, "teacher")
results.append({"session": None, "peran": "teacher", "expected_allow": False, "got_allow": allowed, "reason": reason})
allowed, reason = authorize_room_access(None, USER, "student")
results.append({"session": None, "peran": "student", "expected_allow": False, "got_allow": allowed, "reason": reason})

statuses = ["scheduled", "live", "ended"]
tipes = ["kelas", "privat"]
guru_options = [("owner", GURU_OWNER), ("other", GURU_OTHER)]
student_id_options = [("null", None), ("match", STUDENT_MATCH), ("other", STUDENT_OTHER)]

# Ground-truth spec, derived independently from the plain-English access
# policy (not copy-pasted from the implementation), then compared against
# the implementation's actual output for every combination:
#   TEACHER: allowed iff guru_id == user_id, REGARDLESS of status/tipe/student_id
#   STUDENT: allowed iff status == 'live' AND (
#              tipe == 'kelas' OR (tipe == 'privat' AND student_id == user_id)
#            )

for status in statuses:
    for tipe in tipes:
        for guru_label, guru_id in guru_options:
            for sid_label, student_id in student_id_options:
                session = {
                    "guru_id": guru_id,
                    "status": status,
                    "room_name": "r1",
                    "tipe": tipe,
                    "student_id": student_id,
                }

                # --- Teacher path ---
                expected = (guru_id == USER)
                got, reason = authorize_room_access(session, USER, "teacher")
                results.append({
                    "session": {"status": status, "tipe": tipe, "guru": guru_label, "student_id": sid_label},
                    "peran": "teacher", "expected_allow": expected, "got_allow": got, "reason": reason,
                })

                # --- Student path ---
                if status != "live":
                    expected = False
                elif tipe == "kelas":
                    expected = True
                else:  # privat
                    expected = (student_id == USER)
                got, reason = authorize_room_access(session, USER, "student")
                results.append({
                    "session": {"status": status, "tipe": tipe, "guru": guru_label, "student_id": sid_label},
                    "peran": "student", "expected_allow": expected, "got_allow": got, "reason": reason,
                })

mismatches = [r for r in results if r["expected_allow"] != r["got_allow"]]

print(f"Total enumerated cases: {len(results)}")
print(f"Mismatches against independently-derived policy spec: {len(mismatches)}")
if mismatches:
    print("\n!!! MISMATCHES FOUND !!!")
    for m in mismatches:
        print(m)
else:
    print("\nRESULT: authorizeRoomAccess() matches the independently-derived access")
    print("policy on ALL enumerated equivalence classes. No privilege-escalation or")
    print("unintended-denial case found in the exhaustive sweep.")

# Specifically flag the privacy-sensitive case this function's own code comment
# calls out: an uninvited student on a not-yet-started private session must get
# the SAME rejection reason as a not-live class session (cannot distinguish
# "not started" from "not invited").
not_started_privat = next(r for r in results if r["peran"] == "student"
                           and r["session"] != None and r["session"]["status"] == "scheduled"
                           and r["session"]["tipe"] == "privat" and r["session"]["student_id"] == "other")
not_started_kelas = next(r for r in results if r["peran"] == "student"
                          and r["session"] != None and r["session"]["status"] == "scheduled"
                          and r["session"]["tipe"] == "kelas")
print(f"\nPrivacy check -- reason for uninvited student on not-yet-started PRIVATE session: '{not_started_privat['reason']}'")
print(f"Privacy check -- reason for any student on not-yet-started CLASS session:          '{not_started_kelas['reason']}'")
print(f"Reasons identical (no information leak about invitation status before session starts): {not_started_privat['reason'] == not_started_kelas['reason']}")

with open("C:/Users/MicxD/AppData/Local/Temp/claude/C--Users-MicxD-OneDrive-Dokumen-AKSES/fc0615e3-c8ed-405a-aaca-dea42bf758a9/scratchpad/figures/room_access_validation.json", "w") as f:
    json.dump({"total_cases": len(results), "mismatches": len(mismatches), "results": results}, f, indent=2)
print("\nSaved room_access_validation.json")
