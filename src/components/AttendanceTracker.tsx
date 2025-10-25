import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Student {
  id: string;
  full_name: string;
}

interface AttendanceTrackerProps {
  classId: string;
  className: string;
}

const AttendanceTracker = ({ classId, className }: AttendanceTrackerProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchStudents();
    fetchTodayAttendance();
  }, [classId]);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("class_enrollments")
      .select(`
        student_id,
        profiles:student_id (
          id,
          full_name
        )
      `)
      .eq("class_id", classId);

    if (error) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const studentList = data.map((enrollment: any) => enrollment.profiles).filter(Boolean);
      setStudents(studentList);
    }
  };

  const fetchTodayAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", classId)
      .eq("date", today);

    if (data) {
      const attendanceMap: Record<string, string> = {};
      data.forEach((record) => {
        attendanceMap[record.student_id] = record.status;
      });
      setAttendance(attendanceMap);
    }
  };

  const markAttendance = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
      class_id: classId,
      student_id: studentId,
      status,
      date: today,
      marked_by: user.id,
    }));

    // Delete existing attendance for today first
    await supabase
      .from("attendance")
      .delete()
      .eq("class_id", classId)
      .eq("date", today);

    // Insert new records
    const { error } = await supabase
      .from("attendance")
      .insert(attendanceRecords);

    if (error) {
      toast({
        title: "Error saving attendance",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Attendance saved!",
        description: `Attendance for ${className} has been recorded.`,
      });
    }

    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-accent text-accent-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      case "late": return "bg-yellow-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle>Mark Attendance</CardTitle>
        </div>
        <CardDescription>
          {format(new Date(), "EEEE, MMMM d, yyyy")} • {className}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No students enrolled yet
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all animate-scale-in"
                >
                  <span className="font-medium">{student.full_name}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={attendance[student.id] === "present" ? "default" : "outline"}
                      onClick={() => markAttendance(student.id, "present")}
                      className="transition-all hover:scale-105"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[student.id] === "late" ? "default" : "outline"}
                      onClick={() => markAttendance(student.id, "late")}
                      className="transition-all hover:scale-105"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Late
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[student.id] === "absent" ? "destructive" : "outline"}
                      onClick={() => markAttendance(student.id, "absent")}
                      className="transition-all hover:scale-105"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {Object.keys(attendance).length} / {students.length} marked
              </div>
              <Button
                onClick={submitAttendance}
                disabled={isSubmitting || Object.keys(attendance).length === 0}
                className="transition-all hover:scale-105"
              >
                {isSubmitting ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceTracker;