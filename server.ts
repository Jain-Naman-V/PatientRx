/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Increase payload bounds to allow prescription & packaging photos to be sent via Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Normalize routes so endpoints work whether requested with /api prefix or without
const API_ENDPOINTS = [
  'search', 'compare', 'compare-multi', 'prescription', 'chat', 'authenticity',
  'med-image', 'drug-interactions', 'prescription-safety', 'drug-safety-search',
  'patient/register', 'patient/login', 'patient/profile', 'patient/safety-check',
  'fact-check', 'allergies', 'patient/consent/grant', 'patient/consent/active', 'patient/consent/revoke'
];
app.use((req, res, next) => {
  const cleanPath = req.path.replace(/^\//, '');
  if (!req.url.startsWith('/api/') && API_ENDPOINTS.some(ep => cleanPath === ep || cleanPath.startsWith(ep + '/'))) {
    req.url = '/api' + req.url;
  }
  next();
});

// ── EHR API Configuration ──
const EHR_API_KEY = process.env.EHR_API_KEY || '';
const EHR_API_BASE_URL = process.env.EHR_API_BASE_URL || '';
const EHR_CONFIGURED = !!(EHR_API_KEY && EHR_API_KEY !== 'MY_EHR_API_KEY' && EHR_API_BASE_URL);

const SAFETY_API_BASE_URL = process.env.SAFETY_API_BASE_URL || EHR_API_BASE_URL;

async function callPatientSafetyApi(endpoint: string, method: string, body: any, token: string) {
  if (!SAFETY_API_BASE_URL) throw new Error('SAFETY_API_BASE_URL not configured');
  const response = await fetch(`${SAFETY_API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Safety API returned ${response.status}`);
  return data;
}

async function callEhrApi(endpoint: string, body: any): Promise<any> {
  if (!EHR_CONFIGURED) {
    throw new Error('EHR_API_KEY not configured');
  }
  const response = await fetch(`${EHR_API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': EHR_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`EHR API returned ${response.status}: ${text}`);
  }
  return response.json();
}

// Helper: safe initialization of Google Gen AI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      console.warn('⚠️ WARNING: GEMINI_API_KEY is not configured or left as default. Live AI capabilities will fall back to local intelligence.');
      throw new Error('MISSING_KEY');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
    });
  }
  return aiClient;
}

// Global fallbacks for offline / missing-key scenarios
import { getFallbackSearch, getFallbackComparison, getMultiFallback, getFallbackPrescription, getFallbackChat, getFallbackAuthenticity } from './fallback-database.js';

async function callGeminiWithFallback(params: { contents: any; config?: any }) {
  const client = getGeminiClient();
  const envModel = process.env.GEMINI_MODEL_NAME?.trim();
  
  // Cascade through preferred and reliable models
  const candidateModels = [
    ...(envModel ? [envModel] : []),
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
  ];
  const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Handler] Attempting call with model: ${modelName} (attempt ${attempt}/2)`);
        const response = await client.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          console.log(`[Gemini Handler] Model ${modelName} succeeded!`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.error(`[Gemini Handler] Model ${modelName} attempt ${attempt}/2 error:`, err?.message || err);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  throw lastError || new Error('All models exhausted');
}

// ---- API ENDPOINTS ----

// 1. Search Medicine
app.post('/api/search', async (req, res) => {
  const { query, lang = 'en' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious, an elite AI medication authority.
      The user is searching for details on: "${query}" in language code "${lang}".

      You must query medical knowledge and output a strictly structured JSON matching the SearchResult interface.
      Ensure the language returned matches the given language code "${lang}" for all user-facing content (clinical terminology can remain universal if standard).
      Languages table: en=English, hi=Hindi, gu=Gujarati, mr=Marathi, ta=Tamil, te=Telugu, bn=Bengali.
      Provide detailed, trusted, realistic clinical and patient explanations.

      The returned JSON should look exactly like:
      {
        "overview": {
          "name": "Generic or Brand Name of Drug",
          "composition": "Active Chemical Ingredients (e.g. Paracetamol 650mg)",
          "manufacturer": "Associated Pharmaceutical Lab (e.g. Micro Labs)",
          "price": "Average price range (e.g. ₹30 - ₹45 per strip of 15)",
          "strength": "Dose strength",
          "category": "Therapeutic category",
          "prescriptionRequired": true or false
        },
        "productIntroduction": "A comprehensive introductory overview of the drug (e.g., its development, typical forms, its standing in clinical usage, and user-friendly explanation of why it is trusted)",
        "whyUsed": "Plain-English summary of why this drug is prescribed",
        "howItWorks": "Fascinating patient-centric description of biological mechanism",
        "benefits": [
          "Therapeutic benefit 1: Rapid relief within 30 minutes of consumption",
          "Therapeutic benefit 2: High safety profile for adults when adhering to specified dosages",
          "Therapeutic benefit 3: Dual action formulation designed for pain relief and temperature regulation"
        ],
        "sideEffects": ["Side effect 1", "Side effect 2", "Side effect 3"],
        "foodInteractions": "Warnings regarding food or drink (e.g., alcohol, milk, citrus fruits)",
        "drugInteractions": ["Interacts with Drug X (Severity: High)", "Interacts with Drug Y (Severity: Moderate)"],
        "pregnancySafety": "Official FDA pregnancy category and warning level details",
        "alternatives": [
          {"name": "Alternative Drug 1", "price": "₹XX per strip", "matchPercentage": 98},
          {"name": "Alternative Drug 2", "price": "₹XX per strip", "matchPercentage": 95}
        ],
        "priceComparison": { "online": "₹XX", "retail": "₹YY", "savings": "ZZ%" },
        "nearbyAvailability": [
          { "pharmacy": "Apollo Pharmacy", "distance": "0.4 km", "status": "In Stock" },
          { "pharmacy": "MedPlus", "distance": "1.2 km", "status": "In Stock" },
          { "pharmacy": "Local Wellness Pharmacy", "distance": "2.1 km", "status": "Low Stock" }
        ],
        "clinicalInfo": {
          "drugClass": "Pharmacological class name",
          "halfLife": "Duration of half-life",
          "dosageRange": "Standard adult daily dosage guidelines",
          "excretion": "Mechanism of metabolic clearance/excretion"
        },
        "patientView": {
          "simpleExplanation": "Extremely simple layman's description",
          "whyPrescribed": "What diagnoses warrant this",
          "howToTake": "Detailed steps: with or after meal, timezone rules",
          "commonSideEffects": "Common, manageable issues",
          "warnings": "Critical precautions",
          "interactions": "What to avoid taking concurrently",
          "availability": "How common is it in typical shops",
          "pricing": "Patient-oriented cost summary"
        },
        "professionalView": {
          "drugClass": "In-depth class context",
          "therapeuticClass": "Therapeutic class taxonomy",
          "atcClassification": "ATC Code",
          "mechanismOfAction": "Direct molecular level detail",
          "pharmacology": "Pharmacodynamic principles",
          "pharmacokinetics": "Absorption, Distribution, Metabolism profile",
          "contraindications": "Absolute contraindications list",
          "monitoringParameters": "Clinical vital checks recommended during treatment",
          "clinicalReferences": ["Reference Journal 1", "Reference Journal 2"]
        }
      }
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Search API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackSearch(query, lang);
    return res.json({ ...fallback, isFallback: true });
  }
});

// 2. Drug Comparison
app.post('/api/compare', async (req, res) => {
  const { medA, medB, lang = 'en' } = req.body;
  if (!medA || !medB) {
    return res.status(400).json({ error: 'Both meds to compare are required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious, a healthcare informatics compared-drug intelligence engine.
      The user is comparing: "${medA}" vs "${medB}" (Language translation code requested: "${lang}").

      Output a strictly structured JSON matching the ComparisonResult interface.
      The output must be JSON format only, matching:
      {
        "medicineA": "${medA}",
        "medicineB": "${medB}",
        "comparison": {
          "composition": { "a": "Chemical composite med A", "b": "Chemical composite med B", "same": true or false },
          "strength": { "a": "Strength med A", "b": "Strength med B", "same": true or false },
          "uses": { "a": "Uses med A", "b": "Uses med B", "same": true or false },
          "sideEffects": { "a": "Sides med A", "b": "Sides med B", "same": true or false },
          "price": { "a": "Price med A", "b": "Price med B", "savings": "Calculated difference or 'Marginal'" },
          "manufacturer": { "a": "Maker med A", "b": "Maker med B" },
          "availability": { "a": "Availability med A", "b": "Availability med B" }
        },
        "keyDifference": "One clear expert-level sentence on how they differ clinical-wise or price-wise",
        "recommendation": "Objective clinical perspective summary context"
      }
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Compare API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackComparison(medA, medB, lang);
    return res.json({ ...fallback, isFallback: true });
  }
});

// 2b. Multi-Drug Comparison Dashboard
app.post('/api/compare-multi', async (req, res) => {
  const { medicines, lang = 'en' } = req.body;
  if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
    return res.status(400).json({ error: 'At least two medicines are required for comparison' });
  }

  const medsToCompare = medicines.slice(0, 5); // limit to max 5 for performance

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious, a healthcare informatics compared-drug intelligence engine.
      The user is comparing these medications: ${JSON.stringify(medsToCompare)} (Language translation code requested: "${lang}").

      Output a strictly structured JSON matching the MultiComparisonResult interface.
      The output must be JSON format only, matching:
      {
        "medicines": ${JSON.stringify(medsToCompare)},
        "comparison": {
          "composition": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are chemical composition descriptions
            },
            "same": true or false, // true if all contain the identical active ingredient
            "differencesAnalysis": "One brief sentence summarizing active compound differences"
          },
          "strength": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are strength/dosages
            },
            "same": true or false,
            "differencesAnalysis": "One brief sentence explaining strength/dosage discrepancies"
          },
          "uses": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are primary therapeutic uses
            },
            "same": true or false,
            "differencesAnalysis": "One brief sentence comparing medical indications"
          },
          "sideEffects": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are common side effects
            },
            "same": true or false,
            "differencesAnalysis": "One brief sentence on side effect profile variance"
          },
          "price": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are price range/standards
            },
            "same": true or false,
            "differencesAnalysis": "One brief sentence on price comparison, highlighting the most economical option"
          },
          "manufacturer": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are registered manufacturers
            }
          },
          "availability": {
            "values": {
              // keys MUST be the exact medication names from ${JSON.stringify(medsToCompare)}, values are pharmacy availability footprints
            }
          }
        },
        "keyDifference": "One clear expert-level sentence on how they differ clinical-wise or price-wise",
        "recommendation": "Objective clinical perspective summary context advising safe consumption"
      }
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Multi-compare API falling back to local database. Reason: ${reason}`);
    const fallback = getMultiFallback(medsToCompare, lang);
    return res.json({ ...fallback, isFallback: true });
  }
});

// 3. Prescription Analysis (Multimodal or Raw text OCR)
app.post('/api/prescription', async (req, res) => {
  const { imageBase64, textContent, lang = 'en' } = req.body;

  try {
    const client = getGeminiClient();
    
    let parts: any[] = [];
    if (imageBase64) {
      // Stripping data prefixes if exists
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
    }

    const ocrInstruction = textContent ? `Raw text provided from prescription: "${textContent}"` : 'Please perform OCR on the attached prescription.';

    const systemPrompt = `
      You are Med Conscious Premium Clinical Prescription Analyzer.
      Analyze this prescription image or text content.
      ${ocrInstruction}

      Extract and translate all relevant details and output them in a secure JSON structure matching the PrescriptionAnalysisResult interface:
      {
        "left": {
          "summary": "Medical summary of condition or overall therapy plan",
          "patientDetails": {
            "name": "Full name detected or 'Not Stated'",
            "age": "Age detected or 'Not Stated'",
            "gender": "Gender detected or 'Not Stated'",
            "date": "Date of prescription or current day"
          },
          "detectedMedicines": [
            {
              "name": "Medicine Name (e.g., Augmentin 625 Duo)",
              "composition": "Chemical composition (e.g., Amoxicillin + Clavulanic Acid)",
              "dosage": "e.g., 1 tablet twice a day",
              "duration": "e.g., 5 days",
              "instruction": "e.g., Post Meal / with plenty of water"
            }
          ],
          "detectedTests": ["Blood Sugar test", "TSH level checks" or equivalents],
          "followUpPlan": "e.g., Visit in 2 weeks or if symptoms persist",
          "medicationSchedule": [
            { "time": "Morning (8:00 AM)", "medicines": ["Medicine A", "Medicine B"] },
            { "time": "Afternoon (1:30 PM)", "medicines": ["Medicine C"] },
            { "time": "Night (9:30 PM)", "medicines": ["Medicine A", "Medicine D"] }
          ]
        },
        "right": {
          "medicationIntelligence": "Concise deep clinical assessment of this combinational therapy",
          "drugInteractions": ["Interaction warning 1", "Interaction warning 2" or "No major interactions detected"],
          "duplicateTherapyStatus": "Analysis of potential therapist overlap / therapeutic duplicates (e.g. Taking two NSAIDs)",
          "foodInteractions": "Advice regarding milk, caffeine, alcohol, meals timing",
          "warnings": ["Warning 1", "Warning 2" or critical flags],
          "alternativeBrands": [
            { "original": "Augmentin 625 Duo", "alt": "Clavam 625 (Alkem)", "priceDiff": "Save 30%" }
          ],
          "estimatedMonthlyCost": "Estimated medical spend comparison or typical cost"
        }
      }

      Strictly return this JSON output, fully translated to "${lang}" (except standard medical names).
    `;

    parts.push({ text: systemPrompt });

    const response = await callGeminiWithFallback({
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Prescription Analyzer API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackPrescription(lang);
    return res.json({ ...fallback, isFallback: true });
  }
});

// 4. Medication Chat / Conversational Perplexity-Style Intelligence
app.post('/api/chat', async (req, res) => {
  const { message, history = [], lang = 'en', patientContext } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message parameter is required' });
  }

  try {
    const client = getGeminiClient();

    let contextSection = '';
    if (patientContext && (patientContext.name || patientContext.allergies || patientContext.conditions)) {
      contextSection = `
        PATIENT MEDICAL PROFILE:
        - Patient Name: ${patientContext.name || 'User'}
        - Age & Sex: ${patientContext.age || 'Not stated'} yrs, ${patientContext.sex || 'Not stated'}
        - Known Drug Allergies: ${patientContext.allergies || 'None reported'}
        - Chronic Conditions: ${patientContext.conditions || 'None reported'}
        - Active Daily Medications: ${JSON.stringify(patientContext.active_medications || [])}
        CLINICAL MANDATE: You MUST actively evaluate if the medicines or symptoms asked about conflict with this patient's documented allergies (${patientContext.allergies || 'None'}) or conditions (${patientContext.conditions || 'None'}). Address them by name and explicitly state if it is safe or requires caution.
      `;
    } else {
      contextSection = `
        PATIENT CONTEXT: Patient is NOT signed in / medical profile is unknown.
        CLINICAL MANDATE: Give the accurate medical explanation. At the end, gently remind the patient that they can tell you their chronic conditions or allergies (e.g. Diabetes, Penicillin allergy) to get tailored interaction warnings.
      `;
    }

    // Format conversation history for multi-turn context retention
    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const turns = history
        .filter((h: any) => {
          if (!h) return false;
          const txt = typeof h === 'string' ? h : (h.text || h.content || '');
          if (!txt || typeof txt !== 'string') return false;
          if (txt.trim().startsWith('Namaste! I am your MedConscious')) return false;
          return true;
        })
        .slice(-10) // preserve the last 10 messages for rich multi-turn continuity
        .map((h: any) => {
          const isUser = (h.sender === 'user' || h.role === 'user');
          const speaker = isUser ? 'Patient' : 'MedConscious AI Consultant';
          const content = typeof h === 'string' ? h : (h.text || h.content || '');
          return `${speaker}: ${content.trim()}`;
        });

      if (turns.length > 0) {
        formattedHistory = `
        ACTIVE CONVERSATION HISTORY (Previous discussion in this consultation):
        ${turns.join('\n\n')}
        `;
      }
    }

    const prompt = `
      You are Med Conscious Core Chat intelligence, an elite evidence-based clinical digital medicine consultant.

      ${contextSection}

      ${formattedHistory}

      CURRENT PATIENT QUESTION: "${message}" (Language code requested: "${lang}").

      CRITICAL CONTEXT CONTINUITY & FOLLOW-UP MANDATE:
      1. CONTINUOUS CONSULTATION:
         - You are having an ongoing, multi-turn clinical consultation with the patient.
         - Carefully check the ACTIVE CONVERSATION HISTORY above.
         - If the current message is a follow-up (e.g., "which one to take first?", "how do we plan so we can take both?", "what are its side effects?", "can I take it with milk?"), you MUST anchor your response directly to the specific medications, dosages, and interactions established earlier in the conversation (such as Thyroid medication vs Gastric medication / PPIs / Antacids).
         - Resolve all pronouns and ambiguous references ("it", "they", "them", "which one", "both") using the medications and topics from the conversation history. Do NOT ask the user to re-specify medicines that have already been identified in previous turns.
         - Never reset context or provide generic, abstract advice when specific medications were already under discussion.
      2. DIRECT ACTIONABLE ADVICE:
         - In "quickAnswer", provide an immediate, unambiguous answer (e.g., explicitly specify which medication to take first and the exact time gap).
         - In "detailedExplanation", give clear step-by-step morning / daily schedule instructions with clinical rationale (such as empty stomach absorption vs binding interactions).
      3. PATIENT SAFETY:
         - Highlight critical separation times (e.g. 30-60 min for empty stomach; 4 hours for antacids/calcium/iron binding).

      Generate a beautiful, visual, and modular Perplexity-style answer structure matching the ChatAnswer interface.
      The output must be JSON format only, matching:
      {
        "quickAnswer": "Direct, highly reassuring, bold summary answer (1-2 sentences)",
        "detailedExplanation": "Complete, thorough clinical assessment using bullet points or paragraphs, tailored to patient understanding.",
        "safetyNotes": "Important warnings, things to remember, or pregnancy/kidney-safety guidelines.",
        "relatedMedicines": ["Related drug or compound 1", "Related drug or compound 2"],
        "suggestedFollowUp": [
          "Suggest follow-up question 1?",
          "Suggest follow-up question 2?"
        ]
      }

      Strictly translate the values to the language requested: "${lang}".
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Chat API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackChat(message, lang, history);
    return res.json({ ...fallback, isFallback: true });
  }
});

