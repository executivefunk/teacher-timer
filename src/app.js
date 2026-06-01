import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import clsx from "clsx";
import { Input } from "./components/ui/input";

// ---------- constants ----------

const STORAGE_KEY = "teacher-timer-state-v2";
const SETTINGS_KEY = "teacher-timer-settings-v2";
const CUSTOM_KEY = "teacher-timer-custom-schedules-v2";
const LOG_KEY = "teacher-timer-activity-log-v2";

const PHASE_LABELS = [
  "Work",
  "Work Together",
  "Break",
  "Review & Practice",
  "Review & Next Steps",
  "Review, Questions & Next Steps",
];

const PHASE_EMOJI = {
  Work: "📝",
  "Work Together": "🤝",
  Break: "🔄",
  "Review & Practice": "🎯",
  "Review & Next Steps": "✅",
  "Review, Questions & Next Steps": "❓",
};

// ---------- preset schedules ----------

const presets = [
  {
    id: "preset-deep",
    name: "Deep Focus",
    description:
      "📝 50 min → Work\n☕ 10 min → Break\n📝 50 min → Work\n✅ 10 min → Review & Next Steps\n\nGreat for: Two long focused sessions with one break.",
    times: [
      { label: "Work", duration: 50 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 50 },
      { label: "Review & Next Steps", duration: 10 },
    ],
  },
  {
    id: "preset-balanced",
    name: "Balanced Focus",
    description:
      "📝 40 min → Work\n🔄 5 min → Break\n📖 40 min → Work\n🔄 5 min → Break\n🎯 20 min → Review & Practice\n✅ 10 min → Review & Next Steps\n\nGreat for: Solid work blocks with built-in practice time.",
    times: [
      { label: "Work", duration: 40 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 40 },
      { label: "Break", duration: 5 },
      { label: "Review & Practice", duration: 20 },
      { label: "Review & Next Steps", duration: 10 },
    ],
  },
  {
    id: "preset-flexible",
    name: "Flexible Focus",
    description:
      "📝 25 min → Work\n🔄 5 min → Break\n📖 25 min → Work\n✨ 10 min → Break\n🖊️ 25 min → Work\n🔄 5 min → Break\n🏁 20 min → Work\n✅ 5 min → Review & Next Steps\n\nGreat for: Several shorter sessions with frequent breaks.",
    times: [
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 20 },
      { label: "Review & Next Steps", duration: 5 },
    ],
  },
  {
    id: "preset-pomodoro",
    name: "Classic Pomodoro",
    description:
      "📝 25 min → Work\n🔄 5 min → Break\n📝 25 min → Work\n🔄 5 min → Break\n📝 25 min → Work\n🔄 5 min → Break\n📝 25 min → Work\n✅ 5 min → Review & Next Steps\n\nGreat for: Four classic 25-minute Pomodoro sessions.",
    times: [
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
      { label: "Work", duration: 25 },
      { label: "Review & Next Steps", duration: 5 },
    ],
  },
  {
    id: "preset-partner",
    name: "Partner Mode",
    description:
      "🤝 30 min → Work Together\n🔄 5 min → Break\n🤝 30 min → Work Together\n🔄 5 min → Break\n🤝 30 min → Work Together\n❓ 20 min → Review, Questions & Next Steps\n\nFor two or more students. Tip: enter names like \"Kimberly & Luis\".",
    times: [
      { label: "Work Together", duration: 30 },
      { label: "Break", duration: 5 },
      { label: "Work Together", duration: 30 },
      { label: "Break", duration: 5 },
      { label: "Work Together", duration: 30 },
      { label: "Review, Questions & Next Steps", duration: 20 },
    ],
  },
];

// ---------- helpers ----------

