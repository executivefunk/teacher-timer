import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

// Tailwind color settings
const workColor = "bg-green-500 text-white";
const breakColor = "bg-blue-500 text-white";
const finishedColor = "bg-red-500 text-white";
const alertSound = typeof window !== "undefined" ? new Audio("/notification.mp3") : null;

const schedules = [
  {
    name: "Work Hard, Take a Break",
    description: "📝 50 min → Get work done\n☕ 10 min → Break\n📝 50 min → Get work done\n✅ 10 min → Break & plan next steps\n\nGreat for: Staying focused with just one break!",
    times: [
      { label: "Work", duration: 50 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 50 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Work a Little, Rest a Little",
    description: "💡 30 min → Work time\n⏸️ 10 min → Break\n💡 30 min → Work time\n⏸️ 10 min → Break\n💡 30 min → Work time\n✅ 10 min → Break & plan next steps\n\nGreat for: Working in short bursts with more breaks!",
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
    description: "⚡ 60 min → Get in the zone!\n🌿 15 min → Break\n📝 35 min → Work again\n✅ 10 min → Break & plan next steps\n\nGreat for: Getting a lot done first, then taking a longer break!",
    times: [
      { label: "Work", duration: 60 },
      { label: "Break", duration: 15 },
      { label: "Work", duration: 35 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Short Work & Quick Breaks",
    description: "💻 25 min → Work\n🔄 5 min → Break\n📖 25 min → Work\n🌟 10 min → Break\n🖊️ 25 min → Work\n🔄 5 min → Break\n🏁 15 min → Work\n✅ 10 min → Break & plan next steps\n\nGreat for: If you like to take lots of small breaks!",
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

export default function TeacherTimerApp() {
  const [students, setStudents] = useState([]);
  const animationFrameRef = useRef(null);

  const addStudent = (name, schedule) => {
    if (!name.trim()) return;
    setStudents((prev) => [
      ...prev,
      {
        name,
        schedule,
        scheduleName: schedule.name,
        currentIndex: 0,
        timeLeft: schedule.times[0].duration * 60,
        lastUpdate: performance.now(),
        isRunning: true,
        isFinished: false,
      },
    ]);
  };

  useEffect(() => {
    const updateTimers = () => {
      setStudents((prev) =>
        prev.map((student) => {
          if (!student.isRunning) return student;

          const now = performance.now();
          const elapsedSeconds = Math.floor((now - student.lastUpdate) / 1000);
          const newTimeLeft = Math.max(student.timeLeft - elapsedSeconds, 0);

          if (newTimeLeft === 0) {
            if (alertSound) alertSound.play();
            const nextIndex = student.currentIndex + 1;

            if (nextIndex < student.schedule.times.length) {
              return {
                ...student,
                currentIndex: nextIndex,
                timeLeft: student.schedule.times[nextIndex].duration * 60,
                lastUpdate: now,
              };
            } else {
              return { ...student, isRunning: false, isFinished: true };
            }
          }

          return { ...student, timeLeft: newTimeLeft, lastUpdate: now };
        })
      );
      animationFrameRef.current = requestAnimationFrame(updateTimers);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimers);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Teacher Dashboard</h2>
      <h3 className="text-lg font-semibold mt-4">Select a Timer Schedule</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {schedules.map((schedule) => (
          <button
            key={schedule.name}
            className="p-4 border rounded bg-gray-200 hover:bg-gray-300 w-full text-left"
            onClick={() => addStudent(prompt("Enter Student Name:"), schedule)}
          >
            <h4 className="font-bold">{schedule.name}</h4>
            <p className="text-sm whitespace-pre-line">{schedule.description}</p>
          </button>
        ))}
      </div>
      <h3 className="text-lg font-semibold mt-6">Active Students</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {students.map((student, index) => (
          <div key={index} className={clsx("p-4 border rounded relative", student.isFinished ? finishedColor : student.schedule.times[student.currentIndex].label === "Work" ? workColor : breakColor)}>
            <h4 className="font-bold">{student.name} - {student.scheduleName}</h4>
            <p className="text-md">{Math.floor(student.timeLeft / 60)}m {student.timeLeft % 60}s remaining</p>
          </div>
        ))}
      </div>
    </div>
  );
}
