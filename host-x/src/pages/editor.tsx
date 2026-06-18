import { useState, useRef, useEffect } from "react";
import { useListFiles, useReadFile, useWriteFile } from "@workspace/api-client-react";
import MonacoEditor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderIcon, FileIcon, Save, ChevronRight, PanelLeftClose, PanelLeftOpen,
  FilePlus2, AlertCircle, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

const LANG_COLORS: Record<string, string> = {
  python: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  javascript: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  typescript: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  php: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  html: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  css: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  json: "bg-green-500/20 text-green-400 border-green-500/30",
  markdown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  plaintext: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const FILE_ICONS: Record<string, string> = {
  py: "🐍", js: "📜", ts: "📘", tsx: "📘", jsx: "📜",
  html: "🌐", css: "🎨", php: "🐘", json: "📋", md: "📝",
  sh: "⚙️", txt: "📄", env: "🔧", yml: "📐", yaml: "📐",
};

function fileEmoji(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "📄";
}

export default function CodeEditor() {
  const search = useSearch();
  const initialFile = search ? new URLSearchParams(search).get("file") : null;

  const [treePath, setTreePath] = useState("/");
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFile);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorContent, setEditorContent] = useState("");
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const editorRef = useRef<{ getValue: () => string; getPosition: () => { lineNumber: number; column: number } | null } | null>(null);
  const { toast } = useToast();

  const { data: treeFiles } = useListFiles({ path: treePath });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fileContent, isLoading } = useReadFile(
    { path: selectedFile ?? "" },
    { query: { enabled: !!selectedFile } as any }
  );
  const writeFile = useWriteFile();

  useEffect(() => {
    if (fileContent?.content !== undefined) {
      setEditorContent(fileContent.content);
      setIsSaved(null);
    }
  }, [fileContent]);

  useEffect(() => {
    if (initialFile) setSelectedFile(initialFile);
  }, [initialFile]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleEditorMount = (editor: unknown) => {
    editorRef.current = editor as typeof editorRef.current;
    (editor as { onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => void })
      .onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
        setCursor({ line: e.position.lineNumber, col: e.position.column });
      });
  };

  const handleSave = () => {
    if (!selectedFile) return;
    const val = editorRef.current?.getValue() ?? editorContent;
    writeFile.mutate({ data: { path: selectedFile, content: val } }, {
      onSuccess: () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(null), 2000);
      },
      onError: (err) => {
        toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
        setIsSaved(false);
      },
    });
  };

  const fileName = selectedFile?.split("/").pop() ?? null;
  const fileDir = selectedFile && fileName ? selectedFile.slice(0, selectedFile.length - fileName.length - 1) || "/" : "/";
  const language = fileContent?.language ?? "plaintext";
  const langColor = LANG_COLORS[language] ?? LANG_COLORS.plaintext;

  const treeBreadcrumb = treePath === "/" ? ["/"] : ["/" , ...treePath.split("/").filter(Boolean)];

  return (
    <div className="h-full flex overflow-hidden bg-[#1e1e1e]">
      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? "w-52" : "w-0"} transition-all duration-200 flex flex-col border-l border-[#2d2d2d] bg-[#1e1e1e] overflow-hidden shrink-0`}>
        {/* Breadcrumb */}
        <div className="px-2 py-2 border-b border-[#2d2d2d] bg-[#252526]">
          <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-wrap" dir="ltr">
            {treeBreadcrumb.map((seg, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="w-2.5 h-2.5 opacity-50" />}
                <button
                  className="hover:text-gray-300 transition-colors"
                  onClick={() => {
                    if (i === 0) setTreePath("/");
                    else setTreePath("/" + treeBreadcrumb.slice(1, i + 1).join("/"));
                  }}
                >{seg}</button>
              </span>
            ))}
          </div>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {treePath !== "/" && (
            <button
              className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[#2d2d2d] text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => { const p = treePath.split("/").filter(Boolean); p.pop(); setTreePath("/" + p.join("/")); }}
            >
              <span className="text-base">↩</span>
              <span dir="ltr">..</span>
            </button>
          )}
          {treeFiles?.map(f => (
            <button
              key={f.path}
              className={`w-full flex items-center gap-1.5 px-2 py-[5px] text-[11px] transition-colors group
                ${selectedFile === f.path
                  ? "bg-[#37373d] text-gray-100"
                  : "hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200"}`}
              onClick={() => {
                if (f.isDir) { setTreePath(f.path); }
                else { setSelectedFile(f.path); setEditorContent(""); setIsSaved(null); }
              }}
            >
              {f.isDir
                ? <FolderIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                : <span className="text-[13px] leading-none shrink-0">{fileEmoji(f.name)}</span>
              }
              <span className="truncate" dir="ltr">{f.name}</span>
              {f.isDir && <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Editor area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 flex items-center gap-1 px-2 bg-[#252526] border-b border-[#2d2d2d] shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-[#3c3c3c] transition-colors"
            title="تبديل الشريط الجانبي"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* File tab */}
          {fileName ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs font-mono max-w-[300px]">
              <span className="text-sm leading-none">{fileEmoji(fileName)}</span>
              <span className="text-gray-500 truncate" dir="ltr">{fileDir}/</span>
              <span className="text-gray-200 truncate" dir="ltr">{fileName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 text-xs text-gray-600">
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>اختر ملفاً</span>
            </div>
          )}

          <div className="flex-1" />

          {fileName && (
            <Badge variant="outline" className={`text-[10px] border ${langColor}`}>{language}</Badge>
          )}

          <Button
            size="sm"
            className={`h-7 text-xs px-3 gap-1.5 transition-all ${isSaved === true ? "bg-green-600 hover:bg-green-700" : ""}`}
            onClick={handleSave}
            disabled={!selectedFile || writeFile.isPending}
          >
            {isSaved === true
              ? <><Check className="w-3.5 h-3.5" /> محفوظ</>
              : <><Save className="w-3.5 h-3.5" /> حفظ</>
            }
          </Button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden" dir="ltr">
          {isLoading && (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          {!isLoading && !selectedFile && (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center">
                <FilePlus2 className="w-8 h-8 opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">اختر ملفاً من الشريط الجانبي</p>
                <p className="text-xs text-gray-700 mt-1">أو افتح ملفاً من قسم الملفات</p>
              </div>
              <div className="flex gap-3 text-[10px] text-gray-700 mt-2">
                <span className="flex items-center gap-1"><kbd className="bg-[#2d2d2d] px-1.5 py-0.5 rounded border border-[#444] font-mono">Ctrl</kbd> + <kbd className="bg-[#2d2d2d] px-1.5 py-0.5 rounded border border-[#444] font-mono">S</kbd> للحفظ</span>
              </div>
            </div>
          )}
          {!isLoading && selectedFile && fileContent && !fileContent.isText && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
              <AlertCircle className="w-10 h-10 text-red-500/50" />
              <p className="text-sm">لا يمكن عرض هذا الملف — ملف ثنائي</p>
            </div>
          )}
          {!isLoading && selectedFile && (fileContent?.isText !== false) && (
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={editorContent}
              onChange={(val) => { setEditorContent(val ?? ""); setIsSaved(null); }}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "line",
                automaticLayout: true,
                tabSize: 2,
                bracketPairColorization: { enabled: true },
                renderWhitespace: "selection",
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                lineDecorationsWidth: 4,
                overviewRulerBorder: false,
              }}
            />
          )}
        </div>

        {/* Status bar */}
        <div className="h-6 flex items-center px-3 gap-4 bg-[#007acc] shrink-0 text-[10px] text-white/90" dir="ltr">
          {selectedFile && (
            <>
              <span>{language}</span>
              <span className="opacity-60">|</span>
              <span>Ln {cursor.line}, Col {cursor.col}</span>
              <span className="opacity-60">|</span>
              <span>UTF-8</span>
              {writeFile.isPending && <span className="opacity-70 animate-pulse ml-auto">حفظ...</span>}
            </>
          )}
          {!selectedFile && <span className="opacity-60">Host.X Editor</span>}
        </div>
      </div>
    </div>
  );
}