function uuid() {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

// Date.now()-based time math: stays accurate even if setInterval is throttled
// (background tabs, locked iPad screens).
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
    return parsed.map((s) => ({ ...s, id: s.id || uuid() }));
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

function loadCustomSchedules() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function loadActivityLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || data.date !== todayDateString()) return [];
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatClock(date) {
  try {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
}

function customDescription(times) {
  const lines = times.map(
    (t) => `${PHASE_EMOJI[t.label] || "•"} ${t.duration} min → ${t.label}`
  );
  const total = times.reduce((a, t) => a + t.duration, 0);
  return `${lines.join("\n")}\n\nTotal: ${total} min`;
}

function getInitials(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  // Multi-person names: "Maya & Jamal", "Maya, Jamal, Sam"
  if (/[&,]/.test(trimmed)) {
    const names = trimmed
      .split(/[&,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length >= 2) {
      return names
        .slice(0, 3)
        .map((n) => n[0].toUpperCase())
        .join("");
    }
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Stable hue from name — same student always gets the same avatar color.
function avatarStyle(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  return {
    backgroundColor: `hsl(${hue}, 55%, 50%)`,
    color: "white",
  };
}

function phaseColor(label, isFinished) {
  if (isFinished) return "bg-rose-600 text-white";
  switch (label) {
    case "Work":
      return "bg-emerald-600 text-white";
    case "Work Together":
      return "bg-teal-600 text-white";
    case "Break":
      return "bg-sky-600 text-white";
    case "Review & Practice":
      return "bg-violet-600 text-white";
    case "Review & Next Steps":
      return "bg-amber-500 text-white";
    case "Review, Questions & Next Steps":
      return "bg-amber-600 text-white";
    default:
      return "bg-slate-600 text-white";
  }
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
    const notes = [523.25, 659.25, 783.99]; // C-E-G
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

// ---------- main component ----------

export default function TeacherTimerApp() {
  const [students, setStudents] = useState(loadState);
  const [studentName, setStudentName] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [customSchedules, setCustomSchedules] = useState(loadCustomSchedules);
  const [activityLog, setActivityLog] = useState(loadActivityLog);
  const [tick, setTick] = useState(0);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderName, setBuilderName] = useState("");
  const [builderPhases, setBuilderPhases] = useState([
    { label: "Work", duration: 25 },
    { label: "Break", duration: 5 },
  ]);

  // Focus mode + view-all overview
  const [focusedId, setFocusedId] = useState(null);
  const [viewAll, setViewAll] = useState(false);

  // Undo toast + activity log expand
  const [lastRemoved, setLastRemoved] = useState(null); // {student, index, ts}
  const [showLog, setShowLog] = useState(false);

  const alertPlayerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const prevPhaseRef = useRef({});
  const suppressAlertsRef = useRef(new Set());

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

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customSchedules));
    } catch {}
  }, [customSchedules]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOG_KEY,
        JSON.stringify({ date: todayDateString(), entries: activityLog })
      );
    } catch {}
  }, [activityLog]);

  // Auto-clear log if the date rolls over mid-session (rare but possible)
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem(LOG_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data?.date && data.date !== todayDateString()) {
          setActivityLog([]);
        }
      } catch {}
    };
    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Wake Lock: keep iPad/phone screens awake while a timer is running
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
      } catch {}
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

  // Detect phase transitions, fire alerts, mark finished, log completions
  useEffect(() => {
    const now = Date.now();
    const transitions = [];
    const studentFinishedIds = [];

    students.forEach((s) => {
      if (s.isFinished) {
        prevPhaseRef.current[s.id] = "finished";
        return;
      }
      const state = getPhaseState(s, now);
      const curKey = state.isFinished ? "finished" : String(state.currentIndex);
      const prevKey = prevPhaseRef.current[s.id];

      if (prevKey !== undefined && prevKey !== curKey) {
        transitions.push({ target: s, state });
      }
      prevPhaseRef.current[s.id] = curKey;

      if (state.isFinished) studentFinishedIds.push(s.id);
    });

    transitions.forEach(({ target, state }) => {
      if (suppressAlertsRef.current.has(target.id)) return;

      const phaseName = state.isFinished
        ? "All done!"
        : target.schedule.times[state.currentIndex].label;

      if (settings.soundEnabled && alertPlayerRef.current) {
        alertPlayerRef.current.play();
      }

      // OS-level notification (cross-window). Stays until clicked thanks to
      // requireInteraction. Clicking it focuses our tab.
      if (
        settings.notificationsEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const notif = new Notification(`${target.name}: ${phaseName}`, {
            body: state.isFinished
              ? `${target.scheduleName} complete.`
              : `Now starting: ${phaseName}`,
            tag: `${target.id}-${state.currentIndex}`,
            requireInteraction: true,
          });
          notif.onclick = () => {
            try {
              window.focus();
            } catch {}
            notif.close();
          };
        } catch {}
      }
    });

    suppressAlertsRef.current.clear();

    if (studentFinishedIds.length > 0) {
      setStudents((prev) =>
        prev.map((s) =>
          studentFinishedIds.includes(s.id) && !s.isFinished
            ? { ...s, isFinished: true, isRunning: false }
            : s
        )
      );
      // Log natural completions
      setActivityLog((prev) =>
        prev.map((e) =>
          studentFinishedIds.includes(e.timerId) && e.status === "active"
            ? { ...e, status: "completed", endedAt: now }
            : e
        )
      );
    }

    const liveIds = new Set(students.map((s) => s.id));
    Object.keys(prevPhaseRef.current).forEach((id) => {
      if (!liveIds.has(id)) delete prevPhaseRef.current[id];
    });
  }, [
    tick,
    students,
    settings.soundEnabled,
    settings.notificationsEnabled,
  ]);

  // ---------- actions ----------

  const unlock = useCallback(() => {
    if (alertPlayerRef.current) alertPlayerRef.current.unlock();
  }, []);

  const addStudent = useCallback(
    (schedule) => {
      const trimmed = studentName.trim();
      if (!trimmed) return;
      unlock();
      const id = uuid();
      const startedAt = Date.now();
      setStudents((prev) => [
        ...prev,
        {
          id,
          name: trimmed,
          schedule,
          scheduleName: schedule.name,
          startTime: startedAt,
          totalPausedMs: 0,
          pauseStartedAt: null,
          isRunning: true,
          isFinished: false,
        },
      ]);
      setActivityLog((prev) => [
        ...prev,
        {
          id: uuid(),
          timerId: id,
          kind: "student",
          name: trimmed,
          scheduleName: schedule.name,
          startedAt,
          endedAt: null,
          status: "active",
        },
      ]);
      setStudentName("");
    },
    [studentName, unlock]
  );

  const removeStudent = useCallback((id) => {
    const now = Date.now();
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const removed = prev[idx];
      setLastRemoved({ student: removed, index: idx, ts: now });
      return prev.filter((s) => s.id !== id);
    });
    // Mark active log entry as removed (only if still active)
    setActivityLog((prev) =>
      prev.map((e) =>
        e.timerId === id && e.status === "active"
          ? { ...e, status: "removed", endedAt: now }
          : e
      )
    );
  }, []);

  const undoRemove = useCallback(() => {
    if (!lastRemoved) return;
    const { student, index } = lastRemoved;
    setStudents((prev) => {
      if (prev.some((s) => s.id === student.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, student);
      return next;
    });
    // Restore log entry to active if we can
    setActivityLog((prev) =>
      prev.map((e) =>
        e.timerId === student.id && e.status === "removed"
          ? { ...e, status: "active", endedAt: null }
          : e
      )
    );
    setLastRemoved(null);
  }, [lastRemoved]);

  // Auto-clear undo toast after 8 seconds
  useEffect(() => {
    if (!lastRemoved) return;
    const id = setTimeout(() => setLastRemoved(null), 8000);
    return () => clearTimeout(id);
  }, [lastRemoved]);


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

  // Positive minutes = extend (more time left in current phase).
  // Negative minutes = shorten (less time left, may roll into next phase).
  const addTime = useCallback((id, minutes) => {
    suppressAlertsRef.current.add(id);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id && !s.isFinished
          ? { ...s, startTime: s.startTime + minutes * 60 * 1000 }
          : s
      )
    );
  }, []);

  // Skip = advance startTime backwards by exactly the current timeLeft,
  // landing us at the start of the next phase.
  const skipPhase = useCallback((id) => {
    suppressAlertsRef.current.add(id);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id || s.isFinished) return s;
        const state = getPhaseState(s, Date.now());
        if (state.isFinished) return s;
        return { ...s, startTime: s.startTime - state.timeLeft * 1000 };
      })
    );
  }, []);

  // ---------- activity log actions ----------

  const buildLogSummary = useCallback(() => {
    if (activityLog.length === 0) return "No activity logged today.";
    const dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const lines = [`Teacher Timer — ${dateLabel}`, ""];

    let completed = 0;
    let removed = 0;
    let active = 0;
    activityLog.forEach((e) => {
      if (e.status === "completed") completed++;
      else if (e.status === "removed") removed++;
      else active++;

      const start = formatClock(new Date(e.startedAt));
      const endLabel =
        e.status === "active"
          ? "still active"
          : `${e.status === "completed" ? "completed" : "removed"} at ${formatClock(new Date(e.endedAt))}`;
      const minutes =
        e.endedAt != null
          ? Math.max(0, Math.round((e.endedAt - e.startedAt) / 60000))
          : Math.max(0, Math.round((Date.now() - e.startedAt) / 60000));
      const label = e.kind === "class" ? "[Class]" : "";
      lines.push(
        `${label ? label + " " : ""}${e.name} · ${e.scheduleName} · started ${start} · ${endLabel} (${minutes} min)`
      );
    });

    lines.push("");
    lines.push(
      `Total: ${activityLog.length} timers · ${completed} completed · ${removed} removed early · ${active} still active`
    );
    return lines.join("\n");
  }, [activityLog]);

  const copyLogSummary = useCallback(async () => {
    const text = buildLogSummary();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert("Summary copied to clipboard.");
        return;
      }
    } catch {}
    // Fallback: temporary textarea
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Summary copied to clipboard.");
    } catch {
      window.prompt("Copy the text below:", text);
    }
  }, [buildLogSummary]);

  const clearLog = useCallback(() => {
    if (activityLog.length === 0) return;
    if (window.confirm("Clear today's activity log?")) setActivityLog([]);
  }, [activityLog.length]);

  const clearAll = useCallback(() => {
    if (students.length === 0) return;
    if (window.confirm(`Remove all ${students.length} timer(s)?`)) {
      setStudents([]);
    }
  }, [students.length]);

  const toggleNotifications = useCallback(async () => {
    // Already on → turn off in-app (doesn't revoke OS permission)
    if (settings.notificationsEnabled) {
      setSettings((s) => ({ ...s, notificationsEnabled: false }));
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Notifications aren't supported on this device.");
      return;
    }
    if (Notification.permission === "granted") {
      setSettings((s) => ({ ...s, notificationsEnabled: true }));
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
  }, [settings.notificationsEnabled]);

  // ---------- builder actions ----------

  const resetBuilder = useCallback(() => {
    setBuilderName("");
    setBuilderPhases([
      { label: "Work", duration: 25 },
      { label: "Break", duration: 5 },
    ]);
  }, []);

  const addBuilderPhase = useCallback(() => {
    setBuilderPhases((prev) => [...prev, { label: "Work", duration: 25 }]);
  }, []);

  const updateBuilderPhase = useCallback((index, field, value) => {
    setBuilderPhases((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        if (field === "duration") {
          const num = Number.parseInt(value, 10);
          return { ...p, duration: Number.isFinite(num) ? num : 0 };
        }
        return { ...p, [field]: value };
      })
    );
  }, []);

  const removeBuilderPhase = useCallback((index) => {
    setBuilderPhases((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }, []);

  const saveCustomSchedule = useCallback(() => {
    const name = builderName.trim();
    if (!name) {
      alert("Give the schedule a name first.");
      return;
    }
    const valid = builderPhases.filter(
      (p) => p.duration >= 1 && p.duration <= 240
    );
    if (valid.length === 0) {
      alert("Add at least one phase with a duration between 1 and 240 minutes.");
      return;
    }
    const newSchedule = {
      id: uuid(),
      name,
      description: customDescription(valid),
      times: valid,
      isCustom: true,
    };
    setCustomSchedules((prev) => [...prev, newSchedule]);
    resetBuilder();
    setShowBuilder(false);
  }, [builderName, builderPhases, resetBuilder]);

  const deleteCustomSchedule = useCallback((id) => {
    if (window.confirm("Delete this custom schedule?")) {
      setCustomSchedules((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  // ---------- render ----------

  const allSchedules = useMemo(
    () => [...presets, ...customSchedules],
    [customSchedules]
  );

  const focusedStudent = useMemo(
    () => (focusedId ? students.find((s) => s.id === focusedId) || null : null),
    [students, focusedId]
  );

  // Close focus mode if its student is removed
  useEffect(() => {
    if (focusedId && !students.some((s) => s.id === focusedId)) {
      setFocusedId(null);
    }
  }, [students, focusedId]);

  // Escape closes focus mode
  useEffect(() => {
    if (!focusedId) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId]);

  const now = Date.now();
  void tick; // force recompute each tick

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
              onClick={toggleNotifications}
              className={clsx(
                "px-3 py-2 border rounded-lg text-sm font-medium transition",
                settings.notificationsEnabled
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              )}
              title={
                settings.notificationsEnabled
                  ? "Click to turn off"
                  : "Click to enable browser notifications"
              }
            >
              {settings.notificationsEnabled
                ? "Notifications on"
                : "Enable notifications"}
            </button>
            {students.length > 0 && (
              <button
                onClick={() => setViewAll(true)}
                className="px-3 py-2 border border-gray-300 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                title="Full-screen view of all active timers"
              >
                View all ⛶
              </button>
            )}
          </div>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Start a new timer</h2>
          <Input
            placeholder='Student name (use "Multiple Student Names" for partners)'
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onFocus={unlock}
            className="mb-4"
          />
          <p className="text-sm text-gray-500 mb-3">
            Pick a schedule to start the timer:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allSchedules.map((schedule) => {
              const disabled = !studentName.trim();
              return (
                <div key={schedule.id} className="relative">
                  <button
                    disabled={disabled}
                    className={clsx(
                      "p-4 border rounded-lg w-full text-left transition",
                      disabled
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                        : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100"
                    )}
                    onClick={() => addStudent(schedule)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {schedule.name}
                      </h3>
                      {schedule.isCustom && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {schedule.description}
                    </p>
                  </button>
                  {schedule.isCustom && (
                    <button
                      onClick={() => deleteCustomSchedule(schedule.id)}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full text-lg leading-none"
                      aria-label="Delete custom schedule"
                      title="Delete custom schedule"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4">
            {!showBuilder ? (
              <button
                onClick={() => setShowBuilder(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                + Build your own schedule
              </button>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">New custom schedule</h3>
                  <button
                    onClick={() => {
                      resetBuilder();
                      setShowBuilder(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                <Input
                  placeholder="Schedule name (e.g. Reading Block)"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="mb-3"
                />
                <p className="text-sm text-gray-500 mb-2">Phases:</p>
                <div className="space-y-2">
                  {builderPhases.map((phase, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={phase.label}
                        onChange={(e) =>
                          updateBuilderPhase(i, "label", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      >
                        {PHASE_LABELS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={phase.duration}
                        onChange={(e) =>
                          updateBuilderPhase(i, "duration", e.target.value)
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="text-sm text-gray-500">min</span>
                      <button
                        onClick={() => removeBuilderPhase(i)}
                        disabled={builderPhases.length <= 1}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Remove phase"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addBuilderPhase}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  + Add phase
                </button>
                <div className="text-xs text-gray-500 mt-3">
                  Total:{" "}
                  {builderPhases.reduce(
                    (a, p) => a + (Number.isFinite(p.duration) ? p.duration : 0),
                    0
                  )}{" "}
                  min
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveCustomSchedule}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                  >
                    Save schedule
                  </button>
                </div>
              </div>
            )}
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
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  now={now}
                  onRemove={removeStudent}
                  onTogglePause={togglePause}
                  onReset={resetStudent}
                  onAddTime={addTime}
                  onSkip={skipPhase}
                  onFocus={setFocusedId}
                />
              ))}
            </div>
          </section>
        )}

        {students.length === 0 && (
          <p className="text-center text-gray-500 mt-8">
            No active timers. Enter a name and pick a schedule above to start.
          </p>
        )}

        <section className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setShowLog((v) => !v)}
            className="w-full flex items-center justify-between px-4 md:px-6 py-3 text-left"
          >
            <span className="font-semibold">
              Today&apos;s activity ({activityLog.length})
            </span>
            <span className="text-gray-500 text-sm">{showLog ? "▲" : "▼"}</span>
          </button>
          {showLog && (
            <div className="px-4 md:px-6 pb-4 border-t border-gray-200">
              {activityLog.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">
                  Nothing logged yet today. Timers will appear here as you start
                  them.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="text-left py-2 pr-3">Name</th>
                          <th className="text-left py-2 pr-3">Schedule</th>
                          <th className="text-left py-2 pr-3">Started</th>
                          <th className="text-left py-2 pr-3">Ended</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.map((e) => (
                          <tr key={e.id} className="border-t border-gray-100">
                            <td className="py-2 pr-3 font-medium">
                              {e.kind === "class" ? "👥 " : ""}
                              {e.name}
                            </td>
                            <td className="py-2 pr-3 text-gray-600">
                              {e.scheduleName}
                            </td>
                            <td className="py-2 pr-3 text-gray-600 tabular-nums">
                              {formatClock(new Date(e.startedAt))}
                            </td>
                            <td className="py-2 pr-3 text-gray-600 tabular-nums">
                              {e.endedAt
                                ? formatClock(new Date(e.endedAt))
                                : "—"}
                            </td>
                            <td className="py-2">
                              <span
                                className={clsx(
                                  "inline-block px-2 py-0.5 rounded text-xs font-medium",
                                  e.status === "completed" &&
                                    "bg-emerald-100 text-emerald-700",
                                  e.status === "removed" &&
                                    "bg-gray-100 text-gray-700",
                                  e.status === "active" &&
                                    "bg-blue-100 text-blue-700"
                                )}
                              >
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={copyLogSummary}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                    >
                      Copy summary
                    </button>
                    <button
                      onClick={clearLog}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold"
                    >
                      Clear log
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {focusedStudent && (
        <FocusOverlay
          student={focusedStudent}
          now={now}
          onClose={() => setFocusedId(null)}
          onRemove={removeStudent}
          onTogglePause={togglePause}
          onReset={resetStudent}
          onAddTime={addTime}
          onSkip={skipPhase}
        />
      )}

      {viewAll && (
        <ViewAllOverlay
          students={students}
          now={now}
          onClose={() => setViewAll(false)}
          onTogglePause={togglePause}
          onReset={resetStudent}
        />
      )}

      {lastRemoved && (
        <UndoToast
          name={lastRemoved.student.name}
          onUndo={undoRemove}
          onDismiss={() => setLastRemoved(null)}
        />
      )}
    </div>
  );
}

// ---------- student card ----------

function StudentCard({
  student,
  now,
  onRemove,
  onTogglePause,
  onReset,
  onAddTime,
  onSkip,
  onFocus,
}) {
  const state = getPhaseState(student, now);
  const currentPhase = student.schedule.times[state.currentIndex];
  const phaseDurationSec = currentPhase.duration * 60;
  const phasePercent =
    phaseDurationSec > 0
      ? ((phaseDurationSec - state.timeLeft) / phaseDurationSec) * 100
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

  const phaseEndDate = new Date(now + state.timeLeft * 1000);
  const scheduleEndDate = new Date(
    now + (state.totalDuration - state.totalElapsed) * 1000
  );

  return (
    <div
      className={clsx(
        "rounded-xl shadow-md p-4 relative transition-all",
        phaseColor(currentPhase.label, state.isFinished),
        !student.isRunning &&
          !state.isFinished &&
          "ring-4 ring-yellow-300 ring-inset"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white/40"
            style={avatarStyle(student.name)}
            aria-hidden="true"
          >
            {getInitials(student.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl md:text-2xl font-bold truncate">
              {student.name}
            </h3>
            <p className="text-xs opacity-90 truncate">{student.scheduleName}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            className="w-9 h-9 flex items-center justify-center bg-black/25 hover:bg-black/40 rounded-full text-lg leading-none font-bold"
            onClick={() => onFocus(student.id)}
            aria-label="Focus on this timer"
            title="Focus mode (full screen)"
          >
            ⛶
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center bg-black/25 hover:bg-black/40 rounded-full text-xl leading-none font-bold"
            onClick={() => onRemove(student.id)}
            aria-label="Remove student"
          >
            ×
          </button>
        </div>
      </div>

      {state.isFinished ? (
        <div className="text-center py-6">
          <div className="text-3xl md:text-4xl font-bold mb-1">All done!</div>
          <div className="text-sm opacity-90">Schedule complete</div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-bold uppercase tracking-wide">
              {currentPhase.label}
              {!student.isRunning && " (Paused)"}
            </span>
            <span className="text-xs opacity-80">
              Phase {state.currentIndex + 1}/{student.schedule.times.length}
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
          <div className="flex items-center justify-between text-xs opacity-90 mb-1">
            <span>{Math.round(overallPercent)}% overall</span>
            {nextPhase && (
              <span>
                Next: {nextPhase.label} ({nextPhase.duration}m)
              </span>
            )}
          </div>
          <div className="text-xs opacity-90 mb-3">
            {student.isRunning ? (
              <>
                Phase ends {formatClock(phaseEndDate)}
                {" · "}Done {formatClock(scheduleEndDate)}
              </>
            ) : (
              <>Paused — end times will resume when restarted</>
            )}
          </div>
        </>
      )}

      {!state.isFinished && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <button
            onClick={() => onAddTime(student.id, -5)}
            className="py-2 bg-black/20 hover:bg-black/35 active:bg-black/45 rounded-lg text-sm font-bold"
            title="Subtract 5 minutes from current phase"
          >
            −5m
          </button>
          <button
            onClick={() => onAddTime(student.id, 5)}
            className="py-2 bg-black/20 hover:bg-black/35 active:bg-black/45 rounded-lg text-sm font-bold"
            title="Add 5 minutes to current phase"
          >
            +5m
          </button>
          <button
            onClick={() => onSkip(student.id)}
            className="py-2 bg-black/20 hover:bg-black/35 active:bg-black/45 rounded-lg text-sm font-bold"
            title="Skip to next phase"
          >
            Skip ↪
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {!state.isFinished && (
          <button
            onClick={() => onTogglePause(student.id)}
            className="flex-1 py-3 bg-black/25 hover:bg-black/40 active:bg-black/50 rounded-lg text-sm font-bold uppercase tracking-wide"
          >
            {student.isRunning ? "Pause" : "Resume"}
          </button>
        )}
        <button
          onClick={() => onReset(student.id)}
          className="flex-1 py-3 bg-black/25 hover:bg-black/40 active:bg-black/50 rounded-lg text-sm font-bold uppercase tracking-wide"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ---------- focus overlay ----------

function FocusOverlay({
  student,
  now,
  onClose,
  onRemove,
  onTogglePause,
  onReset,
  onAddTime,
  onSkip,
}) {
  const state = getPhaseState(student, now);
  const currentPhase = student.schedule.times[state.currentIndex];
  const phaseDurationSec = currentPhase.duration * 60;
  const phasePercent =
    phaseDurationSec > 0
      ? ((phaseDurationSec - state.timeLeft) / phaseDurationSec) * 100
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
  const phaseEndDate = new Date(now + state.timeLeft * 1000);
  const scheduleEndDate = new Date(
    now + (state.totalDuration - state.totalElapsed) * 1000
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${student.name} timer focus view`}
    >
      <div
        className={clsx(
          "w-full max-w-3xl max-h-full overflow-auto rounded-2xl p-6 md:p-10 relative shadow-2xl",
          phaseColor(currentPhase.label, state.isFinished),
          !student.isRunning &&
            !state.isFinished &&
            "ring-4 ring-yellow-300 ring-inset"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-lg md:text-2xl shadow-md ring-4 ring-white/40"
              style={avatarStyle(student.name)}
              aria-hidden="true"
            >
              {getInitials(student.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl md:text-5xl font-bold truncate">
                {student.name}
              </h2>
              <p className="text-sm md:text-base opacity-90 truncate">
                {student.scheduleName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-black/25 hover:bg-black/40 rounded-full text-2xl leading-none font-bold"
            aria-label="Close focus mode"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {state.isFinished ? (
          <div className="text-center py-12 md:py-20">
            <div className="text-6xl md:text-8xl font-bold mb-2">
              All done!
            </div>
            <div className="text-lg opacity-90">Schedule complete</div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-base md:text-lg font-bold uppercase tracking-widest">
                {currentPhase.label}
                {!student.isRunning && " (Paused)"}
              </span>
              <span className="text-sm opacity-80">
                Phase {state.currentIndex + 1}/{student.schedule.times.length}
              </span>
            </div>
            <div className="text-center my-8 md:my-12">
              <div className="text-7xl md:text-[10rem] font-mono font-bold tabular-nums leading-none">
                {formatTime(state.timeLeft)}
              </div>
            </div>
            <div className="bg-black/25 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${phasePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm opacity-90 mb-1">
              <span>{Math.round(overallPercent)}% overall</span>
              {nextPhase && (
                <span>
                  Next: {nextPhase.label} ({nextPhase.duration}m)
                </span>
              )}
            </div>
            <div className="text-sm opacity-90 mb-6">
              {student.isRunning ? (
                <>
                  Phase ends {formatClock(phaseEndDate)}
                  {" · "}Done {formatClock(scheduleEndDate)}
                </>
              ) : (
                <>Paused — end times will resume when restarted</>
              )}
            </div>
          </>
        )}

        {!state.isFinished && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => onAddTime(student.id, -5)}
              className="py-3 md:py-4 bg-black/20 hover:bg-black/35 rounded-lg text-base font-bold"
            >
              −5m
            </button>
            <button
              onClick={() => onAddTime(student.id, 5)}
              className="py-3 md:py-4 bg-black/20 hover:bg-black/35 rounded-lg text-base font-bold"
            >
              +5m
            </button>
            <button
              onClick={() => onSkip(student.id)}
              className="py-3 md:py-4 bg-black/20 hover:bg-black/35 rounded-lg text-base font-bold"
            >
              Skip ↪
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          {!state.isFinished && (
            <button
              onClick={() => onTogglePause(student.id)}
              className="flex-1 py-4 md:py-5 bg-black/25 hover:bg-black/40 rounded-lg text-base md:text-lg font-bold uppercase tracking-wide"
            >
              {student.isRunning ? "Pause" : "Resume"}
            </button>
          )}
          <button
            onClick={() => onReset(student.id)}
            className="flex-1 py-4 md:py-5 bg-black/25 hover:bg-black/40 rounded-lg text-base md:text-lg font-bold uppercase tracking-wide"
          >
            Reset
          </button>
        </div>

        <button
          onClick={() => {
            onRemove(student.id);
            onClose();
          }}
          className="w-full py-2 text-sm opacity-80 hover:opacity-100 underline"
        >
          Remove this student
        </button>
      </div>
    </div>
  );
}

// ---------- undo toast ----------

function UndoToast({ name, onUndo, onDismiss }) {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 max-w-[90vw]"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm truncate">
        Removed <span className="font-semibold">{name}</span>
      </span>
      <button
        onClick={onUndo}
        className="text-sm font-bold underline shrink-0 hover:text-blue-300"
      >
        Undo
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-full text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ---------- view-all overlay ----------

function computeViewAllGrid(count, viewportWidth) {
  if (count <= 0) return { cols: 1, rows: 1 };
  // Cap cols by viewport width
  const maxCols =
    viewportWidth < 640
      ? 2
      : viewportWidth < 1024
        ? 4
        : viewportWidth < 1440
          ? 5
          : 6;
  // Roughly square grid
  const cols = Math.max(1, Math.min(Math.ceil(Math.sqrt(count)), maxCols));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

function ViewAllOverlay({
  students,
  now,
  onClose,
  onTogglePause,
  onReset,
}) {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cardCount = students.length;
  const { cols, rows } = computeViewAllGrid(cardCount, viewportWidth);

  // Density buckets drive font/avatar/button sizes per tile so the contents
  // shrink along with the cells.
  const density =
    cardCount <= 2
      ? "xl"
      : cardCount <= 4
        ? "lg"
        : cardCount <= 9
          ? "md"
          : cardCount <= 16
            ? "sm"
            : "xs";

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      <div className="shrink-0 bg-black/85 backdrop-blur px-3 md:px-5 py-2.5 flex items-center justify-between border-b border-white/10">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold leading-tight">
            All active timers
          </h2>
          <p className="text-xs text-gray-400">
            {cardCount === 0
              ? "No active timers"
              : `${cardCount} timer${cardCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100"
          title="Back to dashboard (Esc)"
        >
          Exit ×
        </button>
      </div>

      <div className="flex-1 min-h-0 p-2 md:p-3">
        {cardCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="text-lg">No active timers right now.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <div
            className="h-full grid gap-2 md:gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {students.map((s) => (
              <ViewAllTile
                key={s.id}
                timer={s}
                now={now}
                density={density}
                onTogglePause={() => onTogglePause(s.id)}
                onReset={() => onReset(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const VIEW_ALL_SIZES = {
  xl: {
    padding: "p-4 md:p-5",
    avatar: "w-14 h-14 text-base",
    name: "text-2xl md:text-3xl",
    schedule: "text-sm",
    countdown: "text-6xl md:text-7xl",
    label: "text-sm",
    button: "py-3 text-sm",
    showSchedule: true,
    showProgress: true,
    showEndTime: true,
    showButtons: true,
  },
  lg: {
    padding: "p-3 md:p-4",
    avatar: "w-12 h-12 text-sm",
    name: "text-xl md:text-2xl",
    schedule: "text-xs",
    countdown: "text-5xl md:text-6xl",
    label: "text-xs",
    button: "py-2.5 text-sm",
    showSchedule: true,
    showProgress: true,
    showEndTime: true,
    showButtons: true,
  },
  md: {
    padding: "p-3",
    avatar: "w-10 h-10 text-xs",
    name: "text-lg md:text-xl",
    schedule: "text-xs",
    countdown: "text-4xl md:text-5xl",
    label: "text-xs",
    button: "py-2 text-xs",
    showSchedule: true,
    showProgress: true,
    showEndTime: true,
    showButtons: true,
  },
  sm: {
    padding: "p-2",
    avatar: "w-9 h-9 text-xs",
    name: "text-base md:text-lg",
    schedule: "text-[10px]",
    countdown: "text-3xl md:text-4xl",
    label: "text-[10px]",
    button: "py-1.5 text-xs",
    showSchedule: false,
    showProgress: true,
    showEndTime: false,
    showButtons: true,
  },
  xs: {
    padding: "p-1.5",
    avatar: "w-7 h-7 text-[10px]",
    name: "text-sm md:text-base",
    schedule: "text-[10px]",
    countdown: "text-2xl md:text-3xl",
    label: "text-[10px]",
    button: "py-1 text-[10px]",
    showSchedule: false,
    showProgress: true,
    showEndTime: false,
    showButtons: false,
  },
};

function ViewAllTile({ timer, now, density, onTogglePause, onReset }) {
  const state = getPhaseState(timer, now);
  const currentPhase = timer.schedule.times[state.currentIndex];
  const phaseDurationSec = currentPhase.duration * 60;
  const phasePercent =
    phaseDurationSec > 0
      ? ((phaseDurationSec - state.timeLeft) / phaseDurationSec) * 100
      : 100;
  const scheduleEndDate = new Date(
    now + (state.totalDuration - state.totalElapsed) * 1000
  );

  const sz = VIEW_ALL_SIZES[density] || VIEW_ALL_SIZES.md;

  return (
    <div
      className={clsx(
        "rounded-xl shadow-lg relative h-full flex flex-col min-h-0 min-w-0 overflow-hidden",
        sz.padding,
        phaseColor(currentPhase.label, state.isFinished),
        !timer.isRunning && !state.isFinished && "ring-4 ring-yellow-300 ring-inset"
      )}
    >
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <div
          className={clsx(
            "shrink-0 rounded-full ring-2 ring-white/40 flex items-center justify-center font-bold",
            sz.avatar
          )}
          style={avatarStyle(timer.name)}
        >
          {getInitials(timer.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={clsx("font-bold truncate leading-tight", sz.name)}>
            {timer.name}
          </h3>
          {sz.showSchedule && (
            <p className={clsx("opacity-90 truncate", sz.schedule)}>
              {timer.scheduleName}
            </p>
          )}
        </div>
      </div>

      {state.isFinished ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className={clsx("font-bold", sz.countdown)}>Done</div>
        </div>
      ) : (
        <>
          <div
            className={clsx(
              "font-bold uppercase tracking-wider opacity-90 shrink-0",
              sz.label
            )}
          >
            {currentPhase.label}
            {!timer.isRunning && " (Paused)"}
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div
              className={clsx(
                "font-mono font-bold tabular-nums leading-none",
                sz.countdown
              )}
            >
              {formatTime(state.timeLeft)}
            </div>
          </div>
          {sz.showProgress && (
            <div className="bg-black/30 rounded-full h-1.5 overflow-hidden mb-1 shrink-0">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${phasePercent}%` }}
              />
            </div>
          )}
          {sz.showEndTime && (
            <div className={clsx("opacity-90 shrink-0 mb-1.5", sz.label)}>
              {timer.isRunning ? (
                <>Done at {formatClock(scheduleEndDate)}</>
              ) : (
                <>Paused</>
              )}
            </div>
          )}
        </>
      )}

      {!state.isFinished && sz.showButtons && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={onTogglePause}
            className={clsx(
              "flex-1 bg-black/30 hover:bg-black/50 rounded-lg font-bold uppercase",
              sz.button
            )}
          >
            {timer.isRunning ? "Pause" : "Resume"}
          </button>
          <button
            onClick={onReset}
            className={clsx(
              "flex-1 bg-black/30 hover:bg-black/50 rounded-lg font-bold uppercase",
              sz.button
            )}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
