import { useState } from "react";
import DashboardHeader from "@/components/dashboard-header";
import LeadStatistics from "@/components/lead-statistics";
import LeadTable from "@/components/lead-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleExport = () => {
    // Export functionality is handled in the DashboardHeader component
  };

  const handleFilter = () => {
    setFilterDialogOpen(true);
  };

  const applyFilters = () => {
    setFilterDialogOpen(false);
    // Any additional filtering logic can go here
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
      <DashboardHeader 
        onSearch={handleSearch} 
        onExport={handleExport} 
        onFilter={handleFilter} 
      />
      
      <LeadStatistics />
      
      <LeadTable searchQuery={searchQuery} statusFilter={statusFilter} />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Leads</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down your lead list.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tag-filter">Tag</Label>
              <Select>
                <SelectTrigger id="tag-filter">
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="Hot Lead">Hot Lead</SelectItem>
                  <SelectItem value="Demo Needed">Demo Needed</SelectItem>
                  <SelectItem value="Tech Summit">Tech Summit</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="assigned-filter">Assigned To</Label>
              <Select>
                <SelectTrigger id="assigned-filter">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="user-1">Sarah Thompson</SelectItem>
                  <SelectItem value="user-2">Michael Rodriguez</SelectItem>
                  <SelectItem value="user-3">Jessica Chen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
