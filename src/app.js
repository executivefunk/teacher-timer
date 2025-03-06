import { useState, useEffect } from "react";
import clsx from "clsx";

// Tailwind color settings
const workColor = "bg-green-500 text-white"; // Green for Work
const breakColor = "bg-blue-500 text-white"; // Blue for Break
const finishedColor = "bg-red-500 text-white"; // Red when Finished
const alertSound = typeof window !== "undefined" ? new Audio("/notification.mp3") : null; // Ensure compatibility with SSR

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
  const [selectedSchedule, setSelectedSchedule] = useState(schedules[0]);

  const addStudent = () => {
    if (!studentName) return;
    setStudents((prev) => [
      ...prev,
      {
        name: studentName,
        schedule: selectedSchedule,
        scheduleName: selectedSchedule.name,
        currentIndex: 0,
        timeLeft: selectedSchedule.times[0].duration * 60,
        isRunning: true,
        isFinished: false,
      },
    ]);
    setStudentName("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Teacher Dashboard</h2>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Available Timer Schedules</h3>
        <ul className="mb-4">
          {schedules.map((schedule) => (
            <li key={schedule.name} className="mb-2 p-2 border rounded bg-gray-100">
              <h4 className="font-bold">{schedule.name}</h4>
              <p className="text-sm whitespace-pre-line">{schedule.description}</p>
            </li>
          ))}
        </ul>
        <input
          placeholder="Student Name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="p-2 border rounded w-full"
        />
        <select
          className="mt-2 p-2 border rounded w-full"
          value={selectedSchedule.name}
          onChange={(e) =>
            setSelectedSchedule(schedules.find((s) => s.name === e.target.value))
          }
        >
          {schedules.map((schedule) => (
            <option key={schedule.name} value={schedule.name}>
              {schedule.name}
            </option>
          ))}
        </select>
        <button
          className="mt-2 bg-blue-500 text-white font-bold text-lg px-4 py-2 rounded hover:bg-blue-700 w-full"
          onClick={addStudent}
        >
          Add Student
        </button>
      </div>
    </div>
  );
}
