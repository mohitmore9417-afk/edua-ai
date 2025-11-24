import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FolderOpen, Search, Eye } from "lucide-react";
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
    subject: string;
  };
}

const RESOURCE_CATEGORIES = [
  "Lecture Notes",
  "Study Guide",
  "Practice Problems",
  "Reading Material",
  "Reference",
  "Other",
];

const StudentResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchQuery, selectedClass, selectedCategory]);

  const fetchResources = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("class_id, classes(id, name)")
      .eq("student_id", user.id);

    if (enrollments) {
      const classList = enrollments.map((e: any) => ({
        id: e.class_id,
        name: e.classes.name,
      }));
      setClasses(classList);

      const classIds = enrollments.map((e) => e.class_id);

      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          classes(name, subject)
        `)
        .in("class_id", classIds)
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
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.classes.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedClass !== "all") {
      filtered = filtered.filter((r) => r.class_id === selectedClass);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    setFilteredResources(filtered);
  };

  const getSignedUrl = async (fileUrl: string) => {
    try {
      // Extract the path from the full URL
      const path = fileUrl.split('/').slice(-1)[0];
      
      const { data, error } = await supabase.storage
        .from('class-resources')
        .createSignedUrl(path, 3600); // URL valid for 1 hour

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to access file",
        variant: "destructive",
      });
      return null;
    }
  };

  const downloadResource = async (fileUrl: string, fileName: string) => {
    try {
      const signedUrl = await getSignedUrl(fileUrl);
      if (!signedUrl) return;

      const response = await fetch(signedUrl);
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

  const handlePreview = async (fileUrl: string, fileName: string) => {
    const signedUrl = await getSignedUrl(fileUrl);
    if (signedUrl) {
      setPreviewFile({ url: signedUrl, name: fileName });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Learning Resources</h2>
        <p className="text-muted-foreground">Access study materials and files from your classes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
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
          </div>
        </CardContent>
      </Card>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedClass !== "all" || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Your teachers haven't shared any resources yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="w-8 h-8 text-primary mb-2" />
                <CardTitle>{resource.title}</CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{resource.classes.name}</Badge>
                    <Badge variant="secondary">{resource.classes.subject}</Badge>
                    {resource.category && (
                      <Badge>{resource.category}</Badge>
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
                  <p>Added: {format(new Date(resource.created_at), "PP")}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePreview(resource.file_url, resource.file_name)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
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

export default StudentResources;
