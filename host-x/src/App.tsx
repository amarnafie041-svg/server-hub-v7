import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Files from "@/pages/files";
import Editor from "@/pages/editor";
import Terminal from "@/pages/terminal";
import AiAssistant from "@/pages/ai";
import Processes from "@/pages/processes";
import Subdomains from "@/pages/subdomains";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/files">
        <AppLayout><Files /></AppLayout>
      </Route>
      <Route path="/editor">
        <AppLayout><Editor /></AppLayout>
      </Route>
      <Route path="/terminal">
        <AppLayout><Terminal /></AppLayout>
      </Route>
      <Route path="/ai">
        <AppLayout><AiAssistant /></AppLayout>
      </Route>
      <Route path="/processes">
        <AppLayout><Processes /></AppLayout>
      </Route>
      <Route path="/subdomains">
        <AppLayout><Subdomains /></AppLayout>
      </Route>
      <Route path="/settings">
        <AppLayout><Settings /></AppLayout>
      </Route>
      <Route path="/:rest*">
        <AppLayout><NotFound /></AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
