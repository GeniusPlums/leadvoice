import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { cn, getStatusColor } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

const RecentLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);

  // Fetch recent leads
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/leads/recent'],
  });

  // Load offline leads if online query fails
  useEffect(() => {
    if (error || (data && data.length === 0)) {
      const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
      if (offlineLeads.length > 0) {
        setLeads(offlineLeads.slice(0, 5));
      }
    } else if (data) {
      setLeads(data);
    }
  }, [data, error]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Leads</CardTitle>
          <a href="/dashboard" className="text-sm text-primary hover:text-primary/80">View all</a>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="py-4 text-center text-neutral-500">Loading recent leads...</div>
        ) : leads.length > 0 ? (
          leads.map((lead, index) => (
            <div 
              key={lead.id} 
              className={cn(
                "pt-4 mt-2 first:border-t-0 first:pt-0 first:mt-0",
                index !== 0 && "border-t border-gray-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-800">{lead.firstName} {lead.lastName}</p>
                  <p className="text-sm text-neutral-600">{lead.title}{lead.company ? `, ${lead.company}` : ''}</p>
                  <p className="text-sm text-neutral-500 mt-1">{lead.email} • {lead.phone || 'No phone'}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  getStatusColor(lead.status).bg,
                  getStatusColor(lead.status).text
                )}>
                  {lead.status}
                </span>
              </div>
              <div className="mt-2 flex items-center text-sm text-neutral-500">
                <CalendarDays className="h-4 w-4 mr-1" />
                Captured {formatTimeAgo(lead.createdAt)}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-neutral-500">
            <p>No recent leads found</p>
            <p className="text-sm mt-1">Capture a lead to see it here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentLeads;
