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
const PORT = 3000;

// Increase payload bounds to allow prescription & packaging photos to be sent via Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Global fallbacks for offline / missing-key scenarios
import { getFallbackSearch, getFallbackComparison, getMultiFallback, getFallbackPrescription, getFallbackChat, getFallbackAuthenticity } from './fallback-database.js';

async function callGeminiWithFallback(params: { contents: any; config?: any }) {
  const client = getGeminiClient();
  const modelsToTry = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Gemini Handler] Model ${modelName} transition state (attempt ${attempt}/2)`);
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
  const { message, history = [], lang = 'en' } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message parameter is required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `
      You are Med Conscious Core Chat intelligence, a friendly digital medicine consultant.
      The user is asking: "${message}" in language code "${lang}".

      History context check: ${JSON.stringify(history)}

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
    const fallback = getFallbackChat(message, lang);
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


// ---- FRONTEND VITE INTEGRATION ----

// In development, hook up the Vite dev server middleware
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // In production, serve the compiled assets
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
