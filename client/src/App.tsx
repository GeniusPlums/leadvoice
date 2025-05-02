import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./hooks/use-theme";
import { Toaster } from "@/components/ui/toaster";
import LeadCapture from "@/pages/lead-capture";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import MobileHeader from "@/components/mobile-header";

function App() {
  const [location] = useLocation();
  
  // Check if the current location is a valid page
  const isValidRoute = ['/', '/dashboard'].includes(location);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 w-0 overflow-hidden">
            <MobileHeader />
            <main className="flex-1 relative overflow-y-auto focus:outline-none pt-0 md:pt-0">
              <Switch>
                <Route path="/" component={LeadCapture} />
                <Route path="/dashboard" component={Dashboard} />
                {!isValidRoute && <Route component={NotFound} />}
              </Switch>
            </main>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
