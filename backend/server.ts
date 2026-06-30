/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { Solution, Collateral, UserLog, CurrentProject, UpcomingProject, SubdomainPortal } from "../shared/types";

// ESM does not expose __dirname — derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  syncDataStoreToDrive,
  appendLogToDrive,
  uploadCollateralMetadataToDrive,
  uploadSolutionMetadataToDrive,
  driveHealthCheck,
} from "./drive";

// Setup storage
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "data-store.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Lazy loaded OpenAI Client
let openAIClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  if (openAIClient) return openAIClient;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("[AI] OPENAI_API_KEY not set. AI calls will use offline fallback simulation.");
    return null;
  }
  openAIClient = new OpenAI({ apiKey: key });
  return openAIClient;
}

// Dynamic state helpers
interface DatabaseSchema {
  solutions: Solution[];
  collaterals: Collateral[];
  userLogs: UserLog[];
  heroText: string;
  heroPrompt: string;
  subdomain: string;
  subdomains?: SubdomainPortal[];
  currentProjects?: CurrentProject[];
  upcomingProjects?: UpcomingProject[];
}

const DEFAULT_SUBDOMAINS: SubdomainPortal[] = [
  { id: "unilever", name: "unilever", displayName: "Unilever APAC", createdAt: new Date().toISOString() },
  { id: "reliance", name: "reliance", displayName: "Reliance Industries", createdAt: new Date().toISOString() },
  { id: "tatamotors", name: "tatamotors", displayName: "Tata Motors Co", createdAt: new Date().toISOString() }
];

