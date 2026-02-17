import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Project Neuron Program Hub...");

  // ── Clean ──────────────────────────────────────────
  await prisma.subTask.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.partnerInitiative.deleteMany();
  await prisma.partnerWorkstream.deleteMany();
  await prisma.initiativeDependency.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.initiative.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.person.deleteMany();
  await prisma.workstream.deleteMany();
  await prisma.program.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Users (10 seats) ──────────────────────────────────
  const hash = await bcrypt.hash("password123", 10);

  const TEAM_USERS = [
    { email: "admin@neuron.dev",    name: "Admin User",        role: "ADMIN"  },
    { email: "dq@neuron.dev",       name: "Dan Q.",            role: "ADMIN"  },
    { email: "jc@neuron.dev",       name: "Jacky C.",          role: "MEMBER" },
    { email: "ab@neuron.dev",       name: "Anita B.",          role: "MEMBER" },
    { email: "mk@neuron.dev",       name: "Mike K.",           role: "MEMBER" },
    { email: "sr@neuron.dev",       name: "Sara R.",           role: "MEMBER" },
    { email: "tl@neuron.dev",       name: "Tom L.",            role: "MEMBER" },
    { email: "np@neuron.dev",       name: "Nina P.",           role: "MEMBER" },
    { email: "rg@neuron.dev",       name: "Ryan G.",           role: "MEMBER" },
    { email: "lw@neuron.dev",       name: "Lisa W.",           role: "MEMBER" },
  ] as const;

  const admin = await prisma.user.create({
    data: { email: TEAM_USERS[0].email, name: TEAM_USERS[0].name, passwordHash: hash, role: TEAM_USERS[0].role },
  });
  for (const u of TEAM_USERS.slice(1)) {
    await prisma.user.create({
      data: { email: u.email, name: u.name, passwordHash: hash, role: u.role },
    });
  }
  console.log(`  ✅ ${TEAM_USERS.length} Users (all passwords: password123)`);

  // ── Program ────────────────────────────────────────
  const program = await prisma.program.create({
    data: {
      name: "Project Neuron",
      fyStartYear: 26,
      fyEndYear: 28,
      createdById: admin.id,
      mission: `Deliver a complete, end-to-end digital ecosystem that transforms how Eclipse Automation designs, builds, simulates, delivers, and supports custom automation.`,
      vision: `Architect a fully connected and contextualized digital environment of Eclipse facilities always representative of the current real world state where people and agents can collaborate on top of or within.`,
      successTenets: `• Faster ROM and quotation cycle with higher quality and improved client experience
• Increased proposal hit rate
• Parallelize controls commissioning with mechanical design
• All mechanical design data fully mirrored in USD
• Always connect to source of truth data
• Digitize everything
• All systems connected and contextualized
• Remove friction to collaboration amongst humans and agents
• BUILD MENTALITY`,
      objectives: `• USD ready machine as standard deliverable with all projects
• Production grade PDM connector and conversion service
• Applications engineering system configurator workflow as standard
• Production grade Solution Recall & USD Search Assistant
• Deliver version 1 of Omniverse virtual commissioning application
• Reality capture workflow in production for reverse GS & build capture
• NVIDIA Space at 485 fully operational
• Deliver Eclipse Virtual Assistant
• Client facing Proposal Portal
• Sales adding opportunities via Project Portal
• Project Portal 3D Viewport (Gaussian Splat + Omniverse USD Stage)
• Control Tower Portal MVP
• Mirsee humanoid robot use-case at Eclipse and Client pilot
• Production grade EPLAN connector
• Eclipse Project Assistant born at every opportunity inception
• Eclipse Operations Omniverse Application
• Large scale mechanical design review omniverse application
• Metropolis Machine build and operations solution
• ⭐ GOAL: Design & Build the Machine that Builds Machines ⭐`,
    },
  });
  console.log("  ✅ Program");

  // ── Workstreams ────────────────────────────────────
  const wsData = [
    { name: "Connectors", slug: "connectors", color: "#3b82f6", sortOrder: 1, targetCompletionDate: "November 2027", description: "Builds the data foundation required for Physical AI and digital twins by connecting critical systems across the enterprise. These integrations create a unified contextual data model that supports simulation, dashboards, and AI agents." },
    { name: "Kit Applications", slug: "kit-applications", color: "#8b5cf6", sortOrder: 2, targetCompletionDate: "November 2027", description: "Development of accelerated design and simulation applications used during engineering and client engagement using NVIDIA Omniverse Kit." },
    { name: "Web Platform", slug: "web-platform", color: "#06b6d4", sortOrder: 3, targetCompletionDate: "November 2028", description: "Builds centralized portals that unify project insight, proposals, and Neuron-powered intelligence for internal teams and clients. Built on Azure RedHat OpenShift containerization." },
    { name: "Artificial Intelligence", slug: "artificial-intelligence", color: "#f59e0b", sortOrder: 4, targetCompletionDate: "November 2028", description: "Development of AI assistants and intelligence layers that support engineering, project delivery, and client workflows. These systems support daily work, accelerate decision-making, and enable rapid reuse of organizational knowledge." },
    { name: "Omniverse Cloud (DGX + RTX)", slug: "omniverse-cloud", color: "#10b981", sortOrder: 5, targetCompletionDate: "November 2027", description: "Deployment and integration of cloud-based digital twin and simulation infrastructure using NVIDIA DGX Cloud. Enables high-fidelity streaming of industrial scenes to engineers, clients, and partners." },
    { name: "DevSecOps / Infra", slug: "devsecops-infra", color: "#6366f1", sortOrder: 6, targetCompletionDate: "November 2027", description: "Infrastructure preparation, Accenture to Eclipse transition of Azure environments, and DevOps pipeline transitions." },
    { name: "Internal Tools & Apps", slug: "internal-tools-apps", color: "#ec4899", sortOrder: 7, targetCompletionDate: "November 2028", description: "Internal applications built to solve specific Eclipse operational needs including Nuclear MTR, Built to Print, and various Eclipse AI Applications." },
    { name: "Mirsee Humanoid Robot", slug: "mirsee-humanoid", color: "#ef4444", sortOrder: 8, targetCompletionDate: "November 2028", description: "Collaborative partnership with Mirsee Robotics to test, validate, and refine humanoid robots inside real manufacturing environments. Includes manufacturing of robots, internal use-case identification, and client pilot projects." },
  ];

  const workstreams: Record<string, any> = {};
  for (const ws of wsData) {
    workstreams[ws.slug] = await prisma.workstream.create({
      data: { ...ws, programId: program.id, status: "IN_PROGRESS", createdById: admin.id },
    });
  }
  console.log("  ✅ Workstreams");

  // ── Initiatives ────────────────────────────────────
  // CONNECTORS
  const connectorsInitiatives = [
    { name: "PDM Connector", category: "CONNECTOR", description: "Connector to automatically convert SolidWorks CAD data to USD and store on Nucleus server in USD format. Monitors PDM Vault for version bumps/new files and converts overnight. Ability to manually trigger conversion at any time.", plannedStartMonth: "2025-12", plannedEndMonth: "2027-06", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 1, totalPoints: 40 },
    { name: "ERP Connector", category: "CONNECTOR", description: "Various connectors to be developed to connect to and push and pull data from ERP database via API calls to Web Platform or Omniverse. Includes Opportunities Data, Quotation & Costing Data, Project Management Data, Receiving.", plannedStartMonth: "2026-01", plannedEndMonth: "2027-11", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 2, totalPoints: 34 },
    { name: "PLC Connectors", category: "CONNECTOR", description: "Various connectors to PLC software used at Eclipse to enable virtual commissioning within Omniverse to further parallelize commissioning with design. Includes Allen-Bradley, Siemens, and Open Source connectors.", plannedStartMonth: "2026-06", plannedEndMonth: "2028-06", status: "NOT_STARTED", ownerInitials: "BZ", sortOrder: 3, totalPoints: 30 },
    { name: "Robot Connectors", category: "CONNECTOR", description: "Various connectors to Robot programming software used at Eclipse to enable virtual commissioning within Omniverse. Includes FANUC, RoboGuide, SDS Omniverse Integration.", plannedStartMonth: "2026-09", plannedEndMonth: "2028-09", status: "NOT_STARTED", ownerInitials: "BZ", sortOrder: 4, totalPoints: 24 },
    { name: "EPLAN Connector", category: "CONNECTOR", description: "Connector to EPLAN software to connect EPLAN data to Omniverse to layer electrical data on top of relative CAD USD components brought in from the PDM Connector.", plannedStartMonth: "2026-03", plannedEndMonth: "2027-11", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 5, totalPoints: 20 },
    { name: "Conversion Service", category: "CONNECTOR", description: "Eclipse Azure environment deployment for the conversion service that transforms SolidWorks CAD to USD format.", plannedStartMonth: "2025-12", plannedEndMonth: "2026-06", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 6, totalPoints: 15 },
    { name: "Omniverse PDM Browser", category: "CONNECTOR", description: "Production deployment of the Omniverse PDM Browser for navigating converted USD assets.", plannedStartMonth: "2026-03", plannedEndMonth: "2026-09", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 7, totalPoints: 12 },
  ];

  // KIT APPLICATIONS
  const kitInitiatives = [
    { name: "Eclipse System Configurator", category: "KIT_APP", description: "Custom Omniverse Kit application for applications engineers to rapidly develop new concepts with wireframing and costing capabilities alongside AI assistants like Solution Recall and USD Search to find past project 3D data and build concepts following the ZCSA standard for easier transition to design.", plannedStartMonth: "2025-12", plannedEndMonth: "2027-11", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 1, totalPoints: 50 },
    { name: "Eclipse Simulation Configurator", category: "KIT_APP", description: "Custom Omniverse Kit application for controls engineers to conduct virtual commissioning leveraging up-to-date mechanical design models.", plannedStartMonth: "2026-06", plannedEndMonth: "2027-11", status: "NOT_STARTED", ownerInitials: "BZ", sortOrder: 2, totalPoints: 35 },
    { name: "Large Scale Design Review", category: "KIT_APP", description: "Custom Omniverse Kit application to enable mechanical design to conduct collaborative design reviews on large scale projects.", plannedStartMonth: "2027-01", plannedEndMonth: "2028-06", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 3, totalPoints: 25 },
    { name: "Eclipse Operations", category: "KIT_APP", description: "Custom application for layering operational and project status in context of digitized Eclipse facilities (Gaussian splats). Tools to select projects and load project data such as mechanical design from latest PDM conversion. Features to query ERP database APIs to write to operational status layers to visualize parts/assembly status. Tools to visualize project timeline and milestones for earned value visualization. Tools for shop build team to plan layout configuration of build space.", plannedStartMonth: "2027-06", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 4, totalPoints: 40 },
  ];

  // WEB PLATFORM
  const webInitiatives = [
    { name: "Neuron Landing Page", category: "PORTAL", description: "Web platform built on Azure RedHat OpenShift containerization consisting of various 'portals'. Enables auto scaling based on demand, preventing wasting compute resources when there is no demand, and auto scaling as demand increases.", plannedStartMonth: "2025-12", plannedEndMonth: "2026-09", status: "IN_PROGRESS", ownerInitials: "JC", sortOrder: 1, totalPoints: 20 },
    { name: "Proposal Portal", category: "PORTAL", description: "Web portal to view the 3D Omniverse machine concept within a viewport, view the written quotation document, and access to the AI Proposal Assistant to aid in quotation digestion as well as providing a comparison analysis of the provided RFQ/URS etc to the submitted quotation. Also used for internal project kick off.", plannedStartMonth: "2026-01", plannedEndMonth: "2027-06", status: "IN_PROGRESS", ownerInitials: "JC", sortOrder: 2, totalPoints: 35 },
    { name: "Project Portal", category: "PORTAL", description: "Web portal to add, view, edit, and work on projects as they progress from initial opportunity through to delivery. Includes 3D view of the model when in concept/design. Utilizes ERP connectors to push/pull from the EclipseDB via API calls. Intended to collect and store all project data, history, and context.", plannedStartMonth: "2026-03", plannedEndMonth: "2028-06", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 3, totalPoints: 45 },
    { name: "Control Tower Portal", category: "PORTAL", description: "Web portal to provide frictionless access to project health/earned value as well as organizational health and statistics from data pulled directly from the Eclipse database via the ERP Connector ecosystem.", plannedStartMonth: "2026-09", plannedEndMonth: "2028-09", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 4, totalPoints: 30 },
    { name: "Digital Machine Portal", category: "PORTAL", description: "Web based portal (potentially leveraging 3rd party platforms) to expose machine data, provide service/support, analytics, insights, etc. With intention to integrate Omniverse capabilities leveraging the USD version of the machine.", plannedStartMonth: "2027-06", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 5, totalPoints: 25 },
  ];

  // ARTIFICIAL INTELLIGENCE
  const aiInitiatives = [
    { name: "Neuron AI Orchestration", category: "AI_SYSTEM", description: "Orchestration platform for delegating AI queries, ingesting unstructured data, implementing guardrails, evaluations, vector storage, knowledge graphs, etc.", plannedStartMonth: "2025-12", plannedEndMonth: "2028-11", status: "IN_PROGRESS", ownerInitials: "JC", sortOrder: 1, totalPoints: 50 },
    { name: "Solution Recall", category: "AI_SYSTEM", description: "Assistant with access to past project quotations, post mortems, lessons learned, risk registry, project data, etc. Mainly used for finding past solutions and querying about those projects.", plannedStartMonth: "2026-01", plannedEndMonth: "2027-06", status: "IN_PROGRESS", ownerInitials: "JC", sortOrder: 2, totalPoints: 30 },
    { name: "USD Search", category: "AI_SYSTEM", description: "NVIDIA API to USD Search to locate 3D assets stored on Nucleus through their metadata/thumbnail image. Mainly to find past engineered solutions to drag and drop into new concept designs.", plannedStartMonth: "2026-01", plannedEndMonth: "2027-03", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 3, totalPoints: 20 },
    { name: "Proposal Assistant", category: "AI_SYSTEM", description: "Individual assistants with specific knowledge of their respective proposal documents/client provided documents, etc. Including RFQ vs Proposal Analyzer and Proposal rewrite support.", plannedStartMonth: "2026-03", plannedEndMonth: "2027-09", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 4, totalPoints: 25 },
    { name: "Eclipse Virtual Assistant", category: "AI_SYSTEM", description: "General Eclipse assistant tailored to on-boarding, employee support, HR/ISO/Process questions, etc. Including general Eclipse questions & feedback and HR support aid.", plannedStartMonth: "2026-06", plannedEndMonth: "2028-06", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 5, totalPoints: 30 },
    { name: "Project Assistant", category: "AI_SYSTEM", description: "Individual assistants with specific knowledge of their respective projects that grows as the project progresses. Project assistants are 'born' at opportunity inception, and continually learn from project data as it progresses through delivery.", plannedStartMonth: "2026-09", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 6, totalPoints: 35 },
    { name: "Asset Insights", category: "AI_SYSTEM", description: "AI-powered insights for physical assets leveraging digital twin data.", plannedStartMonth: "2027-09", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 7, needsRefinement: true, totalPoints: 20 },
    { name: "Reality Capture", category: "AI_SYSTEM", description: "Reverse gaussian splatting headless application, machine build capture to Omniverse, scene set up Omniverse extension, and machine build Metropolis solution.", plannedStartMonth: "2027-03", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 8, totalPoints: 30 },
    { name: "Metropolis Vision Analytics", category: "AI_SYSTEM", description: "Machine build and operations solution using NVIDIA Metropolis for vision analytics.", plannedStartMonth: "2027-09", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "DQ", sortOrder: 9, needsRefinement: true, totalPoints: 25 },
  ];

  // OMNIVERSE CLOUD
  const cloudInitiatives = [
    { name: "DGX Omniverse Cloud", category: "INFRA", description: "NVIDIA DGX cloud streaming platform that hosts custom Kit applications. Enables anyone in the organization or clients to access and use these custom applications from any PC globally by leveraging a cloud GPU. Also can be embedded into the web platform.", plannedStartMonth: "2025-12", plannedEndMonth: "2027-11", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 1, totalPoints: 30 },
    { name: "On-Prem RTX Servers", category: "INFRA", description: "'NVIDIA Space' On-prem RTX servers for use internally & within new 'NVIDIA' space within new Eclipse facility. Ordering, installation, & set up.", plannedStartMonth: "2026-03", plannedEndMonth: "2027-06", status: "NOT_STARTED", ownerInitials: "AS", sortOrder: 2, totalPoints: 20 },
    { name: "NVIDIA DGX Licensing", category: "INFRA", description: "Provision licenses and accounts for Eclipse NVIDIA DGX service.", plannedStartMonth: "2026-01", plannedEndMonth: "2027-11", status: "IN_PROGRESS", ownerInitials: "DQ", sortOrder: 3, totalPoints: 10 },
  ];

  // DEVSECOPS / INFRA
  const devopsInitiatives = [
    { name: "Eclipse Azure Infra Preparation", category: "DEVSECOPS", description: "Eclipse Azure set up & preparation for cloud infrastructure.", plannedStartMonth: "2025-12", plannedEndMonth: "2026-06", status: "IN_PROGRESS", ownerInitials: "AB", sortOrder: 1, totalPoints: 20 },
    { name: "Accenture to Eclipse Infra Transition", category: "DEVSECOPS", description: "Transition of infrastructure management and hosting from Accenture to Eclipse's own Azure environment.", plannedStartMonth: "2026-06", plannedEndMonth: "2027-03", status: "NOT_STARTED", ownerInitials: "AB", sortOrder: 2, totalPoints: 25 },
    { name: "DevOps Transition", category: "DEVSECOPS", description: "Transition of DevOps pipelines and processes from Accenture-managed to Eclipse-managed.", plannedStartMonth: "2026-09", plannedEndMonth: "2027-06", status: "NOT_STARTED", ownerInitials: "AB", sortOrder: 3, totalPoints: 20 },
  ];

  // INTERNAL TOOLS & APPS
  const toolsInitiatives = [
    { name: "Nuclear MTR Application", category: "TOOLING", description: "Web application to ingest drawings and MTR PDFs, extract key attributes, and link them to the correct purchase orders and parts in the Receiving process.", plannedStartMonth: "2025-12", plannedEndMonth: "2026-09", status: "IN_PROGRESS", ownerInitials: "JC", sortOrder: 1, totalPoints: 18 },
    { name: "Built to Print Application", category: "TOOLING", description: "Web application to ingest customer provided built to print drawings and extract information from the drawings to aid in quoting, comparing drawings details, tolerances, and specification to rules of thumb. Also aims to automatically create and ingest assembly structure into engineering database.", plannedStartMonth: "2026-03", plannedEndMonth: "2026-12", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 2, totalPoints: 22 },
    { name: "Eclipse AI Application Suite", category: "TOOLING", description: "Series of Eclipse AI Applications built across FY26-FY28 to address specific operational needs across the organization.", plannedStartMonth: "2026-06", plannedEndMonth: "2028-11", status: "NOT_STARTED", ownerInitials: "JC", sortOrder: 3, totalPoints: 30 },
  ];

  // MIRSEE HUMANOID
  const mirseeInitiatives = [
    { name: "Manufacturing of 6 MH3 Humanoids", category: "ROBOTICS", description: "Manufacturing and assembly of 6 MH3 Humanoid robots in collaboration with Mirsee Robotics.", plannedStartMonth: "2025-12", plannedEndMonth: "2026-09", status: "IN_PROGRESS", ownerInitials: "AS", sortOrder: 1, totalPoints: 25 },
    { name: "Identify Internal Use-Cases", category: "ROBOTICS", description: "Internal use-case identification for humanoid robotic applications in custom automation and manufacturing at Eclipse.", plannedStartMonth: "2026-06", plannedEndMonth: "2027-03", status: "NOT_STARTED", ownerInitials: "AS", sortOrder: 2, totalPoints: 15 },
    { name: "Identify Customer Pilots", category: "ROBOTICS", description: "Client pilot projects identification for humanoid robot deployment in customer manufacturing environments.", plannedStartMonth: "2026-09", plannedEndMonth: "2027-09", status: "NOT_STARTED", ownerInitials: "AS", sortOrder: 3, totalPoints: 15 },
  ];

  const allInitiativeData: { wsSlug: string; items: any[] }[] = [
    { wsSlug: "connectors", items: connectorsInitiatives },
    { wsSlug: "kit-applications", items: kitInitiatives },
    { wsSlug: "web-platform", items: webInitiatives },
    { wsSlug: "artificial-intelligence", items: aiInitiatives },
    { wsSlug: "omniverse-cloud", items: cloudInitiatives },
    { wsSlug: "devsecops-infra", items: devopsInitiatives },
    { wsSlug: "internal-tools-apps", items: toolsInitiatives },
    { wsSlug: "mirsee-humanoid", items: mirseeInitiatives },
  ];

  const initiativeMap: Record<string, string> = {}; // name -> id

  for (const { wsSlug, items } of allInitiativeData) {
    for (const item of items) {
      const init = await prisma.initiative.create({
        data: {
          workstreamId: workstreams[wsSlug].id,
          name: item.name,
          description: item.description,
          category: item.category,
          plannedStartMonth: item.plannedStartMonth || null,
          plannedEndMonth: item.plannedEndMonth || null,
          status: item.status,
          ownerInitials: item.ownerInitials || null,
          sortOrder: item.sortOrder,
          needsRefinement: item.needsRefinement || false,
          totalPoints: item.totalPoints || 0,
          createdById: admin.id,
        },
      });
      initiativeMap[item.name] = init.id;
    }
  }
  console.log("  ✅ Initiatives");

  // ── Sub-Tasks ───────────────────────────────────────
  const subTaskData: Record<string, { name: string; points: number; completionPercent: number }[]> = {
    "PDM Connector": [
      { name: "SolidWorks to USD conversion pipeline", points: 10, completionPercent: 70 },
      { name: "PDM Vault monitoring & auto-trigger", points: 8, completionPercent: 40 },
      { name: "Manual conversion trigger UI", points: 5, completionPercent: 60 },
      { name: "Nucleus storage integration", points: 8, completionPercent: 30 },
      { name: "Version tracking & delta updates", points: 5, completionPercent: 10 },
      { name: "Production testing & hardening", points: 4, completionPercent: 0 },
    ],
    "ERP Connector": [
      { name: "Opportunities Data API", points: 8, completionPercent: 50 },
      { name: "Quotation & Costing Data API", points: 8, completionPercent: 30 },
      { name: "Project Management Data API", points: 8, completionPercent: 20 },
      { name: "Receiving Data API", points: 5, completionPercent: 0 },
      { name: "API authentication & rate limiting", points: 5, completionPercent: 40 },
    ],
    "Eclipse System Configurator": [
      { name: "Wireframing tools", points: 10, completionPercent: 45 },
      { name: "Costing module integration", points: 8, completionPercent: 20 },
      { name: "Solution Recall integration", points: 8, completionPercent: 30 },
      { name: "USD Search integration", points: 8, completionPercent: 25 },
      { name: "ZCSA standard enforcement", points: 8, completionPercent: 10 },
      { name: "User onboarding & training", points: 4, completionPercent: 0 },
      { name: "Performance optimization", points: 4, completionPercent: 0 },
    ],
    "Neuron Landing Page": [
      { name: "OpenShift container setup", points: 5, completionPercent: 80 },
      { name: "Landing page UI/UX", points: 5, completionPercent: 60 },
      { name: "Auth & SSO integration", points: 5, completionPercent: 50 },
      { name: "Auto-scaling configuration", points: 5, completionPercent: 30 },
    ],
    "Neuron AI Orchestration": [
      { name: "Query delegation engine", points: 10, completionPercent: 40 },
      { name: "Unstructured data ingestion", points: 8, completionPercent: 30 },
      { name: "Guardrails & evaluations", points: 8, completionPercent: 20 },
      { name: "Vector storage layer", points: 8, completionPercent: 35 },
      { name: "Knowledge graph framework", points: 8, completionPercent: 15 },
      { name: "Agent workflow orchestration", points: 8, completionPercent: 10 },
    ],
    "DGX Omniverse Cloud": [
      { name: "DGX Cloud provisioning", points: 8, completionPercent: 60 },
      { name: "Kit app hosting & streaming", points: 8, completionPercent: 40 },
      { name: "Web platform embed integration", points: 7, completionPercent: 20 },
      { name: "Global access & latency optimization", points: 7, completionPercent: 10 },
    ],
    "Conversion Service": [
      { name: "Azure environment deployment", points: 5, completionPercent: 80 },
      { name: "CAD to USD conversion engine", points: 5, completionPercent: 70 },
      { name: "Batch processing pipeline", points: 5, completionPercent: 40 },
    ],
    "Solution Recall": [
      { name: "Quotation data ingestion", points: 8, completionPercent: 50 },
      { name: "Post mortem & lessons learned index", points: 7, completionPercent: 40 },
      { name: "Natural language query interface", points: 8, completionPercent: 35 },
      { name: "Project data retrieval system", points: 7, completionPercent: 20 },
    ],
    "Eclipse Azure Infra Preparation": [
      { name: "Azure subscription setup", points: 5, completionPercent: 90 },
      { name: "Network & security config", points: 5, completionPercent: 60 },
      { name: "Resource provisioning", points: 5, completionPercent: 50 },
      { name: "Monitoring & alerting", points: 5, completionPercent: 30 },
    ],
    "Nuclear MTR Application": [
      { name: "Drawing PDF ingestion", points: 5, completionPercent: 70 },
      { name: "MTR attribute extraction", points: 5, completionPercent: 55 },
      { name: "PO/parts linking engine", points: 4, completionPercent: 40 },
      { name: "Receiving workflow UI", points: 4, completionPercent: 30 },
    ],
    "Manufacturing of 6 MH3 Humanoids": [
      { name: "Component procurement", points: 5, completionPercent: 80 },
      { name: "Assembly of units 1-2", points: 5, completionPercent: 60 },
      { name: "Assembly of units 3-4", points: 5, completionPercent: 20 },
      { name: "Assembly of units 5-6", points: 5, completionPercent: 0 },
      { name: "Testing & validation", points: 5, completionPercent: 10 },
    ],
    "Proposal Portal": [
      { name: "3D Omniverse viewport integration", points: 10, completionPercent: 25 },
      { name: "Quotation document viewer", points: 8, completionPercent: 40 },
      { name: "AI Proposal Assistant integration", points: 8, completionPercent: 15 },
      { name: "RFQ vs Proposal comparison tool", points: 5, completionPercent: 10 },
      { name: "Internal project kick-off workflow", points: 4, completionPercent: 5 },
    ],
  };

  for (const [initName, tasks] of Object.entries(subTaskData)) {
    const initId = initiativeMap[initName];
    if (!initId) continue;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      await prisma.subTask.create({
        data: {
          initiativeId: initId,
          name: t.name,
          points: t.points,
          completionPercent: t.completionPercent,
          status: t.completionPercent === 100 ? "DONE" : t.completionPercent > 0 ? "IN_PROGRESS" : "NOT_STARTED",
          sortOrder: i + 1,
        },
      });
    }
  }
  console.log("  ✅ Sub-Tasks");

  // ── Program-level key milestones ───────────────────
  const keyMilestones = [
    { name: "USD ready machine as standard deliverable", date: "2027-06" },
    { name: "Production grade PDM connector and conversion service", date: "2026-09" },
    { name: "System Configurator workflow as standard", date: "2027-03" },
    { name: "Production grade Solution Recall & USD Search", date: "2027-06" },
    { name: "Omniverse virtual commissioning v1", date: "2027-11" },
    { name: "Reality capture workflow in production", date: "2028-03" },
    { name: "NVIDIA Space at 485 fully operational", date: "2027-03" },
    { name: "Eclipse Virtual Assistant delivered", date: "2027-09" },
    { name: "Client facing Proposal Portal", date: "2027-03" },
    { name: "Sales adding opportunities via Project Portal", date: "2027-06" },
    { name: "Project Portal 3D Viewport", date: "2027-09" },
    { name: "Control Tower Portal MVP", date: "2027-11" },
    { name: "Mirsee humanoid use-case & client pilot", date: "2027-06" },
    { name: "Production grade EPLAN connector", date: "2027-11" },
    { name: "Project Assistant born at every opportunity inception", date: "2028-03" },
    { name: "Eclipse Operations Omniverse Application", date: "2028-06" },
    { name: "Large scale design review application", date: "2028-06" },
    { name: "Metropolis Machine build & operations solution", date: "2028-11" },
  ];

  for (const m of keyMilestones) {
    await prisma.milestone.create({
      data: { name: m.name, date: m.date, programId: program.id, createdById: admin.id },
    });
  }
  console.log("  ✅ Key Milestones");

  // ── Partners ───────────────────────────────────────
  const nvidia = await prisma.partner.create({
    data: {
      name: "NVIDIA",
      roleDescription: "Provides advanced computing platforms, Omniverse infrastructure, OpenUSD expertise, and technical support for digital twin development, real-time collaboration, and AI agent workflows. NVIDIA engineers work directly to support Eclipse on connector development, application logic, and cloud deployment patterns that support Physical AI.",
      agreements: "Eclipse + NVIDIA Partnership, Physical AI tech stack and NVIDIA libraries, Accenture + NVIDIA Diamond Partnership",
      createdById: admin.id,
    },
  });

  const accenture = await prisma.partner.create({
    data: {
      name: "Accenture Industry X",
      roleDescription: "Acts as a strategic collaborator and development partner. Accenture contributes software engineers and technical specialists who support connector development, AI-driven workflows, and application builds. Eclipse serves as the primary sandbox where both teams continue to refine and extend Accenture's Physical AI Orchestrator.",
      agreements: "Collaborative Partnership Agreement & Investment, Global Systems Integrator and Software Solutions",
      createdById: admin.id,
    },
  });

  const mirsee = await prisma.partner.create({
    data: {
      name: "Mirsee Robotics",
      roleDescription: "Works with Eclipse to test, validate, and refine humanoid robots inside real manufacturing environments. Eclipse provides an applied sandbox where Mirsee evaluates performance on true industrial tasks, gathers insight from engineers and technicians, and identifies practical roles the robots can support. This includes early client pilot opportunities, workflow testing, safety validation, and hands-on integration with standard automation equipment.",
      agreements: "Joint Collaboration Agreement, Vertically integrated humanoid robot company, Sandbox for humanoid robotic applications in custom automation and manufacturing",
      createdById: admin.id,
    },
  });

  const academic = await prisma.partner.create({
    data: {
      name: "Academic Partners",
      roleDescription: "Ontario Colleges and Universities contribute applied research, co-op students, curriculum alignment, and hands-on learning tied to digital manufacturing, OpenUSD, simulation engineering, and AI. Students work onsite in Eclipse's Innovation Centre on applied projects that link academic knowledge to real industrial systems.",
      createdById: admin.id,
    },
  });

  const localVendors = await prisma.partner.create({
    data: {
      name: "Local Vendors & SMEs",
      roleDescription: "Participate in pilot projects that explore digital-twin adoption, connector deployment, and simulation-based workflows that lead to simulation-ready assets for the industrial products they offer. Their involvement helps shape practical, scalable solutions that smaller manufacturers across Ontario can adopt.",
      createdById: admin.id,
    },
  });
  console.log("  ✅ Partners");

  // ── Partner-Workstream links ───────────────────────
  // NVIDIA involved in: Connectors, Kit Apps, AI, Omniverse Cloud
  for (const slug of ["connectors", "kit-applications", "artificial-intelligence", "omniverse-cloud"]) {
    await prisma.partnerWorkstream.create({
      data: { partnerId: nvidia.id, workstreamId: workstreams[slug].id },
    });
  }
  // Accenture: Connectors, Kit Apps, Web Platform, AI, DevSecOps
  for (const slug of ["connectors", "kit-applications", "web-platform", "artificial-intelligence", "devsecops-infra"]) {
    await prisma.partnerWorkstream.create({
      data: { partnerId: accenture.id, workstreamId: workstreams[slug].id },
    });
  }
  // Mirsee: Mirsee Humanoid
  await prisma.partnerWorkstream.create({
    data: { partnerId: mirsee.id, workstreamId: workstreams["mirsee-humanoid"].id },
  });
  // Academic: Kit Apps, AI, Internal Tools
  for (const slug of ["kit-applications", "artificial-intelligence", "internal-tools-apps"]) {
    await prisma.partnerWorkstream.create({
      data: { partnerId: academic.id, workstreamId: workstreams[slug].id },
    });
  }
  // Local Vendors: Connectors, Kit Apps
  for (const slug of ["connectors", "kit-applications"]) {
    await prisma.partnerWorkstream.create({
      data: { partnerId: localVendors.id, workstreamId: workstreams[slug].id },
    });
  }
  console.log("  ✅ Partner-Workstream links");

  // ── People (from PDF org chart) ────────────────────
  const peopleData = [
    { name: "Daniel Qubrossi", initials: "DQ", title: "Digital Innovation Architect", team: "Digital Innovation", roleInProgram: "Architecture & Connectors Lead" },
    { name: "Jacky Chen", initials: "JC", title: "Digital Innovation Architect", team: "Digital Innovation", roleInProgram: "Web Platform & AI Lead" },
    { name: "Brad Zalischuk", initials: "BZ", title: "Project Neuron Tech Lead", team: "Digital Innovation", roleInProgram: "Tech Lead" },
    { name: "Adam Sokacz", initials: "AS", title: "Digital Innovation Project Manager", team: "Digital Innovation", roleInProgram: "Project Manager" },
    { name: "Anthony Beijes", initials: "AB", title: "DevSecOps Lead", team: "Digital Innovation", roleInProgram: "DevSecOps Lead" },
    { name: "Alex Blandford", initials: "TL", title: "Digital Innovation Co-op", team: "Digital Innovation", roleInProgram: "Co-op Student" },
    { name: "Hyelynn Choi", initials: "HC", title: "Digital Innovation Co-op", team: "Digital Innovation", roleInProgram: "Co-op Student" },
    { name: "Sebastion Bubasci", initials: "SB", title: "Digital Innovation Co-op", team: "Digital Innovation", roleInProgram: "Co-op Student" },
    { name: "Steve Mai", initials: "SM", title: "Digital Innovation Power-User", team: "Digital Innovation", roleInProgram: "Power User" },
    { name: "Prashanth Kandige", initials: "PK", title: "Digital Innovation Program Manager", team: "Digital Innovation", roleInProgram: "Program Manager" },
    { name: "Joe Ligori", initials: "JL", title: "Global Director of IT", team: "IT", roleInProgram: "IT Director" },
    { name: "Michael Fisher", initials: "MF", title: "ERP Systems Manager", team: "IT", roleInProgram: "ERP Systems" },
    { name: "Sherri-Lynn", initials: "SL", title: "Director of Operations", team: "Operations", roleInProgram: "Operations Director" },
  ];

  for (const p of peopleData) {
    await prisma.person.create({ data: p });
  }
  console.log("  ✅ People");

  console.log("\n🎉 Seeding complete! Sign in with:");
  console.log("   Admin: admin@neuron.dev / password123");
  console.log("   Member: member@neuron.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
