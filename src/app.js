import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import clsx from "clsx";
import { Input } from "./components/ui/input";

const STORAGE_KEY = "teacher-timer-state-v2";
const SETTINGS_KEY = "teacher-timer-settings-v2";

const schedules = [
  {
    name: "Work Hard, Take a Break",
    description:
      "📝 50 min → Get work done\n☕ 10 min → Break\n📝 50 min → Get work done\n✅ 10 min → Break & plan next steps\n\nGreat for: Staying focused with just one break!",
    times: [
      { label: "Work", duration: 50 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 50 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Work a Little, Rest a Little",
    description:
      "💡 30 min → Work time\n⏸️ 10 min → Break\n💡 30 min → Work time\n⏸️ 10 min → Break\n💡 30 min → Work time\n✅ 10 min → Break & plan next steps\n\nGreat for: Working in short bursts with more breaks!",
    times: [
      { label: "Work", duration: 30 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 30 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 30 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Power Hour & Chill",
    description:
      "⚡ 60 min → Get in the zone!\n🌿 15 min → Break\n📝 35 min → Work again\n✅ 10 min → Break & plan next steps\n\nGreat for: Getting a lot done first, then taking a longer break!",
    times: [
      { label: "Work", duration: 60 },
      { label: "Break", duration: 15 },
      { label: "Work", duration: 35 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Short Work & Quick Breaks",
    description:
      "💻 25 min → Work\n🔄 5 min → Break\n📖 25 min → Work\n🌟 10 min → Break\n🖊️ 25 min → Work\n🔄 5 min → Break\n🏁 15 min → Work\n✅ 10 min → Break & plan next steps\n\nGreat for: If you like to take lots of small breaks!",
    times: [
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 15 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
];

// ---------- helpers ----------

function uuid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

// Computes derived phase state for a student.
// Time math uses Date.now() so it stays accurate even if
// setInterval is throttled (background tabs, locked iPad).
function getPhaseState(student, now) {
  const ref = student.isRunning ? now : student.pauseStartedAt || now;
  const elapsedSec = Math.max(
    0,
    Math.floor((ref - student.startTime - student.totalPausedMs) / 1000)
  );

  let totalDurationSec = 0;
  for (const t of student.schedule.times) totalDurationSec += t.duration * 60;

  let remaining = elapsedSec;
  for (let i = 0; i < student.schedule.times.length; i++) {
    const durationSec = student.schedule.times[i].duration * 60;
    if (remaining < durationSec) {
      return {
        currentIndex: i,
        timeLeft: durationSec - remaining,
        isFinished: false,
        totalElapsed: elapsedSec,
        totalDuration: totalDurationSec,
      };
    }
    remaining -= durationSec;
  }
  return {
    currentIndex: student.schedule.times.length - 1,
    timeLeft: 0,
    isFinished: true,
    totalElapsed: totalDurationSec,
    totalDuration: totalDurationSec,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function loadSettings() {
  const defaults = { soundEnabled: true, notificationsEnabled: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function phaseColor(label, isFinished) {
  if (isFinished) return "bg-rose-600 text-white";
  if (label === "Work") return "bg-emerald-600 text-white";
  if (label === "Wrap Up") return "bg-amber-500 text-white";
  return "bg-sky-600 text-white"; // Break
}

// ---------- alert player ----------

function createAlertPlayer() {
  let audio = null;
  let audioCtx = null;
  let mp3Failed = false;

  try {
    audio = new Audio("/notification.mp3");
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      mp3Failed = true;
    });
  } catch {
    mp3Failed = true;
  }

  function getCtx() {
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function chime() {
    const ctx = getCtx();
    if (!ctx) return;
    // Pleasant 3-note ascending chime
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    });
  }

  return {
    // Call inside a user gesture so iOS allows later auto-plays.
    unlock() {
      getCtx();
      if (audio && !mp3Failed) {
        const wasMuted = audio.muted;
        audio.muted = true;
        const p = audio.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = wasMuted;
          }).catch(() => {
            audio.muted = wasMuted;
          });
        }
      }
    },
    play() {
      if (audio && !mp3Failed) {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            mp3Failed = true;
            chime();
          });
        }
      } else {
        chime();
      }
    },
  };
}

// ---------- component ----------

export default function TeacherTimerApp() {
  const [students, setStudents] = useState(loadState);
  const [studentName, setStudentName] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [tick, setTick] = useState(0);

  const alertPlayerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const prevPhaseRef = useRef({});

  if (!alertPlayerRef.current && typeof window !== "undefined") {
    alertPlayerRef.current = createAlertPlayer();
  }

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch {}
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Ticker: 250ms for smooth countdown without burning cycles
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Wake Lock: keep iPad/phone screens awake while any timer is running
  const anyRunning = useMemo(
    () => students.some((s) => s.isRunning && !s.isFinished),
    [students]
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquire() {
      if (cancelled || !anyRunning) return;
      if (wakeLockRef.current) return;
      if (document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
        });
      } catch {
        // Permission denied or unsupported — silently ignore
      }
    }

    function release() {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }

    function onVisChange() {
      if (document.visibilityState === "visible" && anyRunning) acquire();
    }

    if (anyRunning) acquire();
    else release();

    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisChange);
      release();
    };
  }, [anyRunning]);

  // Detect phase transitions and mark finished students
  useEffect(() => {
    const now = Date.now();
    const transitions = [];
    const finishedIds = [];

    students.forEach((s) => {
      if (s.isFinished) {
        prevPhaseRef.current[s.id] = "finished";
        return;
      }
      const state = getPhaseState(s, now);
      const curKey = state.isFinished ? "finished" : String(state.currentIndex);
      const prevKey = prevPhaseRef.current[s.id];

      if (prevKey !== undefined && prevKey !== curKey) {
        transitions.push({ student: s, state });
      }
      prevPhaseRef.current[s.id] = curKey;

      if (state.isFinished) finishedIds.push(s.id);
    });

    // Fire alerts
    transitions.forEach(({ student, state }) => {
      const phaseName = state.isFinished
        ? "All done!"
        : student.schedule.times[state.currentIndex].label;

      if (settings.soundEnabled && alertPlayerRef.current) {
        alertPlayerRef.current.play();
      }
      if (
        settings.notificationsEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(`${student.name}: ${phaseName}`, {
            body: state.isFinished
              ? `${student.scheduleName} complete.`
              : `Now starting: ${phaseName}`,
            tag: `student-${student.id}-${state.currentIndex}`,
          });
        } catch {}
      }
    });

    // Persist isFinished so other effects (wake lock) react correctly
    if (finishedIds.length > 0) {
      setStudents((prev) =>
        prev.map((s) =>
          finishedIds.includes(s.id) && !s.isFinished
            ? { ...s, isFinished: true, isRunning: false }
            : s
        )
      );
    }

    // GC removed students from ref
    const liveIds = new Set(students.map((s) => s.id));
    Object.keys(prevPhaseRef.current).forEach((id) => {
      if (!liveIds.has(id)) delete prevPhaseRef.current[id];
    });
  }, [tick, students, settings.soundEnabled, settings.notificationsEnabled]);

  // ---------- actions ----------

  const unlock = useCallback(() => {
    if (alertPlayerRef.current) alertPlayerRef.current.unlock();
  }, []);

  const addStudent = useCallback(
    (schedule) => {
      const trimmed = studentName.trim();
      if (!trimmed) return;
      unlock();
      setStudents((prev) => [
        ...prev,
        {
          id: uuid(),
          name: trimmed,
          schedule,
          scheduleName: schedule.name,
          startTime: Date.now(),
          totalPausedMs: 0,
          pauseStartedAt: null,
          isRunning: true,
          isFinished: false,
        },
      ]);
      setStudentName("");
    },
    [studentName, unlock]
  );

  const removeStudent = useCallback((id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const togglePause = useCallback((id) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id || s.isFinished) return s;
        const now = Date.now();
        if (s.isRunning) {
          return { ...s, isRunning: false, pauseStartedAt: now };
        } else {
          const addedPaused = s.pauseStartedAt ? now - s.pauseStartedAt : 0;
          return {
            ...s,
            isRunning: true,
            pauseStartedAt: null,
            totalPausedMs: s.totalPausedMs + addedPaused,
          };
        }
      })
    );
  }, []);

  const resetStudent = useCallback((id) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              startTime: Date.now(),
              totalPausedMs: 0,
              pauseStartedAt: null,
              isRunning: true,
              isFinished: false,
            }
          : s
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    if (students.length === 0) return;
    if (window.confirm(`Remove all ${students.length} timer(s)?`)) {
      setStudents([]);
    }
  }, [students.length]);

  const requestNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Notifications aren't supported on this device.");
      return;
    }
    if (Notification.permission === "denied") {
      alert(
        "Notifications were blocked. Re-enable them in your browser's site settings."
      );
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setSettings((s) => ({ ...s, notificationsEnabled: perm === "granted" }));
    } catch {}
  }, []);

  // ---------- render ----------

  const now = Date.now();
  void tick; // ensure recompute each tick

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <header className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Teacher Timer</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  unlock();
                  setSettings((s) => ({
                    ...s,
                    soundEnabled: e.target.checked,
                  }));
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Sound</span>
            </label>
            <button
              onClick={requestNotifications}
              className={clsx(
                "px-3 py-2 border rounded-lg text-sm font-medium transition",
                settings.notificationsEnabled
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              )}
            >
              {settings.notificationsEnabled
                ? "Notifications on"
                : "Enable notifications"}
            </button>
          </div>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Start a new timer</h2>
          <Input
            placeholder="Student name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onFocus={unlock}
            className="mb-4"
          />
          <p className="text-sm text-gray-500 mb-3">
            Pick a schedule to start the timer:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schedules.map((schedule) => {
              const disabled = !studentName.trim();
              return (
                <button
                  key={schedule.name}
                  disabled={disabled}
                  className={clsx(
                    "p-4 border rounded-lg w-full text-left transition",
                    disabled
                      ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                      : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100"
                  )}
                  onClick={() => addStudent(schedule)}
                >
                  <h3 className="font-semibold text-gray-900">
                    {schedule.name}
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line mt-1">
                    {schedule.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {students.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Active timers ({students.length})
              </h2>
              <button
                onClick={clearAll}
                className="text-sm text-gray-600 hover:text-red-600 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => {
                const state = getPhaseState(student, now);
                const currentPhase = student.schedule.times[state.currentIndex];
                const phaseDurationSec = currentPhase.duration * 60;
                const phasePercent =
                  phaseDurationSec > 0
                    ? ((phaseDurationSec - state.timeLeft) / phaseDurationSec) *
                      100
                    : 100;
                const overallPercent =
                  state.totalDuration > 0
                    ? (state.totalElapsed / state.totalDuration) * 100
                    : 0;
                const nextPhase =
                  !state.isFinished &&
                  state.currentIndex < student.schedule.times.length - 1
                    ? student.schedule.times[state.currentIndex + 1]
                    : null;

                return (
                  <div
                    key={student.id}
                    className={clsx(
                      "rounded-xl shadow-md p-4 relative transition-all",
                      phaseColor(currentPhase.label, state.isFinished),
                      !student.isRunning &&
                        !state.isFinished &&
                        "ring-4 ring-yellow-300 ring-inset"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl md:text-2xl font-bold truncate">
                          {student.name}
                        </h3>
                        <p className="text-xs opacity-90 truncate">
                          {student.scheduleName}
                        </p>
                      </div>
                      <button
                        className="shrink-0 w-9 h-9 flex items-center justify-center bg-black/25 hover:bg-black/40 rounded-full text-xl leading-none font-bold"
                        onClick={() => removeStudent(student.id)}
                        aria-label="Remove student"
                      >
                        ×
                      </button>
                    </div>

                    {state.isFinished ? (
                      <div className="text-center py-6">
                        <div className="text-3xl md:text-4xl font-bold mb-1">
                          All done!
                        </div>
                        <div className="text-sm opacity-90">
                          Schedule complete
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-bold uppercase tracking-wide">
                            {currentPhase.label}
                            {!student.isRunning && " (Paused)"}
                          </span>
                          <span className="text-xs opacity-80">
                            Phase {state.currentIndex + 1}/
                            {student.schedule.times.length}
                          </span>
                        </div>
                        <div className="text-5xl md:text-6xl font-mono font-bold mb-3 text-center tabular-nums">
                          {formatTime(state.timeLeft)}
                        </div>
                        <div className="bg-black/25 rounded-full h-2 mb-1 overflow-hidden">
                          <div
                            className="bg-white h-2 rounded-full transition-all duration-300"
                            style={{ width: `${phasePercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-90 mb-3">
                          <span>{Math.round(overallPercent)}% overall</span>
                          {nextPhase && (
                            <span>
                              Next: {nextPhase.label} ({nextPhase.duration}m)
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      {!state.isFinished && (
                        <button
                          onClick={() => togglePause(student.id)}
                          className="flex-1 py-3 bg-black/25 hover:bg-black/40 active:bg-black/50 rounded-lg text-sm font-bold uppercase tracking-wide"
                        >
                          {student.isRunning ? "Pause" : "Resume"}
                        </button>
                      )}
                      <button
                        onClick={() => resetStudent(student.id)}
                        className="flex-1 py-3 bg-black/25 hover:bg-black/40 active:bg-black/50 rounded-lg text-sm font-bold uppercase tracking-wide"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {students.length === 0 && (
          <p className="text-center text-gray-500 mt-8">
            No active timers. Enter a name and pick a schedule above to start.
          </p>
        )}
      </div>
    </div>
  );
}
