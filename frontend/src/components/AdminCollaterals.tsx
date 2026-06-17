/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit2, Sparkles, X, Check, FileText, LayoutTemplate, Film, FileUp, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Collateral } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AdminCollateralsProps {
  collaterals: Collateral[];
  onRefresh: (action: string, collateralData: any) => Promise<void>;
  subdomains?: { id: string; name: string; displayName: string }[];
  prefilledSubdomain?: string | null;
}

export function AdminCollaterals({ 
  collaterals, 
  onRefresh,
  subdomains = [],
  prefilledSubdomain
}: AdminCollateralsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("all");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800");
  const [prompt, setPrompt] = useState(
    "Create a comprehensive, production-grade industry case study based on the following title, core instructions, and reference documents. Organize into 🏢 About the Customer, ⚠️ The Problem, 👁️ The Solution (render a clean text-based system structural flow ASCII diagram), and 📈 Impact & Insights. Maintain a precise and metric-driven enterprise tone."
  );

  // File picker mockup states (multiple selection)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState("document"); // document, deck, video

  // Generation preview states
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationInstruction, setGenerationInstruction] = useState("Drafting Case Study Index...");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (prefilledSubdomain) {
      setCustomerName(prefilledSubdomain);
    }
  }, [prefilledSubdomain]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setCustomerName("all");
    setTitle("");
    setThumbnail("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800");
    setPrompt(
      "Create a comprehensive, production-grade industry case study based on the following title, core instructions, and reference documents. Organize into 🏢 About the Customer, ⚠️ The Problem, 👁️ The Solution (render a clean text-based system structural flow ASCII diagram), and 📈 Impact & Insights. Maintain a precise and metric-driven enterprise tone."
    );
    setUploadedFiles([]);
    setGeneratedContent("");
    setNewFileName("");
  };

  // Simulated rapid steps during Gemini generation
  const simulateSteps = async () => {
    const steps = [
      "Securing background briefings...",
      "Extracting raw client parameters...",
      "Analyzing supply obstacles...",
      "Ingesting structural blueprints...",
      "Formatting case study layout using Gemini 3.5..."
    ];
    for (const step of steps) {
      setGenerationInstruction(step);
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  const handleGenerateAI = async () => {
    if (!title) {
      alert("Please provide a title for the collateral use case study before using Gemini.");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    
    // Stagger loading messages nicely
    const simulatorPromise = simulateSteps();

    try {
      const apiPromise = fetch("/api/admin/generate-collateral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt,
          uploadedFiles
        })
      });

      const [_, res] = await Promise.all([simulatorPromise, apiPromise]);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gemini Generation encountered an error.");
      } else {
        setGeneratedContent(data.generatedContent);
      }
    } catch (err) {
      alert("Network error occurred during case study composition.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddFileMock = () => {
    if (!newFileName) return;
    
    let extension = ".docx";
    let mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let size = "1.2 MB";

    if (newFileType === "deck") {
      extension = ".pdf";
      mime = "application/pdf";
      size = "4.5 MB";
    } else if (newFileType === "video") {
      extension = ".mp4";
      mime = "video/mp4";
      size = "24.1 MB";
    }

    const cleanName = newFileName.includes(".")
      ? newFileName
      : `${newFileName.replace(/\s+/g, "_")}${extension}`;

    const newFileObj = {
      name: cleanName,
      size,
      type: mime
    };

    setUploadedFiles([...uploadedFiles, newFileObj]);
    setNewFileName("");
  };

  const handleRemoveFileMock = (idx: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx));
  };

  const handleCommitCollateral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !generatedContent) {
      alert("Please generate or provide the case study markdown content before committing.");
      return;
    }

    setSubmitting(true);
    const payload = {
      id: editingId || undefined,
      title,
      thumbnail,
      prompt,
      generatedContent,
      uploadedFiles,
      customerName,
      enabled: editingId ? (collaterals.find((c) => c.id === editingId)?.enabled !== false) : true
    };

    try {
      await onRefresh(editingId ? "update" : "create", payload);
      resetForm();
    } catch (err) {
      alert("Error committing collateral portfolio item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (col: Collateral) => {
    setEditingId(col.id);
    setCustomerName(col.customerName || "all");
    setTitle(col.title);
    setThumbnail(col.thumbnail);
    setPrompt(col.prompt);
    setGeneratedContent(col.generatedContent);
    setUploadedFiles(col.uploadedFiles || []);
    setIsEditing(true);
  };

  const handleToggleEnable = async (coll: Collateral) => {
    const nextState = coll.enabled === false ? true : false;
    await onRefresh("update", { ...coll, enabled: nextState });
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("video/")) return <Film className="h-4 w-4 text-indigo-500" />;
    if (mime === "application/pdf") return <LayoutTemplate className="h-4 w-4 text-amber-500" />;
    return <FileText className="h-4 w-4 text-emerald-500" />;
  };

  return (
    <div id="admin-collaterals-view" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 leading-tight">
            Collaterals & AI Synthesis Portal
          </h3>
          <p className="text-xs text-slate-500">
            Ingest client manuals/decisions, edit prompts, and compose publication-grade case summaries using Gemini AI.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Synthesize New Collateral
          </button>
        )}
      </div>

      {isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configurations Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Metadata Settings
              </span>

              {/* Linked Subdomain */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Linked Customer Subdomain Portal (Visiblity context)
                </label>
                <select
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden font-mono"
                >
                  <option value="all">Publish to All Portals (Global Asset)</option>
                  {subdomains.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.displayName} ({sub.name}.mobiusservices.co.in)
                    </option>
                  ))}
                </select>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Case Study Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., PepsiCo Logistics Modernization Study"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
                  required
                />
              </div>

              {/* Cover Thumbnail Image url */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Cover Photo Address / Link
                </label>
                <input
                  type="url"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/your-card-image"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
                  required
                />
              </div>
            </div>

            {/* Simulated file upload cabinet */}
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Source Document Upload Shelf
              </span>

              {/* Add file widget */}
              <div className="flex gap-2.5">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter file name (e.g. pilot_spec)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Format:</span>
                    {["document", "deck", "video"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewFileType(type)}
                        className={`text-[9px] px-2 py-0.5 rounded-sm border capitalize ${
                          newFileType === type ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-250 text-slate-500"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddFileMock}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl transition-all flex items-center justify-center text-slate-700 font-semibold text-xs h-10 self-start"
                >
                  <FileUp className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* File list */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scroll">
                {uploadedFiles.map((file, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-600"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(file.type)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 font-medium shrink-0">
                      <span>{file.size}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFileMock(fIdx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {uploadedFiles.length === 0 && (
                  <div className="p-5 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400">
                      Drag-and-drop or use upload helper to add briefs, slide decks (PPTX/PDF), and video demos.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Prompting Controller */}
            <div className="p-5 bg-slate-950 text-slate-200 rounded-2xl border border-slate-900 space-y-3 shadow-md">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-4 w-4 text-amber-400" /> Case Blueprint Prompt
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] leading-relaxed text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-slate-700 font-mono"
              />

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-950"
              >
                {isGenerating ? "Gemini Compiling Case Study..." : "Compile Case Study with Gemini"}
              </button>
            </div>
          </div>

          {/* AI Generator Preview Screen */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-3xs flex-1 flex flex-col min-h-120">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-500" /> Case Study Dynamic Screen Preview
                </span>
                {generatedContent && (
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 ${isGenerating ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>

              {/* Large scrollable text blocks */}
              <div className="flex-1 overflow-y-auto max-h-140 custom-scroll border border-slate-100 rounded-xl bg-slate-50/50 p-4.5 relative text-left">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 text-center"
                    >
                      <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
                      <h4 className="font-display font-semibold text-sm text-slate-900">
                        Writing Comprehensive Case Study
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-1 animate-pulse">
                        {generationInstruction}
                      </p>
                    </motion.div>
                  ) : generatedContent ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap select-text font-mono"
                    >
                      {generatedContent}
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50/40 text-center select-none text-slate-400">
                      <Sparkles className="h-8 w-8 text-slate-300 mb-3" />
                      <p className="text-xs">No case materials generated yet.</p>
                      <p className="text-[10px] text-slate-300 mt-1 max-w-xs">
                        Configure the customer details on the left, upload telemetry sources, and launch Gemini to preview output.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom save bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 text-xs font-semibold transition-colors"
                >
                  Clear Entry
                </button>
                <button
                  type="button"
                  onClick={handleCommitCollateral}
                  disabled={submitting || !generatedContent}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl disabled:opacity-50 hover:shadow-lg transition-all shadow-slate-350"
                >
                  {submitting ? "Committing..." : editingId ? "Update Collateral Study" : "Commit Case Study to System"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Collaterals Database */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collaterals.map((coll) => (
            <div
              key={coll.id}
              className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                coll.enabled === false ? "border-slate-200 bg-slate-50/50 opacity-80" : "border-slate-100 hover:border-slate-200 hover:shadow-2xs bg-white"
              }`}
            >
              <div className="h-20 w-32 rounded-xl bg-slate-50 border border-slate-150 overflow-hidden shrink-0">
                <img
                  src={coll.thumbnail}
                  alt={coll.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
                <div>
                  <h4 className="font-display font-semibold text-xs text-slate-900 uppercase tracking-wide truncate flex items-center gap-1.5">
                    <span className="truncate">{coll.title}</span>
                    {coll.enabled === false ? (
                      <span className="shrink-0 text-[8px] bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.5 rounded-sm uppercase tracking-wide font-semibold font-sans">
                        Hidden
                      </span>
                    ) : (
                      <span className="shrink-0 text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 py-0.5 rounded-sm uppercase tracking-wide font-semibold font-sans">
                        Visible
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-relaxed">
                    Prompt: "{coll.prompt}"
                  </p>
                  <span className="inline-block mt-2 text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-0.5 rounded-sm font-semibold">
                    📂 Reference documents: {coll.uploadedFiles?.length || 0}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Created: {new Date(coll.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleEnable(coll)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-semibold transition-all ${
                        coll.enabled === false
                          ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-sans"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-sans"
                      }`}
                      title={coll.enabled === false ? "Show in User View" : "Hide from User View"}
                    >
                      {coll.enabled === false ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(coll)}
                      className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-450 hover:text-slate-850 transition-colors"
                      title="Edit Collateral"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {collaterals.length === 0 && (
            <div className="md:col-span-2 text-center p-8 bg-slate-50 rounded-2xl border border-slate-150">
              <p className="text-xs text-slate-400 font-mono">No synthesized collaterals cataloged as of this session.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
