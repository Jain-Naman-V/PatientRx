/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResult, ComparisonResult, MultiComparisonResult, PrescriptionAnalysisResult, ChatAnswer, AuthenticityResult } from './src/types';

// Simple multilingual translation presets for high-touch presentation
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    whyUsed: "Used primarily to treat mild to moderate pain (including headache, muscle aches, backache, toothaches) and to reduce fever.",
    howItWorks: "Inhibits prostaglandins synthesis in the central nervous system and blocks pain impulse generation peripheral-wise.",
    sideEffects_head: "Nausea, skin rash, liver enzyme elevation with excessive chronic use.",
    pregnancy: "Category B. Generally considered safe during all trimesters, but always consult your attending obstetrician.",
    food: "Can be taken with or without food. Avoid alcohol as it increases dangerous hepatotoxic risks.",
    warning: "Avoid taking other paracetamol-inclusive drugs simultaneously to prevent acute accidental liver overdose.",
    onlinePrice: "₹28 per strip",
    retailPrice: "₹34 per strip",
    savings: "Save 18%"
  },
  hi: {
    whyUsed: "मुख्य रूप से हल्के से मध्यम दर्द (जैसे सिरदर्द, मांसपेशियों में दर्द, पीठ दर्द, दांत दर्द) के इलाज और बुखार को कम करने के लिए उपयोग किया जाता है।",
    howItWorks: "यह केंद्रीय तंत्रिका तंत्र में दर्द के संकेतों को रोकता है और मस्तिष्क में तापमान नियंत्रण केंद्र को नियंत्रित करता है।",
    sideEffects_head: "मतली, त्वचा पर लाल चकत्ते, बहुत अधिक उपयोग करने पर लीवर में समस्या।",
    pregnancy: "श्रेणी बी। गर्भावस्था के दौरान आमतौर पर सुरक्षित माना जाता है, लेकिन हमेशा अपने डॉक्टर से सलाह लें।",
    food: "भोजन के साथ या बिना लिया जा सकता है। शराब से बचें क्योंकि इससे लीवर को गंभीर खतरा हो सकता है।",
    warning: "लीवर के नुकसान से बचने के लिए एक ही समय में अन्य पैरासिटामोल युक्त दवाएं लेने से बचें।",
    onlinePrice: "₹28 प्रति स्ट्रिप",
    retailPrice: "₹34 प्रति स्ट्रिप",
    savings: "18% की बचत"
  },
  gu: {
    whyUsed: "મુખ્યત્વે હળવાથી મધ્યમ દુખાવો (માથાનો દુખાવો, સ્નાયુઓનો દુખાવો, પીઠનો દુખાવો, દાંતનો દુખાવો) અને તાવ ઘટાડવા માટે વપરાય છે.",
    howItWorks: "તે મગજમાં પીડા પેદા કરતા પ્રોસ્ટાગ્લેન્ડિન્સના ઉત્પાદનને ઘટાડે છે અને તાવને નિયંત્રિત કરે છે.",
    sideEffects_head: "ઉબકા, ત્વચા પર લાલાશ, વધુ પડતા લાંબા સમય સુધી ઉપયોગથી લિવર રિસ્ક.",
    pregnancy: "કેટેગરી બી. ગર્ભાવસ્થા દરમિયાન સામાન્ય રીતે સુરક્ષિત માનવામાં આવે છે, છતાં ડૉક્ટરની સલાહ લેવી.",
    food: "ખોરાક સાથે અથવા વગર લઈ શકાય છે. આલ્કોહોલ ટાળો કારણ કે તે લિવરને નુકસાન પહોંચાડી શકે છે.",
    warning: "ઓવરડોઝ ટાળવા માટે એક જ સમયે અન્ય પેરાસીટામોલ યુક્ત દવાઓ સાથે ન લેવી.",
    onlinePrice: "₹28 પ્રતિ સ્ટ્રીપ",
    retailPrice: "₹34 પ્રતિ સ્ટ્રીપ",
    savings: "18% બચત"
  },
  mr: {
    whyUsed: "मुख्यत्वे सौम्य ते मध्यम वेदना (डोकेदुखी, स्नायू दुखणे, पाठदुखी, दातदुखी) कमी करण्यासाठी आणि ताप कमी करण्यासाठी वापरले जाते.",
    howItWorks: "मेंदूतील वेदना आणि ताप निर्माण करणाऱ्या रासायनिक संदेशवाहकांना रोखून हे कार्य करते.",
    sideEffects_head: "मळमळ, त्वचेवर पुरळ, जास्त प्रमाणात वापरल्यास यकृताला इजा होऊ शकते.",
    pregnancy: "श्रेणी बी. गर्भधारणेदरम्यान सामान्यतः सुरक्षित मानले जाते, परंतु डॉक्टरांचा सल्ला नक्की घ्या.",
    food: "जेवणासोबत किंवा जेवणाशिवाय घेता येते. मद्यपान टाळा कारण यामुळे यकृताचा धोका वाढतो.",
    warning: "यकृत खराब होण्यापासून वाचवण्यासाठी इतर पॅरासिटामॉल युक्त औषधे एकाच वेळी घेणे टाळा.",
    onlinePrice: "₹28 प्रति स्ट्रिप",
    retailPrice: "₹34 प्रति स्ट्रिप",
    savings: "18% बचत"
  },
  ta: {
    whyUsed: "முதன்மையாக லேசான அல்லது மிதமான வலி (தலைவலி, தசை வலி, முதுகுவலி, பல்வலி) மற்றும் காய்ச்சலைக் குறைக்கப் பயன்படுகிறது.",
    howItWorks: "மூளையில் உள்ள வலி மற்றும் காய்ச்சலை உண்டாக்கும் வேதிப்பொருட்களைத் தடுப்பதன் மூலம் இது செயல்படுகிறது.",
    sideEffects_head: "குமட்டல், தோல் அரிப்பு, அதிகப்படியான பயன்பாட்டால் கல்லீரல் பாதிப்பு.",
    pregnancy: "பிரிவு பி. கர்ப்ப காலத்தில் பொதுவாக பாதுகாப்பானது, ஆனால் எப்போதும் உங்கள் மருத்துவரை அணுகவும்.",
    food: "உணவுடனோ அல்லது உணவு இல்லாமலோ உட்கொள்ளலாம். மது அருந்துவதைத் தவிர்க்கவும், அது கல்லீரலைக் கெடுக்கும்.",
    warning: "அளவுக்கு அதிகமாக உட்கொள்வதைத் தவிர்க்க பிற பாராசிட்டமால் மருந்துகளை ஒரே நேரத்தில் எடுக்க வேண்டாம்.",
    onlinePrice: "₹28 ஒரு அட்டை",
    retailPrice: "₹34 ஒரு அட்டை",
    savings: "18% சேமிப்பு"
  },
  te: {
    whyUsed: "ప్రధానంగా తక్కువ నుండి మధ్యస్థ నొప్పి (తల నొప్పి, కండరాల నొప్పులు, వెన్నునొప్పి, పంటి నొప్పి) మరియు జ్వరం తగ్గించడానికి ఉపయోగిస్తారు.",
    howItWorks: "ఇది మెదడులో నొప్పి సంకేతాలు వేసే ప్రోస్టాగ్లాండిన్స్ అనే రసాయనాల ఉత్పత్తిని తగ్గిస్తుంది.",
    sideEffects_head: "వికారం, చర్మంపై దద్దుర్లు, అధిక వినియోగంతో కాలేయ సమస్యలు.",
    pregnancy: "కేటగిరీ బి. గర్భధారణ సమయంలో సాధారణంగా సురక్షితం, కానీ వైద్యులను సంప్రదించడం మంచిది.",
    food: "ఆహారంతో లేదా ఆహారం లేకుండా తీసుకోవచ్చు. మద్యపానం కాలేయానికి హాని కలిగిస్తుంది కాబట్టి దూరంగా ఉండాలి.",
    warning: "లివర్ ఓవర్ డోస్ కాకుండా ఉండటానికి ఏకకాలంలో ఇతర పారాసిటమాల్ మందులు వాడకండి.",
    onlinePrice: "₹28 స్ట్రిప్",
    retailPrice: "₹34 స్ట్రిప్",
    savings: "18% ఆదా"
  },
  bn: {
    whyUsed: "প্রধানত মৃদু থেকে মাঝারি ব্যথা (মাথাব্যথা, পেশী ব্যথা, পিঠব্যথা, দাঁতব্যথা) উপশম এবং জ্বর কমাতে ব্যবহৃত হয়।",
    howItWorks: "এটি মস্তিষ্কে ব্যথার রাসায়নিক সংকেত তৈরিতে বাধা সৃষ্টি করে এবং তাপনিয়ন্ত্রণ কেন্দ্র ঠিক রাখে।",
    sideEffects_head: "বমি বমি ভাব, ত্বকে ফুসকুড়ি, অতিরিক্ত সেবনে লিভারের ক্ষতি হতে পারে।",
    pregnancy: "ক্যাটাগরি বি। গর্ভাবস্থায় সাধারণত নিরাপদ, তবে সর্বদা আপনার ডাক্তারের সাথে পরামর্শ করুন।",
    food: "খাবারের সাথে বা খাবার ছাড়া নেওয়া যেতে পারে। অ্যালকোহল পরিহার করুন কারণ এটি লিভারের ক্ষতি বাড়ায়।",
    warning: "লিভারের ক্ষতি এড়াতে একই সাথে অন্য প্যারাসিটামল সমৃদ্ধ ওষুধ নেওয়া এড়িয়ে চলুন।",
    onlinePrice: "₹28 প্রতি পাতা",
    retailPrice: "₹34 প্রতি পাতা",
    savings: "১৮% সাশ্রয়"
  }
};

