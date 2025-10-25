import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Calendar, Users, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  submission_count?: number;
}

interface AssignmentManagerProps {
  classId: string;
  className: string;
}

const AssignmentManager = ({ classId, className }: AssignmentManagerProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    due_date: "",
    total_points: 100,
  });

  useEffect(() => {
    fetchAssignments();
  }, [classId]);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        assignment_submissions(count)
      `)
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching assignments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAssignments(data || []);
    }
  };

  const handleCreateAssignment = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        ...newAssignment,
        class_id: classId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating assignment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Assignment created!",
        description: "Students can now view and submit this assignment.",
      });
      setAssignments([data, ...assignments]);
      setIsCreateDialogOpen(false);
      setNewAssignment({ title: "", description: "", due_date: "", total_points: 100 });
    }
  };

  const viewSubmissions = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Assignments</h3>
          <p className="text-sm text-muted-foreground">{className}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Add a new assignment for your students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="e.g., Essay on Climate Change"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  placeholder="Provide detailed instructions..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="total_points">Total Points</Label>
                <Input
                  id="total_points"
                  type="number"
                  value={newAssignment.total_points}
                  onChange={(e) => setNewAssignment({ ...newAssignment, total_points: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAssignment}>Create Assignment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground mb-4">Create your first assignment to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-all animate-fade-in">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {assignment.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewSubmissions(assignment.id)}
                      className="transition-all hover:scale-105"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      View Submissions
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {assignment.due_date ? format(new Date(assignment.due_date), "PPP") : "No deadline"}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {assignment.total_points} points
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4 text-primary" />
                    AI Grading Available
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;