// 5. Counterfeit Packaging Analysis
app.post('/api/authenticity', async (req, res) => {
  const { imageBase64, batchNumber, lang = 'en' } = req.body;

  try {
    const client = getGeminiClient();
    let parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
    }

    const batchPrompt = batchNumber ? `Report on Batch Number detected: "${batchNumber}"` : '';

    const systemPrompt = `
      You are Med Conscious Authenticity & Counterfeit Scanning Center.
      Evaluate the packaging/strip image or details.
      ${batchPrompt}

      Analyze standard typography alignment, holographic labels, logo elements, registered manufacturer alignment, and active regulatory serial verification.
      Produce an AuthenticityResult JSON object:
      {
        "authenticityScore": 95, // 0-100 indicating confidence in product genuineness
        "manufacturerMatch": "Matched Verified" | "Mismatched" | "Unknown",
        "packagingMatch": "Authentic Design" | "Suspicious Elements" | "Unknown",
        "riskIndicators": ["Any anomalies detected or 'None - packaging matches repository specs'"],
        "confidenceLevel": "High" | "Medium" | "Low",
        "batchDetails": {
          "batchNumber": "Extracted or provided batch number",
          "expiryDate": "Parsed expiry date or active duration status",
          "manufacturerRegistered": true/false
        }
      }

      Language: "${lang}". Strictly format output as valid JSON.
    `;

    parts.push({ text: systemPrompt });

    const response = await callGeminiWithFallback({
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Authenticity API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackAuthenticity(batchNumber, lang);
    return res.json({ ...fallback, isFallback: true });
  }
});


// 5. Search Medication Image from Google Images
app.get('/api/med-image', async (req, res) => {
  const query = req.query.query as string;
  if (!query) {
    return res.redirect('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop');
  }

  try {
    // Add packaging keywords to retrieve realistic blister pack / pill packaging results
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " tablet capsule packaging blister")}&tbm=isch`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Search responded with ${response.status}`);
    }

    const html = await response.text();
    
    // Extract gstatic thumbnail image URLs. These are stable, fast, and prevent CORS/hotlink issues.
    const gstaticRegex = /https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[A-Za-z0-9_-]+/g;
    const matches = html.match(gstaticRegex);
    
    if (matches && matches.length > 0) {
      // Pick the first result, clean any unescaped ampersands
      const imageUrl = matches[0].replace(/&amp;/g, '&');
      return res.redirect(imageUrl);
    }
    
    // Direct Fallback if packaging keywords failed:
    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
    const fbResponse = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (fbResponse.ok) {
      const fbHtml = await fbResponse.text();
      const fbMatches = fbHtml.match(gstaticRegex);
      if (fbMatches && fbMatches.length > 0) {
        return res.redirect(fbMatches[0].replace(/&amp;/g, '&'));
      }
    }

    // Default general pharmacy pill box image
    return res.redirect('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop');
  } catch (error) {
    console.warn(`Medication image lookup failed for '${query}'. Redirecting to default. Details:`, error.message);
    return res.redirect('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop');
  }
});

