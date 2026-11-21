/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'hi' | 'gu' | 'mr' | 'ta' | 'te' | 'bn';

export interface MedicineOverview {
  name: string;
  composition: string;
  manufacturer: string;
  image?: string;
  price?: string;
  strength?: string;
  category?: string;
  prescriptionRequired: boolean;
}

export interface DetailedCard {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'danger' | 'accent';
  icon?: string;
}

export interface SearchResult {
  isFallback?: boolean;
  ehr_unavailable?: boolean;
  ehrSafety?: EHRSafetyReport;
  overview: MedicineOverview;
  productIntroduction: string;
  whyUsed: string;
  howItWorks: string;
  benefits: string[];
  sideEffects: string[];
  foodInteractions: string;
  drugInteractions: string[];
  pregnancySafety: string;
  alternatives: Array<{ name: string; price: string; matchPercentage: number }>;
  priceComparison: { online: string; retail: string; savings: string };
  nearbyAvailability: Array<{ pharmacy: string; distance: string; status: string }>;
  clinicalInfo: {
    drugClass: string;
    halfLife: string;
    dosageRange: string;
    excretion: string;
  };
  patientView: {
    simpleExplanation: string;
    whyPrescribed: string;
    howToTake: string;
    commonSideEffects: string;
    warnings: string;
    interactions: string;
    availability: string;
    pricing: string;
  };
  professionalView: {
    drugClass: string;
    therapeuticClass: string;
    atcClassification: string;
    mechanismOfAction: string;
    pharmacology: string;
    pharmacokinetics: string;
    contraindications: string;
    monitoringParameters: string;
    clinicalReferences: string[];
  };
}

export interface ComparisonResult {
  isFallback?: boolean;
  medicineA: string;
  medicineB: string;
  comparison: {
    composition: { a: string; b: string; same: boolean };
    strength: { a: string; b: string; same: boolean };
    uses: { a: string; b: string; same: boolean };
    sideEffects: { a: string; b: string; same: boolean };
    price: { a: string; b: string; savings: string };
    manufacturer: { a: string; b: string };
    availability: { a: string; b: string };
  };
  keyDifference: string;
  recommendation: string;
}

export interface MultiComparisonResult {
  isFallback?: boolean;
  medicines: string[];
  comparison: {
    composition: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    strength: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    uses: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    sideEffects: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    price: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    manufacturer: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
    availability: { values: Record<string, string>; same: boolean; differencesAnalysis?: string };
  };
  keyDifference: string;
  recommendation: string;
}

export interface PrescriptionAnalysisResult {
  isFallback?: boolean;
  ehr_unavailable?: boolean;
  ehrSafety?: EHRSafetyReport;
  left: {
    summary: string;
    patientDetails: {
      name: string;
      age: string;
      gender: string;
      date?: string;
    };
    detectedMedicines: Array<{
      name: string;
      composition: string;
      dosage: string;
      duration: string;
      instruction: string;
    }>;
    detectedTests: string[];
    followUpPlan: string;
    medicationSchedule: Array<{
      time: string; // 'Morning' | 'Afternoon' | 'Night'
      medicines: string[];
    }>;
  };
  right: {
    medicationIntelligence: string;
    drugInteractions: string[];
    duplicateTherapyStatus: string;
    foodInteractions: string;
    warnings: string[];
    alternativeBrands: Array<{ original: string; alt: string; priceDiff: string }>;
    estimatedMonthlyCost: string;
  };
}

export interface ChatAnswer {
  isFallback?: boolean;
  quickAnswer: string;
  detailedExplanation: string;
  safetyNotes: string;
  relatedMedicines: string[];
  suggestedFollowUp: string[];
}

export interface Pharmacy {
  name: string;
  distance: string;
  openStatus: 'open' | 'closed';
  deliveryAvailable: boolean;
  deliveryTime: string;
  priceLevel: '₹' | '₹₹' | '₹₹₹';
  availabilityStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  phone?: string;
  address?: string;
}

export interface AuthenticityResult {
  isFallback?: boolean;
  authenticityScore: number; // 0-100
  manufacturerMatch: 'Matched Verified' | 'Mismatched' | 'Unknown';
  packagingMatch: 'Authentic Design' | 'Suspicious Elements' | 'Unknown';
  riskIndicators: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
  batchDetails: {
    batchNumber?: string;
    expiryDate?: string;
    manufacturerRegistered?: boolean;
  };
}

// ── EHR Safety Engine Integration Types ──

export interface EHRAlertResponse {
  severity: string;
  title: string;
  description: string;
  mechanism?: string;
  evidence_level?: string;
  clinical_significance?: string;
}

export interface EHRSafetyReport {
  is_safe: boolean;
  alerts: EHRAlertResponse[];
  ai_insights?: string;
  ai_alternatives?: string[];
  request_id?: string;
}

export interface FactCheckCitation {
  source: string; // e.g. "CDSCO", "ICMR Guidelines", "National Formulary of India (NFI)", "PubMed"
  title: string;
  referenceUrl?: string;
  quoteOrFinding: string;
}

export interface FactCheckResult {
  isFallback?: boolean;
  claim: string;
  verdict: 'VERIFIED_SAFE' | 'MYTH_MISLEADING' | 'DANGEROUS' | 'CAUTION_REQUIRED';
  verdictBadge: string;
  summary: string;
  scientificExplanation: string;
  actionGuidance: string;
  citations: FactCheckCitation[];
}

export interface AllergenCatalogItem {
  id: string;
  name: string;
  description: string;
  common_brands: string;
  severity: string;
  sample_ingredients: string[];
}

