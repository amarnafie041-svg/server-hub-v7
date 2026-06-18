import { z } from "zod";

export const LoginBody = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const RegisterBody = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const ExecuteCommandBody = z.object({
  command: z.string().min(1).max(5000),
  workingDir: z.string().optional(),
});

export const InstallPackageBody = z.object({
  packageManager: z.enum(["pip", "npm", "composer", "apt"]),
  packages: z.array(z.string().min(1).max(100)).min(1).max(20),
});

export const StartProcessBody = z.object({
  name: z.string().min(1).max(100),
  command: z.string().min(1).max(500),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export const ListFilesQueryParams = z.object({
  path: z.string().optional(),
});

export const ReadFileQueryParams = z.object({
  path: z.string().min(1),
});

export const WriteFileBody = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const DeleteFileQueryParams = z.object({
  path: z.string().min(1),
});

export const CreateDirectoryBody = z.object({
  path: z.string().min(1),
});

export const RenameFileBody = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

export const UploadFileBody = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const TouchFileBody = z.object({
  path: z.string().min(1),
});

export const CreateSubdomainBody = z.object({
  subdomain: z.string().min(1).max(63).regex(/^[a-zA-Z0-9-]+$/),
  targetPath: z.string().min(1),
  type: z.enum(["nodejs", "python", "php", "html"]),
});

export const DeleteSubdomainParams = z.object({
  subdomainId: z.coerce.number().int().positive(),
});

export const UpdateSettingsBody = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().optional(),
});

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(100),
});

export const AiChatBody = z.object({
  message: z.string().min(1).max(10000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export const AnalyzeFileBody = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const HealthCheckResponse = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
});