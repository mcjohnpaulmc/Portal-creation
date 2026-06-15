/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, Edit2, Sparkles, X, Check, FileText, FileUp, Trash2, 
  BarChart3, RefreshCw, Eye, EyeOff, LayoutTemplate, 
  MessageSquare, TrendingUp, HelpCircle, ShieldCheck
} from "lucide-react";
import { CurrentProject, UpcomingProject } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AdminProjectsProps {
  currentProjects: CurrentProject[];
  upcomingProjects: UpcomingProject[];
  onRefreshCurrent: (action: string, project: any) => Promise<void>;
  onRefreshUpcoming: (action: string, project: any) => Promise<void>;
  subdomains?: { id: string; name: string; displayName: string }[];
  prefilledSubdomain?: string | null;
}

export function AdminProjects({ 
  currentProjects, 
  upcomingProjects, 
  onRefreshCurrent, 
  onRefreshUpcoming,
  subdomains = [],
  prefilledSubdomain
}: AdminProjectsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"current" | "upcoming">("current");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // AI Generation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNameInput, setAiNameInput] = useState("");

  // Common fields
  const [customerName, setCustomerName] = useState("unilever"); // unilever, reliance, retail etc.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");

  const [pubEnabled, setPubEnabled] = useState(true);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);

  React.useEffect(() => {
    if (prefilledSubdomain) {
      setCustomerName(prefilledSubdomain);
    }
  }, [prefilledSubdomain]);

  // -- CURRENT PROJECT exclusive fields --
  // Trends metrics as comma-separated or list states
  const [deliveryLabelsStr, setDeliveryLabelsStr] = useState("Jan, Feb, Mar, Apr, May, Jun");
  const [deliveryValuesStr, setDeliveryValuesStr] = useState("240, 280, 290, 310, 340, 380");
  const [qualityLabelsStr, setQualityLabelsStr] = useState("Jan, Feb, Mar, Apr, May, Jun");
  const [qualityValuesStr, setQualityValuesStr] = useState("98.2, 98.7, 98.1, 99.0, 99.4, 99.6");

  // TAT exclusive
  const [tatTarget, setTatTarget] = useState("24 hours");
  const [tatActual, setTatActual] = useState("18.5 hours");
  const [tatLabelsStr, setTatLabelsStr] = useState("Jan, Feb, Mar, Apr, May, Jun");
  const [tatValuesStr, setTatValuesStr] = useState("22, 21, 20.5, 19.8, 19.1, 18.5");

  // Innovations sublist state
  const [innovations, setInnovations] = useState<{ title: string; impact: string }[]>([]);
  const [newInnTitle, setNewInnTitle] = useState("");
  const [newInnImpact, setNewInnImpact] = useState("");

  // Feedback repo sublist state
  const [feedbackRepo, setFeedbackRepo] = useState<
    { id: string; description: string; reportedDate: string; resolvedDate: string | null; status: "Open" | "Resolved" }[]
  >([]);
  const [newFbDesc, setNewFbDesc] = useState("");
  const [newFbReportDate, setNewFbReportDate] = useState("");
  const [newFbResolvedDate, setNewFbResolvedDate] = useState("");
  const [newFbStatus, setNewFbStatus] = useState<"Open" | "Resolved">("Open");

  // Uploaded files mockup
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState("document");

  // -- UPCOMING PROJECT exclusive fields --
  const [status, setStatus] = useState<"Requirement gathering" | "POC / pilot" | "Proposal" | "Awaiting approval">("Requirement gathering");
  const [scope, setScope] = useState("");
  const [solution, setSolution] = useState("");
  const [timelines, setTimelines] = useState("");
  
  // Documents categorized
  const [upcomingDocs, setUpcomingDocs] = useState<
    { name: string; size: string; type: string; category: "Sample Data" | "Pricing" | "Proposal" | "Solution Approach" }[]
  >([]);
  const [newUpDocName, setNewUpDocName] = useState("");
  const [newUpDocCat, setNewUpDocCat] = useState<"Sample Data" | "Pricing" | "Proposal" | "Solution Approach">("Solution Approach");

  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setCustomerName("unilever");
    setName("");
    setDescription("");
    setDepartment("");
    setPubEnabled(true);
    setHiddenSections([]);

    // Current reset
    setDeliveryLabelsStr("Jan, Feb, Mar, Apr, May, Jun");
    setDeliveryValuesStr("240, 280, 290, 310, 340, 380");
    setQualityLabelsStr("Jan, Feb, Mar, Apr, May, Jun");
    setQualityValuesStr("98.2, 98.7, 98.1, 99.0, 99.4, 99.6");
    setTatTarget("24 hours");
    setTatActual("18.5 hours");
    setTatLabelsStr("Jan, Feb, Mar, Apr, May, Jun");
    setTatValuesStr("22, 21, 20.5, 19.8, 19.1, 18.5");
    setInnovations([]);
    setFeedbackRepo([]);
    setUploadedFiles([]);
    setNewFileName("");

    // Upcoming reset
    setStatus("Requirement gathering");
    setScope("");
    setSolution("");
    setTimelines("");
    setUpcomingDocs([]);
    setNewUpDocName("");
  };

  const handleGenerateAIProject = async () => {
    if (!aiNameInput) {
      alert("Please provide a core project title for AI Generation scoping.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aiNameInput,
          customerName,
          templateType: activeSubTab
        })
      });
      if (!res.ok) throw new Error("Gemini generation failed");
      const data = await res.json();
      
      setName(data.name || aiNameInput);
      setDescription(data.description || "");
      setDepartment(data.department || "");

      if (activeSubTab === "current") {
        if (data.deliveryValues) {
          setDeliveryValuesStr(data.deliveryValues.join(", "));
          setDeliveryLabelsStr((data.deliveryLabels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]).join(", "));
        }
        if (data.qualityValues) {
          setQualityValuesStr(data.qualityValues.join(", "));
          setQualityLabelsStr((data.qualityLabels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]).join(", "));
        }
        if (data.innovations) setInnovations(data.innovations);
        if (data.tatTarget) setTatTarget(data.tatTarget);
        if (data.tatActual) setTatActual(data.tatActual);
        if (data.tatValues) {
          setTatValuesStr(data.tatValues.join(", "));
          setTatLabelsStr((data.tatLabels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]).join(", "));
        }
        if (data.feedbackRepo) {
          setFeedbackRepo(data.feedbackRepo.map((f: any, idx: number) => ({
            ...f,
            id: f.id || `fb-gen-${idx}`
          })));
        }
        // Hydrate double dummy files
        setUploadedFiles([
          { name: `${aiNameInput.toLowerCase().replace(/\s+/g, "_")}_sla_spec.pdf`, size: "1.8 MB", type: "application/pdf" },
          { name: "telemetry_volume_metrics.docx", size: "900 KB", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
        ]);
      } else {
        setStatus(data.status || "Requirement gathering");
        setScope(data.scope || "");
        setSolution(data.solution || "");
        setTimelines(data.timelines || "");
        setUpcomingDocs([
          { name: `opportunity_${aiNameInput.toLowerCase().replace(/\s+/g, "_")}_approach.pdf`, size: "2.4 MB", type: "application/pdf", category: "Solution Approach" },
          { name: `pricing_sheet_${customerName}.xlsx`, size: "750 KB", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "Pricing" }
        ]);
      }
      setAiNameInput("");
    } catch (err) {
      alert("Encountered network block compiling dynamic project metrics.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddFileMock = () => {
    if (!newFileName) return;
    const size = newFileType === "deck" ? "3.2 MB" : "1.4 MB";
    const mime = newFileType === "deck" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const extension = newFileType === "deck" ? ".pdf" : ".docx";

    const clean = newFileName.includes(".") ? newFileName : `${newFileName.replace(/\s+/g, "_")}${extension}`;
    setUploadedFiles([...uploadedFiles, { name: clean, size, type: mime }]);
    setNewFileName("");
  };

  const handleAddUpcomingDocMock = () => {
    if (!newUpDocName) return;
    const size = "1.5 MB";
    const mime = "application/pdf";
    const clean = newUpDocName.includes(".") ? newUpDocName : `${newUpDocName.replace(/\s+/g, "_")}.pdf`;

    setUpcomingDocs([...upcomingDocs, {
      name: clean,
      size,
      type: mime,
      category: newUpDocCat
    }]);
    setNewUpDocName("");
  };

  const handleAddInnovation = () => {
    if (!newInnTitle || !newInnImpact) return;
    setInnovations([...innovations, { title: newInnTitle, impact: newInnImpact }]);
    setNewInnTitle("");
    setNewInnImpact("");
  };

  const handleAddFeedback = () => {
    if (!newFbDesc) return;
    const rawReport = newFbReportDate || new Date().toISOString().split("T")[0];
    setFeedbackRepo([...feedbackRepo, {
      id: `fb-${Date.now()}`,
      description: newFbDesc,
      reportedDate: rawReport,
      resolvedDate: newFbStatus === "Resolved" ? (newFbResolvedDate || rawReport) : null,
      status: newFbStatus
    }]);
    setNewFbDesc("");
    setNewFbReportDate("");
    setNewFbResolvedDate("");
  };

  const handleToggleFeedFeedbackStatus = (id: string) => {
    setFeedbackRepo(feedbackRepo.map(f => {
      if (f.id === id) {
        const next = f.status === "Open" ? "Resolved" : "Open";
        return {
          ...f,
          status: next,
          resolvedDate: next === "Resolved" ? new Date().toISOString().split("T")[0] : null
        };
      }
      return f;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !department) {
      alert("Please fill out all administrative core fields.");
      return;
    }

    setSubmitting(true);

    try {
      if (activeSubTab === "current") {
        const payload = {
          id: editingId || undefined,
          customerName,
          name,
          description,
          department,
          deliveryLabels: deliveryLabelsStr.split(",").map(s => s.trim()),
          deliveryValues: deliveryValuesStr.split(",").map(s => Number(s.trim())),
          qualityLabels: qualityLabelsStr.split(",").map(s => s.trim()),
          qualityValues: qualityValuesStr.split(",").map(s => Number(s.trim())),
          innovations,
          tatTarget,
          tatActual,
          tatLabels: tatLabelsStr.split(",").map(s => s.trim()),
          tatValues: tatValuesStr.split(",").map(s => Number(s.trim())),
          feedbackRepo,
          documents: uploadedFiles,
          enabled: pubEnabled,
          hiddenSections: hiddenSections
        };
        await onRefreshCurrent(editingId ? "update" : "create", payload);
      } else {
        const payload = {
          id: editingId || undefined,
          customerName,
          name,
          description,
          department,
          status,
          scope,
          solution,
          timelines,
          documents: upcomingDocs,
          enabled: pubEnabled,
          hiddenSections: hiddenSections
        };
        await onRefreshUpcoming(editingId ? "update" : "create", payload);
      }
      resetForm();
    } catch (err) {
      alert("Failed to persist details to operations datastore.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCurrentClick = (proj: CurrentProject) => {
    setEditingId(proj.id);
    setCustomerName(proj.customerName);
    setName(proj.name);
    setDescription(proj.description);
    setDepartment(proj.department);
    setPubEnabled(proj.enabled !== false);
    setHiddenSections(proj.hiddenSections || []);

    setDeliveryLabelsStr(proj.deliveryLabels.join(", "));
    setDeliveryValuesStr(proj.deliveryValues.join(", "));
    setQualityLabelsStr(proj.qualityLabels.join(", "));
    setQualityValuesStr(proj.qualityValues.join(", "));
    setTatTarget(proj.tatTarget || "");
    setTatActual(proj.tatActual || "");
    setTatLabelsStr(proj.tatLabels ? proj.tatLabels.join(", ") : "");
    setTatValuesStr(proj.tatValues ? proj.tatValues.join(", ") : "");
    setInnovations(proj.innovations || []);
    setFeedbackRepo(proj.feedbackRepo || []);
    setUploadedFiles(proj.documents || []);
    
    setActiveSubTab("current");
    setIsEditing(true);
  };

  const handleEditUpcomingClick = (proj: UpcomingProject) => {
    setEditingId(proj.id);
    setCustomerName(proj.customerName);
    setName(proj.name);
    setDescription(proj.description);
    setDepartment(proj.department);
    setPubEnabled(proj.enabled !== false);
    setHiddenSections(proj.hiddenSections || []);

    setStatus(proj.status);
    setScope(proj.scope);
    setSolution(proj.solution);
    setTimelines(proj.timelines);
    setUpcomingDocs(proj.documents || []);

    setActiveSubTab("upcoming");
    setIsEditing(true);
  };

  const handleToggleCurrentEnable = async (proj: CurrentProject) => {
    const nextState = proj.enabled === false ? true : false;
    await onRefreshCurrent("update", { ...proj, enabled: nextState });
  };

  const handleToggleUpcomingEnable = async (proj: UpcomingProject) => {
    const nextState = proj.enabled === false ? true : false;
    await onRefreshUpcoming("update", { ...proj, enabled: nextState });
  };

  return (
    <div id="admin-projects-panel" className="space-y-6 text-left">
      {/* Upper Navigation & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 leading-tight">
            Client Subdomain Portals & Engagement Desks
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Publish client-specific delivery timelines, SLA volume metrics, audit clarifications, and upcoming pilot scopes.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-750 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Provision New Project Card
          </button>
        )}
      </div>

      {/* Sub tabs selectors */}
      {!isEditing && (
        <div className="flex bg-slate-100 p-0.8 rounded-xl max-w-sm">
          <button
            onClick={() => setActiveSubTab("current")}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === "current" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📊 Current Engagements ({currentProjects.length})
          </button>
          <button
            onClick={() => setActiveSubTab("upcoming")}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === "upcoming" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            💡 Upcoming Pipelines ({upcomingProjects.length})
          </button>
        </div>
      )}

      {/* EDIT / CREATE WORKSPACE */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Metadata Controls on Left Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Target Subdomain Context
              </span>

              {/* Selector for portal */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Customer Subdomain Portal
                </label>
                <select
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden font-mono"
                >
                  {subdomains.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.displayName} ({sub.name}.mobiusservices.co.in)
                    </option>
                  ))}
                  <option value="all">Global Catalog / General Platform view</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Automated Bottling Pipeline Analytics"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="E.g. Logistics Maintenance APAC"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Strategic Brief Overview
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short business case scope..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Show / Hide (Publish state) toggle & Checkboxes configurator */}
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Portal Publish State
                  </span>
                  <span className="text-[10px] text-slate-450 block leading-tight">
                    Show or hide this project in client portals.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPubEnabled(!pubEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    pubEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      pubEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg text-xs leading-none">
                {pubEnabled ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-650 shrink-0" />
                    <span className="font-semibold text-emerald-700">Publish State: SHOW (Active)</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-500">Publish State: HIDE (Draft Mode)</span>
                  </>
                )}
              </div>
            </div>

            {/* Sections to Hide Checkbox configurator */}
            {activeSubTab === "current" && (
              <div className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl shadow-3xs space-y-3 text-left">
                <span className="block text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  📊 Toggle Section Visibility
                </span>
                <span className="text-[10px] text-indigo-700/80 block leading-normal">
                  Toggle visibility for individual charts or modules on the project details scorecard below:
                </span>

                <div className="space-y-2 mt-2">
                  {[
                    { id: "deliveryVolumeChart", label: "Hide Delivery Volumes Graph" },
                    { id: "qualitySLAChart", label: "Hide SLA fulfillment Graph" },
                    { id: "tatChart", label: "Hide Turnaround Time (TAT) Graph" },
                    { id: "governanceDocs", label: "Hide Agreements & Telemetry" },
                    { id: "innovations", label: "Hide Innovations & Impact" },
                    { id: "feedbackRepo", label: "Hide Feedback repository ticket" },
                  ].map((item) => {
                    const isChecked = hiddenSections.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-xs font-medium text-slate-705 hover:text-slate-900 cursor-pointer select-none leading-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setHiddenSections(hiddenSections.filter((id) => id !== item.id));
                            } else {
                              setHiddenSections([...hiddenSections, item.id]);
                            }
                          }}
                          className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 h-3.5 w-3.5 mt-0.5 shrink-0"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Generator Helper widget in Sidebar */}
            <div className="p-5 bg-slate-950 text-slate-200 rounded-2xl border border-slate-900 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-350">
                <Sparkles className="h-4.5 w-4.5 text-amber-400 rotate-12" /> Smart Gemini Hydrater
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Provide a basic title, select a category, and let Gemini compile rich volume metrics, quality trends, innovations data, scope parameters, and feedback entries.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={aiNameInput}
                  onChange={(e) => setAiNameInput(e.target.value)}
                  placeholder="Project name to populate..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleGenerateAIProject}
                  disabled={aiLoading || !aiNameInput}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-500 hover:to-indigo-750 text-white font-semibold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Gemini Simulating Data...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Autocomplete with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Metric Details Form Columns on Right */}
          <div className="lg:col-span-8 space-y-4">
            {/* CURRENT ENGAGEMENT CONDITIONAL FIELDS */}
            {activeSubTab === "current" && (
              <div className="space-y-4">
                {/* SLA Graph inputs */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <h4 className="text-xs font-mono font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2 mb-2">
                      📈 Live Volumes & SLA Quality Trends (comma separated values)
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                      Delivery Monthly Months
                    </label>
                    <input
                      type="text"
                      value={deliveryLabelsStr}
                      onChange={(e) => setDeliveryLabelsStr(e.target.value)}
                      placeholder="Jan, Feb, Mar, Apr, May, Jun"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                      Delivery Values (Volume Packets)
                    </label>
                    <input
                      type="text"
                      value={deliveryValuesStr}
                      onChange={(e) => setDeliveryValuesStr(e.target.value)}
                      placeholder="180, 210, 240, 220, 280, 310"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                      Quality Monthly Months
                    </label>
                    <input
                      type="text"
                      value={qualityLabelsStr}
                      onChange={(e) => setQualityLabelsStr(e.target.value)}
                      placeholder="Jan, Feb, Mar, Apr, May, Jun"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                      Quality complianceValues %
                    </label>
                    <input
                      type="text"
                      value={qualityValuesStr}
                      onChange={(e) => setQualityValuesStr(e.target.value)}
                      placeholder="98.5, 99.1, 98.4, 99.2, 99.5, 99.8"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* TAT exclusive details */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <h4 className="text-xs font-mono font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2 mb-2">
                      ⏱️ Turnaround Time (TAT) Performance metrics
                    </h4>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Target TAT Bound
                    </label>
                    <input
                      type="text"
                      value={tatTarget}
                      onChange={(e) => setTatTarget(e.target.value)}
                      placeholder="E.g., 24 Hours or 2 Hours"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Current Actual Average
                    </label>
                    <input
                      type="text"
                      value={tatActual}
                      onChange={(e) => setTatActual(e.target.value)}
                      placeholder="E.g., 18.5 Hours"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      TAT Values (Trend hours over time)
                    </label>
                    <input
                      type="text"
                      value={tatValuesStr}
                      onChange={(e) => setTatValuesStr(e.target.value)}
                      placeholder="23, 21.5, 20, 19.8, 19.1, 18.5"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Innovations with impact Sub Form */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    💡 Innovations & Enhancements Impact Catalog
                  </h4>

                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={newInnTitle}
                      onChange={(e) => setNewInnTitle(e.target.value)}
                      placeholder="Innovation (e.g. Automated routing optimizer)"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={newInnImpact}
                      onChange={(e) => setNewInnImpact(e.target.value)}
                      placeholder="Business impact description (e.g., cut driver routing hours by 11%)"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddInnovation}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                    >
                      Add Title
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scroll">
                    {innovations.map((inn, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                        <div className="text-left">
                          <span className="font-bold text-slate-800 block">{inn.title}</span>
                          <span className="text-slate-500 text-[11px]">{inn.impact}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInnovations(innovations.filter((_, i) => i !== idx))}
                          className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {innovations.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No innovations listed. Use the AI hydrater to simulate entries.</p>
                    )}
                  </div>
                </div>

                {/* Feedback / Quality repository list */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    💬 Feedback & Clarification Repository Log
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-3 border-b border-slate-50">
                    <div className="md:col-span-6">
                      <input
                        type="text"
                        value={newFbDesc}
                        onChange={(e) => setNewFbDesc(e.target.value)}
                        placeholder="Feedback raised (e.g. latency, formatting)..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="date"
                        value={newFbReportDate}
                        onChange={(e) => setNewFbReportDate(e.target.value)}
                        title="Reported Date"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <select
                        value={newFbStatus}
                        onChange={(e) => setNewFbStatus(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Open">Open</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddFeedback}
                        className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scroll">
                    {feedbackRepo.map((fb, idx) => (
                      <div key={fb.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100 font-sans">
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wide border ${
                              fb.status === "Resolved" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {fb.status}
                            </span>
                            <span className="font-semibold text-slate-850 leading-relaxed">{fb.description}</span>
                          </div>
                          <div className="flex gap-4 text-[10px] text-slate-400 font-mono">
                            <span>Reported: {fb.reportedDate}</span>
                            {fb.resolvedDate && <span>Resolved: {fb.resolvedDate}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleFeedFeedbackStatus(fb.id)}
                            className="text-[10px] font-semibold border border-slate-200 hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded"
                          >
                            Toggle Status
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackRepo(feedbackRepo.filter(f => f.id !== fb.id))}
                            className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {feedbackRepo.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No feedback tickets logged. Use AI generator to prefill.</p>
                    )}
                  </div>
                </div>

                {/* File Upload mock for documents submitted */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    📂 Core Engineering & SLA Documents Upload
                  </h4>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="File name (e.g. unilever_service_agreement)"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <select
                      value={newFileType}
                      onChange={(e) => setNewFileType(e.target.value)}
                      className="px-3 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600"
                    >
                      <option value="document">Microsoft Word (.docx)</option>
                      <option value="deck">PDF Deck (.pdf)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddFileMock}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shrink-0"
                    >
                      Upload File
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-lg text-[11px] text-slate-600">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-semibold">{file.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({file.size})</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="hover:text-rose-600 text-slate-350 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No telemetry reports or engineering manuals uploaded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* UPCOMING PIPELINES CONDITIONAL FIELDS */}
            {activeSubTab === "upcoming" && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold text-slate-900 border-b border-slate-50 pb-2 mb-2 uppercase tracking-wide">
                    📦 Proposal Pipeline & Opportunities Specifics
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Current Lifecycle Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900"
                      >
                        <option value="Requirement gathering">Requirement gathering</option>
                        <option value="POC / pilot">POC / pilot</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Awaiting approval">Awaiting approval</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Deployment Target Timelines
                      </label>
                      <input
                        type="text"
                        value={timelines}
                        onChange={(e) => setTimelines(e.target.value)}
                        placeholder="E.g., Discovery ends mid-July; Launch scheduled Sept 2026"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Business Scope parameters (Full View)
                    </label>
                    <textarea
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      rows={4}
                      placeholder="Detailing exact user journeys, volumes, and requirements mapped from initial discussions..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Proposed Solution Architecture
                    </label>
                    <textarea
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      rows={4}
                      placeholder="Explain the machine learning pipelines, dashboard portals, dynamic APIs, or logistics modules proposed..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Categorized Document Upload shelf */}
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    📝 Proposal Phase Collateral Upload (with Category labels)
                  </h4>

                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={newUpDocName}
                      onChange={(e) => setNewUpDocName(e.target.value)}
                      placeholder="Document name (e.g., pricing_quote_v2)"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <select
                      value={newUpDocCat}
                      onChange={(e) => setNewUpDocCat(e.target.value as any)}
                      className="px-3 border border-slate-200 rounded-lg text-xs bg-slate-100 text-slate-700"
                    >
                      <option value="Sample Data">Sample Data</option>
                      <option value="Pricing">Pricing / proposal</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Solution Approach">Solution Approach</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddUpcomingDocMock}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shrink-0"
                    >
                      Add Document
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {upcomingDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                          <div className="truncate text-left">
                            <span className="font-semibold text-slate-850 truncate block">{doc.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-200/60 rounded text-slate-500 uppercase tracking-widest font-semibold text-[8px] mt-0.5 inline-block">
                              Category: {doc.category}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUpcomingDocs(upcomingDocs.filter((_, i) => i !== idx))}
                          className="text-slate-350 hover:text-rose-600 transition-colors ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {upcomingDocs.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic md:col-span-2">No documents submitted during requirement gathering.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom action bar */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
              >
                Cancel and Reset
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-750 hover:bg-indigo-805 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                {submitting ? "Publishing..." : editingId ? "Save Configurations" : "Publish Project Card"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* RENDER CURRENT PROJECTS DIRECTORY */}
      {!isEditing && activeSubTab === "current" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentProjects.map((proj) => (
              <div 
                key={proj.id}
                className={`p-5 rounded-2xl border transition-all ${
                  proj.enabled === false ? "bg-slate-50/50 border-slate-200 opacity-70" : "bg-white border-slate-100 shadow-3xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-slate-105 border px-2 py-0.5 rounded text-slate-500">
                    Client ID Context: {proj.customerName}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {proj.enabled === false ? (
                      <span className="px-1.5 py-0.5 bg-amber-50 rounded text-[9px] uppercase tracking-wide font-mono font-semibold text-amber-600 border border-amber-200">
                        Hidden
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-50 rounded text-[9px] uppercase tracking-wide font-mono font-semibold text-emerald-600 border border-emerald-200">
                        Live User view
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-left">
                  <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">
                    {proj.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-indigo-600 block mt-0.5">
                    🏢 Dept: {proj.department}
                  </span>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <div className="flex gap-4">
                    <span>📊 Delivery: {proj.deliveryValues.length} months</span>
                    <span>💡 Innovations: {proj.innovations?.length || 0}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCurrentEnable(proj)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 border border-slate-200"
                    >
                      {proj.enabled === false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span>{proj.enabled === false ? "Show" : "Hide"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditCurrentClick(proj)}
                      className="p-1 hover:text-indigo-600 border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
                      title="Edit project details"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Confirm permanent removal?")) {
                          onRefreshCurrent("delete", proj);
                        }
                      }}
                      className="p-1 hover:text-rose-600 border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
                      title="Delete card"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {currentProjects.length === 0 && (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-205">
              <p className="text-xs text-slate-450 font-mono">No ongoing engagements configured yet.</p>
            </div>
          )}
        </div>
      )}

      {/* RENDER UPCOMING PROJECTS DIRECTORY */}
      {!isEditing && activeSubTab === "upcoming" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingProjects.map((proj) => (
              <div 
                key={proj.id}
                className={`p-5 rounded-2xl border transition-all ${
                  proj.enabled === false ? "bg-slate-50/50 border-slate-200 opacity-70" : "bg-white border-slate-100 shadow-3xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">
                    Tenant Target: {proj.customerName}
                  </span>
                  
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 rounded">
                    {proj.status}
                  </span>
                </div>

                <div className="mt-3 text-left">
                  <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">
                    {proj.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                    🏢 Proposed Dept: {proj.department}
                  </span>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span className="font-mono text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded border border-sky-100">
                    ⏱️ timelines: {proj.timelines || "Not declared"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUpcomingEnable(proj)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 border border-slate-200"
                    >
                      {proj.enabled === false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span>{proj.enabled === false ? "Show" : "Hide"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditUpcomingClick(proj)}
                      className="p-1 hover:text-indigo-600 border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Permanently drop upcoming proposal?")) {
                          onRefreshUpcoming("delete", proj);
                        }
                      }}
                      className="p-1 hover:text-rose-600 border border-slate-200 rounded  hover:bg-slate-50 text-slate-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {upcomingProjects.length === 0 && (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-205 font-sans">
              <p className="text-xs text-slate-450 font-mono">No upcoming opportunity cards published yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