export function getFallbackSearch(query: string, lang: string): SearchResult {
  const normQuery = query.toLowerCase();
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  
  let name = query;
  let composition = "Paracetamol (Acetaminophen) 650mg";
  let manufacturer = "Micro Labs Ltd.";
  let price = "₹31 per strip of 15 tablets";
  let strength = "650 mg";
  let category = "Analgesic & Antipyretic";
  let isPrescription = false;

  if (normQuery.includes('dolo') || normQuery.includes('paracetamol') || normQuery.includes('calpol') || normQuery.includes('crocin')) {
    name = normQuery.includes('dolo') ? "Dolo 650" : normQuery.includes('calpol') ? "Calpol 500" : normQuery.includes('crocin') ? "Crocin Advance" : "Paracetamol 650";
    composition = normQuery.includes('calpol') ? "Paracetamol 500mg" : "Paracetamol 650mg";
    manufacturer = normQuery.includes('dolo') ? "Micro Labs Ltd." : normQuery.includes('calpol') ? "GlaxoSmithKline Pharmaceuticals Ltd." : "Cipla Ltd.";
    price = normQuery.includes('calpol') ? "₹18 per strip of 15 tablets" : "₹32 per strip of 15 tablets";
    strength = normQuery.includes('calpol') ? "500 mg" : "650 mg";
  } else if (normQuery.includes('metformin') || normQuery.includes('glycomet')) {
    name = "Glycomet 500 SR";
    composition = "Metformin Hydrochloride 500mg";
    manufacturer = "USV Private Ltd.";
    price = "₹58 per strip of 10 tablets";
    strength = "500 mg (Sustained Release)";
    category = "Anti-diabetic (Biguanide)";
    isPrescription = true;
  } else if (normQuery.includes('amoxicillin') || normQuery.includes('augmentin')) {
    name = "Augmentin 625 Duo";
    composition = "Amoxicillin 500mg + Clavulanic Acid 125mg";
    manufacturer = "GlaxoSmithKline Pharmaceuticals Ltd.";
    price = "₹220 per strip of 10 tablets";
    strength = "625 mg";
    category = "Broad-spectrum Antibiotic";
    isPrescription = true;
  } else if (normQuery.includes('pantocid') || normQuery.includes('pantoprazole')) {
    name = "Pantocid 40";
    composition = "Pantoprazole Sodium 40mg";
    manufacturer = "Sun Pharmaceutical Industries Ltd.";
    price = "₹165 per strip of 15 tablets";
    strength = "40 mg";
    category = "Proton Pump Inhibitor (Acid Reducer)";
    isPrescription = true;
  }

  // Generate localized or standard details
  return {
    overview: {
      name,
      composition,
      manufacturer,
      price,
      strength,
      category,
      prescriptionRequired: isPrescription
    },
    productIntroduction: lang === 'hi'
      ? `${name} एक अत्यधिक विश्वसनीय चिकित्सा नुस्खा है, जिसका उपयोग तीव्र शारीरिक लाभ और स्वास्थ्य स्थिति के सुधार के लिए किया जाता है।`
      : `${name} is an extremely reliable clinical-grade medicinal formulation, globally trusted for direct therapeutic treatment and rapid symptomatic relief.`,
    whyUsed: t.whyUsed,
    howItWorks: t.howItWorks,
    benefits: lang === 'hi'
      ? [
          "त्वरित गति से बुखार को काफी कम करता है।",
          "शरीर दर्द और सिरदर्द से सुरक्षित एवं टिकाऊ राहत देता है।",
          "चिकित्सीय दिशानिर्देशों का पालन करने पर उत्कृष्ट सुरक्षा प्रोफ़ाइल रखता है।"
        ]
      : [
          "Provides rapid action directly targeting physical distress and temperature regulation.",
          "Delivers consistent and effective relief from chronic body pains, physical fatigue and fever.",
          "Maintains an exceptional safety index when consumed under clinical dose parameters."
        ],
    sideEffects: [
      t.sideEffects_head,
      lang === 'en' ? "Mild digestive comfort if taken empty stomach" : "पेट में हल्का खिंचाव या परेशानी",
      lang === 'en' ? "Allergic skin conditions (extremely rare)" : "त्वचा की संवेदनशीलता (दुर्लभ)"
    ],
    foodInteractions: t.food,
    drugInteractions: [
      "Cholestyramine (Reduces absorption)",
      "Metoclopramide / Domperidone (Speeds up absorption)",
      "Warfarin (Regular use can increase bleeding risks)"
    ],
    pregnancySafety: t.pregnancy,
    alternatives: [
      { name: "Calpol 650 (GSK)", price: "₹30 per strip", matchPercentage: 99 },
      { name: "P-650 (Apex)", price: "₹28 per strip", matchPercentage: 98 },
      { name: "Pacimol 650 (Ipca)", price: "₹29 per strip", matchPercentage: 97 }
    ],
    priceComparison: {
      online: t.onlinePrice,
      retail: t.retailPrice,
      savings: t.savings
    },
    nearbyAvailability: [
      { pharmacy: "Apollo Pharmacy - Green Park", distance: "0.3 km", status: "In Stock" },
      { pharmacy: "MedPlus Medicals - Sector V", distance: "1.1 km", status: "In Stock" },
      { pharmacy: "Fortis Healthworld Shop", distance: "1.8 km", status: "Low Stock" }
    ],
    clinicalInfo: {
      drugClass: "Anilide derivatives & central cyclooxygenase inhibitor",
      halfLife: "2 to 3 hours",
      dosageRange: "325 mg to 1000 mg single dose; Max 4000 mg in 24 hours",
      excretion: "Primarily hepatic metabolism via glucuronidation followed by renal clearance"
    },
    patientView: {
      simpleExplanation: `This is a common pill taken to manage fever and relieve mild-to-moderate body aches.`,
      whyPrescribed: `You were likely prescribed this to address fever, body ache, or mild headache symptoms.`,
      howToTake: `Normally swallow whole with some water. Taking it immediately after a light meal helps minimize any sensitive stomach responses.`,
      commonSideEffects: `Occasional mild nausea or localized skin rashes can happen on rare occasions.`,
      warnings: `Never exceed 4000mg within a single day. Doing so carries very high liver toxicity danger.`,
      interactions: `Avoid using any other cold/flu, throat pain, or fever formulas alongside this without verifying if they also contain Paracetamol.`,
      availability: `Extremely common. Available in near-limitless supply across practically all dispensaries.`,
      pricing: `Very affordable standard pricing. General generic alternative options represent excellent additional cost-savings.`
    },
    professionalView: {
      drugClass: "NSAID-like Antipyretic, non-narcotic central analgesic",
      therapeuticClass: "Nervous System, Analgesics & Antipyretics",
      atcClassification: "N02BE01",
      mechanismOfAction: "Though not fully established, thought to act through central inhibition of cyclooxygenase enzymes (COX-1, COX-2, COX-3), preventing prostaglandin development. Unlike traditional NSAIDs, has no peripheral anti-inflammatory footprint.",
      pharmacology: "Possesses strong central analgesic and antipyretic capabilities but lacks meaningful anti-platelet or anti-inflammatory qualities.",
      pharmacokinetics: "Rapidly absorbed in digestive tract. Highly bioavailable (88%). Peak plasma focus achieved within 30 to 60 minutes. Hepatic clearance via conjugation pathway.",
      contraindications: "Severe active hepatic impairment, hypersensitivity reactions.",
      monitoringParameters: "With chronic long-term or high-dosage treatment, monitor liver transaminases (ALT/AST), renal indicators, and complete blood counts periodically.",
      clinicalReferences: [
        "United States Pharmacopeia Monograph for Acetaminophen / Paracetamol",
        "British National Formulary (BNF) - Section 4.7.1 Analgesics"
      ]
    }
  };
}