const DEFAULT_CURRENT_PROJECTS: CurrentProject[] = [
  {
    id: "proj-c1",
    customerName: "unilever",
    name: "APAC Automated Inventory Replenishment",
    description: "Real-time logistics platform monitoring, forecasting product shelf life and orchestrating stock movements across APAC distribution hubs.",
    department: "Logistics & Supply Chain APAC",
    deliveryLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    deliveryValues: [240, 280, 290, 310, 340, 380],
    qualityLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    qualityValues: [98.2, 98.7, 98.1, 99.0, 99.4, 99.6],
    innovations: [
      { title: "Dynamic Reorder Safety Stock", impact: "Reduced warehousing holding costs by 22% while completely avoiding core stockouts." },
      { title: "SLA Predictive Guardrails", impact: "Identifies delayed freight shipments 4 hours prior, triggering back-up logistics automatically." }
    ],
    tatTarget: "24 hours",
    tatActual: "18.5 hours",
    tatLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    tatValues: [22, 21, 20.5, 19.8, 19.1, 18.5],
    feedbackRepo: [
      { id: "fb-1", description: "Warehouse lead noted inventory Sync latency on Southeast Asia depots during peak promotion hours.", reportedDate: "2026-04-12", resolvedDate: "2026-04-14", status: "Resolved" },
      { id: "fb-2", description: "Requesting additional visual gauges on the telemetry dashboard for custom retail store clusters.", reportedDate: "2026-05-20", resolvedDate: null, status: "Open" }
    ],
    documents: [
      { name: "unilever_inventory_sla_brief.docx", size: "1.4 MB", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: "unilever_optimization_scope.pdf", size: "3.1 MB", type: "application/pdf" }
    ],
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c2",
    customerName: "reliance",
    name: "Omnichannel Grocery Fulfillment Sync",
    description: "Intelligent routing, multi-depot stock allocation, and visual micro-fulfillment tracking for hyperlocal grocery sales.",
    department: "Reliance Retail Hub Operations",
    deliveryLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    deliveryValues: [1420, 1510, 1490, 1680, 1750, 1820],
    qualityLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    qualityValues: [97.5, 97.9, 98.4, 98.8, 99.1, 99.4],
    innovations: [
      { title: "Batching Order Dispatchers", impact: "Increased fulfillment density, reducing final-mile routing fees by 14%." }
    ],
    tatTarget: "2 hours",
    tatActual: "1.6 hours",
    tatLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    tatValues: [1.9, 1.8, 1.75, 1.72, 1.65, 1.6],
    feedbackRepo: [
      { id: "fb-3", description: "Initial driver dispatch notification delays in Western Mumbai suburbs.", reportedDate: "2026-05-15", resolvedDate: "2026-05-18", status: "Resolved" }
    ],
    documents: [
      { name: "reliance_groceries_sla.pdf", size: "2.8 MB", type: "application/pdf" }
    ],
    enabled: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_UPCOMING_PROJECTS: UpcomingProject[] = [
  {
    id: "proj-u1",
    customerName: "unilever",
    name: "IoT Sortation & Predictive Depot Maintenance",
    description: "Next-gen predictive maintenance pilot using temperature and vibration telemetry across high-volume belt systems at APAC central depot.",
    status: "POC / pilot",
    scope: "Instrumenting main sorter conveyor motors with temperature, heat, and sound sensors; ingestion into live predicting service dashboards; configuring early failure alert boundaries.",
    solution: "Continuous polling anomaly engine using sensory telemetry data, providing alerts to depot technicians before physical breakdown occurrences.",
    timelines: "Pilot launch scheduled: Q3 2026. Full rollout planned by Q1 2027.",
    department: "Logistics Maintenance APAC",
    documents: [
      { name: "iot_depot_maintenance_approach.pdf", size: "2.1 MB", type: "application/pdf", category: "Solution Approach" },
      { name: "depot_maintenance_pricing_draft.xlsx", size: "850 KB", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "Pricing" }
    ],
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-u2",
    customerName: "reliance",
    name: "AI Autonomous Demand Predictor",
    description: "Predictive replenishment modeling for festive holiday season shopping spikes across major tier-2 and tier-3 city retail outlets.",
    status: "Requirement gathering",
    scope: "Data mapping and cataloging historical festive cycles across 180 product divisions; evaluating predictive model suitability.",
    solution: "Deep learning forecasting pipelines leveraging regional social events and weather trends to model grocery item checkout demands.",
    timelines: "Discovery ends: Q3 2026. Proposed deployment: Q4 2026.",
    department: "Strategic Merchandising",
    documents: [
      { name: "reliance_festive_demand_proposal.pdf", size: "1.1 MB", type: "application/pdf", category: "Proposal" }
    ],
    enabled: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_HERO_PROMPT = "Create a sharp, high-end professional introductory message detailing Mobius Solutions portfolio covering supply chain, retail, and predictive maintenance portals.";

const DEFAULT_HERO_TEXT = `## Delivering Enterprise Velocity Through Intelligent Workflows
We build custom software systems and technical pipelines that deliver real corporate impact. Explore our direct software solutions or read through full case studies mapping customer obstacles, technical implementations, and business analytics.`;

const DEFAULT_SOLUTIONS: Solution[] = [
  {
    id: "sol-1",
    title: "Mobius Retail Vision AI",
    thumbnail: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
    url: "https://retail-vision.mobiusservices.co.in/dashboard",
    credentialsDescription: "Prefilled guest credentials for standard interactive retail dashboard.",
    usernamePrefill: "ops@mobiusretail.com",
    passwordPrefill: "MobiusRetail2026!",
    tags: ["Retail", "Computer Vision", "Analytics"],
    createdAt: new Date().toISOString(),
    customerName: "reliance"
  },
  {
    id: "sol-2",
    title: "Predictive Supply Chain Sync",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
    url: "https://supply-chain.mobiusservices.co.in/terminal",
    credentialsDescription: "Executive operations workspace view credentials.",
    usernamePrefill: "exec.ops@mobiusservices.co.in",
    passwordPrefill: "RouteSyncOptimizer#9",
    tags: ["Logistics", "AI Planner", "Optimization"],
    createdAt: new Date().toISOString(),
    customerName: "unilever"
  },
];

const DEFAULT_COLLATERALS: Collateral[] = [
  {
    id: "col-1",
    title: "Unilever Asia Inventory Optimization",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800",
    prompt: "Generate an end-to-end modern inventory optimization study for Unilever Asia.",
    generatedContent: `# Unilever Asia Inventory Optimization Case Study

## 🏢 About the Customer
Unilever Asia is a leading consumer goods company managing over 40+ household brands across 15 different APAC regions, operating a complex supply chain consisting of 8 major distribution hubs.

## ⚠️ The Problem
- **Demand Over-Estimation**: Excessive buffer stock leading to high warehousing holding costs.
- **Stock-Out Events**: Unpredicted consumer shifts in retail resulting in a 4% loss of sales during high-season promotions.
- **Data Silos**: Distribution hubs lacked a single source of truth, causing a 12-day delay in inventory realignment.

## 👁️ The Solution
\`\`\`
[ Retail Stores ] ──(Real-time Sales)──> [ Mobius Sync Engine ] ──(ML Forecasting)──> [ Inventory Reorder ]
                                                 │
                                                 └───> [ Automated Distribution Plan ]
\`\`\`

Our solution integrated **Mobius Sync Engine** directly with Unilever's ERP:
1. **Telemetry Capture**: Ingestion of point-of-sale data with sub-hourly updates.
2. **Predictive ML Reordering**: Auto-generating replenishment drafts based on historical patterns and upcoming holiday traffic.
3. **Visual Replenishment Charts**: Live tracking of current warehouse inventory limits.

## 📈 Impact & Insights
* **Holding Costs Reduced by 22%**: Streamlined inventory margins across critical Southeast Asian depots.
* **Sales Up by 3.8%**: Elimination of peak stock-out situations.
* **Insight**: Dynamic forecasting is 10x more resilient against unexpected supply chain delays than strict static reordering thresholds.`,
    uploadedFiles: [
      { name: "unilever_asia_brief.docx", size: "1.4 MB", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: "unilever_inventory_optimization_deck.pdf", size: "4.2 MB", type: "application/pdf" }
    ],
    createdAt: new Date().toISOString(),
    customerName: "unilever"
  }
];

function readDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      let altered = false;
      if (!parsed.currentProjects) {
        parsed.currentProjects = DEFAULT_CURRENT_PROJECTS;
        altered = true;
      }
      if (!parsed.upcomingProjects) {
        parsed.upcomingProjects = DEFAULT_UPCOMING_PROJECTS;
        altered = true;
      }
      if (!parsed.subdomains) {
        parsed.subdomains = DEFAULT_SUBDOMAINS;
        altered = true;
      }
      if (!parsed.subdomain || parsed.subdomain === "retail") {
        parsed.subdomain = "unilever";
        altered = true;
      }
      if (altered) {
        writeDatabase(parsed);
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error reading database file, resetting to empty. Error:", error);
  }
  
  const initialDb: DatabaseSchema = {
    solutions: DEFAULT_SOLUTIONS,
    collaterals: DEFAULT_COLLATERALS,
    userLogs: [
      {
        id: "log-init",
        email: "onboarding@mobiusservices.co.in",
        action: "System Initialized",
        details: "Database hydrated with default solutions and collaterals.",
        date: new Date().toISOString()
      }
    ],
    heroText: DEFAULT_HERO_TEXT,
    heroPrompt: DEFAULT_HERO_PROMPT,
    subdomain: "unilever",
    subdomains: DEFAULT_SUBDOMAINS,
    currentProjects: DEFAULT_CURRENT_PROJECTS,
    upcomingProjects: DEFAULT_UPCOMING_PROJECTS
  };
  writeDatabase(initialDb);
  return initialDb;
}

function writeDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
    console.debug("[DB] Local data-store.json written. Triggering Drive sync...");
    // Fire-and-forget Drive sync — does not block the response
    syncDataStoreToDrive(DATA_FILE).catch((err) =>
      console.error("[Drive] Background sync error:", err)
    );
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Start Express server
const app = express();
const PORT = parseInt(process.env.PORT || "4567", 10);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Google Drive health-check endpoint
app.get("/api/drive/health", async (req, res) => {
  const status = await driveHealthCheck();
  res.json(status);
});

// Mock file downloads
app.get("/api/download/:filename", (req, res) => {
  const filename = req.params.filename;
  // Create a clean mock text file representing the source document requested
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/plain");
  res.send(`--- MOBIUS SERVICES COMPLIARY ARCHIVE DOWNLOAD ---\nFile: ${filename}\nStatus: Audited & Digitized\nTimestamp: ${new Date().toISOString()}\n\nThis mock document serves as the background reference materials utilized by OpenAI to construct the tailored Case Study summary format.\nAll underlying calculations, logs, and schemas correspond to customer outcomes.\n`);
});

// GET database
app.get("/api/database", (req, res) => {
  const db = readDatabase();
  res.json(db);
});

// POST corporate email login with exact work domain checks
app.post("/api/email-login", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const normalized = email.trim().toLowerCase();
  
  // Forbidden consumer domains
  const forbiddenDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "aol.com",
    "live.com",
    "zoho.com",
    "mail.com",
    "protonmail.com",
    "yandex.com",
    "gmx.com"
  ];

  const domain = normalized.split("@")[1];
  
  if (forbiddenDomains.includes(domain)) {
    return res.status(403).json({
      error: `Access denied. Personal email domains (${domain}) are not permitted. Please use your corporate or enterprise domain to authenticate.`
    });
  }

  // Success - track in logs
  const db = readDatabase();
  const newLog: UserLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    email: normalized,
    action: "Work Email Access Granted",
    details: `User entered domain: @${domain} and verified email status.`,
    date: new Date().toISOString()
  };
  db.userLogs.unshift(newLog);
  writeDatabase(db);

  // Async Drive log append
  appendLogToDrive(newLog).catch((err) =>
    console.error("[Drive] Login log append failed:", err)
  );

  res.json({ success: true, email: normalized });
});

