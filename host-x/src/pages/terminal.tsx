import { useState, useRef, useEffect, useCallback } from "react";
import { useExecuteCommand, useListFiles, useAiChat } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Download, Play, X, FolderOpen, ChevronRight, ArrowLeft, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type OutputLine = { id: number; type: "cmd" | "out" | "err" | "ai" | "sys"; text: string };

const PKG_FILES: Record<string, { cmd: string; label: string }> = {
  "requirements.txt": { cmd: "python3 -m pip install -r requirements.txt", label: "pip" },
  "Pipfile":           { cmd: "pipenv install",                              label: "pipenv" },
  "pyproject.toml":   { cmd: "python3 -m pip install -e .",                 label: "pip" },
  "package.json":     { cmd: "npm install",                                  label: "npm" },
  "composer.json":    { cmd: "composer install",                             label: "composer" },
};

const RUN_EXT: Record<string, (f: string) => string> = {
  py:  (f) => `python3 ${f}`,
  js:  (f) => `node ${f}`,
  ts:  (f) => `npx ts-node ${f}`,
  php: (f) => `php ${f}`,
  sh:  (f) => `bash ${f}`,
  rb:  (f) => `ruby ${f}`,
};

let _id = 0;
const uid = () => ++_id;

export default function Terminal() {
  const [output, setOutput] = useState<OutputLine[]>([
    { id: uid(), type: "sys", text: "SERVER HUB Terminal — اضغط في أي مكان للكتابة | ↑↓ السجل | Ctrl+C إلغاء | Ctrl+L مسح" }
  ]);
  const [currentCmd, setCurrentCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isRunOpen, setIsRunOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [runPath, setRunPath] = useState("/");
  const [customRun, setCustomRun] = useState("");
  const [fixingId, setFixingId] = useState<number | null>(null);
  const isSubmitting = useRef(false);

  const execCmd = useExecuteCommand();
  const aiChat = useAiChat();
  const { data: rootFiles } = useListFiles({ path: "/" });
  const { data: runFiles } = useListFiles({ path: runPath });
  const { toast } = useToast();

  const endRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, currentCmd]);

  const focus = useCallback(() => {
    hiddenRef.current?.focus({ preventScroll: true });
  }, []);

  // Auto-focus on mount
  useEffect(() => { focus(); }, [focus]);

  const pushLine = useCallback((line: Omit<OutputLine, "id">) => {
    setOutput(prev => [...prev, { ...line, id: uid() }]);
  }, []);

  const run = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setHistory(h => [trimmed, ...h.filter(c => c !== trimmed)]);
    setHistIdx(-1);
    pushLine({ type: "cmd", text: trimmed });

    execCmd.mutate({ data: { command: trimmed } }, {
      onSuccess: (res) => {
        const out = (res.output || "").trim();
        const err = (res.error || "").trim();
        if (out) pushLine({ type: res.success ? "out" : "err", text: out });
        if (err && err !== out) pushLine({ type: "err", text: err });
        if (!out && !err) pushLine({ type: "out", text: "(لا يوجد مخرجات)" });
        isSubmitting.current = false;
      },
      onError: (err) => {
        pushLine({ type: "err", text: err.message });
        isSubmitting.current = false;
      }
    });
  }, [execCmd, pushLine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = currentCmd;
      setCurrentCmd("");
      run(cmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (next >= 0) setCurrentCmd(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setCurrentCmd(next === -1 ? "" : history[next] ?? "");
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      if (currentCmd) pushLine({ type: "sys", text: `${currentCmd} ^C` });
      setCurrentCmd("");
      setHistIdx(-1);
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setOutput([{ id: uid(), type: "sys", text: "تم مسح الشاشة" }]);
    }
  };

  const handleFixWithAi = (errText: string, lineId: number) => {
    setFixingId(lineId);
    aiChat.mutate({
      data: {
        message: `في هذا الخطأ، ساعدني في إصلاحه وأعطني الأمر الصحيح:\n\`\`\`\n${errText}\n\`\`\``,
        history: []
      }
    }, {
      onSuccess: (res) => {
        pushLine({ type: "ai", text: res.reply });
        setFixingId(null);
      },
      onError: () => {
        toast({ title: "خطأ في الاتصال بالـ AI", variant: "destructive" });
        setFixingId(null);
      }
    });
  };

  const pkgFiles = rootFiles?.filter(f => !f.isDir && f.name in PKG_FILES) ?? [];

  const handleRunFile = (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const cmdFn = RUN_EXT[ext];
    const cmd = cmdFn ? cmdFn(filePath) : `bash ${filePath}`;
    setIsRunOpen(false);
    setRunPath("/");
    run(cmd);
  };

  const handleCustomRun = () => {
    if (!customRun.trim()) return;
    setIsRunOpen(false);
    run(customRun);
    setCustomRun("");
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c]" dir="ltr">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border-b border-[#2a2a2a] shrink-0">
        <span className="text-xs text-green-400 font-mono ml-auto font-semibold">root@serverhub:~#</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-[#333] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            onClick={() => setIsInstallOpen(true)}
          >
            <Download className="w-3.5 h-3.5" />
            تثبيت مكاتب
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-[#333] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            onClick={() => setIsRunOpen(true)}
          >
            <Play className="w-3.5 h-3.5" />
            تشغيل ملف
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-gray-600 hover:text-gray-300"
            onClick={() => setOutput([{ id: uid(), type: "sys", text: "تم المسح" }])}
            title="مسح"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal area — full clickable */}
      <div
        className="flex-1 overflow-y-auto p-3 cursor-text"
        onClick={focus}
      >
        <div className="font-mono text-[13px] space-y-[2px] min-h-full">
          {output.map((line) => (
            <div key={line.id} className="group relative">
              {line.type === "cmd" && (
                <div className="flex gap-2 items-start">
                  <span className="text-green-500 shrink-0 text-xs leading-[1.6]">root@serverhub:~#</span>
                  <span className="text-white break-all">{line.text}</span>
                </div>
              )}
              {line.type === "out" && (
                <div className="text-gray-300 whitespace-pre-wrap text-xs leading-relaxed pr-2 border-l border-gray-800">{line.text}</div>
              )}
              {line.type === "err" && (
                <div className="text-red-400 whitespace-pre-wrap text-xs leading-relaxed pr-2 border-l border-red-800 relative">
                  {line.text}
                  <button
                    className="mt-1 flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleFixWithAi(line.text, line.id); }}
                    disabled={fixingId !== null}
                  >
                    {fixingId === line.id ? (
                      <span className="animate-pulse">AI يحلل...</span>
                    ) : (
                      <><Wrench className="w-2.5 h-2.5" /> إصلاح بالـ AI</>
                    )}
                  </button>
                </div>
              )}
              {line.type === "ai" && (
                <div className="text-purple-300 whitespace-pre-wrap text-xs leading-relaxed pr-2 border-l-2 border-purple-600">{line.text}</div>
              )}
              {line.type === "sys" && (
                <div className="text-gray-600 text-xs italic">{line.text}</div>
              )}
            </div>
          ))}

          {/* Executing indicator */}
          {execCmd.isPending && (
            <div className="flex gap-1.5 pl-2 text-gray-600 text-xs">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </div>
          )}

          {/* Current input line (inline cursor) */}
          <div className="flex gap-2 items-start" onClick={focus}>
            <span className="text-green-500 shrink-0 text-xs leading-[1.6]">root@serverhub:~#</span>
            <span className="text-white break-all">
              {currentCmd}
              <span
                className="inline-block w-[2px] h-[14px] bg-green-400 align-middle ml-[1px] translate-y-[-1px]"
                style={{ animation: "blink 1s step-end infinite" }}
              />
            </span>
          </div>
        </div>
        <div ref={endRef} />
      </div>

      {/* Hidden input captures all keystrokes */}
      <input
        ref={hiddenRef}
        value={currentCmd}
        onChange={(e) => setCurrentCmd(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 pointer-events-none w-0 h-0 top-0 left-0"
        autoComplete="off"
        spellCheck={false}
        aria-hidden="true"
        onBlur={() => setTimeout(focus, 50)}
      />

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Install Libraries Dialog */}
      <Dialog open={isInstallOpen} onOpenChange={setIsInstallOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              تثبيت المكاتب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {pkgFiles.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">اختر ملف المكاتب لتثبيت تبعياتها:</p>
                {pkgFiles.map(f => {
                  const info = PKG_FILES[f.name];
                  return (
                    <button
                      key={f.path}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-muted/20 hover:bg-accent hover:border-primary/40 transition-colors group"
                      onClick={() => { setIsInstallOpen(false); run(info.cmd); }}
                    >
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 text-right min-w-0">
                        <div className="text-sm font-medium" dir="ltr">{f.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{info.cmd}</div>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{info.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لم يُعثر على ملفات مكاتب</p>
                <p className="text-xs mt-1 opacity-60">ارفع requirements.txt أو package.json أو composer.json</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Run File Dialog */}
      <Dialog open={isRunOpen} onOpenChange={(v) => { setIsRunOpen(v); if (!v) setRunPath("/"); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-4 h-4 text-green-500" />
              تشغيل ملف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* File browser */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-muted-foreground flex-1">اختر ملفاً للتشغيل:</p>
                {runPath !== "/" && (
                  <button
                    className="flex items-center gap-1 text-xs text-primary"
                    onClick={() => { const p = runPath.split("/").filter(Boolean); p.pop(); setRunPath("/" + p.join("/")); }}
                  >
                    <ArrowLeft className="w-3 h-3" /> رجوع
                  </button>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-muted/10">
                {runFiles?.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">المجلد فارغ</div>
                )}
                {runFiles?.map(f => (
                  <button
                    key={f.path}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm transition-colors border-b border-border/50 last:border-0"
                    onClick={() => f.isDir ? setRunPath(f.path) : handleRunFile(f.path)}
                    dir="ltr"
                  >
                    {f.isDir
                      ? <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      : <Play className="w-4 h-4 text-green-500 shrink-0" />
                    }
                    <span className="truncate flex-1 text-left">{f.name}</span>
                    {f.isDir && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-1">أو أمر مخصص</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary font-mono"
                value={customRun}
                onChange={e => setCustomRun(e.target.value)}
                placeholder="python3 app.py"
                dir="ltr"
                onKeyDown={e => e.key === "Enter" && handleCustomRun()}
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={handleCustomRun} disabled={!customRun.trim()}>
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
