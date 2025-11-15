import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Percent, BookOpen, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAttendanceToCSV, exportAttendanceToPDF } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ClassAttendance {
  classId: string;
  className: string;
  subject: string;
  attendancePercentage: number;
  totalClasses: number;
  presentClasses: number;
}

interface TrendData {
  date: string;
  percentage: number;
  present: number;
  total: number;
}

interface StudentAttendanceStatsProps {
  studentId: string;
}

const StudentAttendanceStats = ({ studentId }: StudentAttendanceStatsProps) => {
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
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

      // Fetch trend data (last 30 days)
      await fetchTrendData(classIds);
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
        .eq("student_id", studentId)
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

  const handleExportCSV = () => {
    const exportData = classAttendance.map(item => ({
      className: item.className,
      subject: item.subject,
      averageAttendance: item.attendancePercentage,
      presentClasses: item.presentClasses,
      totalClasses: item.totalClasses,
    }));
    exportAttendanceToCSV(exportData, overallAttendance, 'student-attendance-report', 'student');
    toast({
      title: "Export successful",
      description: "Attendance data exported as CSV",
    });
  };

  const handleExportPDF = () => {
    const exportData = classAttendance.map(item => ({
      className: item.className,
      subject: item.subject,
      averageAttendance: item.attendancePercentage,
      presentClasses: item.presentClasses,
      totalClasses: item.totalClasses,
    }));
    exportAttendanceToPDF(
      exportData,
      overallAttendance,
      trendData,
      'student-attendance-report',
      'Student Attendance Report',
      'student'
    );
    toast({
      title: "Export successful",
      description: "Attendance data exported as PDF",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

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

      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Your Attendance Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorAttendance)"
                  name="Attendance %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
