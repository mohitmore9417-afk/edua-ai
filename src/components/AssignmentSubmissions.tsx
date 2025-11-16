import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Edit, Eye, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Submission {
  id: string;
  content: string;
  grade: number | null;
  ai_feedback: string | null;
  teacher_feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface AssignmentSubmissionsProps {
  assignmentId: string;
  assignmentTitle: string;
  totalPoints: number;
}

const AssignmentSubmissions = ({ assignmentId, assignmentTitle, totalPoints }: AssignmentSubmissionsProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: "",
    feedback: "",
  });

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("assignment_submissions")
      .select(`
        *,
        profiles!assignment_submissions_student_id_fkey (full_name, email)
      `)
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching submissions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubmissions(data || []);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    const grade = parseInt(gradeData.grade);
    if (isNaN(grade) || grade < 0 || grade > totalPoints) {
      toast({
        title: "Invalid grade",
        description: `Grade must be between 0 and ${totalPoints}`,
        variant: "destructive",
      });
      return;
    }

    setIsGrading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("assignment_submissions")
      .update({
        grade: grade,
        teacher_feedback: gradeData.feedback,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq("id", selectedSubmission.id);

    if (error) {
      toast({
        title: "Error grading submission",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Create notification for student
      await supabase.from("notifications").insert({
        user_id: selectedSubmission.student_id,
        title: "Assignment Graded",
        message: `Your assignment "${assignmentTitle}" has been graded. Score: ${grade}/${totalPoints}`,
        type: "grade",
        related_id: assignmentId,
      });

      toast({
        title: "Submission graded",
        description: "The student has been notified",
      });

      fetchSubmissions();
      setSelectedSubmission(null);
      setGradeData({ grade: "", feedback: "" });
    }
    setIsGrading(false);
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeData({
      grade: submission.grade?.toString() || "",
      feedback: submission.teacher_feedback || "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions for: {assignmentTitle}</CardTitle>
        <CardDescription>
          {submissions.length} submission(s) received
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No submissions yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>AI Grade</TableHead>
                <TableHead>Teacher Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const hasTeacherGrade = submission.grade !== null && submission.teacher_feedback;
                const hasAIGrade = submission.ai_feedback !== null;
                
                return (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{submission.profiles.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(submission.submitted_at), "MMM d, h:mm a")}</TableCell>
                    <TableCell>
                      {hasAIGrade ? (
                        <div className="flex items-center gap-1">
                          <Brain className="w-4 h-4 text-primary" />
                          <span>{submission.grade || "N/A"}/{totalPoints}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasTeacherGrade ? (
                        <span className="font-semibold">{submission.grade}/{totalPoints}</span>
                      ) : (
                        <span className="text-muted-foreground">Not graded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasTeacherGrade ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Graded
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGradeDialog(submission)}
                          >
                            {hasTeacherGrade ? (
                              <>
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Grade
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Grade Submission</DialogTitle>
                            <DialogDescription>
                              Student: {submission.profiles.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Student's Answer</Label>
                              <div className="p-4 bg-muted rounded-lg mt-2">
                                <p className="whitespace-pre-wrap">{submission.content}</p>
                              </div>
                            </div>

                            {submission.ai_feedback && (
                              <div>
                                <Label className="flex items-center gap-2">
                                  <Brain className="w-4 h-4 text-primary" />
                                  AI Feedback
                                </Label>
                                <div className="p-4 bg-primary/5 rounded-lg mt-2">
                                  <p className="text-sm">{submission.ai_feedback}</p>
                                  {submission.grade && (
                                    <p className="text-sm font-semibold mt-2">
                                      AI Suggested Grade: {submission.grade}/{totalPoints}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <Label htmlFor="grade">Your Grade (0-{totalPoints})</Label>
                              <Input
                                id="grade"
                                type="number"
                                min="0"
                                max={totalPoints}
                                value={gradeData.grade}
                                onChange={(e) =>
                                  setGradeData({ ...gradeData, grade: e.target.value })
                                }
                                placeholder={`Enter grade (max ${totalPoints})`}
                              />
                            </div>

                            <div>
                              <Label htmlFor="feedback">Your Feedback</Label>
                              <Textarea
                                id="feedback"
                                value={gradeData.feedback}
                                onChange={(e) =>
                                  setGradeData({ ...gradeData, feedback: e.target.value })
                                }
                                placeholder="Provide detailed feedback for the student..."
                                className="min-h-[120px]"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleGradeSubmission}
                              disabled={isGrading || !gradeData.grade}
                            >
                              {isGrading ? "Saving..." : "Save Grade"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignmentSubmissions;