// POST logging action
app.post("/api/log", (req, res) => {
  const { email, action, details } = req.body;
  const db = readDatabase();
  
  const newLog: UserLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    email: email || "anonymous-viewer",
    action: action || "Page View",
    details: details || "Viewed specific item.",
    date: new Date().toISOString()
  };
  
  db.userLogs.unshift(newLog);
  writeDatabase(db);

  // Async Drive log append — fire-and-forget
  appendLogToDrive(newLog).catch((err) =>
    console.error("[Drive] Log append failed:", err)
  );

  res.json({ success: true });
});

// SOLUTIONS management
app.post("/api/admin/solutions", (req, res) => {
  const { action, solution } = req.body;
  const db = readDatabase();

  if (action === "create") {
    const newSol: Solution = {
      ...solution,
      id: `sol-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.solutions.unshift(newSol);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Solution Created",
      details: `Solution "${newSol.title}" onboarded successfully.`,
      date: new Date().toISOString()
    });
    // Sync solution metadata to Drive
    uploadSolutionMetadataToDrive({
      id: newSol.id,
      title: newSol.title,
      url: newSol.url,
      tags: newSol.tags,
      customerName: newSol.customerName,
      createdAt: newSol.createdAt,
    }).catch((err) => console.error("[Drive] Solution upload failed:", err));
  } else if (action === "update") {
    db.solutions = db.solutions.map(s => s.id === solution.id ? { ...s, ...solution } : s);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Solution Updated",
      details: `Solution "${solution.title}" details was edited.`,
      date: new Date().toISOString()
    });
  } else if (action === "delete") {
    db.solutions = db.solutions.filter(s => s.id !== solution.id);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Solution Deleted",
      details: `Solution with ID "${solution.id}" was soft deleted.`,
      date: new Date().toISOString()
    });
  }

  writeDatabase(db);
  res.json({ success: true, database: db });
});

// COLLATERALS management
app.post("/api/admin/collaterals", (req, res) => {
  const { action, collateral } = req.body;
  const db = readDatabase();

  if (action === "create") {
    const newCol: Collateral = {
      ...collateral,
      id: `col-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.collaterals.unshift(newCol);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Collateral Added",
      details: `Collateral study "${newCol.title}" created.`,
      date: new Date().toISOString()
    });
    // Upload collateral metadata to Drive
    uploadCollateralMetadataToDrive({
      id: newCol.id,
      title: newCol.title,
      customerName: newCol.customerName,
      uploadedFiles: newCol.uploadedFiles || [],
      createdAt: newCol.createdAt,
    }).catch((err) => console.error("[Drive] Collateral upload failed:", err));
  } else if (action === "update") {
    db.collaterals = db.collaterals.map(c => c.id === collateral.id ? { ...c, ...collateral } : c);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Collateral Updated",
      details: `Collateral study "${collateral.title}" updated.`,
      date: new Date().toISOString()
    });
  } else if (action === "delete") {
    db.collaterals = db.collaterals.filter(c => c.id !== collateral.id);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Collateral Deleted",
      details: `Collateral with ID "${collateral.id}" removed.`,
      date: new Date().toISOString()
    });
  }

  writeDatabase(db);
  res.json({ success: true, database: db });
});

