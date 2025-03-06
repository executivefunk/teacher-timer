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
    description: "🕐 50 min → Work\n☕ 10 min → Break\n🕐 50 min → Work\n✅ 10 min → Wrap up & plan next steps\n\nGreat for: Staying focused with just one break!",
    times: [
      { label: "Work", duration: 50 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 50 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Work a Little, Rest a Little",
    description: "🕐 30 min → Work\n☕ 10 min → Break\n🕐 30 min → Work\n☕ 10 min → Break\n🕐 30 min → Work\n✅ 10 min → Wrap up & plan next steps\n\nGreat for: Working in short bursts with more breaks!",
    times: [
      { label: "Work", duration: 30 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 30 },
      { label: "Break", duration: 10 },
      { label: "Work", duration: 30 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
];

export default function TeacherTimerApp() {
  const [students, setStudents] = useState([]);
  const [studentName, setStudentName] = useState("");

  const addStudent = (name, schedule) => {
    setStudents((prev) => [
      ...prev,
      {
        name,
        schedule,
        scheduleName: schedule.name,
        currentIndex: 0,
        timeLeft: schedule.times[0].duration * 60,
        isRunning: true,
        isFinished: false,
      },
    ]);
  };

  const removeStudent = (index) => {
    setStudents((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStudents((prev) =>
        prev.map((student) => {
          if (student.isRunning && student.timeLeft > 0) {
            return { ...student, timeLeft: student.timeLeft - 1 };
          } else if (student.isRunning && student.timeLeft === 0) {
            if (alertSound) alertSound.play();
            const nextIndex = student.currentIndex + 1;
            if (nextIndex < student.schedule.times.length) {
              return {
                ...student,
                currentIndex: nextIndex,
                timeLeft: student.schedule.times[nextIndex].duration * 60,
              };
            } else {
              return { ...student, isRunning: false, isFinished: true };
            }
          }
          return student;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Teacher Dashboard</h2>
      <div className="mt-4">
        <input
          placeholder="Student Name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="p-2 border rounded w-full"
        />
        <button
          className="mt-2 bg-blue-500 text-white font-bold text-lg px-4 py-2 rounded hover:bg-blue-700 w-full"
          onClick={() => {
            if (studentName) {
              addStudent(studentName, schedules[0]);
              setStudentName("");
            }
          }}
        >
          Add Student
        </button>
      </div>
      <h2 className="text-xl font-bold mt-6">Active Students</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {students.map((student, index) => (
          <div
            key={index}
            className={clsx(
              "p-4 rounded shadow text-white relative",
              student.isFinished
                ? finishedColor
                : student.schedule.times[student.currentIndex].label === "Work"
                ? workColor
                : breakColor
            )}
          >
            <button
              className="absolute top-2 right-2 text-white bg-red-600 p-1 rounded"
              onClick={() => removeStudent(index)}
            >
              ✖
            </button>
            <h3 className="text-lg font-semibold">{student.name}</h3>
            <h4 className="text-md font-semibold">{student.scheduleName}</h4>
            <p className="text-md">
              {student.schedule.times[student.currentIndex].label}:{" "}
              {Math.floor(student.timeLeft / 60)}m {student.timeLeft % 60}s
            </p>
            <div className="mt-2 bg-gray-300 h-2 rounded-lg">
              <div
                className="h-2 rounded-lg bg-white"
                style={{
                  width: `${
                    (student.timeLeft /
                      (student.schedule.times[student.currentIndex].duration *
                        60)) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
