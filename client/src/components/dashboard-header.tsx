import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  onSearch: (query: string) => void;
  onExport: () => void;
  onFilter: () => void;
}

const DashboardHeader = ({ onSearch, onExport, onFilter }: DashboardHeaderProps) => {
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const response = await fetch('/api/leads/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: "Your leads have been exported to CSV.",
        });
      } else {
        throw new Error('Failed to export leads');
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: "Export Failed",
        description: "There was a problem exporting your leads.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="md:flex md:items-center md:justify-between mb-8">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-800">Lead Dashboard</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manage and allocate your leads across your sales team
        </p>
      </div>
      <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
        <div className="relative">
          <Input
            type="text"
            name="search"
            id="search"
            placeholder="Search leads..."
            className="pl-10"
            onChange={(e) => onSearch(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400 h-4 w-4" />
          </div>
        </div>
        <Button variant="outline" onClick={onFilter}>
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
