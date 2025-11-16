import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface FilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  onDownload: () => void;
}

const FilePreview = ({ isOpen, onClose, fileUrl, fileName, onDownload }: FilePreviewProps) => {
  const getFileType = () => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
      return "image";
    }
    if (extension === "pdf") {
      return "pdf";
    }
    return "unsupported";
  };

  const fileType = getFileType();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {fileType === "image" && (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          {fileType === "pdf" && (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0 rounded-lg"
              title={fileName}
            />
          )}
          {fileType === "unsupported" && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="mb-4">Preview not available for this file type</p>
              <Button onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
