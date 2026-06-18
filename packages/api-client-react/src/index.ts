import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL || window.location.origin + "/api";

async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers as Record<string, string> },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ───── Auth ───── */
export function useLogin() {
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      api<{ token: string; user: { id: string; username: string; email: string; role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { username: string; email: string; password: string }) =>
      api<{ token: string; user: { id: string; username: string; email: string; role: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useGetMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ id: string; username: string; email: string; role: string }>("/auth/me"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  return useMutation({
    mutationFn: () => api<{ success: boolean }>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });
}

/* ───── Dashboard ───── */
export function useGetDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      api<{
        files: number;
        processes: number;
        subdomains: number;
        activity: Array<{ id: string; action: string; target?: string; type: string; createdAt: string }>;
        disk: { used: string; total: string; percent: number };
      }>("/dashboard/stats"),
  });
}

/* ───── Terminal ───── */
export function useExecuteCommand() {
  return useMutation({
    mutationFn: (body: { data: { command: string; workingDir?: string } }) =>
      api<{ success: boolean; output: string; error?: string | null; exitCode: number }>("/terminal/execute", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

export function useInstallPackage() {
  return useMutation({
    mutationFn: (body: { packageManager: string; packages: string[] }) =>
      api<{ success: boolean; output: string; exitCode: number }>("/terminal/install", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

/* ───── Files ───── */
export function useListFiles(params?: { path?: string }) {
  const searchParams = params?.path ? `?path=${encodeURIComponent(params.path)}` : "";
  return useQuery({
    queryKey: ["files-list", params?.path],
    queryFn: () =>
      api<
        Array<{
          name: string;
          path: string;
          isDir: boolean;
          size: string | number;
          sizeBytes?: number;
          modified: string;
          ext?: string;
          icon?: string;
          language?: string | null;
        }>
      >(`/files/list${searchParams}`),
  });
}

export function useReadFile() {
  return useMutation({
    mutationFn: (body: { data: { path: string } }) =>
      api<{ path: string; content: string; language: string; isText: boolean }>(
        `/files/read?path=${encodeURIComponent(body.data.path)}`
      ),
  });
}

export function useWriteFile() {
  return useMutation({
    mutationFn: (body: { data: { path: string; content: string } }) =>
      api<{ success: boolean }>("/files/write", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: (path: string) =>
      api<{ success: boolean }>(`/files/delete?path=${encodeURIComponent(path)}`, { method: "DELETE" }),
  });
}

export function useCreateDirectory() {
  return useMutation({
    mutationFn: (body: { data: { path: string } }) =>
      api<{ success: boolean }>("/files/mkdir", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

export function useRenameFile() {
  return useMutation({
    mutationFn: (body: { data: { oldPath: string; newPath: string } }) =>
      api<{ success: boolean }>("/files/rename", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

export function useTouchFile() {
  return useMutation({
    mutationFn: (body: { data: { path: string } }) =>
      api<{ success: boolean }>("/files/touch", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

/* ───── AI ───── */
export function useAiChat() {
  return useMutation({
    mutationFn: (body: { data: { message: string; history?: Array<{ role: string; content: string }> } }) =>
      api<{ reply: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}

/* ───── Processes ───── */
export function useListProcesses() {
  return useQuery({
    queryKey: ["processes"],
    queryFn: () =>
      api<
        Array<{
          id: string;
          name: string;
          command: string;
          cwd?: string;
          status: string;
          pid?: number | null;
          port?: number | null;
          createdAt: string;
        }>
      >("/processes"),
  });
}

export function useStartProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { data: { name: string; command: string; cwd?: string } }) =>
      api<{ id: string; pid: number }>("/processes/start", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processes"] }),
  });
}

export function useStopProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>(`/processes/${id}/stop`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processes"] }),
  });
}

export function useRestartProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>(`/processes/${id}/restart`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processes"] }),
  });
}

export function useGetProcessLogs() {
  return useMutation({
    mutationFn: (id: string) =>
      api<{ logs: string }>(`/processes/${id}/logs`),
  });
}

/* ───── Subdomains ───── */
export function useListSubdomains() {
  return useQuery({
    queryKey: ["subdomains"],
    queryFn: () =>
      api<
        Array<{
          id: string;
          subdomain: string;
          targetPath: string;
          type: string;
          status: string;
          fullDomain: string;
          createdAt: string;
          userId: string;
        }>
      >("/subdomains"),
  });
}

export function useCreateSubdomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { data: { subdomain: string; targetPath: string; type: string } }) =>
      api<{ id: string; subdomain: string; fullDomain: string }>("/subdomains/create", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subdomains"] }),
  });
}

export function useDeleteSubdomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { subdomainId: number }) =>
      api<{ success: boolean }>(`/subdomains/${body.subdomainId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subdomains"] }),
  });
}

/* ───── Settings ───── */
export function useGetSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ theme: string; language: string }>("/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { data: { theme?: string; language?: string } }) =>
      api<{ success: boolean }>("/settings/update", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { data: { currentPassword: string; newPassword: string } }) =>
      api<{ success: boolean }>("/settings/change-password", {
        method: "POST",
        body: JSON.stringify(body.data),
      }),
  });
}