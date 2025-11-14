import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Percent, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ClassAttendance {
  classId: string;
  className: string;
  totalStudents: number;
  averageAttendance: number;
}

interface TrendData {
  date: string;
  percentage: number;
  present: number;
  total: number;
}

interface TeacherAttendanceStatsProps {
  teacherId: string;
}

const TeacherAttendanceStats = ({ teacherId }: TeacherAttendanceStatsProps) => {
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
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

      // Fetch trend data (last 30 days)
      await fetchTrendData(classes.map(c => c.id));
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async (classIds: string[]) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendance } = await supabase
        .from("attendance")
        .select("date, status")
        .in("class_id", classIds)
        .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (!attendance || attendance.length === 0) return;

      // Group by date
      const dateMap = new Map<string, { present: number; total: number }>();
      
      attendance.forEach(record => {
        const existing = dateMap.get(record.date) || { present: 0, total: 0 };
        existing.total += 1;
        if (record.status === "present") {
          existing.present += 1;
        }
        dateMap.set(record.date, existing);
      });

      // Convert to array and calculate percentages
      const trend: TrendData[] = Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          percentage: Math.round((stats.present / stats.total) * 100),
          present: stats.present,
          total: stats.total,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setTrendData(trend);
    } catch (error) {
      console.error("Error fetching trend data:", error);
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

      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Attendance Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Attendance %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
