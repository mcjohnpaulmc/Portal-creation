/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Briefcase, 
  Settings, 
  LogOut, 
  Lock, 
  ChevronRight, 
  CheckCircle2, 
  Server, 
  ShieldCheck, 
  Terminal, 
  SlidersHorizontal,
  Info,
  Globe,
  Database,
  Search,
  BookOpen,
  X,
  Sparkles,
  Trash2,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Solution, Collateral, UserLog, AppState, CurrentProject, UpcomingProject } from "./types";

// Import custom parts
import { AccessWall } from "./components/AccessWall";
import { SolutionLaunchModal } from "./components/SolutionLaunchModal";
import { CollateralDetailModal } from "./components/CollateralDetailModal";
import { AdminSolutions } from "./components/AdminSolutions";
import { AdminCollaterals } from "./components/AdminCollaterals";
import { AdminLogs } from "./components/AdminLogs";
import { AdminProjects } from "./components/AdminProjects";
import { CurrentProjectsDashboard } from "./components/CurrentProjectsDashboard";
import { UpcomingProjectsDashboard } from "./components/UpcomingProjectsDashboard";

export default function App() {
  // Global API states
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [currentProjects, setCurrentProjects] = useState<CurrentProject[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<UpcomingProject[]>([]);
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [heroText, setHeroText] = useState("");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [subdomain, setSubdomain] = useState("unilever");
  const [subdomainsList, setSubdomainsList] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const [prefilledSubdomain, setPrefilledSubdomain] = useState<string | null>(null);
  const [newSubdomainSlug, setNewSubdomainSlug] = useState("");
  const [newSubdomainDisplayName, setNewSubdomainDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  // Authentication/Identity states
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authNeededItem, setAuthNeededItem] = useState<{ type: "sol" | "col"; id: string } | null>(null);

  // Layout navigation states
  const [currentTab, setCurrentTab] = useState<"solutions" | "collaterals" | "currentProjects" | "upcomingProjects">("solutions");
  const [viewMode, setViewMode] = useState<"user" | "admin">("user"); // user, admin
  const [adminActiveTab, setAdminActiveTab] = useState<"solutions" | "collaterals" | "projects" | "hero" | "subdomain" | "logs">("solutions");

  // Selection modal items
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);

  // Filter lists down to those enabled for standard user views
  const visibleSolutions = solutions.filter((sol) => sol.enabled !== false);
  const visibleCollaterals = collaterals.filter((col) => col.enabled !== false);
  const visibleCurrentProjects = currentProjects
    .filter((proj) => proj.enabled !== false)
    .filter((proj) => subdomain === "all" || proj.customerName.toLowerCase() === subdomain.toLowerCase());
  const visibleUpcomingProjects = upcomingProjects
    .filter((proj) => proj.enabled !== false)
    .filter((proj) => subdomain === "all" || proj.customerName.toLowerCase() === subdomain.toLowerCase());

  // Admin Customizer states
  const [adminHeroPrompt, setAdminHeroPrompt] = useState("");
  const [adminSubdomainInput, setAdminSubdomainInput] = useState("");
  const [updatingHero, setUpdatingHero] = useState(false);
  const [updatingSubdomain, setUpdatingSubdomain] = useState(false);
  const [simulatedLaunchStatus, setSimulatedLaunchStatus] = useState<"idle" | "launching" | "ready">("idle");

  // Fetch initial portal configuration from the database endpoints
  const fetchPortalData = async () => {
    try {
      const res = await fetch("/api/database");
      const data = await res.json();
      setSolutions(data.solutions || []);
      setCollaterals(data.collaterals || []);
      setSubdomainsList(data.subdomains || []);
      setCurrentProjects(data.currentProjects || []);
      setUpcomingProjects(data.upcomingProjects || []);
      setLogs(data.userLogs || []);
      setHeroText(data.heroText || "");
      setHeroPrompt(data.heroPrompt || "");
      setSubdomain(data.subdomain || "unilever");
      setAdminHeroPrompt(data.heroPrompt || "");
      setAdminSubdomainInput(data.subdomain || "unilever");
    } catch (err) {
      console.error("Failed to load initial portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check path for initial administrative routing
    if (window.location.pathname === "/admin" || window.location.hash === "#/admin") {
      setViewMode("admin");
    }

    // Capture work email from previous persistent cache session if available
    const cached = localStorage.getItem("mobius_work_email");
    if (cached) {
      setUserEmail(cached);
    }

    fetchPortalData();
  }, []);

  // Post dynamic analytic page-view logs directly to server
  const logUserAction = async (action: string, details: string) => {
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, action, details }),
      });
      // Fetch fresh dataset update without blocking
      const res = await fetch("/api/database");
      const data = await res.json();
      setLogs(data.userLogs || []);
    } catch (err) {
      console.warn("Telemetry log could not reach endpoint:", err);
    }
  };

  // Log on user identity authentication
  const handleAuthSuccess = (email: string) => {
    setUserEmail(email);
    logUserAction("Corporate Domain Verified", `Authenticated with work email domain.`);
    
    // Resume opening previously blocked resource
    if (authNeededItem) {
      if (authNeededItem.type === "sol") {
        const solObj = solutions.find(s => s.id === authNeededItem.id);
        if (solObj) {
          triggerSolutionRedirect(solObj);
        }
      } else {
        const colObj = collaterals.find(c => c.id === authNeededItem.id);
        if (colObj) {
          setSelectedCollateral(colObj);
          logUserAction("View Collateral Report", `Accessed dynamic case report for: ${colObj.title}`);
        }
      }
      setAuthNeededItem(null);
    }
  };

  // Sign out
  const handleSignOut = () => {
    localStorage.removeItem("mobius_work_email");
    setUserEmail(null);
    logUserAction("Portal Logout", "User logged out of core portal dashboard.");
  };

  // Helper to trigger redirect with embedded credentials
  const triggerSolutionRedirect = (sol: Solution) => {
    let targetUrl = sol.url;
    if (targetUrl) {
      try {
        const urlObj = new URL(targetUrl);
        if (sol.usernamePrefill) {
          urlObj.searchParams.set("username", sol.usernamePrefill);
          urlObj.searchParams.set("user", sol.usernamePrefill);
        }
        if (sol.passwordPrefill) {
          urlObj.searchParams.set("password", sol.passwordPrefill);
        }
        targetUrl = urlObj.toString();
      } catch (e) {
        const separator = targetUrl.includes("?") ? "&" : "?";
        let params = "";
        if (sol.usernamePrefill) {
          params += `username=${encodeURIComponent(sol.usernamePrefill)}&user=${encodeURIComponent(sol.usernamePrefill)}`;
        }
        if (sol.passwordPrefill) {
          if (params) params += "&";
          params += `password=${encodeURIComponent(sol.passwordPrefill)}`;
        }
        if (params) {
          targetUrl = `${targetUrl}${separator}${params}`;
        }
      }
    }
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    logUserAction("Redirect to Embedded Solution", `Redirected with embedded credentials to: ${sol.title} (URL: ${targetUrl})`);
  };

  // Handle Clicking on Solution Tiles
  const handleSolutionClick = (sol: Solution) => {
    if (!userEmail) {
      setAuthNeededItem({ type: "sol", id: sol.id });
      return;
    }
    triggerSolutionRedirect(sol);
  };

  // Handle Clicking on Collateral Tiles
  const handleCollateralClick = (col: Collateral) => {
    if (!userEmail) {
      setAuthNeededItem({ type: "col", id: col.id });
      return;
    }
    setSelectedCollateral(col);
    logUserAction("View Collateral Report", `Accessed dynamic case report for: ${col.title}`);
  };

  // Onboarder/AI updater callback for Solutions & Collaterals
  const handleAdminDatabaseUpdate = async (endpoint: "solutions" | "collaterals", action: string, data: any) => {
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, [endpoint === "solutions" ? "solution" : "collateral"]: data })
      });
      const resData = await res.json();
      if (resData.success) {
        await fetchPortalData();
      } else {
        alert("Encountered failure during database persistence updates.");
      }
    } catch (err) {
      console.error("Administrative update failed:", err);
    }
  };

  // Admin updater callback for Current Projects
  const handleAdminCurrentProjectUpdate = async (action: string, data: any) => {
    try {
      const res = await fetch("/api/admin/projects/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, project: data })
      });
      const resData = await res.json();
      if (resData.success) {
        await fetchPortalData();
      } else {
        alert("Encountered failure updating core projects datastore.");
      }
    } catch (err) {
      console.error("Administrative project update failed:", err);
    }
  };

  // Admin updater callback for Upcoming Opportunities
  const handleAdminUpcomingProjectUpdate = async (action: string, data: any) => {
    try {
      const res = await fetch("/api/admin/projects/upcoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, project: data })
      });
      const resData = await res.json();
      if (resData.success) {
        await fetchPortalData();
      } else {
        alert("Encountered failure updating core proposal datastore.");
      }
    } catch (err) {
      console.error("Administrative proposal update failed:", err);
    }
  };

  // Regenerate Hero Marketing Block via Gemini
  const handleRegenerateHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingHero(true);
    try {
      const res = await fetch("/api/admin/generate-hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: adminHeroPrompt })
      });
      const data = await res.json();
      if (res.ok) {
        setHeroText(data.heroText);
        setLogs(data.database.userLogs || []);
      } else {
        alert(data.error || "Failed to update hero.");
      }
    } catch (err) {
      alert("Error regenerating main marketing text block.");
    } finally {
      setUpdatingHero(false);
    }
  };

  // Create or Delete dynamic subdomains
  const handleManageSubdomains = async (action: "create" | "delete", subdomainName: string, displayName?: string) => {
    try {
      const res = await fetch("/api/admin/subdomains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, subdomain: subdomainName, displayName })
      });
      const resData = await res.json();
      if (resData.success) {
        await fetchPortalData();
        if (action === "create") {
          setNewSubdomainSlug("");
          setNewSubdomainDisplayName("");
        }
      } else {
        alert(resData.error || "Persistence mismatch handling portal list.");
      }
    } catch (err) {
      console.error("Management error for customer portals:", err);
    }
  };

  // Update subdomain
  const handleUpdateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSubdomain(true);
    try {
      const res = await fetch("/api/admin/subdomain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: adminSubdomainInput })
      });
      const data = await res.json();
      if (res.ok) {
        setSubdomain(data.subdomain);
        setLogs(data.database.userLogs || []);
        alert(`Host subdomain pointing set to: ${data.subdomain}.mobiusservices.co.in`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error defining routing subdomains.");
    } finally {
      setUpdatingSubdomain(false);
    }
  };

  // Simulate cloud portal deployments
  const handleSimulatedDeploymentLaunch = async () => {
    setSimulatedLaunchStatus("launching");
    logUserAction("Portal Launch Requested", `Requested compilation of active application under: ${subdomain}.mobiusservices.co.in`);
    await new Promise((r) => setTimeout(r, 2000));
    setSimulatedLaunchStatus("ready");
    logUserAction("Portal Live on Cloud Server", `Deployed domain host pipeline to production successfully.`);
  };

  // Helper parser to render hero description cleanly (converts markdown headers/paragraphs to elegant elements)
  const renderHeroText = (text: string) => {
    if (!text) return null;
    const lines = text.trim().split("\n");
    const h2Lines = lines.filter(l => l.startsWith("##"));
    const otherLines = lines.filter(l => !l.startsWith("##"));

    const titleStr = h2Lines.length > 0 ? h2Lines[0].replace("##", "").trim() : "Mobius Solutions & Catalog Portal";
    const bodyStr = otherLines.join("\n").trim();

    return (
      <div className="space-y-3 relative z-10 text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
          {titleStr}
        </h2>
        <p className="text-indigo-100 opacity-90 leading-relaxed text-xs md:text-sm max-w-2xl">
          {bodyStr}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <svg className="animate-spin h-8 w-8 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-mono text-xs text-slate-400">Loading Mobius Services Catalog...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 relative">
      {/* Visual background gradient accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-100 rounded-full blur-3xl pointer-events-none opacity-50 z-0" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-sky-50 rounded-full blur-3xl pointer-events-none opacity-40 z-0" />

      {/* Corporate Header */}
      <header className="sticky top-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-40 backdrop-blur-md">
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 bg-indigo-700 rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-855">
              Mobius<span className="text-indigo-600 font-bold">Services</span>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-0.5 select-none text-left">
              <span className="text-[10px] font-mono text-slate-400 leading-none">
                Portal: <strong className="text-indigo-600 font-mono">{subdomain}</strong>.mobiusservices.co.in
              </span>
              {viewMode === "admin" && (
                <div className="flex flex-wrap items-center gap-1 sm:border-l sm:border-slate-205 sm:pl-1.5 mt-1 sm:mt-0 max-w-lg">
                  {subdomainsList.map((subObj) => (
                    <button
                      key={subObj.name}
                      type="button"
                      onClick={() => {
                        setSubdomain(subObj.name);
                      }}
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-sm border transition-all cursor-pointer ${
                        subdomain === subObj.name
                          ? "bg-indigo-650 border-indigo-650 text-white shadow-3xs"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                      title={`Simulate ${subObj.name}.mobiusservices.co.in (${subObj.displayName})`}
                    >
                      {subObj.name}
                    </button>
                  ))}
                  <button
                    key="all"
                    type="button"
                    onClick={() => {
                      setSubdomain("all");
                    }}
                    className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-sm border transition-all cursor-pointer ${
                      subdomain === "all"
                        ? "bg-indigo-650 border-indigo-650 text-white shadow-3xs"
                        : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100"
                    }`}
                    title="Simulate all subdomains active simultaneously"
                  >
                    all
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-4">
          {/* Identity details */}
          {userEmail ? (
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Corporate Access</span>
                <span className="text-xs font-medium text-slate-600 mt-1">{userEmail}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-xs flex items-center justify-center text-xs font-semibold text-slate-600 uppercase select-none relative group">
                {userEmail.substring(0, 2).toUpperCase()}
                <button
                  onClick={handleSignOut}
                  className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-250 text-white hover:bg-slate-800 p-0.5 rounded-full shadow-xs"
                  title="Disconnect Workspace"
                >
                  <LogOut className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200/40">
              <Lock className="h-3.5 w-3.5 text-slate-350" />
              <span>Gated Hub</span>
            </div>
          )}

          {/* Discreet Admin Toggle Key */}
          {viewMode === "user" ? (
            <button
              onClick={() => {
                setViewMode("admin");
                window.location.hash = "/admin";
              }}
              className="px-3.5 py-1.5 border border-slate-250 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-lg text-[11px] font-semibold text-slate-600 transition-all flex items-center gap-1.5 shadow-2xs animate-fade-in"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              Admin Module
            </button>
          ) : (
            <button
              onClick={() => {
                setViewMode("user");
                window.location.hash = "";
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Compass className="h-3.5 w-3.5 text-slate-400" />
              Public Portal View
            </button>
          )}
        </div>
      </header>

      {/* Authentication Block overlay */}
      <AnimatePresence>
        {authNeededItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setAuthNeededItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-950 bg-white rounded-md border border-slate-100"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <AccessWall onSuccess={handleAuthSuccess} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Core Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 relative z-10 flex flex-col">
        
        {viewMode === "user" ? (
          // ============================== PUBLIC VISITOR VIEW ==============================
          <div className="space-y-8 flex-1 flex flex-col justify-between">
            {/* AI Hero copy */}
            <div className="bg-indigo-900 rounded-2xl p-8 md:p-10 relative overflow-hidden shrink-0 border border-indigo-700 shadow-lg select-none text-left flex flex-col justify-end">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-800/40 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-md mb-4 self-start text-[10px] font-bold text-indigo-100 uppercase tracking-widest gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse"></span>
                  AI Perspective — Generated by Gemini
                </div>
                {renderHeroText(heroText)}
              </div>
              <div className="absolute bottom-8 right-8 flex space-x-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>
              </div>
            </div>

            {/* Menu tab selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 mt-6 gap-3">
              <nav className="flex flex-wrap gap-1 items-center bg-slate-100 border border-slate-200/50 p-1 rounded-xl md:rounded-full self-start shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrentTab("solutions")}
                  className={`px-4 py-1.5 rounded-lg md:rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                    currentTab === "solutions"
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Solutions Hub
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab("collaterals")}
                  className={`px-4 py-1.5 rounded-lg md:rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                    currentTab === "collaterals"
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Collaterals Catalogue
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab("currentProjects")}
                  className={`px-4 py-1.5 rounded-lg md:rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                    currentTab === "currentProjects"
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Active Engagements
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab("upcomingProjects")}
                  className={`px-4 py-1.5 rounded-lg md:rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                    currentTab === "upcomingProjects"
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Upcoming Opportunities
                </button>
              </nav>

              <span className="hidden md:inline-flex items-center text-[10px] uppercase tracking-wider font-mono text-slate-400 gap-1.5 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Node Ingress
              </span>
            </div>             {/* Grid Container */}
            <div className="flex-1 pt-4 text-left">
              <AnimatePresence mode="wait">
                {currentTab === "solutions" ? (
                  // Solutions Catalogue Grid
                  <motion.div
                    key="solutions-grid"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {visibleSolutions.map((sol) => (
                      <div
                        key={sol.id}
                        id={`sol-card-${sol.id}`}
                        onClick={() => handleSolutionClick(sol)}
                        className="group bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:border-indigo-400 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 duration-205 justify-between"
                      >
                        {/* Visual Image */}
                        <div className="w-full h-32 bg-slate-50 rounded-lg mb-4 overflow-hidden border border-slate-150 relative shrink-0">
                          <img
                            src={sol.thumbnail}
                            alt={sol.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-sm px-2 py-0.5 rounded-sm text-[8px] text-white font-mono uppercase tracking-widest font-semibold select-none">
                            Active App
                          </div>
                        </div>

                        {/* Text and meta values */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                              {sol.title}
                            </h3>
                            <p className="text-[10px] text-slate-450 font-mono truncate leading-none">
                              Target: {sol.url}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {sol.credentialsDescription || "Gated enterprise intelligence hub."}
                            </p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                              Solution
                            </span>
                            <button className="text-xs font-bold text-slate-650 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                              Open App 
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {visibleSolutions.length === 0 && (
                      <div className="md:col-span-3 text-center p-12 bg-white rounded-xl border border-dashed border-slate-350 shadow-2xs">
                        <Compass className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-700 text-sm">No solutions onboarded</h4>
                        <p className="text-slate-400 text-xs mt-1">Visit the administrator dashboard to build out the app catalog.</p>
                      </div>
                    )}
                  </motion.div>
                ) : currentTab === "collaterals" ? (
                  // Collateral Research Grid
                  <motion.div
                    key="collaterals-grid"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {visibleCollaterals.map((col) => (
                      <div
                        key={col.id}
                        onClick={() => handleCollateralClick(col)}
                        className="group bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:border-indigo-400 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 duration-205 justify-between"
                      >
                        {/* Thumbnail image and badge */}
                        <div className="w-full h-32 bg-slate-50 rounded-lg mb-4 overflow-hidden border border-slate-150 relative shrink-0">
                          <img
                            src={col.thumbnail}
                            alt={col.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-sm px-2 py-0.5 rounded-sm text-[8px] text-white font-mono uppercase tracking-widest font-semibold select-none">
                            Dossier
                          </div>
                        </div>

                        {/* Title details */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5 text-left">
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                              📁 {col.uploadedFiles?.length || 0} items attached
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                              {col.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {col.prompt || "Generated research and synthesis dossier."}
                            </p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                              Collateral
                            </span>
                            <button className="text-xs font-bold text-slate-650 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
                              Read Brief 
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {visibleCollaterals.length === 0 && (
                      <div className="md:col-span-3 text-center p-12 bg-white rounded-xl border border-dashed border-slate-350 shadow-2xs">
                        <Compass className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-700 text-sm">No collaterals compiled</h4>
                        <p className="text-slate-400 text-xs mt-1">Visit the administrator console to compile studies via Gemini.</p>
                      </div>
                    )}
                  </motion.div>
                ) : currentTab === "currentProjects" ? (
                  // Active Multi-tenant Engagements Dashboard
                  <CurrentProjectsDashboard 
                    projects={visibleCurrentProjects} 
                    userEmail={userEmail} 
                  />
                ) : (
                  // Upcoming Opportunities & Pending Approvals
                  <UpcomingProjectsDashboard 
                    projects={visibleUpcomingProjects} 
                    userEmail={userEmail} 
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // ============================== ADMINISTRATIVE CONTROL CONSOLE ==============================
          <div className="bg-white border border-slate-100 shadow-lg rounded-3xl overflow-hidden flex-1 flex flex-col md:flex-row text-left">
            {/* Sidebar navigation */}
            <div className="w-full md:w-64 bg-slate-950 text-slate-200 border-r border-slate-900 p-6 flex flex-col justify-between shrink-0">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    System Control Suite
                  </span>
                  <h2 className="font-display text-base font-bold text-slate-100 mt-1">
                    Control Console
                  </h2>
                </div>

                {/* Tab selectors */}
                <nav className="space-y-1.5 flex flex-col">
                  {[
                    { id: "solutions", label: "Solutions Onboard" },
                    { id: "collaterals", label: "AI Collaterals" },
                    { id: "projects", label: "Projects & Portals" },
                    { id: "hero", label: "Hero Copy edit" },
                    { id: "subdomain", label: "Portal Domains" },
                    { id: "logs", label: "Visitor Telemetry" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminActiveTab(tab.id as any)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all ${
                        adminActiveTab === tab.id
                          ? "bg-slate-900 text-white shadow-xs border-l-2 border-indigo-500"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Status footer inside sidebar */}
              <div className="pt-6 border-t border-slate-900">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-[10px] font-mono">
                    <span className="block text-slate-500 uppercase">Cloud Deployments</span>
                    <span className="text-slate-200">Active Node 12-US</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Central console body */}
            <div className="flex-1 p-6 md:p-8 bg-slate-50/40 overflow-y-auto max-h-160 custom-scroll flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={adminActiveTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1"
                >
                  {/* Case 1: Solutions Onboarder */}
                  {adminActiveTab === "solutions" && (
                    <AdminSolutions
                      solutions={solutions}
                      subdomains={subdomainsList}
                      prefilledSubdomain={prefilledSubdomain}
                      onRefresh={async (action, data) => handleAdminDatabaseUpdate("solutions", action, data)}
                    />
                  )}

                  {/* Case 2: Ingest & AI Collaterals */}
                  {adminActiveTab === "collaterals" && (
                    <AdminCollaterals
                      collaterals={collaterals}
                      subdomains={subdomainsList}
                      prefilledSubdomain={prefilledSubdomain}
                      onRefresh={async (action, data) => handleAdminDatabaseUpdate("collaterals", action, data)}
                    />
                  )}

                  {/* Case 3: Admin Multi-tenant Projects and Proposals */}
                  {adminActiveTab === "projects" && (
                    <AdminProjects
                      currentProjects={currentProjects}
                      upcomingProjects={upcomingProjects}
                      subdomains={subdomainsList}
                      prefilledSubdomain={prefilledSubdomain}
                      onRefreshCurrent={handleAdminCurrentProjectUpdate}
                      onRefreshUpcoming={handleAdminUpcomingProjectUpdate}
                    />
                  )}

                  {/* Case 3: Hero Generation Settings */}
                  {adminActiveTab === "hero" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-950">
                          Hero Custom Copy AI Writer
                        </h3>
                        <p className="text-xs text-slate-400">
                          Configure targeted marketing directions. Gemini will write, format, and layout copy suited for international visitor funnels.
                        </p>
                      </div>

                      <form onSubmit={handleRegenerateHero} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Marketing Prompt Directed to Gemini AI
                          </label>
                          <textarea
                            value={adminHeroPrompt}
                            onChange={(e) => setAdminHeroPrompt(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800 font-mono"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">
                            Model selection: gemini-3.5-flash
                          </span>
                          <button
                            type="submit"
                            disabled={updatingHero}
                            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all disabled:opacity-50"
                          >
                            {updatingHero ? "Regenerating marketing copywriting..." : "Regenerate Hero Block using AI"}
                          </button>
                        </div>
                      </form>

                      {/* Current Visual Preview Block */}
                      <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl relative text-left select-none">
                        <span className="absolute top-3 right-3 text-[9px] font-mono bg-white px-2 py-0.5 rounded-sm border text-slate-400">
                          Active Layout Preview
                        </span>
                        <div className="prose prose-slate max-w-none text-xs leading-relaxed whitespace-pre-wrap font-mono">
                          {heroText}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case 4: Hosting Subdomains Customizer */}
                  {adminActiveTab === "subdomain" && (
                    <div className="space-y-6">
                      <div className="text-left">
                        <h3 className="font-display text-base font-bold text-slate-950 flex items-center gap-1.5">
                          🚀 Customer Portals Launch Pad
                        </h3>
                        <p className="text-xs text-slate-500">
                          Configure tenant subdomains under <strong className="font-semibold text-slate-500">mobiusservices.co.in</strong>. Create a subdomain first, prefill assets context, then proceed to organize Solutions, Case Studies, and Projects.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Provisioning Form */}
                        <div className="lg:col-span-5 p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4 h-fit text-left">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-sm font-mono tracking-widest uppercase inline-block">
                            Step 1: Create New Subdomain Portal
                          </span>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!newSubdomainSlug || !newSubdomainDisplayName) {
                                alert("Please provide both friendly display name and alpha-numeric slug!");
                                return;
                              }
                              const formattedSlug = newSubdomainSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "");
                              handleManageSubdomains("create", formattedSlug, newSubdomainDisplayName);
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Customer / Client Name
                              </label>
                              <input
                                type="text"
                                value={newSubdomainDisplayName}
                                onChange={(e) => setNewSubdomainDisplayName(e.target.value)}
                                placeholder="E.g., Unilever APAC"
                                className="w-full px-3 py-2 border border-slate-205 rounded-lg text-xs text-slate-905 focus:outline-hidden"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Unique Slotted Subdomain Slug
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newSubdomainSlug}
                                  onChange={(e) => setNewSubdomainSlug(e.target.value)}
                                  placeholder="unilever"
                                  className="w-full pl-3 pr-36 py-2 border border-slate-205 rounded-lg text-xs text-slate-905 font-mono focus:outline-hidden"
                                  required
                                />
                                <div className="absolute right-3 top-2.5 text-[9.5px] font-mono text-slate-400 select-none">
                                  .mobiusservices.co.in
                                </div>
                              </div>
                              <span className="block text-[9.5px] text-slate-400 leading-normal mt-1">
                                Lowercase alphanumeric letters only. Becomes the customized entryway URL for the portal.
                              </span>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-650 hover:to-indigo-800 text-white font-semibold text-xs rounded-lg transition-all"
                            >
                              🌟 Create Customer Subdomain
                            </button>
                          </form>
                        </div>

                        {/* List of active customer portals */}
                        <div className="lg:col-span-7 p-6 bg-slate-900 text-slate-105 border border-slate-800 rounded-2xl shadow-md text-left space-y-4 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] bg-slate-800 text-slate-350 px-2.5 py-0.5 rounded-sm font-mono tracking-widest uppercase inline-block">
                              Step 2: Onboard Assets & Configure
                            </span>

                            <div className="mt-3 space-y-3 max-h-80 overflow-y-auto custom-scroll pr-1.5 font-mono text-xs">
                              {subdomainsList.map((portal) => (
                                <div
                                  key={portal.id}
                                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <h4 className="font-display font-bold text-white text-xs">
                                      {portal.displayName}
                                    </h4>
                                    <a
                                      href={`https://${portal.name}.mobiusservices.co.in`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-400 hover:underline font-mono text-[10px] block mt-0.5"
                                    >
                                      {portal.name}.mobiusservices.co.in
                                    </a>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 font-sans">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPrefilledSubdomain(portal.name);
                                        // Auto route to solutions onboarding to make asset injection seamless
                                        setAdminActiveTab("solutions");
                                        alert(`Active onboarding context changed to: ${portal.displayName}. You can now add Solutions, Case Studies, and Projects directly pre-assigned to this portal!`);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer"
                                    >
                                      Onboard Assets ⚡
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Are you absolutely sure you want to delete customer portal "${portal.displayName}"?`)) {
                                          handleManageSubdomains("delete", portal.name);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-450 transition-colors cursor-pointer"
                                      title="Remove Client Subdomain"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 leading-normal font-sans">
                            💡 <strong>Start with Subdomain Planning</strong>: Simply instantiate a subdomain above. Then, clicking <strong>"Onboard Assets ⚡"</strong> will lock your view context to that client portal. Any projects, metrics charts, and collateral case-studies created on other tabs will automatically publish strictly inside their portal!
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case 5: Logs analytical module */}
                  {adminActiveTab === "logs" && (
                    <AdminLogs logs={logs} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* LaunchPad Solution Modal Details */}
      <AnimatePresence>
        {selectedSolution && (
          <SolutionLaunchModal
            solution={selectedSolution}
            onClose={() => setSelectedSolution(null)}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Collateral Reader Panel Details */}
      <AnimatePresence>
        {selectedCollateral && (
          <CollateralDetailModal
            collateral={selectedCollateral}
            onClose={() => setSelectedCollateral(null)}
          />
        )}
      </AnimatePresence>

      {/* Visual Footer */}
      <footer className="w-full h-12 bg-slate-900 flex items-center justify-between px-8 text-slate-400 shrink-0 font-mono text-[10px] border-t border-slate-850 relative z-30 mt-auto select-none">
        <div className="flex items-center space-x-6">
          <span className="text-[10px] font-medium tracking-widest uppercase text-slate-450 leading-none">
            Host instance: {subdomain}.mobiusservices.co.in
          </span>
          <div className="hidden md:flex space-x-4 border-l border-slate-800 pl-6 leading-none">
            <span className="text-[10px] flex items-center text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span> System Active
            </span>
            <span className="text-[10px] flex items-center text-slate-400">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2 animate-pulse"></span> Gemini AI Engine Connected
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (viewMode === "admin") {
                setViewMode("user");
                window.location.hash = "";
              } else {
                setViewMode("admin");
                window.location.hash = "/admin";
                setAdminActiveTab("logs");
              }
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            User Activity Logs
          </button>
          <button
            onClick={() => {
              if (viewMode === "user") {
                setViewMode("admin");
                window.location.hash = "/admin";
              } else {
                setViewMode("user");
                window.location.hash = "";
              }
            }}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-800 rounded border border-slate-750 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            {viewMode === "user" ? "Admin Console" : "Public Hub Portal"}
          </button>
        </div>
      </footer>
    </div>
  );
}