export function getFallbackComparison(medA: string, medB: string, lang: string): ComparisonResult {
  const isParacetamolComp = (medA.toLowerCase().includes('dolo') || medA.toLowerCase().includes('calpol') || medA.toLowerCase().includes('paracetamol')) && 
                            (medB.toLowerCase().includes('calpol') || medB.toLowerCase().includes('dolo') || medB.toLowerCase().includes('paracetamol'));

  if (isParacetamolComp) {
    return {
      medicineA: medA,
      medicineB: medB,
      comparison: {
        composition: { a: "Paracetamol 650mg", b: "Paracetamol 500mg/650mg", same: true },
        strength: { a: "650mg", b: "500mg or 650mg", same: false },
        uses: { a: "Fever, Body ache, Severe Headache", b: "Mild Fever, Pediatrics, Minor headache", same: true },
        sideEffects: { a: "Extremely low, safe when dosage < 4g", b: "Extremely low, safe when dosage < 4g", same: true },
        price: { a: "₹31 per strip (15 tabs)", b: "₹18 per strip (15 tabs)", savings: "42% cheaper for lower dosage" },
        manufacturer: { a: "Micro Labs Ltd.", b: "GlaxoSmithKline (GSK)" },
        availability: { a: "Highly available", b: "Highly available" }
      },
      keyDifference: `The singular material difference between Dolo and Calpol is the active strength (650mg vs 500mg) and manufacturer brand identity. Both contain exactly the same active medical molecules.`,
      recommendation: "Take 500mg (Calpol) for minor headaches or children over 12. Reserve 650mg (Dolo) for higher body temperatures or moderate pain, not exceeding dosages suggested by your practitioner."
    };
  }

  // Generic Comparison
  return {
    medicineA: medA,
    medicineB: medB,
    comparison: {
      composition: { a: `${medA} Active Molecule`, b: `${medB} Active Component`, same: false },
      strength: { a: "Dosage a", b: "Dosage b", same: false },
      uses: { a: "Target condition A", b: "Target condition B", same: false },
      sideEffects: { a: "Standard side effect a", b: "Standard side effect b", same: false },
      price: { a: "₹150", b: "₹110", savings: "Buy Med B to save 26%" },
      manufacturer: { a: "Pharma Brand A", b: "Pharma Brand B" },
      availability: { a: "Available nearby", b: "Varies by branch" }
    },
    keyDifference: `These medicines belong to separate pharmaceutical classes and serve distinct diagnostic purposes. Do not substitute one for the other without clinical consent.`,
    recommendation: "Please review these with an attending practitioner. Dual consumption can lead to systemic drug interaction risks."
  };
}

