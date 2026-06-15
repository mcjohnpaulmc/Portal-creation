/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubdomainPortal {
  id: string; // e.g., 'unilever'
  name: string; // e.g., 'unilever'
  displayName: string; // e.g., 'Unilever APAC'
  createdAt: string;
}

export interface Solution {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  credentialsDescription: string;
  usernamePrefill?: string;
  passwordPrefill?: string;
  tags?: string[];
  createdAt: string;
  enabled?: boolean;
  customerName?: string; // Associated customer subdomain portal name
}

export interface Collateral {
  id: string;
  title: string;
  thumbnail: string;
  prompt: string;
  generatedContent: string;
  uploadedFiles: { name: string; size: string; type: string }[];
  createdAt: string;
  enabled?: boolean;
  customerName?: string; // Associated customer subdomain portal name
}

export interface UserLog {
  id: string;
  email: string;
  action: string;
  details: string;
  date: string;
}

export interface CurrentProject {
  id: string;
  customerName: string; // matches subdomain/slug e.g., 'unilever', 'reliance'
  name: string;
  description: string;
  department: string;
  deliveryLabels: string[];
  deliveryValues: number[];
  qualityLabels: string[];
  qualityValues: number[];
  innovations: { title: string; impact: string }[];
  tatTarget?: string;
  tatActual?: string;
  tatLabels?: string[];
  tatValues?: number[];
  feedbackRepo: { id: string; description: string; reportedDate: string; resolvedDate: string | null; status: "Open" | "Resolved" }[];
  documents: { name: string; size: string; type: string }[];
  enabled?: boolean;
  createdAt: string;
  hiddenSections?: string[]; // list of hidden sections/charts, e.g. ['deliveryVolumeChart', 'qualitySLAChart']
}

export interface UpcomingProject {
  id: string;
  customerName: string;
  name: string;
  description: string;
  status: "Requirement gathering" | "POC / pilot" | "Proposal" | "Awaiting approval";
  scope: string;
  solution: string;
  timelines: string;
  department: string;
  documents: { name: string; size: string; type: string; category: "Sample Data" | "Pricing" | "Proposal" | "Solution Approach" }[];
  enabled?: boolean;
  createdAt: string;
  hiddenSections?: string[];
}

export interface AppState {
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
