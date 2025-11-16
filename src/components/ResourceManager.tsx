import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, FolderOpen, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import FilePreview from "@/components/FilePreview";

interface Resource {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  category: string | null;
  created_at: string;
  classes: {
    name: string;
  };
}

interface TeacherClass {
  id: string;
  name: string;
  subject: string;
}

const RESOURCE_CATEGORIES = [
  "Lecture Notes",
  "Study Guide",
  "Practice Problems",
  "Reading Material",
  "Reference",
  "Other",
];

const ResourceManager = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    class_id: "",
    category: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchClasses();
    fetchResources();
  }, []);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("classes")
      .select("id, name, subject")
      .eq("teacher_id", user.id);

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

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select(`
        *,
        classes(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching resources",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResources(data || []);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewResource({ ...newResource, file: e.target.files[0] });
    }
  };

  const handleUpload = async () => {
    if (!newResource.file || !newResource.class_id || !newResource.title) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileExt = newResource.file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("class-resources")
        .upload(fileName, newResource.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("class-resources")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("resources")
        .insert({
          class_id: newResource.class_id,
          title: newResource.title,
          description: newResource.description,
          category: newResource.category || null,
          file_url: publicUrl,
          file_name: newResource.file.name,
          file_size: newResource.file.size,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      // Notify students
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("student_id")
        .eq("class_id", newResource.class_id);

      if (enrollments) {
        const notifications = enrollments.map((e) => ({
          user_id: e.student_id,
          title: "New Resource Shared",
          message: `A new resource "${newResource.title}" has been shared in your class`,
          type: "resource",
          related_id: newResource.class_id,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      toast({
        title: "Resource uploaded",
        description: "The resource has been shared with your class",
      });

      setIsDialogOpen(false);
      setNewResource({ title: "", description: "", class_id: "", category: "", file: null });
      fetchResources();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resourceId: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("resources")
        .delete()
        .eq("id", resourceId);

      if (deleteError) throw deleteError;

      const pathMatch = fileUrl.match(/class-resources\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from("class-resources").remove([pathMatch[1]]);
      }

      toast({
        title: "Resource deleted",
        description: "The resource has been removed",
      });

      fetchResources();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadResource = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file is being downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredResources = resources.filter((r) => {
    const classMatch = !selectedClass || r.class_id === selectedClass;
    const categoryMatch = selectedCategory === "all" || r.category === selectedCategory;
    return classMatch && categoryMatch;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Resource Library</h2>
          <p className="text-muted-foreground">Share files and materials with your students</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Resource</DialogTitle>
              <DialogDescription>
                Share a file with your class students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select
                  value={newResource.class_id}
                  onValueChange={(value) =>
                    setNewResource({ ...newResource, class_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newResource.category}
                  onValueChange={(value) =>
                    setNewResource({ ...newResource, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) =>
                    setNewResource({ ...newResource, title: e.target.value })
                  }
                  placeholder="e.g., Week 3 Study Guide"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newResource.description}
                  onChange={(e) =>
                    setNewResource({ ...newResource, description: e.target.value })
                  }
                  placeholder="Brief description of the resource"
                />
              </div>
              <div className="space-y-2">
                <Label>File *</Label>
                <Input type="file" onChange={handleFileChange} />
                {newResource.file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {newResource.file.name} ({formatFileSize(newResource.file.size)})
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Resource"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {RESOURCE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resources yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first resource to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(resource.id, resource.file_url)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <CardTitle className="mt-2">{resource.title}</CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{resource.classes.name}</Badge>
                    {resource.category && (
                      <Badge variant="secondary">{resource.category}</Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resource.description && (
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                )}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>File: {resource.file_name}</p>
                  <p>Size: {formatFileSize(resource.file_size)}</p>
                  <p>Uploaded: {format(new Date(resource.created_at), "PP")}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPreviewFile({ url: resource.file_url, name: resource.file_name })}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => downloadResource(resource.file_url, resource.file_name)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreview
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onDownload={() => downloadResource(previewFile.url, previewFile.name)}
        />
      )}
    </div>
  );
};

export default ResourceManager;