// CURRENT PROJECTS management
app.post("/api/admin/projects/current", (req, res) => {
  const { action, project } = req.body;
  const db = readDatabase();

  if (!db.currentProjects) db.currentProjects = [];

  if (action === "create") {
    const newProj: CurrentProject = {
      ...project,
      id: `proj-c-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.currentProjects.unshift(newProj);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Current Project Created",
      details: `Project "${newProj.name}" created for customer: ${newProj.customerName}.`,
      date: new Date().toISOString()
    });
  } else if (action === "update") {
    db.currentProjects = db.currentProjects.map(p => p.id === project.id ? { ...p, ...project } : p);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Current Project Updated",
      details: `Project "${project.name}" details updated.`,
      date: new Date().toISOString()
    });
  } else if (action === "delete") {
    db.currentProjects = db.currentProjects.filter(p => p.id !== project.id);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Current Project Deleted",
      details: `Project with ID "${project.id}" deleted.`,
      date: new Date().toISOString()
    });
  }

  writeDatabase(db);
  res.json({ success: true, database: db });
});

// UPCOMING PROJECTS management
app.post("/api/admin/projects/upcoming", (req, res) => {
  const { action, project } = req.body;
  const db = readDatabase();

  if (!db.upcomingProjects) db.upcomingProjects = [];

  if (action === "create") {
    const newProj: UpcomingProject = {
      ...project,
      id: `proj-u-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.upcomingProjects.unshift(newProj);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Upcoming Project Created",
      details: `Upcoming engagement "${newProj.name}" added for customer: ${newProj.customerName}.`,
      date: new Date().toISOString()
    });
  } else if (action === "update") {
    db.upcomingProjects = db.upcomingProjects.map(p => p.id === project.id ? { ...p, ...project } : p);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Upcoming Project Updated",
      details: `Upcoming engagement "${project.name}" details revised.`,
      date: new Date().toISOString()
    });
  } else if (action === "delete") {
    db.upcomingProjects = db.upcomingProjects.filter(p => p.id !== project.id);
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Upcoming Project Deleted",
      details: `Upcoming engagement with ID "${project.id}" deleted.`,
      date: new Date().toISOString()
    });
  }

  writeDatabase(db);
  res.json({ success: true, database: db });
});

