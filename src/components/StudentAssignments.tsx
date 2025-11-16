import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, Brain, CheckCircle, Clock, Download, Search } from "lucide-react";
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
  file_url: string | null;
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
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_date");

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, searchQuery, statusFilter, sortBy]);

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("class_id")
      .eq("student_id", user.id);

    if (!enrollments || enrollments.length === 0) return;

    const classIds = enrollments.map((e) => e.class_id);

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

  const filterAndSortAssignments = () => {
    let filtered = [...assignments];

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.classes.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const hasSubmission = a.assignment_submissions && a.assignment_submissions.length > 0;
        if (statusFilter === "submitted") return hasSubmission;
        if (statusFilter === "pending") return !hasSubmission;
        if (statusFilter === "graded") return hasSubmission && a.assignment_submissions[0].grade !== null;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "due_date") {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "class") {
        return a.classes.name.localeCompare(b.classes.name);
      }
      return 0;
    });

    setFilteredAssignments(filtered);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    try {
      await supabase.functions.invoke("ai-grading", {
        body: {
          submissionId: submissionData.id,
          content: submissionContent,
          assignmentTitle: selectedAssignment.title,
        },
      });

      toast({
        title: "Assignment submitted!",
        description: "Your work has been submitted and is being graded by AI.",
      });
    } catch (error: any) {
      toast({
        title: "Submitted successfully",
        description: "AI grading will process your submission.",
      });
    } finally {
      fetchAssignments();
      setSelectedAssignment(null);
      setSubmissionContent("");
      setIsSubmitting(false);
    }
  };

  const getSubmission = (assignment: Assignment) => {
    return assignment.assignment_submissions?.[0];
  };

  const downloadAssignmentFile = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("assignment-files")
        .download(fileUrl.replace(/^.*assignment-files\//, ""));

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file is being downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter & Sort Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters"
                : "No assignments have been posted yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredAssignments.map((assignment) => {
            const submission = getSubmission(assignment);
            const isSubmitted = !!submission;
            const isGraded = submission?.grade !== null && submission?.grade !== undefined;
            const isPastDue = new Date(assignment.due_date) < new Date();

            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{assignment.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{assignment.classes.name}</Badge>
                        {isGraded && (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Graded
                          </Badge>
                        )}
                        {isSubmitted && !isGraded && (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                        {!isSubmitted && isPastDue && (
                          <Badge variant="destructive">Past Due</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{assignment.total_points} points</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {assignment.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Due: {format(new Date(assignment.due_date), "PPP")}</span>
                    </div>
                  </div>

                  {assignment.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAssignmentFile(
                        assignment.file_url!,
                        `${assignment.title}-attachment`
                      )}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Assignment File
                    </Button>
                  )}

                  {isSubmitted ? (
                    <div className="space-y-3 p-4 bg-muted rounded-lg">
                      {isGraded && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Grade:</span>
                          <Badge variant="default" className="text-lg">
                            {submission.grade}/{assignment.total_points}
                          </Badge>
                        </div>
                      )}
                      {submission.ai_feedback && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            <span className="font-semibold">AI Feedback:</span>
                          </div>
                          <p className="text-sm">{submission.ai_feedback}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted on {format(new Date(submission.submitted_at), "PPP 'at' p")}
                      </p>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setSubmissionContent("");
                          }}
                          className="w-full"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Submit Assignment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit: {assignment.title}</DialogTitle>
                          <DialogDescription>
                            Write your answer below. Your work will be automatically graded by AI.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Your Answer</Label>
                            <Textarea
                              value={submissionContent}
                              onChange={(e) => setSubmissionContent(e.target.value)}
                              placeholder="Type your answer here..."
                              className="min-h-[200px]"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleSubmit}
                            disabled={!submissionContent || isSubmitting}
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
