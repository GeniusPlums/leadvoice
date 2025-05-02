import { db } from "./index";
import * as schema from "@shared/schema";

async function seed() {
  try {
    console.log("Starting database seed...");

    // Check if sales team members already exist to avoid duplicates
    const existingTeamMembers = await db.select().from(schema.salesTeam).execute();
    
    if (existingTeamMembers.length === 0) {
      console.log("Seeding sales team members...");
      // Create sales team members
      await db.insert(schema.salesTeam).values([
        { 
          name: "Sarah Thompson", 
          email: "sarah.thompson@leadvoice.com", 
          role: "Sales Manager" 
        },
        { 
          name: "Michael Rodriguez", 
          email: "michael.rodriguez@leadvoice.com", 
          role: "Senior Sales Rep" 
        },
        { 
          name: "Jessica Chen", 
          email: "jessica.chen@leadvoice.com", 
          role: "Sales Rep" 
        }
      ]);
    } else {
      console.log(`Found ${existingTeamMembers.length} existing sales team members, skipping...`);
    }

    // Check if tags already exist
    const existingTags = await db.select().from(schema.tags).execute();
    
    if (existingTags.length === 0) {
      console.log("Seeding tags...");
      // Create common tags
      await db.insert(schema.tags).values([
        { name: "Hot Lead" },
        { name: "Demo Needed" },
        { name: "Tech Summit" },
        { name: "Follow-up" },
        { name: "Enterprise" }
      ]);
    } else {
      console.log(`Found ${existingTags.length} existing tags, skipping...`);
    }

    // Check if leads already exist
    const existingLeads = await db.select().from(schema.leads).execute();
    
    if (existingLeads.length === 0) {
      console.log("Seeding sample leads...");
      
      // Get sales team IDs
      const teamMembers = await db.select().from(schema.salesTeam).execute();
      const sarahId = teamMembers.find(member => member.name === "Sarah Thompson")?.id;
      const michaelId = teamMembers.find(member => member.name === "Michael Rodriguez")?.id;
      
      // Create sample leads
      const [johnSmith] = await db.insert(schema.leads).values({
        firstName: "John",
        lastName: "Smith",
        title: "Product Manager",
        company: "Acme Inc.",
        email: "john.smith@acme.com",
        phone: "(555) 123-4567",
        notes: "Met at Tech Summit 2023. Interested in a demo next week. Priority lead!",
        status: "New",
        eventName: "Tech Summit 2023"
      }).returning();
      
      const [sarahJohnson] = await db.insert(schema.leads).values({
        firstName: "Sarah",
        lastName: "Johnson",
        title: "Marketing Director",
        company: "XYZ Corp",
        email: "sarah@xyz.com",
        phone: "(555) 987-6543",
        notes: "Connected at the Tech Summit. Looking for marketing solutions.",
        status: "Assigned",
        assignedTo: sarahId,
        eventName: "Tech Summit 2023"
      }).returning();
      
      const [michaelTaylor] = await db.insert(schema.leads).values({
        firstName: "Michael",
        lastName: "Taylor",
        title: "CTO",
        company: "Innovation Labs",
        email: "m.taylor@innovlabs.com",
        phone: "(555) 555-1212",
        notes: "Enterprise prospect. Needs follow-up within 3 days.",
        status: "Contacted",
        assignedTo: michaelId,
        eventName: "Enterprise Connect 2023"
      }).returning();
      
      // Get tag IDs
      const allTags = await db.select().from(schema.tags).execute();
      const hotLeadId = allTags.find(tag => tag.name === "Hot Lead")?.id;
      const demoNeededId = allTags.find(tag => tag.name === "Demo Needed")?.id;
      const techSummitId = allTags.find(tag => tag.name === "Tech Summit")?.id;
      const followUpId = allTags.find(tag => tag.name === "Follow-up")?.id;
      const enterpriseId = allTags.find(tag => tag.name === "Enterprise")?.id;
      
      // Assign tags to leads
      if (hotLeadId && demoNeededId && techSummitId && followUpId && enterpriseId) {
        await db.insert(schema.leadTags).values([
          { leadId: johnSmith.id, tagId: hotLeadId },
          { leadId: johnSmith.id, tagId: demoNeededId },
          { leadId: sarahJohnson.id, tagId: techSummitId },
          { leadId: michaelTaylor.id, tagId: followUpId },
          { leadId: michaelTaylor.id, tagId: enterpriseId }
        ]);
      }
    } else {
      console.log(`Found ${existingLeads.length} existing leads, skipping...`);
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
