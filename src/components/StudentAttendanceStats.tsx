import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Percent, BookOpen } from "lucide-react";

interface ClassAttendance {
  classId: string;
  className: string;
  subject: string;
  attendancePercentage: number;
  totalClasses: number;
  presentClasses: number;
}

interface StudentAttendanceStatsProps {
  studentId: string;
}

const StudentAttendanceStats = ({ studentId }: StudentAttendanceStatsProps) => {
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceStats();
  }, [studentId]);

  const fetchAttendanceStats = async () => {
    try {
      // Get all classes the student is enrolled in
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", studentId);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = enrollments.map(e => e.class_id);

      // Get class details
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name, subject")
        .in("id", classIds);

      const classStats: ClassAttendance[] = [];
      let totalRecords = 0;
      let totalPresent = 0;

      for (const classItem of classes || []) {
        // Get attendance records for this student in this class
        const { data: attendance } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", studentId)
          .eq("class_id", classItem.id);

        const total = attendance?.length || 0;
        const present = attendance?.filter(a => a.status === "present").length || 0;

        totalRecords += total;
        totalPresent += present;

        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        classStats.push({
          classId: classItem.id,
          className: classItem.name,
          subject: classItem.subject,
          attendancePercentage: percentage,
          totalClasses: total,
          presentClasses: present,
        });
      }

      setClassAttendance(classStats);
      const overall = totalRecords > 0 
        ? Math.round((totalPresent / totalRecords) * 100)
        : 0;
      setOverallAttendance(overall);
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading attendance stats...</p>
        </CardContent>
      </Card>
    );
  }

  if (classAttendance.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">No attendance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Overall Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{overallAttendance}%</div>
          <p className="text-sm text-muted-foreground mt-1">Across all subjects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classAttendance.map((classItem) => (
              <div
                key={classItem.classId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{classItem.className}</p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.subject} • {classItem.presentClasses}/{classItem.totalClasses} classes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {classItem.attendancePercentage}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendanceStats;
