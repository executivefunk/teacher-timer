import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { Input } from "./components/ui/input";
import clsx from "clsx";

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
  {
    name: "Power Hour & Chill",
    description: "🕐 60 min → Work\n☕ 15 min → Break\n🕐 35 min → Work\n✅ 10 min → Wrap up & plan next steps\n\nGreat for: Getting a lot done first, then taking a longer break!",
    times: [
      { label: "Work", duration: 60 },
      { label: "Break", duration: 15 },
      { label: "Work", duration: 35 },
      { label: "Wrap Up", duration: 10 },
    ],
  },
  {
    name: "Short Work & Quick Breaks",
    description: "🕐 25 min → Work\n☕ 5 min → Break\n🕐 25 min → Work\n☕ 10 min → Break\n🕐 25 min → Work\n☕ 5 min → Break\n🕐 15 min → Work\n✅ 10 min → Wrap up & plan next steps\n\nGreat for: If you like to take lots of small breaks!",
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
  }
];

export default function TeacherTimerApp() {
  const [students, setStudents] = useState([]);
  const [studentName, setStudentName] = useState("");

  const addStudent = (name, schedule) => {
    setStudents((prev) => [
      ...prev,
      { name, schedule, scheduleName: schedule.name, currentIndex: 0, timeLeft: schedule.times[0].duration * 60, isRunning: true, isFinished: false },
    ]);
  };

  const removeStudent = (index) => {
    setStudents((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStudents((prev) => prev.map((student) => {
        if (student.isRunning && student.timeLeft > 0) {
          return { ...student, timeLeft: student.timeLeft - 1 };
        } else if (student.isRunning && student.timeLeft === 0) {
          if (alertSound) alertSound.play();
          const nextIndex = student.currentIndex + 1;
          if (nextIndex < student.schedule.times.length) {
            return { ...student, currentIndex: nextIndex, timeLeft: student.schedule.times[nextIndex].duration * 60 };
          } else {
            return { ...student, isRunning: false, isFinished: true };
          }
        }
        return student;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Teacher Dashboard</h2>
      <div className="mt-4">
        <Input
          placeholder="Student Name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="p-2 border rounded"
        />
        <Button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => {
            if (studentName) {
              addStudent(studentName, schedules[0]);
              setStudentName("");
            }
          }}
        >
          Add Student
        </Button>
      </div>
      <h2 className="text-xl font-bold mt-6">Active Students</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {students.map((student, index) => (
          <Card key={index} className={clsx("p-4 rounded shadow", student.isFinished ? finishedColor : (student.schedule.times[student.currentIndex].label === "Work" ? workColor : breakColor))}>
            <CardContent className="relative">
              <button className="absolute top-2 right-2 text-white bg-red-600 p-1 rounded" onClick={() => removeStudent(index)}>✖</button>
              <h3 className="text-lg font-semibold text-black">{student.name}</h3>
              <h4 className="text-md font-semibold text-black">{student.scheduleName}</h4>
              <p className="text-md text-white">{student.schedule.times[student.currentIndex].label}: {Math.floor(student.timeLeft / 60)}m {student.timeLeft % 60}s</p>
              <Progress value={(student.timeLeft / (student.schedule.times[student.currentIndex].duration * 60)) * 100} className="mt-2 bg-gray-300 h-2 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