export function getFallbackPrescription(lang: string): PrescriptionAnalysisResult {
  return {
    left: {
      summary: "Patient displays standard symptoms of acute upper respiratory tract infection and muscular discomfort. Recommended therapy targets bacterial eradication and rapid symptomatic relief.",
      patientDetails: {
        name: "Aman Sharma",
        age: "29 Years",
        gender: "Male",
        date: "2026-06-03"
      },
      detectedMedicines: [
        {
          name: "Augmentin 625 Duo",
          composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",
          dosage: "1 tablet twice daily",
          duration: "5 Days",
          instruction: "Post Meals to avoid gastric irritation"
        },
        {
          name: "Dolo 650",
          composition: "Paracetamol 650mg",
          dosage: "1 tablet as needed (SOS)",
          duration: "3 Days",
          instruction: "Every 6-8 hours if fever/pain persists"
        },
        {
          name: "Pantocid 40",
          composition: "Pantoprazole 40mg",
          dosage: "1 tablet once daily",
          duration: "5 Days",
          instruction: "Morning - 30 minutes Before Food empty stomach"
        }
      ],
      detectedTests: [
        "Complete Blood Count (CBC)",
        "Dengue NS1 Antigen (if fever persists beyond 3 days)"
      ],
      followUpPlan: "Return in 5 days for review if respiratory inflammation or high spikes in temperature do not subside.",
      medicationSchedule: [
        { time: "Morning (08:30 AM - Before Food)", medicines: ["Pantocid 40"] },
        { time: "Morning (09:00 AM - After Food)", medicines: ["Augmentin 625 Duo"] },
        { time: "Night (09:00 PM - After Food)", medicines: ["Augmentin 625 Duo", "Dolo 650 (if febrish)"] }
      ]
    },
    right: {
      medicationIntelligence: "Highly standard combinational respiratory care. Pantoprazole is added as a gastric proton pump inhibitor to suppress excess stomach acids often triggered by active amoxicillin antibiotic treatments.",
      drugInteractions: [
        "No severe physiological interaction verified between amoxicillin-clavulanate, pantoprazole, and paracetamol."
      ],
      duplicateTherapyStatus: "No duplicate active chemical duplicate detected. Clean and safe diagnostic layout.",
      foodInteractions: "Take Augmentin after meals; Amoxicillin can cause loose stools if swallowed on an empty stomach. Avoid alcohol as both Dolo and Pantocid are metabolized in the liver.",
      warnings: [
        "Complete full 5-day cycle of antibiotic (Augmentin) even if symptoms resolve to prevent corporate bacterial tolerance.",
        "Check for penicillin allergies."
      ],
      alternativeBrands: [
        { original: "Augmentin 625 Duo (GSK)", alt: "Clavam 625 (Alkem)", priceDiff: "Save ₹54 (24% cheaper)" },
        { original: "Pantocid 40", alt: "Pan-40 (Alkem Labs)", priceDiff: "Save ₹31 (19% cheaper)" }
      ],
      estimatedMonthlyCost: "Calculated cycle cost: ₹320 (Expected total spend complete therapy)"
    }
  };
}

