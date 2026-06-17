/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit2, Check, X, Shield, Globe, Image, Tag, Key, Eye, EyeOff } from "lucide-react";
import { Solution } from "../types";

interface AdminSolutionsProps {
  solutions: Solution[];
  onRefresh: (action: string, solutionData: any) => Promise<void>;
  subdomains?: { id: string; name: string; displayName: string }[];
  prefilledSubdomain?: string | null;
}

// Crisp thumbnail recommendations
const VISUAL_PRESETS = [
  { label: "Dashboard", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" },
  { label: "Sourcing", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" },
  { label: "Retail Tech", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" },
  { label: "Server Room", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800" }
];

export function AdminSolutions({ 
  solutions, 
  onRefresh,
  subdomains = [],
  prefilledSubdomain
}: AdminSolutionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("all");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [credentialsDescription, setCredentialsDescription] = useState("");
  const [usernamePrefill, setUsernamePrefill] = useState("");
  const [passwordPrefill, setPasswordPrefill] = useState("");
  const [tagsInput, setTagsInput] = useState("");
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
    setThumbnail("");
    setAppUrl("");
    setCredentialsDescription("");
    setUsernamePrefill("");
    setPasswordPrefill("");
    setTagsInput("");
  };

  const handleEditClick = (sol: Solution) => {
    setEditingId(sol.id);
    setCustomerName(sol.customerName || "all");
    setTitle(sol.title);
    setThumbnail(sol.thumbnail);
    setAppUrl(sol.url);
    setCredentialsDescription(sol.credentialsDescription);
    setUsernamePrefill(sol.usernamePrefill || "");
    setPasswordPrefill(sol.passwordPrefill || "");
    setTagsInput(sol.tags ? sol.tags.join(", ") : "");
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !appUrl || !thumbnail) {
      alert("Please complete all primary fields (Title, Application URL, Visual Thumbnail).");
      return;
    }

    setSubmitting(true);
    const splitTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      id: editingId || undefined,
      title,
      thumbnail,
      url: appUrl,
      credentialsDescription,
      usernamePrefill,
      passwordPrefill,
      tags: splitTags,
      customerName,
      enabled: editingId ? (solutions.find((s) => s.id === editingId)?.enabled !== false) : true,
    };

    try {
      await onRefresh(editingId ? "update" : "create", payload);
      resetForm();
    } catch (err) {
      alert("Execution error while trying to onboard solution.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnable = async (sol: Solution) => {
    const nextState = sol.enabled === false ? true : false;
    await onRefresh("update", { ...sol, enabled: nextState });
  };

  return (
    <div id="admin-solutions-view" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 leading-tight">
            Solution Onboarding Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Provision active cloud systems, set copyable guest keys, and map custom tag indices.
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
            Onboard New Solution
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {editingId ? "Edit Solution Resource" : "Onboard New Utility"}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Subdomain */}
            <div className="md:col-span-2">
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

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Solution Name / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Mobius Supply Chain Tracker"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Application URL
              </label>
              <input
                type="url"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://dashboard.mobiusservices.co.in"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>

            {/* Thumbnail URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Image className="h-3 w-3" /> Visual Thumbnail Link (or Select Preset below)
              </label>
              <input
                type="url"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://images.unsplash.com/your-image-url"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
                required
              />
              
              {/* Preset selectors */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-[10px] text-slate-400 self-center uppercase mr-1.5 font-semibold">Presets:</span>
                {VISUAL_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setThumbnail(preset.url)}
                    className={`text-[10px] px-2.5 py-1 rounded-md border text-slate-600 transition-all ${
                      thumbnail === preset.url ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tag Categories (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Computer Vision, Logistics, Real-time"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              />
            </div>

            {/* Credentials Description */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Credentials Instruction / Context
              </label>
              <input
                type="text"
                value={credentialsDescription}
                onChange={(e) => setCredentialsDescription(e.target.value)}
                placeholder="E.g., Authorized guest credentials. Admin bypass active."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              />
            </div>

            {/* Username Prefill */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Key className="h-3 w-3" /> Username prefill (Optional)
              </label>
              <input
                type="text"
                value={usernamePrefill}
                onChange={(e) => setUsernamePrefill(e.target.value)}
                placeholder="ops@client.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              />
            </div>

            {/* Password Prefill */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Key className="h-3 w-3" /> Password prefill (Optional)
              </label>
              <input
                type="text"
                value={passwordPrefill}
                onChange={(e) => setPasswordPrefill(e.target.value)}
                placeholder="AuthorizedPass2026!"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3.5">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving changes..." : editingId ? "Apply Modifications" : "Launch Solution"}
            </button>
          </div>
        </form>
      )}

      {/* Solutions Catalogue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {solutions.map((sol) => (
          <div
            key={sol.id}
            id={`onboarded-${sol.id}`}
            className={`flex gap-4 p-4.5 bg-white rounded-2xl border transition-all relative overflow-hidden group ${
              sol.enabled === false ? "border-slate-200 bg-slate-50/50 opacity-80" : "border-slate-100 hover:border-slate-200 hover:shadow-2xs"
            }`}
          >
            {/* Visual preview */}
            <div className="h-20 w-32 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
              <img
                src={sol.thumbnail}
                alt={sol.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Meta values */}
            <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
              <div>
                <h4 className="font-display font-semibold text-xs text-slate-900 uppercase tracking-wide truncate flex items-center gap-1.5">
                  <span className="truncate">{sol.title}</span>
                  {sol.enabled === false ? (
                    <span className="shrink-0 text-[8px] bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.5 rounded-sm uppercase tracking-wide font-semibold font-sans">
                      Hidden
                    </span>
                  ) : (
                    <span className="shrink-0 text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 py-0.5 rounded-sm uppercase tracking-wide font-semibold font-sans">
                      Visible
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                  Path: {sol.url}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {sol.tags && sol.tags.map((tag, tagIdx) => (
                    <span key={tagIdx} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-sm text-slate-500 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prefill stats preview */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Guest: {sol.usernamePrefill ? "Encrypted" : "None"}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleEnable(sol)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-semibold transition-all ${
                      sol.enabled === false
                        ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-sans"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-sans"
                    }`}
                    title={sol.enabled === false ? "Show on User View" : "Hide from User View"}
                  >
                    {sol.enabled === false ? (
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
                    onClick={() => handleEditClick(sol)}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-450 hover:text-slate-850 transition-colors"
                    title="Edit System Parameters"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {solutions.length === 0 && (
          <div className="md:col-span-2 text-center p-8 bg-slate-50 rounded-2xl border border-slate-150">
            <p className="text-xs text-slate-400 font-mono">No corporate solutions onboarded as of this session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
