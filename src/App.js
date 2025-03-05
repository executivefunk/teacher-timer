import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { Input } from "./components/ui/input";

const workColor = "bg-green-200"; // Productivity color
const breakColor = "bg-blue-200"; // Relaxing color
const alertSound = new Audio("/notification.mp3"); // Non-invasive sound alert

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
      { name, schedule, currentIndex: 0, timeLeft: schedule.times[0].duration * 60, isRunning: true },
    ]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStudents((prev) => prev.map((student) => {
        if (student.isRunning && student.timeLeft > 0) {
          return { ...student, timeLeft: student.timeLeft - 1 };
        } else if (student.isRunning && student.timeLeft === 0) {
          alertSound.play();
          const nextIndex = student.currentIndex + 1;
          if (nextIndex < student.schedule.times.length) {
            return { ...student, currentIndex: nextIndex, timeLeft: student.schedule.times[nextIndex].duration * 60 };
          } else {
            return { ...student, isRunning: false };
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
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {schedules.map((schedule, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold">{schedule.name}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{schedule.description}</p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => {
                    if (studentName) {
                      addStudent(studentName, schedule);
                      setStudentName("");
                    }
                  }}
                >
                  Add Student
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <h2 className="text-xl font-bold mt-6">Active Students</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {students.map((student, index) => (
          <Card key={index} className={student.schedule.times[student.currentIndex].label === "Work" ? workColor : breakColor}>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold">{student.name}</h3>
              <p className="text-md">{student.schedule.times[student.currentIndex].label}: {Math.floor(student.timeLeft / 60)}m {student.timeLeft % 60}s</p>
              <Progress value={(student.timeLeft / (student.schedule.times[student.currentIndex].duration * 60)) * 100} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