// AI PROJECT GENERATOR via OpenAI
app.post("/api/admin/generate-project", async (req, res) => {
  const { name, customerName, templateType } = req.body;
  
  const systemPrompt = `You are an expert enterprise systems project metadata and metrics generator.
  Generate structured project metadata in raw JSON form based on:
  - Project Title: ${name}
  - Target Customer: ${customerName}
  - Type: ${templateType} (MUST be "current" or "upcoming")

  If type is "current", return an RFC 8259 valid JSON object matching this structural schema. Do not output typescript code, prefix descriptors, comments or inline markup. Only raw fields:
  {
    "name": "${name}",
    "description": "A meticulous 1-2 sentence description detailing the live analytics platform or logistic coordination.",
    "department": "Logistics & Supply Chain",
    "deliveryLabels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "deliveryValues": [310, 390, 420, 380, 480, 520],
    "qualityLabels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "qualityValues": [98.2, 98.6, 99.1, 98.9, 99.4, 99.7],
    "innovations": [{"title": "Dynamic safety stock logic", "impact": "Reduced warehouse overflows by 12%."}],
    "tatTarget": "24 hours",
    "tatActual": "18.5 hours",
    "tatLabels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "tatValues": [23.1, 21.5, 20.1, 19.4, 18.7, 18.5],
    "feedbackRepo": [{"id": "fb1", "description": "Client manager noted prompt delivery sync calibration.", "reportedDate": "2026-05-12", "resolvedDate": "2026-05-14", "status": "Resolved"}]
  }

  If type is "upcoming", return a valid JSON object matching this schema:
  {
    "name": "${name}",
    "description": "Engaging description of the upcoming project concept.",
    "status": "Requirement gathering",
    "scope": "Comprehensive explanation of project scope of work",
    "solution": "Technical solution proposed (architecture, platforms, model pipelines)",
    "timelines": "E.g., Pilot launch scheduled for Q3 2026, Full rollout by Q1 2027.",
    "department": "Logistics Maintenance APAC"
  }

  CRITICAL: You MUST output ONLY the raw JSON object itself in the chat reply. Do not enclose it in markdown blocks. No explanations, no introductory texts.`;

  try {
    let responseText = "";
    const client = getOpenAIClient();
    if (client) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
      });
      responseText = response.choices[0]?.message?.content || "";
    } else {
      // Offline Simulation
      if (templateType === "current") {
        responseText = JSON.stringify({
          name: name || "APAC Automated Inventory Replenishment",
          description: "Real-time logistics platform monitoring, forecasting product shelf life and orchestrating stock movements across APAC distribution hubs.",
          department: "Logistics & Supply Chain APAC",
          deliveryLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          deliveryValues: [245, 285, 295, 315, 345, 390],
          qualityLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          qualityValues: [98.2, 98.7, 98.1, 99.0, 99.4, 99.6],
          innovations: [
            { title: "Dynamic Reorder Safety Stock", impact: "Reduced warehousing holding costs by 22% while completely avoiding core stockouts." },
            { title: "SLA Predictive Guardrails", impact: "Identifies delayed freight shipments 4 hours prior, triggering back-up logistics automatically." }
          ],
          tatTarget: "24 hours",
          tatActual: "18.5 hours",
          tatLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          tatValues: [22, 21, 20.5, 19.8, 19.1, 18.5],
          feedbackRepo: [
            { id: "fb-1", description: "Warehouse lead noted inventory Sync latency on Southeast Asia depots during peak promotion hours.", reportedDate: "2026-04-12", resolvedDate: "2026-04-14", status: "Resolved" }
          ]
        });
      } else {
        responseText = JSON.stringify({
          name: name || "IoT Sortation & Predictive Depot Maintenance",
          description: "Next-gen predictive maintenance pilot using temperature and vibration telemetry across high-volume belt systems at APAC central depot.",
          status: "POC / pilot",
          scope: "Instrumenting main sorter conveyor motors with temperature, heat, and sound sensors; ingestion into live predicting service dashboards; configuring early failure alert boundaries.",
          solution: "Continuous polling anomaly engine using sensory telemetry data, providing alerts to depot technicians before physical breakdown occurrences.",
          timelines: "Pilot launch scheduled: Q3 2026. Full rollout planned by Q1 2027.",
          department: "Logistics Maintenance APAC"
        });
      }
    }

    const cleanJSON = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
    const resultObj = JSON.parse(cleanJSON);
    res.json(resultObj);
  } catch (error: any) {
    console.error("AI Project Generation Error:", error);
    res.status(500).json({ error: "Failed to generate project parameters with OpenAI. " + error.message });
  }
});

