import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Upload() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = trpc.content.uploadPdf.useMutation({
    onSuccess: (data) => {
      toast.success(`PDF uploaded successfully! ${data.paragraphCount} paragraphs extracted.`);
      setLocation(`/reader/${data.contentId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload PDF");
    },
  });

  const uploadTextMutation = trpc.content.uploadText.useMutation({
    onSuccess: (data) => {
      toast.success(`Text uploaded successfully! ${data.paragraphCount} paragraphs extracted.`);
      setLocation(`/reader/${data.contentId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload text");
    },
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    const isPDF = selectedFile.type === "application/pdf";
    const isText = selectedFile.type === "text/plain" || selectedFile.name.endsWith('.txt');
    
    if (!isPDF && !isText) {
      toast.error("Please select a PDF or text (.txt) file");
      return;
    }

    const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for PDF, 5MB for text
    if (selectedFile.size > maxSize) {
      toast.error(`${isPDF ? 'PDF' : 'Text'} file must be smaller than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setFile(selectedFile);
    if (!title && selectedFile.name) {
      // Suggest title from filename
      const suggestedTitle = selectedFile.name
        .replace(/\.(pdf|txt)$/i, "")
        .replace(/[-_]/g, " ");
      setTitle(suggestedTitle);
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error("Please select a file and enter a title");
      return;
    }

    const isPDF = file.type === "application/pdf";
    const isText = file.type === "text/plain" || file.name.endsWith('.txt');

    if (isText) {
      // For text files, read as text directly
      const reader = new FileReader();
      reader.onload = async () => {
        const textContent = reader.result as string;
        if (!textContent || textContent.trim().length === 0) {
          toast.error("Text file is empty");
          return;
        }

        uploadTextMutation.mutate({
          title: title.trim(),
          author: author.trim() || undefined,
          textContent: textContent.trim(),
        });
      };

      reader.onerror = () => {
        toast.error("Failed to read text file");
      };

      reader.readAsText(file);
    } else if (isPDF) {
      // For PDF files, convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        if (!base64Data) {
          toast.error("Failed to read PDF file");
          return;
        }

        uploadMutation.mutate({
          title: title.trim(),
          author: author.trim() || undefined,
          pdfData: base64Data,
        });
      };

      reader.onerror = () => {
        toast.error("Failed to read PDF file");
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            ← Home
          </Button>
          <h1 className="text-xl font-bold">Upload Document</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container py-8 max-w-2xl">
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Upload Your Document</h2>
              <p className="text-muted-foreground">
                Upload a PDF or text file (.txt) and we'll make it readable at your level.
                Text files are recommended for best results.
              </p>
            </div>

            {/* File Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-border"}
                ${file ? "border-green-500 bg-green-500/5" : ""}
              `}
            >
              {file ? (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-green-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium mb-1">Drag and drop your file here</p>
                    <p className="text-sm text-muted-foreground">or</p>
                  </div>
                  <label>
                    <input
                      type="file"
                      accept=".pdf,.txt,text/plain"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Button as="span" variant="outline">
                      Browse Files
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF (max 10MB) or Text file (max 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Title and Author */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="author">Author (optional)</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploadMutation.isPending || uploadTextMutation.isPending}
              className="w-full"
              size="lg"
            >
              {(uploadMutation.isPending || uploadTextMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload and Process
                </>
              )}
            </Button>

            {(uploadMutation.isPending || uploadTextMutation.isPending) && (
              <div className="text-sm text-muted-foreground text-center">
                <p>Processing your file...</p>
                <p className="text-xs mt-1">This may take a moment</p>
              </div>
            )}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 mt-6 bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            📖 Your file will be processed and made available for reading with adaptive difficulty levels.
            The original text will be stored, and easier versions will be generated on-demand.
            <br />
            <span className="text-xs mt-1 block">💡 Tip: Text files (.txt) process faster than PDFs</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

