import { useState, useEffect } from "react";
import clsx from "clsx";

// Tailwind color settings
const workColor = "bg-green-500 text-white";
const breakColor = "bg-blue-500 text-white";
const finishedColor = "bg-red-500 text-white";
const alertSound = typeof window !== "undefined" ? new Audio("/notification.mp3") : null;

const schedules = [
  {
    name: "Work Hard, Take a Break",
    description: "🕐 0:00 - 0:50 → Get work done\n☕ 0:50 - 1:00 → Quick break\n🕐 1:00 - 1:50 → Get work done\n✅ 1:50 - 2:00 → Wrap up & plan next steps\n\nGreat for: Staying focused with just one break!",
    times: [
      { label: "Work", duration: 50 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 50 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Work a Little, Rest a Little",
    description: "🕐 0:00 - 0:30 → Work time\n☕ 0:30 - 0:40 → Break\n🕐 0:40 - 1:10 → Work time\n☕ 1:10 - 1:20 → Break\n🕐 1:20 - 1:50 → Work time\n✅ 1:50 - 2:00 → Wrap up & plan next steps\n\nGreat for: Working in short bursts with more breaks!",
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
    description: "🕐 0:00 - 1:00 → Work, work, work!\n☕ 1:00 - 1:15 → Long break\n🕐 1:15 - 1:50 → Work again\n✅ 1:50 - 2:00 → Wrap up & plan next steps\n\nGreat for: Getting a lot done first, then taking a longer break!",
    times: [
      { label: "Work", duration: 60 },
      { label: "Break", duration: 15 },
      { label: "Work", duration: 35 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Short Work & Quick Breaks",
    description: "🕐 0:00 - 0:25 → Work\n☕ 0:25 - 0:30 → Break\n🕐 0:30 - 0:55 → Work\n☕ 0:55 - 1:05 → Break\n🕐 1:05 - 1:30 → Work\n☕ 1:30 - 1:35 → Quick break\n🕐 1:35 - 1:50 → Work\n✅ 1:50 - 2:00 → Wrap up & plan next steps\n\nGreat for: If you like to take lots of small breaks!",
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
  const [studentName, setStudentName] = useState("");

  const addStudent = (schedule) => {
    if (!studentName) return;
    setStudents((prev) => [
      ...prev,
      {
        name: studentName,
        schedule: schedule,
        scheduleName: schedule.name,
        currentIndex: 0,
        timeLeft: schedule.times[0].duration * 60,
        isRunning: true,
        isFinished: false,
      },
    ]);
    setStudentName("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Teacher Dashboard</h2>
      <input
        placeholder="Student Name"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        className="p-2 border rounded w-full mt-4"
      />
      <h3 className="text-lg font-semibold mt-4">Select a Timer Schedule</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {schedules.map((schedule) => (
          <button
            key={schedule.name}
            className="p-4 border rounded bg-gray-200 hover:bg-gray-300 w-full text-left"
            onClick={() => addStudent(schedule)}
          >
            <h4 className="font-bold">{schedule.name}</h4>
            <p className="text-sm whitespace-pre-line">{schedule.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