// GET dynamic AI layout generation with OpenAI
app.post("/api/admin/generate-collateral", async (req, res) => {
  const { title, prompt, uploadedFiles } = req.body;
  const db = readDatabase();

  const referenceDocs = (uploadedFiles || []).map((f: any) => `- ${f.name} (type: ${f.type})`).join("\n");
  const systemPrompt = `You are an expert enterprise business case study generator. Create an elite case study in premium markdown style.
Format structure exactly:
# ${title || "Enterprise Solution Study"}

## 🏢 About the Customer
[Insert structured paragraph about client profile]

## ⚠️ The Problem
[List bullet points detailing operational failures, technical debt, and financial impact]

## 👁️ The Solution
[Insert a clean ASCII horizontal diagram of the pipeline/flow. E.g.: [Retail] ──> [AI Hub] ──> [Impact]
And then detailed bullet points describing execution strategy]

## 📈 Impact & Insights
[List statistical metrics (e.g. costs reduced, speedups) followed by business intelligence takeaways]

Apply clear typography and concise language. Keep diagrams readable. Reference files:
${referenceDocs}`;

  try {
    let responseText = "";
    const client = getOpenAIClient();
    if (client) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `${systemPrompt}\n\nUser Prompts/Modifications:\n${prompt}` }],
      });
      responseText = response.choices[0]?.message?.content || "";
    } else {
      // Simulate gorgeous Markdown responses so the program operates perfectly in dev
      responseText = `# ${title || "Client Logistics Intelligence Study"}

## 🏢 About the Customer
A major multi-national client managing regional warehouse facilities across APAC, handling highly volatile consumer stock cycles.

## ⚠️ The Problem
* **Fragile Sourcing Paths**: Multi-tier scheduling latency.
* **Loss of Visibility**: manual spreadsheet tracking creating 4-day visibility gaps.
* **Over-allocation**: buffer levels exceeding 30% standard margins.

## 👁️ The Solution
\`\`\`
[ Raw Warehouse Feed ] ──> [ Mobius Prediction Hub ] ──(Auto Replenishment)──> [ Scheduled Fleet ]
\`\`\`

1. **Integrated Forecast Feed**: Seamless telemetry modeling.
2. **Dynamic Schedule Adjustments**: Autonomous route shifting.

## 📈 Impact & Insights
* **35% reduction in buffer inventory costs** realized within first 90 days.
* **100% route verification speedups** with full real-time telemetry.`;
    }

    res.json({ generatedContent: responseText });
  } catch (error: any) {
    console.error("OpenAI Generation Error:", error);
    res.status(500).json({ error: "Failed to generate study using OpenAI. " + error.message });
  }
});

