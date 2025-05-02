import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Switch } from "@/components/ui/switch";
import { Mic, LayoutDashboard, Users, Settings, LightbulbIcon } from "lucide-react";
import { isOffline } from "@/lib/utils";
import { useState, useEffect } from "react";

const Sidebar = () => {
  const [location] = useLocation();
  const { highContrast, toggleHighContrast } = useTheme();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update online status when it changes
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-primary">
            <Mic className="inline-block mr-2" />
            LeadVoice
          </h1>
        </div>
        <div className="flex flex-col flex-grow px-4 py-4">
          <nav className="flex-1 space-y-1">
            <Link href="/">
              <a
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === "/" 
                    ? "bg-primary text-white" 
                    : "text-neutral-700 hover:text-primary hover:bg-gray-50"
                )}
                aria-current={location === "/" ? "page" : undefined}
              >
                <Mic className="mr-3 h-6 w-6" />
                Lead Capture
              </a>
            </Link>
            <Link href="/dashboard">
              <a
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === "/dashboard" 
                    ? "bg-primary text-white" 
                    : "text-neutral-700 hover:text-primary hover:bg-gray-50"
                )}
                aria-current={location === "/dashboard" ? "page" : undefined}
              >
                <LayoutDashboard className="mr-3 h-6 w-6" />
                Dashboard
              </a>
            </Link>
            <Link href="/dashboard">
              <a className="flex items-center px-2 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-gray-50 rounded-md">
                <Users className="mr-3 h-6 w-6" />
                Leads
              </a>
            </Link>
            <Link href="/settings">
              <a className="flex items-center px-2 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-gray-50 rounded-md">
                <Settings className="mr-3 h-6 w-6" />
                Settings
              </a>
            </Link>
          </nav>
          <div className="mt-auto">
            <div className="flex items-center space-x-2 py-2">
              <span className="text-sm text-neutral-700">High Contrast</span>
              <Switch 
                id="high-contrast-toggle" 
                checked={highContrast} 
                onCheckedChange={toggleHighContrast}
                aria-label="Toggle high contrast mode"
              />
            </div>
            
            {/* Connection Status Indicator */}
            <div className="flex items-center mt-2">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
              <span className="text-sm text-neutral-700">{online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
