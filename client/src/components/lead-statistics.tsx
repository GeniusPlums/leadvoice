import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StatCardProps {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatCard = ({ title, value, change, icon, iconBg, iconColor }: StatCardProps) => {
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBg} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-neutral-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-neutral-900">{value}</div>
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="sr-only">{change >= 0 ? 'Increased' : 'Decreased'} by</span>
                  {Math.abs(change)}%
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LeadStatistics = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/leads/stats'],
  });

  // Default values if data is not available
  const defaultStats = {
    totalLeads: { count: 0, change: 0 },
    contactedLeads: { count: 0, change: 0 },
    pendingLeads: { count: 0, change: 0 },
    hotLeads: { count: 0, change: 0 }
  };

  const loadedStats = stats || defaultStats;

  if (isLoading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads"
        value={loadedStats.totalLeads.count}
        change={loadedStats.totalLeads.change}
        icon={<Users className="text-blue-600" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      
      <StatCard
        title="Contacted"
        value={loadedStats.contactedLeads.count}
        change={loadedStats.contactedLeads.change}
        icon={<CheckCircle className="text-green-600" />}
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />
      
      <StatCard
        title="Pending"
        value={loadedStats.pendingLeads.count}
        change={loadedStats.pendingLeads.change}
        icon={<Clock className="text-yellow-600" />}
        iconBg="bg-yellow-100"
        iconColor="text-yellow-600"
      />
      
      <StatCard
        title="Hot Leads"
        value={loadedStats.hotLeads.count}
        change={loadedStats.hotLeads.change}
        icon={<AlertCircle className="text-red-600" />}
        iconBg="bg-red-100"
        iconColor="text-red-600"
      />
    </div>
  );
};

export default LeadStatistics;