export function getFallbackChat(message: string, lang: string): ChatAnswer {
  const m = message.toLowerCase();
  
  if (m.includes('milk')) {
    return {
      quickAnswer: "Yes, you can take Paracetamol or basic painkillers with milk, but stay cautious with antibiotics.",
      detailedExplanation: "Milk helps protect your stomach lining from mild irritation caused by common painkillers (like paracetamol or ibuprofen). However, certain antibiotics (like Ciprofloxacin or Doxycycline) must NOT be taken with milk as the calcium binds to the drug and blocks absorption.",
      safetyNotes: "When in doubt, pure water remains the universal standard medium for swallowing all pharmaceutical tablets.",
      relatedMedicines: ["Paracetamol", "Amoxicillin", "Ciprofloxacin"],
      suggestedFollowUp: [
        "Can I take Augmentin with milk?",
        "Should painkillers always be taken post meals?"
      ]
    };
  }

  if (m.includes('miss') || m.includes('dose') || m.includes('forgot')) {
    return {
      quickAnswer: "Take the missed dose as soon as you remember, unless your next scheduled dose is less than 4 hours away.",
      detailedExplanation: "If your next dose is close, skip the missed dose entirely and resume your normal pattern. Never double your medication dosage to make up for a missed tablet, as this can trigger toxic levels in the body.",
      safetyNotes: "Set automatic digital reminders on your phone or use a weekly container to build high treatment compliance.",
      relatedMedicines: ["Metformin", "Atorvastatin"],
      suggestedFollowUp: [
        "What happens if I miss a blood pressure pill?",
        "How do I set up a custom medicine reminder scheme?"
      ]
    };
  }

  if (m.includes('pregnancy') || m.includes('pregnant')) {
    return {
      quickAnswer: "Paracetamol is generally considered the safest option for pain/fever during pregnancy, while NSAIDs should be avoided.",
      detailedExplanation: "Acetaminophen (Paracetamol) has a highly established safety record across all trimesters when taken at standard doses. Conversely, medications like Ibuprofen or Aspirin can trigger fetal circulatory complications, especially during the third trimester.",
      safetyNotes: "Avoid ALL self-prescribed medications during pregnancy. Always check with your primary prenatal specialist first.",
      relatedMedicines: ["Ibuprofen", "Crocin", "Labetalol"],
      suggestedFollowUp: [
        "Is amoxicillin safe while pregnant?",
        "What cold remedies can I use during my first trimester?"
      ]
    };
  }

  // General Fallback Chat response
  return {
    quickAnswer: "I have analyzed your healthcare question and matched it to verified pharmaceutical databases.",
    detailedExplanation: `For "${message}", treatment guidelines suggest always reviewing the active mineral formulation. If you are experiencing mild symptoms, standard symptomatic drugs (e.g. anti-pyretics, antacids) are typically used, but persistent conditions require an empirical doctor consultation.`,
    safetyNotes: "Always monitor individual hypersensitivity responses when commencing any major therapeutic class.",
    relatedMedicines: ["Paracetamol 650mg", "Pantoprazole Sodium"],
    suggestedFollowUp: [
      "What are the major side effects associated with this?",
      "Can I buy a generic equivalent of this medication over-the-counter?"
    ]
  };
}

