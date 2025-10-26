import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import StudentAssignments from "@/components/StudentAssignments";
import StudentAnnouncements from "@/components/StudentAnnouncements";
import StudentTimetable from "@/components/StudentTimetable";
import { BookOpen, Calendar, FileText, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EnrolledClass {
  id: string;
  class_id: string;
  classes: {
    id: string;
    name: string;
    subject: string;
    description: string;
    class_code: string;
    room: string;
  };
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "student") {
        navigate("/");
      } else {
        fetchEnrolledClasses(user.id);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchEnrolledClasses = async (studentId: string) => {
    const { data, error } = await supabase
      .from("class_enrollments")
      .select(`
        *,
        classes (
          id,
          name,
          subject,
          description,
          class_code,
          room
        )
      `)
      .eq("student_id", studentId);

    if (error) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEnrolledClasses(data || []);
    }
  };

  const handleJoinClass = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find class by code
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("class_code", classCode.toUpperCase())
      .single();

    if (classError || !classData) {
      toast({
        title: "Class not found",
        description: "Please check the class code and try again",
        variant: "destructive",
      });
      return;
    }

    // Enroll student
    const { error: enrollError } = await supabase
      .from("class_enrollments")
      .insert({
        class_id: classData.id,
        student_id: user.id,
      });

    if (enrollError) {
      if (enrollError.code === "23505") {
        toast({
          title: "Already enrolled",
          description: "You are already enrolled in this class",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error joining class",
          description: enrollError.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Successfully joined!",
        description: "You have been enrolled in the class",
      });
      fetchEnrolledClasses(user.id);
      setIsJoinDialogOpen(false);
      setClassCode("");
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Student Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's your learning overview
            </p>
          </div>
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Join Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
                <DialogDescription>
                  Enter the class code provided by your teacher
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="class-code">Class Code</Label>
                  <Input
                    id="class-code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123"
                    className="uppercase font-mono"
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleJoinClass}>Join Class</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            {enrolledClasses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
                  <p className="text-muted-foreground mb-4">Join your first class to get started</p>
                  <Button onClick={() => setIsJoinDialogOpen(true)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Join Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledClasses.map((enrollment) => (
                  <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>{enrollment.classes.name}</CardTitle>
                      <CardDescription>{enrollment.classes.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {enrollment.classes.room && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Room:</span>
                          <span>{enrollment.classes.room}</span>
                        </div>
                      )}
                      <Button variant="outline" className="w-full mt-4">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timetable" className="space-y-4">
            <StudentTimetable />
          </TabsContent>

          <TabsContent value="assignments">
            <StudentAssignments />
          </TabsContent>

          <TabsContent value="announcements">
            <StudentAnnouncements />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;