// AI Hero Generation
app.post("/api/admin/generate-hero", async (req, res) => {
  const { prompt } = req.body;
  const db = readDatabase();

  const systemPrompt = `You are an elite marketing copywriter for enterprise business channels. 
Write a powerful title (starting with ##) and accompanying short, impactful descriptive paragraph that will welcome users to our custom application catalog.
The style must be direct, sophisticated, and professional. Do not use exclamation marks or hype words. Format:
## [Compelling Headline Here]
[Short professional paragraph here]`;

  try {
    let heroOutput = "";
    const client = getOpenAIClient();
    if (client) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `${systemPrompt}\n\nCorporate focus instructions:\n${prompt}` }],
      });
      heroOutput = response.choices[0]?.message?.content || "";
    } else {
      heroOutput = `## Custom Enterprise Workflows & Predictive Business Modules
We build production technical portals and AI pipelines that resolve hard enterprise logistics, retail sales spikes, and system routing demands. Explore real portals or read audited customer execution case studies.`;
    }

    db.heroText = heroOutput;
    db.heroPrompt = prompt;
    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Hero Text Regenerated",
      details: "Regenerated corporate portal subtitle copy using AI modeling.",
      date: new Date().toISOString()
    });
    
    writeDatabase(db);
    res.json({ success: true, heroText: heroOutput, database: db });
  } catch (error: any) {
    console.error("Hero Generation Error:", error);
    res.status(500).json({ error: "Failed to generate marketing intro: " + error.message });
  }
});