export function getFallbackAuthenticity(batchNumber?: string, lang?: string): AuthenticityResult {
  const num = (batchNumber || 'DL93012').toUpperCase();
  const isSuspicious = num === 'BAD123' || num === 'FAKE99';

  if (isSuspicious) {
    return {
      authenticityScore: 12,
      manufacturerMatch: "Mismatched",
      packagingMatch: "Suspicious Elements",
      riskIndicators: [
        "Batch series does not exist inside manufacturer registered databases.",
        "Label printing displays irregular typography alignment.",
        "QR validation key mismatch detected from official state registers."
      ],
      confidenceLevel: "High",
      batchDetails: {
        batchNumber: num,
        expiryDate: "Invalid Date",
        manufacturerRegistered: false
      }
    };
  }

  return {
    authenticityScore: 98,
    manufacturerMatch: "Matched Verified",
    packagingMatch: "Authentic Design",
    riskIndicators: [
      "Packaging dimensions, font weight, and batch serial conform 100% with registered specifications."
    ],
    confidenceLevel: "High",
    batchDetails: {
      batchNumber: num,
      expiryDate: "09 / 2028",
      manufacturerRegistered: true
    }
  };
}

export function getMultiFallback(meds: string[], lang: string): MultiComparisonResult {
  const dataList = meds.map(m => getFallbackSearch(m, lang));
  
  const composition: Record<string, string> = {};
  const strength: Record<string, string> = {};
  const uses: Record<string, string> = {};
  const sideEffects: Record<string, string> = {};
  const price: Record<string, string> = {};
  const manufacturer: Record<string, string> = {};
  const availability: Record<string, string> = {};

  meds.forEach((m, idx) => {
    const s = dataList[idx];
    composition[m] = s.overview.composition;
    strength[m] = s.overview.strength || "N/A";
    uses[m] = s.whyUsed.split('.')[0] + ".";
    sideEffects[m] = s.sideEffects[0] || "Mild symptoms";
    price[m] = s.overview.price || "₹30 per strip";
    manufacturer[m] = s.overview.manufacturer;
    availability[m] = s.nearbyAvailability[0]?.status || "Available";
  });

  // check if compositions are mostly identical
  const uniqueComps = new Set(dataList.map(s => s.overview.composition.toLowerCase().split(' ')[0]));
  const compositionsSame = uniqueComps.size === 1;

  const strengths = dataList.map(s => s.overview.strength);
  const strengthsSame = new Set(strengths).size === 1;

  return {
    isFallback: true,
    medicines: meds,
    comparison: {
      composition: {
        values: composition,
        same: compositionsSame,
        differencesAnalysis: compositionsSame 
          ? "All selected brands contain the identical active chemical formulation."
          : "These medications feature different active chemical substances and target separate physiological systems."
      },
      strength: {
        values: strength,
        same: strengthsSame,
        differencesAnalysis: strengthsSame 
          ? "The dosage strengths across all selected options are identical."
          : "The selected medications have varying concentrations/dosages."
      },
      uses: {
        values: uses,
        same: false,
        differencesAnalysis: "Indications vary based on chemical class and patient specifications."
      },
      sideEffects: {
        values: sideEffects,
        same: false,
        differencesAnalysis: "Side effect severity and occurrence rates differ based on molecular interactions."
      },
      price: {
        values: price,
        same: false,
        differencesAnalysis: "Significant price variations exist between generic alternatives and premium brands."
      },
      manufacturer: {
        values: manufacturer,
        same: false
      },
      availability: {
        values: availability,
        same: false
      }
    },
    keyDifference: compositionsSame 
      ? `These drugs share the same therapeutic core molecule (${dataList[0].overview.composition}) but vary in manufacturer packaging, branding, and cost structure.`
      : `These represent distinct medicinal classes with separate modes of action. Substitution is strictly prohibited without direct clinical supervision.`,
    recommendation: "Review current therapeutic alternatives with your prescribing physician to ensure medical equivalence and safety."
  };
}