// ── EHR Safety Engine Proxy Endpoints ──

// 6. Drug-Drug Interaction Check (proxies to Prescription Safety Engine EHR API)
app.post('/api/drug-interactions', async (req, res) => {
  const { drugs } = req.body;
  if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
    return res.status(400).json({ error: 'At least two drugs are required for interaction check' });
  }

  try {
    const data = await callEhrApi('/safety/check-drugs', { drugs });
    return res.json(data);
  } catch (err: any) {
    console.warn(`EHR API drug-interactions failed: ${err.message}`);
    return res.json({ ehr_unavailable: true, is_safe: true, alerts: [] });
  }
});

// 7. Prescription Safety Check (proxies to EHR check-prescription)
app.post('/api/prescription-safety', async (req, res) => {
  const { medications, patient } = req.body;
  if (!medications || !Array.isArray(medications) || medications.length === 0) {
    return res.status(400).json({ error: 'At least one medication is required' });
  }

  try {
    const data = await callEhrApi('/safety/check-prescription', { medications, patient });
    return res.json(data);
  } catch (err: any) {
    console.warn(`EHR API prescription-safety failed: ${err.message}`);
    return res.json({ ehr_unavailable: true, is_safe: true, alerts: [] });
  }
});

// 8. Hybrid Drug Safety Search — Gemini explanation enriched with EHR DDI data
app.post('/api/drug-safety-search', async (req, res) => {
  const { query, lang = 'en' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious, an elite AI medication authority.
      The user is searching for details on: "${query}" in language code "${lang}".

      You must query medical knowledge and output a strictly structured JSON matching the SearchResult interface.
      Ensure the language returned matches the given language code "${lang}" for all user-facing content.
      Languages table: en=English, hi=Hindi, gu=Gujarati, mr=Marathi, ta=Tamil, te=Telugu, bn=Bengali.
      Provide detailed, trusted, realistic clinical and patient explanations.

      The returned JSON should look exactly like:
      {
        "overview": {
          "name": "Generic or Brand Name of Drug",
          "composition": "Active Chemical Ingredients",
          "manufacturer": "Pharmaceutical Lab",
          "price": "Price range",
          "strength": "Dose strength",
          "category": "Therapeutic category",
          "prescriptionRequired": true or false
        },
        "productIntroduction": "Comprehensive introductory overview",
        "whyUsed": "Plain-English summary",
        "howItWorks": "Biological mechanism description",
        "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
        "sideEffects": ["Side effect 1", "Side effect 2"],
        "foodInteractions": "Warnings regarding food or drink",
        "drugInteractions": ["Interaction 1 (Severity: High)", "Interaction 2 (Severity: Moderate)"],
        "pregnancySafety": "FDA pregnancy category",
        "alternatives": [{"name": "Alt Drug", "price": "₹XX", "matchPercentage": 98}],
        "priceComparison": { "online": "₹XX", "retail": "₹YY", "savings": "ZZ%" },
        "nearbyAvailability": [{"pharmacy": "Apollo", "distance": "0.4 km", "status": "In Stock"}],
        "clinicalInfo": { "drugClass": "Class", "halfLife": "Duration", "dosageRange": "Guidelines", "excretion": "Metabolic clearance" },
        "patientView": { "simpleExplanation": "Layman description", "whyPrescribed": "Diagnoses", "howToTake": "Steps", "commonSideEffects": "Common issues", "warnings": "Precautions", "interactions": "What to avoid", "availability": "How common", "pricing": "Cost summary" },
        "professionalView": { "drugClass": "Class", "therapeuticClass": "Taxonomy", "atcClassification": "ATC", "mechanismOfAction": "Molecular detail", "pharmacology": "Principles", "pharmacokinetics": "ADME profile", "contraindications": "Absolute contraindications", "monitoringParameters": "Vital checks", "clinicalReferences": ["Ref 1"] }
      }
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const geminiData = JSON.parse(response.text || '{}');

    // Try to enrich with EHR safety data
    try {
      const drugName = (geminiData.overview?.composition || query).split(/\s+/)[0];
      const ehrData = await callEhrApi('/safety/check-drugs', { drugs: [drugName] });
      const words = query.toLowerCase().split(/\s+/);
      const ddiKeywords = ['interaction', 'with', 'and', 'vs', 'versus', 'together'];
      if (ddiKeywords.some(k => words.includes(k))) {
        geminiData.ehrSafety = ehrData;
      }
    } catch (ehrErr: any) {
      console.warn(`EHR enrichment failed for drug-safety-search: ${ehrErr.message}`);
      geminiData.ehr_unavailable = true;
    }

    return res.json(geminiData);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isRateLimit = err.status === 429 || errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('EXHAUSTED');
    const reason = isRateLimit ? 'Gemini API Rate-Limited / Quota Exceeded (429)' : err.message || 'Connection offline';
    console.warn(`Drug Safety Search API falling back to local database. Reason: ${reason}`);
    const fallback = getFallbackSearch(query, lang);
    return res.json({ ...fallback, isFallback: true, ehr_unavailable: true });
  }
});

