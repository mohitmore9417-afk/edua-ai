import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Percent, Users } from "lucide-react";

interface ClassAttendance {
  classId: string;
  className: string;
  totalStudents: number;
  averageAttendance: number;
}

interface TeacherAttendanceStatsProps {
  teacherId: string;
}

const TeacherAttendanceStats = ({ teacherId }: TeacherAttendanceStatsProps) => {
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceStats();
  }, [teacherId]);

  const fetchAttendanceStats = async () => {
    try {
      // Get all classes taught by this teacher
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", teacherId);

      if (!classes || classes.length === 0) {
        setLoading(false);
        return;
      }

      const classStats: ClassAttendance[] = [];
      let totalAttendanceRecords = 0;
      let totalPresentRecords = 0;

      for (const classItem of classes) {
        // Get all students in this class
        const { data: enrollments } = await supabase
          .from("class_enrollments")
          .select("student_id")
          .eq("class_id", classItem.id);

        const studentCount = enrollments?.length || 0;

        // Get attendance records for this class
        const { data: attendance } = await supabase
          .from("attendance")
          .select("status")
          .eq("class_id", classItem.id);

        const totalRecords = attendance?.length || 0;
        const presentRecords = attendance?.filter(a => a.status === "present").length || 0;

        totalAttendanceRecords += totalRecords;
        totalPresentRecords += presentRecords;

        const classPercentage = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

        classStats.push({
          classId: classItem.id,
          className: classItem.name,
          totalStudents: studentCount,
          averageAttendance: Math.round(classPercentage),
        });
      }

      setClassAttendance(classStats);
      const overall = totalAttendanceRecords > 0 
        ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100)
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
          <p className="text-sm text-muted-foreground mt-1">Across all your classes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classAttendance.map((classItem) => (
              <div
                key={classItem.classId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{classItem.className}</p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.totalStudents} students
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {classItem.averageAttendance}%
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

export default TeacherAttendanceStats;
