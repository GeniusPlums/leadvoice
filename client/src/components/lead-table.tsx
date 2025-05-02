import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor, getTagColor } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  tags: string[];
  assignedTo: string | null;
  createdAt: string;
}

interface SalesTeamMember {
  id: string;
  name: string;
}

interface LeadTableProps {
  searchQuery: string;
  statusFilter: string;
}

const LeadTable = ({ searchQuery, statusFilter }: LeadTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads data
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/leads', currentPage, pageSize, searchQuery, statusFilter],
  });

  // Fetch sales team data
  const { data: salesTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['/api/sales-team'],
  });

  useEffect(() => {
    if (leadsData?.totalPages) {
      setTotalPages(leadsData.totalPages);
    }
  }, [leadsData]);

  // Mutation for updating lead assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ leadId, salesPersonId }: { leadId: string, salesPersonId: string }) => {
      return apiRequest('PATCH', `/api/leads/${leadId}/assign`, { assignedTo: salesPersonId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Assignment Updated",
        description: "The lead has been successfully assigned.",
      });
    },
    onError: (error) => {
      console.error("Error assigning lead:", error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign the lead. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAssign = (leadId: string, salesPersonId: string) => {
    updateAssignmentMutation.mutate({ leadId, salesPersonId });
  };

  // Handle page changes
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    
    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink 
          onClick={() => goToPage(1)} 
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <span className="px-4 py-2">...</span>
        </PaginationItem>
      );
    }
    
    // Show nearby pages
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i > 1 && i < totalPages) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              onClick={() => goToPage(i)} 
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis2">
          <span className="px-4 py-2">...</span>
        </PaginationItem>
      );
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => goToPage(totalPages)} 
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <Card className="mt-8">
      <CardHeader className="px-6 py-5 border-b border-gray-200">
        <CardTitle>Lead Assignment</CardTitle>
        <CardDescription>
          Assign leads to your sales team members for follow-up
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-1/4">Lead</TableHead>
              <TableHead className="w-1/6">Contact</TableHead>
              <TableHead className="w-1/12">Status</TableHead>
              <TableHead className="w-1/6">Tags</TableHead>
              <TableHead className="w-1/6">Assigned To</TableHead>
              <TableHead className="w-1/12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : leadsData?.leads && leadsData.leads.length > 0 ? (
              leadsData.leads.map((lead: Lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                      <div className="text-sm text-neutral-500">{lead.title} at {lead.company}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{lead.email}</div>
                    <div className="text-sm text-neutral-500">{lead.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-xs",
                      getStatusColor(lead.status).bg,
                      getStatusColor(lead.status).text,
                      "bg-opacity-50 hover:bg-opacity-50"
                    )}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags && lead.tags.map((tag, index) => (
                        <Badge 
                          key={`${lead.id}-${tag}-${index}`}
                          className={cn(
                            "text-xs",
                            getTagColor(tag).bg,
                            getTagColor(tag).text,
                            "bg-opacity-50 hover:bg-opacity-50"
                          )}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={lead.assignedTo || "unassigned"} 
                      onValueChange={(value) => handleAssign(lead.id, value)}
                      disabled={updateAssignmentMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {!teamLoading && salesTeam && salesTeam.map((member: SalesTeamMember) => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <a href={`/lead/${lead.id}`} className="text-primary hover:text-primary/80 mr-3">Edit</a>
                    <a href={`/lead/${lead.id}`} className="text-primary hover:text-primary/80">View</a>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No leads found. Try adjusting your search or filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <CardContent className="px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            Showing <span className="font-medium">{leadsData?.startItem || 0}</span> to{" "}
            <span className="font-medium">{leadsData?.endItem || 0}</span> of{" "}
            <span className="font-medium">{leadsData?.totalItems || 0}</span> results
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage === totalPages || totalPages === 0}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadTable;
