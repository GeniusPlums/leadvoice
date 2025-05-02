import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Mic, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Switch } from "@/components/ui/switch";
import { LayoutDashboard, Users, Settings } from "lucide-react";

const MobileHeader = () => {
  const [location] = useLocation();
  const { highContrast, toggleHighContrast } = useTheme();
  const [online, setOnline] = useState(navigator.onLine);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between h-16 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open sidebar menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
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
                      id="mobile-high-contrast-toggle" 
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
          </SheetContent>
        </Sheet>

        <h1 className="text-xl font-semibold text-primary">
          <Mic className="inline-block mr-1" />
          LeadVoice
        </h1>

        <Button variant="ghost" size="icon">
          <User className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default MobileHeader;
