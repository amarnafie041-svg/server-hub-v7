import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { AiChatBody, AnalyzeFileBody } from "@workspace/api-zod";
import https from "https";
import path from "path";
import os from "os";
import fs from "fs";

const router: IRouter = Router();

const NVIDIA_API_KEY = "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";
const NVIDIA_BASE = "integrate.api.nvidia.com";

async function callAI(messages: { role: string; content: string }[], model = "openai/gpt-oss-20b"): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    });
    const options = {
      hostname: NVIDIA_BASE,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content ?? "لم أتمكن من الرد.");
        } catch {
          reject(new Error("Failed to parse AI response"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(body);
    req.end();
  });
}

router.post("/ai/chat", requireAuth, async (req, res) => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { message, history } = parsed.data;
  const messages = [
    {
      role: "system",
      content: "أنت مساعد ذكي متخصص في لوحة تحكم Host.X لاستضافة المواقع والبوتات. لديك خبرة في Python, Node.js, PHP, HTML/CSS/JS. أجب باللغة العربية ما لم يطلب المستخدم غير ذلك."
    },
    ...(history ?? []).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
    { role: "user", content: message }
  ];
  try {
    const reply = await callAI(messages);
    res.json({ reply, model: "GPT-OSS 20B" });
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    res.json({ reply: "⚠️ خطأ في الاتصال بالذكاء الاصطناعي. جرب مرة أخرى.", model: null });
  }
});

router.post("/ai/analyze-file", requireAuth, async (req, res) => {
  const parsed = AnalyzeFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { path: filePath } = parsed.data;
  const username = req.session.username!;
  const base = process.env.USER_FILES_DIR ?? path.join(os.homedir(), "hostx-files");
  const userDir = path.join(base, username);
  const fullPath = path.resolve(path.join(userDir, filePath));
  if (!fullPath.startsWith(userDir)) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    let content = "";
    if (fs.existsSync(fullPath)) {
      content = fs.readFileSync(fullPath, "utf-8").slice(0, 3000);
    }
    const ext = path.extname(filePath).toLowerCase();
    const messages = [
      { role: "system", content: "أنت خبير في البرمجة. حلل الكود المقدم وأعطِ تحليلاً مفيداً باللغة العربية." },
      { role: "user", content: `حلل هذا الملف (${filePath}):\n\n\`\`\`${ext.slice(1)}\n${content}\n\`\`\`\n\nأخبرني:\n1. وظيفة الملف\n2. المكتبات/الحزم المطلوبة\n3. الأخطاء المحتملة\n4. طريقة التشغيل\n5. نصائح للتحسين` }
    ];
    const reply = await callAI(messages, "google/gemma-4-31b-it");
    res.json({ reply, model: "Gemma 4 31B" });
  } catch (err) {
    req.log.error({ err }, "Analyze file error");
    res.json({ reply: "⚠️ خطأ في تحليل الملف. جرب مرة أخرى.", model: null });
  }
});

export default router;
