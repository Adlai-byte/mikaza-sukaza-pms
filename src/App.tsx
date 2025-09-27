import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Jobs from "./pages/Jobs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/calendar" element={<div className="p-8 text-center text-muted-foreground">Calendar - Coming Soon</div>} />
            <Route path="/todos" element={<div className="p-8 text-center text-muted-foreground">To-Do List - Coming Soon</div>} />
            <Route path="/issues" element={<div className="p-8 text-center text-muted-foreground">Issues & Photos - Coming Soon</div>} />
            <Route path="/documents/*" element={<div className="p-8 text-center text-muted-foreground">Documents - Coming Soon</div>} />
            <Route path="/finance/*" element={<div className="p-8 text-center text-muted-foreground">Finance - Coming Soon</div>} />
            <Route path="/media" element={<div className="p-8 text-center text-muted-foreground">Media - Coming Soon</div>} />
            <Route path="/highlights" element={<div className="p-8 text-center text-muted-foreground">Highlights - Coming Soon</div>} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
