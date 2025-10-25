import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Calendar, Brain, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  class_id: string;
  classes: {
    name: string;
  };
  assignment_submissions?: Array<{
    id: string;
    content: string;
    grade: number;
    ai_feedback: string;
    submitted_at: string;
  }>;
}

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("class_id")
      .eq("student_id", user.id);

    if (!enrollments || enrollments.length === 0) return;

    const classIds = enrollments.map((e) => e.class_id);

    // Get assignments for enrolled classes
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        classes(name),
        assignment_submissions!left(*)
      `)
      .in("class_id", classIds)
      .eq("assignment_submissions.student_id", user.id)
      .order("due_date", { ascending: true });

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

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Submit assignment
    const { data: submissionData, error: submitError } = await supabase
      .from("assignment_submissions")
      .insert({
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        content: submissionContent,
      })
      .select()
      .single();

    if (submitError) {
      toast({
        title: "Error submitting assignment",
        description: submitError.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Request AI grading
    try {
      const { data, error } = await supabase.functions.invoke("ai-grading", {
        body: {
          submissionId: submissionData.id,
          content: submissionContent,
          assignmentTitle: selectedAssignment.title,
        },
      });

      if (error) throw error;

      toast({
        title: "Assignment submitted!",
        description: "Your work has been submitted and is being graded by AI.",
      });

      fetchAssignments();
      setSelectedAssignment(null);
      setSubmissionContent("");
    } catch (error: any) {
      toast({
        title: "Submitted successfully",
        description: "Your assignment has been submitted. AI grading will be processed shortly.",
      });
      fetchAssignments();
      setSelectedAssignment(null);
      setSubmissionContent("");
    }

    setIsSubmitting(false);
  };

  const getSubmission = (assignment: Assignment) => {
    return assignment.assignment_submissions?.[0];
  };

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground">Check back later for new assignments</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const submission = getSubmission(assignment);
            const isSubmitted = !!submission;
            const isGraded = submission?.grade !== null && submission?.grade !== undefined;
            
            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-all animate-fade-in">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{assignment.title}</CardTitle>
                        {isSubmitted && (
                          <Badge variant={isGraded ? "default" : "secondary"} className="animate-scale-in">
                            {isGraded ? "Graded" : "Submitted"}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{assignment.classes.name}</CardDescription>
                      <p className="text-sm mt-2">{assignment.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {assignment.due_date ? format(new Date(assignment.due_date), "PPP") : "No deadline"}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {assignment.total_points} points
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg animate-fade-in">
                      {isGraded && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-accent" />
                            <span className="font-semibold">Grade: {submission.grade}/{assignment.total_points}</span>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            AI Graded
                          </Badge>
                        </div>
                      )}
                      {!isGraded && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Waiting for grade...</span>
                        </div>
                      )}
                      {submission.ai_feedback && (
                        <div>
                          <Label className="text-xs text-muted-foreground">AI Feedback</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{submission.ai_feedback}</p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Submitted {format(new Date(submission.submitted_at), "PPp")}
                      </div>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedAssignment(assignment)}
                          className="w-full transition-all hover:scale-105"
                        >
                          Submit Assignment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{assignment.title}</DialogTitle>
                          <DialogDescription>
                            Submit your work for this assignment
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Your Answer</Label>
                            <Textarea
                              value={submissionContent}
                              onChange={(e) => setSubmissionContent(e.target.value)}
                              placeholder="Type your answer here..."
                              rows={12}
                              className="mt-2"
                            />
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
                            <Brain className="w-5 h-5 text-primary mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium">AI-Powered Grading</p>
                              <p className="text-muted-foreground">
                                Your submission will be automatically graded by AI and you'll receive detailed feedback.
                              </p>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleSubmit}
                            disabled={!submissionContent.trim() || isSubmitting}
                          >
                            {isSubmitting ? "Submitting..." : "Submit Assignment"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;