// Subdomain management
app.post("/api/admin/subdomain", (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain) {
    return res.status(400).json({ error: "Subdomain is required." });
  }
  
  const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const db = readDatabase();
  db.subdomain = cleanSub;
  
  db.userLogs.unshift({
    id: `log-${Date.now()}`,
    email: "admin@mobiusservices.co.in",
    action: "Server Subdomain Adjusted",
    details: `Portal host target set to: ${cleanSub}.mobiusservices.co.in`,
    date: new Date().toISOString()
  });

  writeDatabase(db);
  res.json({ success: true, subdomain: cleanSub, database: db });
});

// Subdomains list management (Customer Portals)
app.post("/api/admin/subdomains", (req, res) => {
  const { action, name, displayName, id } = req.body;
  const db = readDatabase();
  if (!db.subdomains) db.subdomains = [...DEFAULT_SUBDOMAINS];

  if (action === "create") {
    if (!name || !displayName) {
      return res.status(400).json({ error: "Subdomain name and Portal Display Name are required." });
    }
    const cleanSub = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanSub) {
      return res.status(400).json({ error: "Subdomain name has invalid characters." });
    }
    // Check duplication
    const exists = db.subdomains.some(s => s.name === cleanSub);
    if (exists) {
      return res.status(400).json({ error: `Subdomain portal ${cleanSub}.mobiusservices.co.in already exists.` });
    }

    const newSub: SubdomainPortal = {
      id: cleanSub,
      name: cleanSub,
      displayName: displayName.trim(),
      createdAt: new Date().toISOString()
    };
    db.subdomains.unshift(newSub);
    // Auto point active subdomain to the newly created one to act as a launchpad!
    db.subdomain = cleanSub;

    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Customer Subdomain Portal Created",
      details: `Created subdomain: ${cleanSub}.mobiusservices.co.in for "${displayName.trim()}"`,
      date: new Date().toISOString()
    });
  } else if (action === "delete") {
    const targetId = id || name;
    db.subdomains = db.subdomains.filter(s => s.id !== targetId);
    
    // If the active subdomain was deleted, default to the first available one (or "unilever")
    if (db.subdomain === targetId) {
      db.subdomain = db.subdomains[0]?.name || "unilever";
    }

    db.userLogs.unshift({
      id: `log-${Date.now()}`,
      email: "admin@mobiusservices.co.in",
      action: "Customer Subdomain Portal Deleted",
      details: `Deleted subdomain portal with reference ID: ${targetId}`,
      date: new Date().toISOString()
    });
  }

  writeDatabase(db);
  res.json({ success: true, subdomain: db.subdomain, subdomains: db.subdomains, database: db });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "../frontend/vite.config.ts"),
      root: path.resolve(__dirname, "../frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n========================================`);
    console.log(`  SPC — Solutions Portal & Collaterals`);
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log(`  Mode: ${process.env.NODE_ENV || "development"}`);
    console.log(`  Drive Sync: ${process.env.GOOGLE_DRIVE_FOLDER_ID ? "ENABLED" : "DISABLED (set GOOGLE_DRIVE_FOLDER_ID)"}`);
    console.log(`========================================\n`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n[ERROR] Port ${PORT} is already in use.`);
      console.error(`[ERROR] Close the other process using port ${PORT} and try again.`);
      console.error(`[ERROR] On Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`);
      process.exit(1);
    }
    throw err;
  });
}

startServer();
