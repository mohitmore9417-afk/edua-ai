import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, FileText, Calendar, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import AttendanceTracker from "@/components/AttendanceTracker";
import AssignmentManager from "@/components/AssignmentManager";
import TimetableManager from "@/components/TimetableManager";
import AnnouncementManager from "@/components/AnnouncementManager";
import TeacherAttendanceStats from "@/components/TeacherAttendanceStats";
import IndividualStudentAttendance from "@/components/IndividualStudentAttendance";

interface Class {
  id: string;
  name: string;
  subject: string;
  description: string;
  class_code: string;
  room: string;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [newClass, setNewClass] = useState({
    name: "",
    subject: "",
    description: "",
    room: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "teacher") {
        navigate("/");
      } else {
        setUserName(profile.full_name || "Teacher");
        setTeacherId(user.id);
        fetchClasses(user.id);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchClasses = async (teacherId: string) => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClasses(data || []);
    }
  };

  const generateClassCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateClass = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("classes")
      .insert({
        ...newClass,
        teacher_id: user.id,
        class_code: generateClassCode(),
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating class",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Class created!",
        description: `Class code: ${data.class_code}`,
      });
      setClasses([data, ...classes]);
      setIsCreateDialogOpen(false);
      setNewClass({ name: "", subject: "", description: "", room: "" });
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">{userName}</h2>
            <p className="text-muted-foreground">
              Manage your classes and student activities
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new class
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="class-name">Class Name</Label>
                  <Input
                    id="class-name"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="e.g., Mathematics 101"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newClass.subject}
                    onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    value={newClass.room}
                    onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                    placeholder="e.g., Room 305"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    placeholder="Brief description of the class..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateClass}>Create Class</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="attendance-stats">Attendance Stats</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="individual">Student Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first class to get started</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="hover:shadow-lg transition-all animate-fade-in">
                    <CardHeader>
                      <CardTitle>{classItem.name}</CardTitle>
                      <CardDescription>{classItem.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Class Code:</span>
                        <span className="font-mono font-semibold bg-primary/10 px-2 py-1 rounded">{classItem.class_code}</span>
                      </div>
                      {classItem.room && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Room:</span>
                          <span>{classItem.room}</span>
                        </div>
                      )}
                      {classItem.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {classItem.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Create a class first to track attendance</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Label>Select a class to mark attendance</Label>
                <div className="grid gap-4">
                  {classes.map((classItem) => (
                    <AttendanceTracker
                      key={classItem.id}
                      classId={classItem.id}
                      className={classItem.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance-stats">
            {teacherId && <TeacherAttendanceStats teacherId={teacherId} />}
          </TabsContent>

          <TabsContent value="individual">
            {teacherId && <IndividualStudentAttendance teacherId={teacherId} />}
          </TabsContent>

          <TabsContent value="assignments">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Create a class first to manage assignments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {classes.map((classItem) => (
                  <AssignmentManager
                    key={classItem.id}
                    classId={classItem.id}
                    className={classItem.name}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timetable">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Create a class first to manage timetables</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {classes.map((classItem) => (
                  <TimetableManager
                    key={classItem.id}
                    classId={classItem.id}
                    className={classItem.name}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="announcements">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Create a class first to post announcements</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {classes.map((classItem) => (
                  <AnnouncementManager
                    key={classItem.id}
                    classId={classItem.id}
                    className={classItem.name}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;