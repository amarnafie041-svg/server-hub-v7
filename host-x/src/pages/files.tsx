import { useRef, useState, useCallback } from "react";
import { useListFiles, useDeleteFile, useCreateDirectory, useRenameFile, useTouchFile } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileIcon, FolderIcon, Trash2, Edit2, FolderPlus, ArrowLeft, RefreshCw, Upload, FilePlus, Code2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

const FILE_ICONS: Record<string, string> = {
  py: "🐍", js: "📜", ts: "📘", html: "🌐", css: "🎨", php: "🐘",
  json: "📋", md: "📝", sh: "⚙️", txt: "📄", env: "🔧", yml: "📐", yaml: "📐",
  rb: "💎", go: "🐹", rs: "🦀", java: "☕", cpp: "⚡", c: "⚡",
  zip: "📦", tar: "📦", gz: "📦",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", svg: "🖼️",
  mp4: "🎬", mp3: "🎵", pdf: "📑",
};

function getFileEmoji(name: string, isDir: boolean) {
  if (isDir) return null;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || null;
}

type UploadStatus = { name: string; progress: number; done: boolean; error?: string };

export default function Files() {
  const [currentPath, setCurrentPath] = useState("/");
  const { data: files, isLoading, refetch } = useListFiles({ path: currentPath });
  const deleteFile = useDeleteFile();
  const createDir = useCreateDirectory();
  const renameFile = useRenameFile();
  const touchFile = useTouchFile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateDirOpen, setIsCreateDirOpen] = useState(false);
  const [isCreateFileOpen, setIsCreateFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<{ oldPath: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const buildPath = (name: string) =>
    currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;

  const handleNavigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const handleDelete = (path: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    deleteFile.mutate({ params: { path } }, {
      onSuccess: () => { toast({ title: "تم الحذف" }); refetch(); },
      onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
    });
  };

  const handleCreateDir = () => {
    if (!newFolderName) return;
    createDir.mutate({ data: { path: buildPath(newFolderName) } }, {
      onSuccess: () => { toast({ title: "تم إنشاء المجلد" }); setIsCreateDirOpen(false); setNewFolderName(""); refetch(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    });
  };

  const handleCreateFile = () => {
    if (!newFileName) return;
    touchFile.mutate({ data: { path: buildPath(newFileName) } }, {
      onSuccess: () => { toast({ title: "تم إنشاء الملف" }); setIsCreateFileOpen(false); setNewFileName(""); refetch(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    });
  };

  const handleRename = () => {
    if (!renameItem || !newName) return;
    renameFile.mutate({ data: { oldPath: renameItem.oldPath, newPath: buildPath(newName) } }, {
      onSuccess: () => { toast({ title: "تم تغيير الاسم" }); setIsRenameOpen(false); setNewName(""); refetch(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    });
  };

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    const newStatuses: UploadStatus[] = filesArray.map(f => ({ name: f.name, progress: 0, done: false }));
    setUploads(prev => [...prev, ...newStatuses]);
    const baseIdx = uploads.length;

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const filePath = buildPath(file.name);

      setUploads(prev => prev.map((u, idx) => idx === baseIdx + i ? { ...u, progress: 10 } : u));

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let j = 0; j < bytes.length; j += chunkSize) {
          binary += String.fromCharCode(...bytes.slice(j, Math.min(j + chunkSize, bytes.length)));
          const progress = Math.round(10 + (j / bytes.length) * 40);
          setUploads(prev => prev.map((u, idx) => idx === baseIdx + i ? { ...u, progress } : u));
        }
        const base64 = btoa(binary);

        setUploads(prev => prev.map((u, idx) => idx === baseIdx + i ? { ...u, progress: 60 } : u));

        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content: base64 }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "فشل الرفع");
        }

        setUploads(prev => prev.map((u, idx) => idx === baseIdx + i ? { ...u, progress: 100, done: true } : u));
        refetch();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "حدث خطأ";
        setUploads(prev => prev.map((u, idx) => idx === baseIdx + i ? { ...u, progress: 0, done: true, error: msg } : u));
        toast({ title: `خطأ في رفع ${file.name}`, description: msg, variant: "destructive" });
      }
    }

    setTimeout(() => {
      setUploads(prev => prev.filter(u => !u.done || u.error));
    }, 2500);
  }, [currentPath, uploads.length, refetch, toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleOpenInEditor = (filePath: string) => {
    setLocation(`/editor?file=${encodeURIComponent(filePath)}`);
  };

  const isUploading = uploads.some(u => !u.done);

  return (
    <div className="p-4 h-full flex flex-col gap-3" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">إدارة الملفات</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">{currentPath}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 ml-1.5" /> تحديث
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="w-3.5 h-3.5 ml-1.5" />
            {isUploading ? "جاري الرفع..." : "رفع ملف"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreateFileOpen(true)}>
            <FilePlus className="w-3.5 h-3.5 ml-1.5" /> ملف جديد
          </Button>
          <Button size="sm" onClick={() => setIsCreateDirOpen(true)}>
            <FolderPlus className="w-3.5 h-3.5 ml-1.5" /> مجلد جديد
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="shrink-0 space-y-1.5">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate" dir="ltr">{u.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {u.error ? <span className="text-destructive">خطأ</span> : u.done ? "✅" : `${u.progress}%`}
                  </span>
                </div>
                {!u.done && (
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
              </div>
              {(u.done) && (
                <button onClick={() => setUploads(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File list — drag & drop target */}
      <Card
        className={`flex-1 overflow-hidden border-border bg-card flex flex-col min-h-0 transition-colors ${isDragging ? "border-primary/60 bg-primary/5" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center">
              <Upload className="w-12 h-12 text-primary mx-auto mb-2 opacity-80" />
              <p className="text-primary font-semibold">أفلت الملفات للرفع</p>
            </div>
          </div>
        )}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-muted/20 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNavigateUp} disabled={currentPath === "/"}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div className="text-xs font-mono flex-1 text-left truncate" dir="ltr">{currentPath}</div>
        </div>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
          ) : !files || files.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FolderIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">المجلد فارغ</p>
              <p className="text-xs mt-1 opacity-60">اسحب ملفات هنا أو اضغط "رفع ملف"</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...files].sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
              }).map((file) => {
                const emoji = getFileEmoji(file.name, file.isDir);
                return (
                  <div
                    key={file.path}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-accent/40 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      onClick={() => file.isDir && setCurrentPath(file.path)}
                    >
                      {file.isDir
                        ? <FolderIcon className="w-4 h-4 text-primary shrink-0" />
                        : emoji
                          ? <span className="text-base leading-none shrink-0">{emoji}</span>
                          : <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      <span className="text-sm font-medium truncate" dir="ltr">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block" dir="ltr">{file.size}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!file.isDir && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            title="فتح في المحرر"
                            onClick={() => handleOpenInEditor(file.path)}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setRenameItem({ oldPath: file.path, name: file.name }); setNewName(file.name); setIsRenameOpen(true); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(file.path)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDirOpen} onOpenChange={setIsCreateDirOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء مجلد جديد</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="folderName" className="mb-2 block">اسم المجلد</Label>
            <Input id="folderName" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDir()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDirOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateDir} disabled={createDir.isPending || !newFolderName}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFileOpen} onOpenChange={setIsCreateFileOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء ملف جديد</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="fileName" className="mb-2 block">اسم الملف</Label>
            <Input id="fileName" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} dir="ltr"
              placeholder="مثال: app.py" onKeyDown={(e) => e.key === "Enter" && handleCreateFile()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFileOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateFile} disabled={touchFile.isPending || !newFileName}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تغيير الاسم</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="newName" className="mb-2 block">الاسم الجديد</Label>
            <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && handleRename()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>إلغاء</Button>
            <Button onClick={handleRename} disabled={renameFile.isPending || !newName}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
