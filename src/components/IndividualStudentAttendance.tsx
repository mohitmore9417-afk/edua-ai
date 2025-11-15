import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, TrendingUp, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportIndividualStudentToPDF, exportAttendanceToCSV } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface ClassAttendance {
  classId: string;
  className: string;
  subject: string;
  percentage: number;
  present: number;
  total: number;
}

interface TrendData {
  date: string;
  percentage: number;
  present: number;
  total: number;
}

interface IndividualStudentAttendanceProps {
  teacherId: string;
}

const IndividualStudentAttendance = ({ teacherId }: IndividualStudentAttendanceProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number>(0);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [teacherId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentAttendance();
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      // Get all classes taught by this teacher
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", teacherId);

      if (!classes || classes.length === 0) return;

      const classIds = classes.map(c => c.id);

      // Get all students enrolled in these classes
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select(`
          student_id,
          profiles!class_enrollments_student_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .in("class_id", classIds);

      if (!enrollments) return;

      // Remove duplicates and map to Student type
      const uniqueStudents = Array.from(
        new Map(
          enrollments
            .filter(e => e.profiles)
            .map(e => [
              e.profiles.id,
              {
                id: e.profiles.id,
                full_name: e.profiles.full_name,
                email: e.profiles.email,
              }
            ])
        ).values()
      );

      setStudents(uniqueStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchStudentAttendance = async () => {
    if (!selectedStudentId) return;
    
    setLoading(true);
    try {
      // Get classes taught by this teacher that the student is enrolled in
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name, subject")
        .eq("teacher_id", teacherId);

      if (!classes || classes.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      // Filter to only classes the student is enrolled in
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", selectedStudentId)
        .in("class_id", classIds);

      const enrolledClassIds = enrollments?.map(e => e.class_id) || [];
      const enrolledClasses = classes.filter(c => enrolledClassIds.includes(c.id));

      const classStats: ClassAttendance[] = [];
      let totalRecords = 0;
      let totalPresent = 0;

      for (const classItem of enrolledClasses) {
        const { data: attendance } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", selectedStudentId)
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
          percentage,
          present,
          total,
        });
      }

      setClassAttendance(classStats);
      const overall = totalRecords > 0 
        ? Math.round((totalPresent / totalRecords) * 100)
        : 0;
      setOverallPercentage(overall);

      // Fetch trend data
      await fetchTrendData(enrolledClassIds);
    } catch (error) {
      console.error("Error fetching student attendance:", error);
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
        .eq("student_id", selectedStudentId)
        .in("class_id", classIds)
        .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (!attendance || attendance.length === 0) {
        setTrendData([]);
        return;
      }

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

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleExportCSV = () => {
    if (!selectedStudent) return;
    const exportData = classAttendance.map(item => ({
      className: item.className,
      subject: item.subject,
      averageAttendance: item.percentage,
      presentClasses: item.present,
      totalClasses: item.total,
    }));
    exportAttendanceToCSV(
      exportData,
      overallPercentage,
      `${selectedStudent.full_name}-attendance-report`,
      'student'
    );
    toast({
      title: "Export successful",
      description: "Student attendance data exported as CSV",
    });
  };

  const handleExportPDF = () => {
    if (!selectedStudent) return;
    const exportData = classAttendance.map(item => ({
      className: item.className,
      subject: item.subject,
      averageAttendance: item.percentage,
      presentClasses: item.present,
      totalClasses: item.total,
    }));
    exportIndividualStudentToPDF(
      selectedStudent.full_name,
      exportData,
      overallPercentage,
      trendData,
      `${selectedStudent.full_name}-attendance-report`
    );
    toast({
      title: "Export successful",
      description: "Student attendance data exported as PDF",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Select Student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a student to track" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name} ({student.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">Loading attendance data...</p>
          </CardContent>
        </Card>
      )}

      {!loading && selectedStudentId && (
        <>
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
              <CardTitle>
                {selectedStudent?.full_name}'s Overall Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{overallPercentage}%</div>
              <p className="text-sm text-muted-foreground mt-1">Across all subjects</p>
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

          {classAttendance.length > 0 && (
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
                            {classItem.subject} • {classItem.present}/{classItem.total} classes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {classItem.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && classAttendance.length === 0 && selectedStudentId && (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-muted-foreground">
                  No attendance data available for this student
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default IndividualStudentAttendance;
