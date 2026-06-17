/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, Mail, AlertTriangle, Building, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface AccessWallProps {
  onSuccess: (email: string) => void;
}

export function AccessWall({ onSuccess }: AccessWallProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorString, setErrorString] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString("");
    
    if (!email || !email.includes("@")) {
      setErrorString("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setErrorString(data.error || "Access Denied. Something went wrong.");
      } else {
        localStorage.setItem("mobius_work_email", data.email);
        onSuccess(data.email);
      }
    } catch (err: any) {
      setErrorString("Server connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="access-wall" className="p-6 md:p-8 max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-xl mx-auto my-12 text-center">
      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-slate-50 text-slate-700 mb-6 border border-slate-100">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <h3 className="font-display text-2xl font-semibold text-slate-900 tracking-tight mb-2">
        Enterprise Gateway Only
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        This resource is restricted. Access is granted exclusively to authenticated personnel with business or enterprise corporate credentials.
      </p>

      <form onSubmit={handleSubmit} className="text-left space-y-4">
        <div>
          <label htmlFor="access-email" className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              id="access-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-1 focus:ring-slate-800 transition-all text-slate-900"
              required
            />
          </div>
        </div>

        {errorString && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs leading-relaxed"
          >
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorString}</span>
          </motion.div>
        )}

        <button
          id="btn-authenticate"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-all disabled:opacity-50 hover:shadow-lg shadow-slate-350"
        >
          {loading ? "Verifying corporate domains..." : "Authenticate Workspace"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Building className="h-3.5 w-3.5" />
        <span>Gmail, Yahoo, Outlook and other consumer addresses are blocked</span>
      </div>
    </div>
  );
}