// ── Patient account and canonical safety engine proxy ──
app.post('/api/patient/register', async (req, res) => {
  try {
    return res.json(await callPatientSafetyApi('/patient/auth/register', 'POST', req.body, ''));
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Patient registration failed' });
  }
});

app.post('/api/patient/login', async (req, res) => {
  try {
    return res.json(await callPatientSafetyApi('/patient/auth/login', 'POST', req.body, ''));
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Patient login failed' });
  }
});

app.put('/api/patient/profile', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Patient login required' });
  try {
    return res.json(await callPatientSafetyApi('/patient/profile', 'PUT', req.body, token));
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Patient profile update failed' });
  }
});

app.post('/api/patient/safety-check', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Patient login required' });
  try {
    return res.json(await callPatientSafetyApi('/patient/safety-check', 'POST', req.body, token));
  } catch (err: any) {
    console.warn(`Patient safety check failed: ${err.message}`);
    return res.status(502).json({ error: err.message || 'Safety engine unavailable' });
  }
});

// ── AI Fact-Check with Cited Scientific Verdicts ──
app.post('/api/fact-check', async (req, res) => {
  const { claim, lang = 'en' } = req.body;
  if (!claim) {
    return res.status(400).json({ error: 'Claim text is required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious Clinical Fact-Checking Authority.
      The user is asking to verify this medicine/health claim or rumor: "${claim}" (Language code: "${lang}").

      Evaluate against authoritative sources: CDSCO (Central Drugs Standard Control Organisation), ICMR (Indian Council of Medical Research), National Formulary of India (NFI), WHO, and peer-reviewed clinical pharmacology literature.

      Return a strictly formatted JSON object matching FactCheckResult:
      {
        "claim": "${claim.replace(/"/g, '\\"')}",
        "verdict": "VERIFIED_SAFE" | "MYTH_MISLEADING" | "DANGEROUS" | "CAUTION_REQUIRED",
        "verdictBadge": "e.g. ❌ Dangerous Myth, or ✅ Clinically Verified Safe, or ⚠️ Caution Advised",
        "summary": "Clear, reassuring 2-sentence plain-language verdict for the patient translated into language code '${lang}'",
        "scientificExplanation": "Detailed pharmacological reason and risk breakdown translated into language code '${lang}'",
        "actionGuidance": "Actionable, direct instruction on what the patient should do translated into language code '${lang}'",
        "citations": [
          {
            "source": "CDSCO / ICMR / National Formulary of India (NFI) / PubMed",
            "title": "Specific advisory or clinical study title",
            "quoteOrFinding": "Relevant clinical takeaway"
          }
        ]
      }
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (err: any) {
    console.warn(`Fact-check fallback triggered for: ${claim}`);
    return res.json({
      isFallback: true,
      claim,
      verdict: 'CAUTION_REQUIRED',
      verdictBadge: '⚠️ Caution: Requires Clinical Verification',
      summary: 'This claim involves drug safety parameters that require clinician supervision. Avoid discontinuing or combining potent medications based solely on informal claims.',
      scientificExplanation: 'Drug pharmacokinetics, liver enzyme interactions, and clinical conditions require individualized medical review.',
      actionGuidance: 'Please confirm with your attending doctor or registered clinical pharmacist before making changes to your regimen.',
      citations: [
        {
          source: 'CDSCO Drug Safety Notice',
          title: 'Advisory on Self-Medication & Prescription Integrity',
          quoteOrFinding: 'Medicines should only be consumed under medical direction.'
        }
      ]
    });
  }
});

// ── Master Allergens Catalog Proxy ──
app.get('/api/allergies', async (req, res) => {
  try {
    const data = await callPatientSafetyApi('/allergies', 'GET', null, '');
    return res.json(data);
  } catch (err: any) {
    return res.json([
      { id: 'penicillins', name: 'Penicillins & Beta-Lactams', description: 'Beta-lactam antibiotics', common_brands: 'Augmentin, Mox', severity: 'High', sample_ingredients: ['amoxicillin', 'ampicillin'] },
      { id: 'cephalosporins', name: 'Cephalosporins', description: 'Broad-spectrum antibiotics', common_brands: 'Cefix, Taxim', severity: 'High', sample_ingredients: ['cefixime', 'cefuroxime'] },
      { id: 'nsaids', name: 'NSAIDs & Aspirin', description: 'Pain relievers and blood thinners', common_brands: 'Ecosprin, Combiflam', severity: 'High', sample_ingredients: ['aspirin', 'ibuprofen', 'diclofenac'] },
      { id: 'sulfa', name: 'Sulfonamides (Sulfa)', description: 'Sulfa antibiotics', common_brands: 'Bactrim, Septran', severity: 'High', sample_ingredients: ['sulfamethoxazole'] },
      { id: 'macrolides', name: 'Macrolides', description: 'Respiratory antibiotics', common_brands: 'Azithral, Rulide', severity: 'Moderate', sample_ingredients: ['azithromycin'] },
      { id: 'statins', name: 'Statins', description: 'Cholesterol-lowering agents', common_brands: 'Atorva, Rosuvas', severity: 'Moderate', sample_ingredients: ['atorvastatin', 'rosuvastatin'] }
    ]);
  }
});

// ── Patient Consented Sharing Endpoints ──
app.post('/api/patient/consent/grant', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Patient login required' });
  try {
    return res.json(await callPatientSafetyApi('/patient/consent/grant', 'POST', req.body, token));
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Unable to grant consent' });
  }
});

app.get('/api/patient/consent/active', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Patient login required' });
  try {
    return res.json(await callPatientSafetyApi('/patient/consent/active', 'GET', null, token));
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Unable to fetch active consent' });
  }
});

app.post('/api/patient/consent/revoke', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Patient login required' });
  try {
    return res.json(await callPatientSafetyApi('/patient/consent/revoke', 'POST', req.body, token));
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Unable to revoke consent' });
  }
});


// ---- FRONTEND VITE INTEGRATION ----

// In development, hook up the Vite dev server middleware (when not on Vercel Serverless)
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production standalone node server, serve the compiled assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // ServeSPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Med Conscious Full-Stack Server starting on http://0.0.0.0:${PORT}`);
  });
}

export default app;
export { app };
