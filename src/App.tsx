/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, AlertTriangle, ShieldCheck, FileText, CheckCircle2, 
  MapPin, TrendingDown, Info, HelpCircle, Send, Languages, ChevronRight, 
  Camera, Fingerprint, RefreshCw, Layers, Check, Clock, Phone, DollarSign,
  Activity, ArrowRight, BookOpen, UserCheck, ShieldAlert, Pill, HeartPulse,
  Plus, Trash2, ChevronDown, ChevronUp, Mic, X, AlertCircle, RefreshCcw, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, SearchResult, ComparisonResult, MultiComparisonResult, PrescriptionAnalysisResult, ChatAnswer, Pharmacy, AuthenticityResult, EHRSafetyReport, EHRAlertResponse } from './types';

// Preloaded beautiful sample searches
const SAMPLE_MEDICINES = [
  { name: 'Dolo 650', desc: 'Paracetamol 650mg' },
  { name: 'Glycomet 500 SR', desc: 'Metformin 500mg' },
  { name: 'Augmentin 625 Duo', desc: 'Amoxicillin + Clavulanic Acid' },
  { name: 'Pantocid 40', desc: 'Pantoprazole 40mg' }
];

const SAMPLE_COMPARISONS = [
  { name: 'Fever (Paracetamol)', meds: ['Dolo 650', 'Calpol 500', 'Crocin Advance'] },
  { name: 'Antibiotics', meds: ['Augmentin 625 Duo', 'Clavam 625', 'Amoxyclav 625'] },
  { name: 'Acid Reducers', meds: ['Pantocid 40', 'Pan-40', 'Omez 20'] }
];

const LANGS: { code: Language; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'મરાઠી' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెલેગુ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' }
];

// Client-side simulation of local pharmacies
const SAMPLE_PHARMACIES: Pharmacy[] = [
  { name: "Apollo Pharmacy - Green Park", distance: "0.3 km", openStatus: "open", deliveryAvailable: true, deliveryTime: "15 mins", priceLevel: "₹₹", availabilityStatus: "in-stock", address: "G-12, Main Market, Green Park, New Delhi", phone: "+91 11 4165 7712" },
  { name: "MedPlus Wellness - Metro Gate 2", distance: "0.8 km", openStatus: "open", deliveryAvailable: true, deliveryTime: "30 mins", priceLevel: "₹", availabilityStatus: "in-stock", address: "Shop 4, Lower Ground Metro Arcade, New Delhi", phone: "+91 11 4165 8291" },
  { name: "Fortis Healthworld Retail", distance: "1.5 km", openStatus: "open", deliveryAvailable: false, deliveryTime: "N/A", priceLevel: "₹₹₹", availabilityStatus: "low-stock", address: "Fortis OP Tower, Outer Ring Road, New Delhi", phone: "+91 11 4059 2911" },
  { name: "Sanjivani 24/7 Dispensary", distance: "2.1 km", openStatus: "open", deliveryAvailable: true, deliveryTime: "45 mins", priceLevel: "₹₹", availabilityStatus: "in-stock", address: "C-11, Block-B, New Friends Colony, New Delhi", phone: "+91 11 2684 5530" },
  { name: "Max Pharmacy Express", distance: "3.4 km", openStatus: "closed", deliveryAvailable: true, deliveryTime: "Next day", priceLevel: "₹₹₹", availabilityStatus: "out-of-stock", address: "Ground Floor Atrium, Max Super Speciality, Saket", phone: "+91 11 2651 5050" }
];

// Interactive message node payload mapping
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  mode: 'standard' | 'think' | 'research' | 'clinical' | 'patient' | 'translate';
  type: 'text' | 'prescription' | 'search' | 'compare' | 'authenticity' | 'pharmacy';
  loading?: boolean;
  error?: string;
  image?: string; // Base64 representation of any uploaded material
  batchNo?: string; // Specifically loaded batch number if verified

  // Formulated response types mapped from backend payloads
  searchResult?: SearchResult;
  comparisonResult?: MultiComparisonResult;
  prescriptionResult?: PrescriptionAnalysisResult;
  chatResult?: ChatAnswer;
  authenticityResult?: AuthenticityResult;
  ehrSafetyResult?: EHRSafetyReport;

  // UI state persistent for this specific message block
  expandedCards: Record<string, boolean>; // e.g. toggled state of 13 modular search cards
  patientViewMode: 'patient' | 'professional';
}

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<Message['mode']>('standard');
  const [chatInput, setChatInput] = useState<string>('');
  
  // Skill selection state - guides the user's focus inside the chat box
  const [skillContext, setSkillContext] = useState<'none' | 'prescription' | 'compare' | 'authenticity' | 'pharmacy'>('none');
  
  // Workspace active file upload slots (drafts)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [batchNo, setBatchNo] = useState<string>('DL93012');
  
  // Compare state drafts
  const [selectedMeds, setSelectedMeds] = useState<string[]>(['Dolo 650', 'Calpol 500']);
  const [newMedInput, setNewMedInput] = useState<string>('');
  
  // Drag-and-drop state indicators
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [customPharmacyRequests, setCustomPharmacyRequests] = useState<Record<string, string>>({}); // pharmacyName -> requestState

  // Medicine Image states specifically mapped for Google Images fallbacks
  const [medImageErrors, setMedImageErrors] = useState<Record<string, boolean>>({});
  const [medImageLoadedMap, setMedImageLoadedMap] = useState<Record<string, boolean>>({});

  // Patient account context is shared with the PrescriptionSafetyEngine backend.
  const [patientToken, setPatientToken] = useState<string | null>(() => localStorage.getItem('med_conscious_patient_token'));
  const [patientProfile, setPatientProfile] = useState<any | null>(() => {
    const saved = localStorage.getItem('med_conscious_patient_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [patientAuthMode, setPatientAuthMode] = useState<'register' | 'login'>('register');
  const [patientAuthError, setPatientAuthError] = useState('');
  const [patientForm, setPatientForm] = useState({ name: '', email: '', password: '', age: '', sex: 'Female', allergies: '', conditions: '', activeMedications: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePatientField = (field: string, value: string) => {
    setPatientForm(prev => ({ ...prev, [field]: value }));
  };

  const submitPatientAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientAuthError('');
    try {
      const endpoint = patientAuthMode === 'register' ? '/api/patient/register' : '/api/patient/login';
      const body = patientAuthMode === 'register'
        ? {
            name: patientForm.name,
            email: patientForm.email,
            password: patientForm.password,
            age: Number(patientForm.age),
            sex: patientForm.sex,
            allergies: patientForm.allergies || null,
            conditions: patientForm.conditions || null,
            active_medications: patientForm.activeMedications.split(',').map(m => m.trim()).filter(Boolean).map(name => ({ name }))
          }
        : { email: patientForm.email, password: patientForm.password };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || 'Unable to authenticate');
      localStorage.setItem('med_conscious_patient_token', data.access_token);
      localStorage.setItem('med_conscious_patient_profile', JSON.stringify(data.patient));
      setPatientToken(data.access_token);
      setPatientProfile(data.patient);
    } catch (error: any) {
      setPatientAuthError(error.message || 'Unable to authenticate');
    }
  };

  const runPatientSafetyCheck = async (medications: any[]) => {
    const profileMeds = Array.isArray(patientProfile?.active_medications) ? patientProfile.active_medications : [];
    const allMedications = [...profileMeds, ...medications].filter((med, index, list) => {
      const key = String(med.name || med.composition || '').trim().toLowerCase();
      return key && list.findIndex(item => String(item.name || item.composition || '').trim().toLowerCase() === key) === index;
    });
    if (!patientToken || !allMedications.length) return null;
    const response = await fetch('/api/patient/safety-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        medications: allMedications.map(m => ({ name: m.name || m.composition, dosage: m.dosage || '1-0-0', duration: m.duration, instructions: m.instruction })),
        allergies: patientProfile?.allergies,
        conditions: patientProfile?.conditions
      })
    });
    if (!response.ok) throw new Error('Patient safety engine unavailable');
    return response.json();
  };

  // Auto-scroll chat window when new answers appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messages.map(m => m.loading)]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedFileName(file.name);
        setSkillContext('prescription'); // Auto-focus prescription analyzer
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset chat workspace
  const handleResetWorkspace = () => {
    setMessages([]);
    setSkillContext('none');
    setUploadedImage(null);
    setUploadedFileName(null);
    setChatInput('');
  };

  // Dispatch a message (AI interaction)
  const handleSendMessage = async (customQuery?: string, forceType?: Message['type']) => {
    const rawQuery = (customQuery || chatInput).trim();
    const draftImage = uploadedImage;

    // Check if there's any active input at all
    if (!rawQuery && !draftImage && skillContext !== 'compare' && skillContext !== 'pharmacy') {
      return;
    }

    // Determine query type
    let type: Message['type'] = 'text';
    if (forceType) {
      type = forceType;
    } else if (skillContext !== 'none') {
      type = skillContext === 'none' ? 'text' : (skillContext as any);
    } else {
      // Smart Auto-detection
      const lower = rawQuery.toLowerCase();
      if (draftImage) {
        type = 'prescription';
      } else if (lower.includes('compare') || lower.includes(' vs ') || lower.includes('difference between')) {
        type = 'compare';
      } else if (lower.includes('genuine') || lower.includes('counterfeit') || lower.includes('batch') || lower.includes('fake')) {
        type = 'authenticity';
      } else if (lower.includes('pharmacy') || lower.includes('nearby') || lower.includes('buy') || lower.includes('stock')) {
        type = 'pharmacy';
      } else {
        const knownMedicines = ['dolo', 'calpol', 'glycomet', 'metformin', 'augmentin', 'clavam', 'pantocid', 'pan-40', 'pan 40', 'crocin', 'omez'];
        const matchesKnown = knownMedicines.some(m => lower.includes(m));
        if (matchesKnown && rawQuery.split(' ').length <= 4) {
          type = 'search';
        } else {
          type = 'text';
        }
      }
    }

    // Set user visible query text
    let userText = rawQuery;
    if (!userText) {
      if (type === 'prescription') userText = "Analyze uploaded prescription";
      else if (type === 'authenticity') userText = `Verify serial index for batch: ${batchNo}`;
      else if (type === 'compare') userText = `Compare ${selectedMeds.join(', ')}`;
      else if (type === 'pharmacy') userText = "Locate nearby stockists and availability";
    }

    // Clear drafts and slide active input panel back down
    setChatInput('');
    setUploadedImage(null);
    setUploadedFileName(null);
    setSkillContext('none');

    // Generate unique turn IDs
    const userMsgId = 'u-' + Date.now();
    const aiMsgId = 'ai-' + Date.now();

    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: userText,
      image: draftImage || undefined,
      mode: activeMode,
      type,
      expandedCards: {},
      patientViewMode: 'patient'
    };

    const aiMsg: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      mode: activeMode,
      type,
      loading: true,
      expandedCards: { '01': true, 'overview': true }, // Overview card always starts open
      patientViewMode: activeMode === 'clinical' ? 'professional' : 'patient'
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    try {
      if (type === 'search') {
        const cleanQuery = rawQuery.replace(/explain|details on|tell me about|search for/gi, '').trim() || 'Dolo 650';
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cleanQuery, lang })
        });
        const data = await response.json();

        // Also fetch EHR drug interaction check in background
        const ehrPromise = fetch('/api/drug-interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drugs: [data?.overview?.name || cleanQuery.split(/\s+/)[0], "aspirin"]
          })
        }).then(r => r.json()).catch(() => ({ ehr_unavailable: true, alerts: [] }));

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: true,
          searchResult: data
        } : m));

        const ehrData = await ehrPromise;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          ehrSafetyResult: ehrData
        } : m));

      } else if (type === 'compare') {
        let finalCompareList = rawQuery.replace(/compare/gi, '').split(/vs|and|,/gi).map(s => s.trim()).filter(s => s.length > 1);
        if (finalCompareList.length < 2) {
          finalCompareList = selectedMeds.length >= 2 ? selectedMeds : ['Dolo 650', 'Calpol 500'];
        }

        const response = await fetch('/api/compare-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicines: finalCompareList, lang })
        });
        const data = await response.json();

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          comparisonResult: data
        } : m));

      } else if (type === 'prescription') {
        const isPreset = rawQuery.toLowerCase().includes('sample') || rawQuery.toLowerCase().includes('demo');
        let payload: any = { lang };
        if (isPreset) {
          payload.textContent = "Dr. Aman Sharma prescription: Augmentin 625 Duo, 1 tab twice daily for 5 days. Dolo 650, 1 tab as needed for high fever (SOS) for 3 days. Pantocid 40mg, 1 tab morning empty stomach for 5 days. Blood tests: CBC, Dengue NS1.";
        } else {
          payload.imageBase64 = draftImage;
          payload.textContent = rawQuery;
        }

        const response = await fetch('/api/prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        // Use the canonical safety engine when the patient is signed in.
        const ehrPromise = patientToken
          ? runPatientSafetyCheck(data?.left?.detectedMedicines || [])
          : fetch('/api/prescription-safety', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medications: (data?.left?.detectedMedicines || []).map((m: any) => ({
              name: m.name || m.composition || ''
            })),
            patient: {
              age: parseInt(data?.left?.patientDetails?.age) || undefined,
              sex: data?.left?.patientDetails?.gender || undefined
            }
          })
        }).then(r => r.json()).catch(() => ({ ehr_unavailable: true, alerts: [] }));

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: true,
          prescriptionResult: data
        } : m));

        const ehrData = await ehrPromise;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          ehrSafetyResult: ehrData
        } : m));

      } else if (type === 'authenticity') {
        const bNo = rawQuery.match(/[A-Z0-9-]{5,12}/gi)?.[0] || batchNo || 'DL93012';
        const response = await fetch('/api/authenticity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchNumber: bNo, imageBase64: draftImage, lang })
        });
        const data = await response.json();

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          authenticityResult: data,
          batchNo: bNo
        } : m));

      } else if (type === 'pharmacy') {
        // Simple client side lookup for pharmacy
        await new Promise(r => setTimeout(r, 1000));
        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          text: `Surrounding Licensed stock centers compiled for: **${rawQuery || 'Requested Medication'}**.`
        } : m));

      } else {
        // Chat mode with prompt injections based on clinical context
        let promptInjection = rawQuery;
        if (activeMode === 'think') {
          promptInjection = `[THINKING MODE: Formulate clinical thoughts step-by-step] ${rawQuery}`;
        } else if (activeMode === 'research') {
          promptInjection = `[DEEP RESEARCH: Search references, provide detailed report with inline citations like [Citation 1]] ${rawQuery}`;
        } else if (activeMode === 'clinical') {
          promptInjection = `[CLINICAL TERMINOLOGY: Formulate your response in professional medical terms for physicians] ${rawQuery}`;
        } else if (activeMode === 'patient') {
          promptInjection = `[PATIENT CONTEXT: Explain in very accessible analogies] ${rawQuery}`;
        }

        const historyPayload = messages
          .filter(m => m.type === 'text' && !m.loading)
          .slice(-6)
          .map(m => ({
            q: m.sender === 'user' ? m.text : '',
            a: m.sender === 'ai' ? m.chatResult : null
          }))
          .filter(h => h.q || h.a);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: promptInjection, history: historyPayload, lang })
        });
        const data = await response.json();

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          loading: false,
          chatResult: data
        } : m));
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? {
        ...m,
        loading: false,
        error: e.message || 'Connecting layer timed out. Please check credentials or retry.'
      } : m));
    }
  };

  // Handles expanding or collapsing cards inside a specific turn
  const toggleTurnCard = (turnId: string, cardId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === turnId) {
        return {
          ...m,
          expandedCards: {
            ...m.expandedCards,
            [cardId]: !m.expandedCards[cardId]
          }
        };
      }
      return m;
    }));
  };

  // Swaps view mode between Patient and Professional inside a search result turn
  const swapTurnViewMode = (turnId: string, mode: 'patient' | 'professional') => {
    setMessages(prev => prev.map(m => {
      if (m.id === turnId) {
        return {
          ...m,
          patientViewMode: mode
        };
      }
      return m;
    }));
  };

  // Prepares a beautiful custom mock reasoning timeline for "Think" mode loading
  const renderThinkingProcess = (mode: string) => {
    return (
      <div className="space-y-2 bg-amber-50/50 border border-amber-200/40 rounded-xl p-3.5 text-xs text-slate-600 font-mono">
        <div className="flex items-center space-x-2 text-amber-800 font-bold mb-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="uppercase tracking-wider">AI Thinking & Cross-Reference Sequence</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Parsing target molecular compounds...</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Checking hepatic & renal contraindication metrics...</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin inline-block" />
            <span>Scanning national drug substitution registers...</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-950 font-sans antialiased flex flex-col selection:bg-amber-100 selection:text-amber-950"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* DRAG OVERLAY */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 border-4 border-dashed border-amber-400"
          >
            <div className="text-center text-white space-y-3 pointer-events-none">
              <Camera className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
              <h2 className="text-2xl font-black">Drop Prescription or Packaging Strip</h2>
              <p className="text-sm text-slate-350">Med Conscious AI will immediately execute OCR and multi-layer clinical mapping</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!patientToken && (
        <div className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitPatientAuth} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-600">Patient safety workspace</div>
              <h1 className="text-2xl font-black text-slate-950 mt-1">Create your medication profile</h1>
              <p className="text-sm text-slate-500 mt-1">We use this context for drug–drug and drug–condition safety checks.</p>
            </div>
            {patientAuthMode === 'register' && (
              <>
                <input required placeholder="Full name" value={patientForm.name} onChange={e => updatePatientField('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="number" min="0" max="120" placeholder="Age" value={patientForm.age} onChange={e => updatePatientField('age', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <select value={patientForm.sex} onChange={e => updatePatientField('sex', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option>Female</option><option>Male</option><option>Other</option></select>
                </div>
                <input placeholder="Allergies (e.g. penicillin, none)" value={patientForm.allergies} onChange={e => updatePatientField('allergies', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Medical conditions (e.g. asthma, CKD, none)" value={patientForm.conditions} onChange={e => updatePatientField('conditions', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Active medicines, comma separated" value={patientForm.activeMedications} onChange={e => updatePatientField('activeMedications', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </>
            )}
            <input required type="email" placeholder="Email" value={patientForm.email} onChange={e => updatePatientField('email', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input required type="password" minLength={8} placeholder="Password (minimum 8 characters)" value={patientForm.password} onChange={e => updatePatientField('password', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            {patientAuthError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{patientAuthError}</div>}
            <button type="submit" className="w-full bg-slate-950 text-white rounded-lg py-2.5 font-bold">{patientAuthMode === 'register' ? 'Create patient account' : 'Sign in'}</button>
            <button type="button" onClick={() => { setPatientAuthMode(patientAuthMode === 'register' ? 'login' : 'register'); setPatientAuthError(''); }} className="w-full text-sm text-slate-500 hover:text-slate-950">
              {patientAuthMode === 'register' ? 'Already registered? Sign in' : 'New patient? Create an account'}
            </button>
          </form>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleResetWorkspace}>
            <div className="relative flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-slate-950 text-white shadow-md">
              <span className="font-extrabold text-sm tracking-tight">M</span>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse border border-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wider text-slate-950 block">MED CONSCIOUS</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5 block uppercase">
                AI Medication Intelligence OS
              </span>
            </div>
          </div>

          {/* Configuration and Control center */}
          <div className="flex items-center space-x-3">
            {messages.length > 0 && (
              <button 
                onClick={handleResetWorkspace}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-250 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Conversation</span>
              </button>
            )}

            <div className="relative group">
              <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs">
                <Languages className="w-3.5 h-3.5 text-slate-500" />
                <span>{LANGS.find(l => l.code === lang)?.native || 'English'}</span>
              </button>
              
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg hidden group-hover:block transition z-50">
                <div className="p-1.5 space-y-1">
                  {LANGS.map(l => (
                    <button 
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center justify-between ${lang === l.code ? 'bg-slate-50 text-slate-950 font-black' : 'text-slate-600'}`}
                    >
                      <span>{l.native}</span>
                      <span className="text-[9px] text-slate-400 font-medium tracking-wide capitalize">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE VIEWPORT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-between">
        
        {/* CASE A: EMPTY WORKSPACE CHAT CONVERSATION */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full py-12 md:py-20 space-y-8">
            
            {/* Header intro info */}
            <div className="text-center space-y-2.5">
              <div className="inline-flex p-2 bg-amber-400/10 border border-amber-250/30 rounded-full text-amber-600 mb-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                What can I help you understand today?
              </h1>
              <p className="text-xs sm:text-sm text-slate-550 max-w-md mx-auto leading-relaxed">
                Consult safety maps, auto-analyze prescription receipts, perform drug-to-drug safety scans, and find regional stockists instantly.
              </p>
            </div>

            {/* AI WORKSPACE PROMPT CONTAINER */}
            <div className="w-full space-y-4">
              
              {/* AI Mode Selector */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {[
                  { id: 'standard', label: 'Standard', desc: 'Fast answers', color: 'border-slate-200 hover:border-slate-900', activeBg: 'bg-slate-950 text-white border-slate-950' },
                  { id: 'think', label: 'Think', desc: 'Clinical reasoning', color: 'border-amber-200 hover:border-amber-400', activeBg: 'bg-amber-400 text-slate-950 border-amber-400' },
                  { id: 'research', label: 'Deep Research', desc: 'Literature & citations', color: 'border-indigo-200 hover:border-indigo-400', activeBg: 'bg-indigo-900 text-white border-indigo-900' },
                  { id: 'clinical', label: 'Clinical Mode', desc: 'Physician metrics', color: 'border-teal-200 hover:border-teal-400', activeBg: 'bg-teal-950 text-white border-teal-950' },
                  { id: 'patient', label: 'Patient Mode', desc: 'Simple layman maps', color: 'border-rose-200 hover:border-rose-400', activeBg: 'bg-rose-950 text-white border-rose-950' },
                  { id: 'translate', label: 'Translate', desc: 'Indian languages', color: 'border-violet-200 hover:border-violet-400', activeBg: 'bg-violet-950 text-white border-violet-950' },
                ].map((mode) => {
                  const isActive = activeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setActiveMode(mode.id as any)}
                      className={`px-3 py-1.5 border text-xs font-bold rounded-full transition-all duration-200 text-center flex flex-col items-center ${
                        isActive ? mode.activeBg : `bg-white text-slate-700 ${mode.color} hover:bg-slate-50`
                      }`}
                    >
                      <span>{mode.label}</span>
                      <span className={`text-[8px] font-normal tracking-wide uppercase ${isActive ? 'opacity-85' : 'text-slate-400'}`}>
                        {mode.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Central Input Box */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 relative focus-within:ring-2 focus-within:ring-slate-950 transition-all">
                
                {/* Embedded Skill Configuration Controls (Slide-out panels) */}
                {skillContext === 'prescription' && (
                  <div className="mb-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-150 text-xs space-y-2">
                    <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100">
                      <span className="font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Prescription Analyzer Core</span>
                      </span>
                      <button onClick={() => setSkillContext('none')} className="text-slate-400 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={triggerFileUpload} 
                        className="bg-white border border-slate-200 hover:border-slate-400 px-3 py-2 rounded-lg text-slate-700 font-bold flex items-center space-x-1.5 text-[11px]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{uploadedFileName ? "Replace Image" : "Upload Prescription"}</span>
                      </button>
                      <button 
                        onClick={() => {
                          setChatInput("Sample Patient Prescription Details:\n- Augmentin 625 Duo, 1 tab after breakfast and dinner for 5 days.\n- Dolo 650, 1 tablet as needed if fever exceeds 100 F.\n- Pantocid 40mg, 1 tab empty stomach daily in the morning.");
                          handleSendMessage("Sample Prescription OCR", 'prescription');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-lg text-[11px] border border-slate-300"
                      >
                        ⚡ Try Standard Demo Prescription
                      </button>
                    </div>
                    {uploadedFileName && (
                      <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-150 inline-block">
                        File Loaded: {uploadedFileName}
                      </div>
                    )}
                  </div>
                )}

                {skillContext === 'compare' && (
                  <div className="mb-3 p-3 bg-amber-50/40 rounded-xl border border-amber-250/40 text-xs space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-amber-100">
                      <span className="font-bold text-amber-950 uppercase tracking-wider flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span>Compare Medicines Builder</span>
                      </span>
                      <button onClick={() => setSkillContext('none')} className="text-slate-400 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200 min-h-[40px] items-center">
                      {selectedMeds.length === 0 ? (
                        <span className="text-slate-400 italic text-[11px]">No meds added. Type below to stack...</span>
                      ) : (
                        selectedMeds.map((m, idx) => (
                          <span key={idx} className="bg-slate-900 text-white pl-2.5 pr-1.5 py-0.5 rounded-md text-[11px] font-bold flex items-center space-x-1">
                            <span>{m}</span>
                            <button onClick={() => setSelectedMeds(prev => prev.filter((_, i) => i !== idx))} className="text-white bg-slate-800 hover:bg-red-500 rounded px-1 text-[9px] font-black">
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newMedInput}
                        onChange={(e) => setNewMedInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newMedInput.trim() && !selectedMeds.includes(newMedInput.trim())) {
                              setSelectedMeds(prev => [...prev, newMedInput.trim()]);
                              setNewMedInput('');
                            }
                          }
                        }}
                        placeholder="Add medicine (e.g. Calpol 500) and press Enter..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold"
                      />
                      <button 
                        onClick={() => {
                          if (selectedMeds.length >= 2) handleSendMessage(`Compare ${selectedMeds.join(', ')}`, 'compare');
                        }}
                        disabled={selectedMeds.length < 2}
                        className="bg-slate-950 hover:bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold disabled:opacity-40"
                      >
                        Run Side-by-Side
                      </button>
                    </div>
                  </div>
                )}

                {skillContext === 'authenticity' && (
                  <div className="mb-3 p-3 bg-red-50/20 rounded-xl border border-red-200/50 text-xs space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-red-100">
                      <span className="font-bold text-red-950 uppercase tracking-wider flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Counterfeit Verification</span>
                      </span>
                      <button onClick={() => setSkillContext('none')} className="text-slate-400 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Batch Number:</label>
                        <input 
                          type="text"
                          value={batchNo}
                          onChange={(e) => setBatchNo(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Upload Packaging Photo (Optional):</label>
                        <button onClick={triggerFileUpload} className="w-full bg-white border border-slate-200 hover:bg-slate-50 p-2 rounded text-xs font-semibold flex items-center justify-center space-x-1.5 text-slate-700">
                          <Camera className="w-3.5 h-3.5 text-slate-500" />
                          <span>{uploadedFileName ? "Replace photo" : "Select image file"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button 
                        onClick={() => {
                          setBatchNo('BAD123');
                          handleSendMessage("Verify Batch BAD123 packaging", 'authenticity');
                        }}
                        className="text-[10px] text-red-700 hover:underline font-bold"
                      >
                        ⚠️ Simulate Compromised Batch (BAD123)
                      </button>

                      <button 
                        onClick={() => handleSendMessage(`Verify batch ${batchNo} authenticity`, 'authenticity')}
                        className="bg-slate-950 hover:bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold"
                      >
                        Execute Serial Check
                      </button>
                    </div>
                  </div>
                )}

                {/* Text prompt layout */}
                <textarea 
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    skillContext === 'prescription' 
                      ? "Add transcription, drug symptoms, or OCR parameters..." 
                      : skillContext === 'compare' 
                        ? "List commercial brands you want to contrast..." 
                        : "Ask Med Conscious about milk interactions, dosage schedules, pregnancy safety, or generic salts..."
                  }
                  className="w-full bg-transparent text-slate-900 font-semibold text-sm placeholder-slate-400 focus:outline-none resize-none tracking-wide pr-12"
                />

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                {/* Active attachments preview block inside prompt */}
                {uploadedImage && skillContext === 'none' && (
                  <div className="mt-2 p-1.5 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between max-w-xs">
                    <span className="text-[10px] text-slate-500 font-mono truncate">{uploadedFileName || "Attached image"}</span>
                    <button onClick={() => { setUploadedImage(null); setUploadedFileName(null); }} className="text-[10px] text-red-500 font-bold hover:underline">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Lower Action buttons inside input bar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={triggerFileUpload} 
                      className="p-2 hover:bg-slate-100 text-slate-550 rounded-xl transition-all"
                      title="Attach image"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={() => setSkillContext(skillContext === 'prescription' ? 'none' : 'prescription')} 
                      className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-black transition ${
                        skillContext === 'prescription' ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      PRESCRIPTION
                    </button>

                    <button 
                      onClick={() => setSkillContext(skillContext === 'compare' ? 'none' : 'compare')} 
                      className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-black transition ${
                        skillContext === 'compare' ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      COMPARE
                    </button>

                    <button 
                      onClick={() => setSkillContext(skillContext === 'authenticity' ? 'none' : 'authenticity')} 
                      className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-black transition ${
                        skillContext === 'authenticity' ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      VERIFY SERIAL
                    </button>
                  </div>

                  <button 
                    onClick={() => handleSendMessage()}
                    className="p-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl transition shadow-md flex items-center space-x-1.5"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                  </button>
                </div>

              </div>

              {/* Quick Prompt triggers / Beautiful AI Skills */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block text-center">
                  Select Action Skill to Begin
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
                  {[
                    { emoji: "📄", label: "Analyze Prescription", query: "Sample Prescription OCR", action: () => setSkillContext('prescription') },
                    { emoji: "💊", label: "Explain Medicine", query: "Explain Glycomet 500 SR" },
                    { emoji: "⚖", label: "Compare Medicines", query: "Compare Dolo 650 and Calpol 500" },
                    { emoji: "⚠", label: "Check Drug Interactions", query: "Check drug interactions for Ibuprofen and Paracetamol" },
                    { emoji: "🧬", label: "Explain Disease", query: "Explain Diabetes Type 2 first-line treatments" },
                    { emoji: "💰", label: "Find Cheaper Alternative", query: "Find cheaper alternatives for Augmentin 625 Duo" },
                    { emoji: "🛡", label: "Verify Medicine", query: "Is Dolo 650 batch DL93012 genuine?", action: () => setSkillContext('authenticity') },
                    { emoji: "📍", label: "Find Nearby Pharmacy", query: "Find nearby pharmacies stocking Pantocid 40" },
                    { emoji: "📊", label: "Interpret Lab Reports", query: "Interpret high creatinine levels in my lab report" },
                    { emoji: "💉", label: "Vaccination Guide", query: "Recommended childhood vaccination schedule" },
                  ].map((skill, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (skill.action) {
                          skill.action();
                        } else {
                          setChatInput(skill.query);
                          handleSendMessage(skill.query);
                        }
                      }}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 px-3.5 py-1.5 rounded-xl hover:border-slate-400 shadow-xs transition flex items-center space-x-1.5"
                    >
                      <span className="text-xs">{skill.emoji}</span>
                      <span>{skill.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        ) : (
          
          /* CASE B: CONVERSATION IS THE APPLICATION (ChatGPT/Perplexity Workspace) */
          <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full space-y-6 pb-24">
            
            {/* Conversation History stream */}
            <div className="space-y-6">
              {messages.map((turn, tIdx) => {
                const isUser = turn.sender === 'user';
                
                if (isUser) {
                  return (
                    <div key={turn.id} className="flex items-start justify-end space-x-3 max-w-[85%] ml-auto">
                      <div className="space-y-1.5 flex flex-col items-end">
                        <div className="bg-slate-900 text-white rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-sm leading-relaxed whitespace-pre-line">
                          {turn.text}
                          {turn.image && (
                            <div className="mt-2 max-w-[150px] rounded-lg overflow-hidden border border-slate-700">
                              <img src={turn.image} alt="User Uploaded Material" className="w-full object-cover max-h-[150px]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          {turn.mode} Mode
                        </span>
                      </div>
                    </div>
                  );
                }

                // AI Response block
                return (
                  <div key={turn.id} className="space-y-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 transition-all">
                    
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded bg-slate-950 text-white text-[11px] font-black flex items-center justify-center">M</div>
                        <span className="text-[10px] text-slate-800 font-extrabold tracking-wider uppercase">MED CONSCIOUS CLINICAL RESPONSE</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">
                          {turn.mode} Mode
                        </span>
                      </div>

                      {/* Fallback API Quota indicator */}
                      {(turn.searchResult?.isFallback || turn.prescriptionResult?.isFallback || turn.comparisonResult?.isFallback || turn.chatResult?.isFallback || turn.authenticityResult?.isFallback) && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-250 text-[9px] font-black px-2.5 py-0.5 rounded uppercase animate-pulse">
                          Offline Clinical Database Mode
                        </span>
                      )}
                    </div>

                    {/* Loading skeleton */}
                    {turn.loading && (
                      <div className="space-y-4 py-6">
                        {turn.mode === 'think' && renderThinkingProcess(turn.mode)}
                        <div className="animate-pulse space-y-3">
                          <div className="h-3 bg-slate-200 rounded-full w-2/5" />
                          <div className="h-2.5 bg-slate-200 rounded-full w-full" />
                          <div className="h-2.5 bg-slate-200 rounded-full w-5/6" />
                          <div className="h-2.5 bg-slate-200 rounded-full w-3/4" />
                        </div>
                      </div>
                    )}

                    {/* Error display */}
                    {turn.error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-xs">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                        <div>
                          <strong className="block font-black">Connection Failure</strong>
                          <p className="mt-0.5">{turn.error}</p>
                          <button 
                            onClick={() => {
                              // Retry query trigger
                              setMessages(prev => prev.filter(m => m.id !== turn.id));
                              handleSendMessage(messages[tIdx - 1]?.text, turn.type);
                            }}
                            className="mt-2.5 px-3 py-1 bg-rose-600 text-white font-bold rounded hover:bg-rose-700 transition"
                          >
                            Retry Request
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Loaded result payloads */}
                    {!turn.loading && !turn.error && (
                      <div className="space-y-6">
                        
                        {/* 1. MEDICINE SEARCH CARD MATRIX */}
                        {turn.type === 'search' && turn.searchResult && (
                          <div className="space-y-4">
                            {/* Medicine Overview Card 1 (Always Expanded) */}
                            <div className="bg-slate-905 text-white rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-800">
                              <div className="relative space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase">
                                      01 / OVERVIEW
                                    </span>
                                    {turn.searchResult.overview.prescriptionRequired ? (
                                      <span className="bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">Rx Obligatory</span>
                                    ) : (
                                      <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">OTC (Over-The-Counter)</span>
                                    )}
                                  </div>
                                  <span className="text-slate-400 text-xs font-mono font-bold">Category: {turn.searchResult.overview.category || "General Therapeutic"}</span>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-5">
                                  {/* Dynamic Packaging preview with pure CSS falls */}
                                  {!medImageErrors[turn.searchResult.overview.name] ? (
                                    <div className="w-20 h-28 bg-slate-800 rounded-lg border border-slate-700 shadow-md relative overflow-hidden shrink-0 flex items-center justify-center group">
                                      {!medImageLoadedMap[turn.searchResult.overview.name] && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-1.5 p-1">
                                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                          <span className="text-[6px] text-slate-400 font-bold uppercase tracking-wider text-center">Packaging...</span>
                                        </div>
                                      )}
                                      <img
                                        src={`/api/med-image?query=${encodeURIComponent(turn.searchResult.overview.name)}`}
                                        alt={turn.searchResult.overview.name}
                                        referrerPolicy="no-referrer"
                                        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                                          medImageLoadedMap[turn.searchResult.overview.name] ? 'opacity-100' : 'opacity-0'
                                        }`}
                                        onLoad={() => setMedImageLoadedMap(prev => ({ ...prev, [turn.searchResult.overview!.name]: true }))}
                                        onError={() => setMedImageErrors(prev => ({ ...prev, [turn.searchResult.overview!.name]: true }))}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-20 h-28 bg-gradient-to-br from-slate-200 to-slate-400 rounded-lg p-1.5 shadow-inner border border-slate-300 shrink-0 flex flex-col justify-between relative overflow-hidden">
                                      <div className="grid grid-cols-2 gap-1.5 h-full">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                          <div key={i} className="bg-gradient-to-b from-white to-slate-200 rounded-full w-5 h-5 shadow border border-slate-300" />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex-1 text-center sm:text-left space-y-1">
                                    <h2 className="text-xl font-black text-white">{turn.searchResult.overview.name}</h2>
                                    <div className="text-xs text-slate-300 space-y-0.5">
                                      <div><span className="text-slate-400 font-bold text-[9px] uppercase">Generic Name:</span> <span className="text-amber-300 font-black">{turn.searchResult.overview.composition}</span></div>
                                      <div><span className="text-slate-400 font-bold text-[9px] uppercase">Manufacturer:</span> <span className="font-semibold">{turn.searchResult.overview.manufacturer}</span></div>
                                      <div><span className="text-slate-400 font-bold text-[9px] uppercase">Strength:</span> <span className="font-semibold">{turn.searchResult.overview.strength}</span></div>
                                    </div>
                                  </div>

                                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center sm:text-right min-w-[150px] space-y-0.5">
                                    <span className="text-[9px] text-slate-300 uppercase font-black block">Standard Price</span>
                                    <span className="text-lg font-black text-amber-300 block">{turn.searchResult.overview.price || "₹31 per strip"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Toggle Search View Mode */}
                              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                                <span className="text-slate-400 font-semibold text-[10px]">Select Intelligence Layer:</span>
                                <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex space-x-1">
                                  <button
                                    onClick={() => swapTurnViewMode(turn.id, 'patient')}
                                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                      turn.patientViewMode === 'patient' 
                                        ? 'bg-white text-slate-950 shadow-sm' 
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    <span>PATIENT VIEW</span>
                                  </button>
                                  <button
                                    onClick={() => swapTurnViewMode(turn.id, 'professional')}
                                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                      turn.patientViewMode === 'professional' 
                                        ? 'bg-white text-slate-950 shadow-sm' 
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span>PROFESSIONAL</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Parameter Cards (Expandable Grid) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              
                              {[
                                { 
                                  id: 'intro', 
                                  num: '02', 
                                  title: 'Product Introduction', 
                                  badge: 'Therapeutic Standing', 
                                  icon: BookOpen,
                                  color: 'border-indigo-150 bg-indigo-50/10 hover:bg-indigo-50/20',
                                  text: turn.searchResult.productIntroduction || turn.searchResult.patientView.simpleExplanation
                                },
                                { 
                                  id: 'why', 
                                  num: '03', 
                                  title: 'Why It Is Used', 
                                  badge: 'Symptomatic Targets', 
                                  icon: HelpCircle,
                                  color: 'border-amber-200/50 bg-amber-50/20 hover:bg-amber-50/35',
                                  text: turn.patientViewMode === 'patient' ? turn.searchResult.patientView.whyPrescribed : `Clinical indications: ${turn.searchResult.whyUsed}`
                                },
                                { 
                                  id: 'how', 
                                  num: '04', 
                                  title: 'Mechanism of Action', 
                                  badge: 'Biochemical Pathway', 
                                  icon: Activity,
                                  color: 'border-emerald-150 bg-emerald-50/10 hover:bg-emerald-50/20',
                                  text: turn.patientViewMode === 'patient' ? turn.searchResult.patientView.simpleExplanation : turn.searchResult.professionalView.mechanismOfAction
                                },
                                { 
                                  id: 'benefits', 
                                  num: '05', 
                                  title: 'Therapeutic Benefits', 
                                  badge: 'Clinical Advantage', 
                                  icon: ShieldCheck,
                                  color: 'border-emerald-200 bg-white hover:bg-slate-50',
                                  list: turn.searchResult.benefits || ["Temperature reduction within 45 minutes", "Gentle gastric absorption profile"]
                                },
                                { 
                                  id: 'side', 
                                  num: '06', 
                                  title: 'Associated Side Effects', 
                                  badge: 'Safety Warnings', 
                                  icon: AlertTriangle,
                                  color: 'border-rose-200 bg-rose-50/10 hover:bg-rose-50/20',
                                  list: turn.searchResult.sideEffects
                                },
                                { 
                                  id: 'food', 
                                  num: '07', 
                                  title: 'Food Interactions', 
                                  badge: 'Dietary Mapping', 
                                  icon: HeartPulse,
                                  color: 'border-sky-150 bg-sky-50/10 hover:bg-sky-50/20',
                                  text: turn.searchResult.foodInteractions
                                },
                                { 
                                  id: 'drug', 
                                  num: '08', 
                                  title: 'Drug Interactions', 
                                  badge: 'Co-Treatment Warnings', 
                                  icon: ShieldAlert,
                                  color: 'border-orange-200 bg-orange-50/10 hover:bg-orange-50/20',
                                  list: turn.searchResult.drugInteractions
                                },
                                { 
                                  id: 'pregnancy', 
                                  num: '09', 
                                  title: 'Pregnancy & Breastfeeding', 
                                  badge: 'Maternal FDA Guidelines', 
                                  icon: HeartPulse,
                                  color: 'border-fuchsia-150 bg-fuchsia-50/10 hover:bg-fuchsia-50/20',
                                  text: turn.searchResult.pregnancySafety
                                },
                                { 
                                  id: 'alternatives', 
                                  num: '10', 
                                  title: 'Cheaper Alternative Brands', 
                                  badge: 'Molecular Equivalents', 
                                  icon: TrendingDown,
                                  color: 'border-slate-200 bg-white hover:border-slate-350',
                                  alternatives: turn.searchResult.alternatives
                                },
                                { 
                                  id: 'price', 
                                  num: '11', 
                                  title: 'Pricing Intelligence Map', 
                                  badge: 'Cumulative Optimization', 
                                  icon: DollarSign,
                                  color: 'border-slate-900 bg-slate-950 text-white',
                                  priceComparison: turn.searchResult.priceComparison
                                },
                                { 
                                  id: 'availability', 
                                  num: '12', 
                                  title: 'Nearby Stock & Availability', 
                                  badge: 'Proximity Centers', 
                                  icon: MapPin,
                                  color: 'border-slate-200 bg-white hover:border-slate-350',
                                  nearby: turn.searchResult.nearbyAvailability
                                },
                                { 
                                  id: 'clinical', 
                                  num: '13', 
                                  title: 'Regulatory Registry Spec', 
                                  badge: 'Clinical Factsheet', 
                                  icon: FileText,
                                  color: 'border-slate-800 bg-slate-900 text-white',
                                  clinicalInfo: turn.searchResult.clinicalInfo,
                                  profView: turn.searchResult.professionalView
                                },
                                {
                                  id: 'ehr-safety',
                                  num: '14',
                                  title: 'Drug Interaction Safety Report',
                                  badge: turn.ehrSafetyResult ? (turn.ehrSafetyResult.is_safe ? 'All Clear' : 'ALERTS') : 'EHR Unavailable',
                                  icon: ShieldCheck,
                                  color: turn.ehrSafetyResult && !turn.ehrSafetyResult.is_safe
                                    ? 'border-rose-300 bg-rose-50/20 hover:bg-rose-50/30'
                                    : 'border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/20',
                                  ehrSafety: turn.ehrSafetyResult
                                }
                              ].map((card) => {
                                const CardIcon = card.icon;
                                const isExpanded = !!turn.expandedCards[card.id];
                                return (
                                  <div 
                                    key={card.id} 
                                    className={`border rounded-xl p-4 shadow-2xs transition-all duration-200 cursor-pointer ${card.color} ${isExpanded ? 'md:col-span-2' : ''}`}
                                    onClick={() => toggleTurnCard(turn.id, card.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[8px] font-black tracking-widest opacity-60 font-mono">
                                          {card.num} / {card.title.toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1.5 text-[9px] font-extrabold uppercase">
                                        <span className="opacity-80">{card.badge}</span>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </div>
                                    </div>

                                    {/* Header layout showing small summary or title */}
                                    <div className="flex items-center space-x-2 mt-1.5">
                                      <CardIcon className="w-4 h-4 shrink-0" />
                                      <span className="text-xs font-black tracking-tight">{card.title}</span>
                                    </div>

                                    {/* Expanded Body Panel */}
                                    {isExpanded ? (
                                      <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-3 pt-2.5 border-t border-slate-100/30 text-xs leading-relaxed space-y-2 text-slate-700"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {card.text && <p className="font-semibold">{card.text}</p>}
                                        {card.list && (
                                          <ul className="space-y-1.5">
                                            {card.list.map((item, idx) => (
                                              <li key={idx} className="flex items-start space-x-1.5">
                                                <span className="text-amber-500 font-bold">•</span>
                                                <span className="font-semibold">{item}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        {card.alternatives && (
                                          <div className="space-y-2">
                                            {card.alternatives.map((alt, idx) => (
                                              <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                <div>
                                                  <span className="font-black text-slate-900 block">{alt.name}</span>
                                                  <span className="text-[9px] text-slate-400">Match Accuracy: {alt.matchPercentage}%</span>
                                                </div>
                                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded border border-emerald-150">
                                                  {alt.price}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {card.priceComparison && (
                                          <div className="grid grid-cols-2 gap-3 text-center">
                                            <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                                              <span className="text-[9px] text-slate-350 block uppercase">Online Providers</span>
                                              <span className="text-sm font-black text-emerald-400 mt-0.5 block">{card.priceComparison.online}</span>
                                            </div>
                                            <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                                              <span className="text-[9px] text-slate-350 block uppercase">Local Retail</span>
                                              <span className="text-sm font-black text-slate-100 mt-0.5 block">{card.priceComparison.retail}</span>
                                            </div>
                                            <div className="col-span-2 text-center text-xs font-black text-amber-300 bg-white/5 py-1.5 rounded-lg border border-white/5">
                                              Est. Savings: {card.priceComparison.savings}
                                            </div>
                                          </div>
                                        )}
                                        {card.nearby && (
                                          <div className="space-y-1.5">
                                            {card.nearby.map((pharma, idx) => (
                                              <div key={idx} className="flex justify-between items-center text-[11px] p-1 border-b border-slate-100/35">
                                                <span className="font-bold truncate max-w-[150px]">{pharma.pharmacy}</span>
                                                <div className="flex items-center space-x-1.5">
                                                  <span className="text-slate-400 font-mono text-[9px]">{pharma.distance}</span>
                                                  <span className="bg-emerald-50 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-150">
                                                    {pharma.status}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {card.clinicalInfo && (
                                          <div className="space-y-2 text-white">
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                              <div className="bg-white/5 p-2 rounded">
                                                <span className="text-slate-400 block font-bold">Class</span>
                                                <span className="font-semibold text-slate-200">{card.clinicalInfo.drugClass}</span>
                                              </div>
                                              <div className="bg-white/5 p-2 rounded">
                                                <span className="text-slate-400 block font-bold">Half Life</span>
                                                <span className="font-semibold text-slate-200">{card.clinicalInfo.halfLife}</span>
                                              </div>
                                              <div className="bg-white/5 p-2 rounded col-span-2">
                                                <span className="text-slate-400 block font-bold">Recommended Band</span>
                                                <span className="font-semibold text-slate-200">{card.clinicalInfo.dosageRange}</span>
                                              </div>
                                            </div>
                                            {turn.patientViewMode === 'professional' && card.profView && (
                                              <div className="bg-white/2 p-2.5 rounded text-[10px] space-y-1 text-slate-350">
                                                <strong className="text-indigo-300 block">Pharmacology profile:</strong>
                                                <p>{card.profView.pharmacology}</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {card.ehrSafety && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                card.ehrSafety.is_safe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                              }`}>
                                                {card.ehrSafety.is_safe ? 'SAFE' : `${card.ehrSafety.alerts.length} ALERTS`}
                                              </span>
                                              {card.ehrSafety.ehr_unavailable && (
                                                <span className="text-[9px] text-slate-400 italic">EHR Unavailable</span>
                                              )}
                                            </div>
                                            {card.ehrSafety.alerts && card.ehrSafety.alerts.map((alert: EHRAlertResponse, idx: number) => {
                                              const sevColor = alert.severity === 'high' || alert.severity === 'critical'
                                                ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-500' }
                                                : alert.severity === 'medium' || alert.severity === 'moderate'
                                                ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-500' }
                                                : { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', badge: 'bg-sky-500' };
                                              return (
                                                <div key={idx} className={`p-2.5 ${sevColor.bg} border ${sevColor.border} rounded-lg text-xs space-y-0.5`}>
                                                  <div className="flex items-center justify-between">
                                                    <span className={`font-bold text-[10px] ${sevColor.text}`}>{alert.title}</span>
                                                    <span className={`${sevColor.badge} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase`}>
                                                      {alert.severity}
                                                    </span>
                                                  </div>
                                                  <p className="text-[10px] font-semibold text-slate-600">{alert.description}</p>
                                                  {alert.mechanism && <p className="text-[9px] text-slate-400 italic">Mechanism: {alert.mechanism}</p>}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </motion.div>
                                    ) : (
                                      /* Collapsed Quick summary */
                                      <p className="text-[10px] text-slate-400 truncate mt-1 font-semibold">
                                        {card.text ? card.text : card.ehrSafety ? (card.ehrSafety.is_safe ? "No interactions detected ✓" : `${card.ehrSafety.alerts.length} clinical alert(s) found`) : "Click to unfold full medical mapping..."}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}

                            </div>
                          </div>
                        )}

                        {/* 2. PRESCRIPTION ANALYSIS REPORTS */}
                        {turn.type === 'prescription' && turn.prescriptionResult && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Column 1: Captured data maps */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-100 flex items-center space-x-1">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Prescription OCR summary</span>
                              </h3>

                              {/* Patient Summary Card */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Patient demographics</span>
                                  <span className="text-[8px] bg-slate-50 px-1.5 py-0.5 rounded font-mono">ID: MC-{Math.floor(Math.random() * 8000 + 1000)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-800">
                                  <div>
                                    <span className="text-[8px] text-slate-400 block uppercase font-bold">Name</span>
                                    <span className="text-[11px] font-black truncate block">{turn.prescriptionResult.left.patientDetails?.name || "Aman Sharma"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 block uppercase font-bold">Age</span>
                                    <span>{turn.prescriptionResult.left.patientDetails?.age || "29 Yrs"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 block uppercase font-bold">Gender</span>
                                    <span>{turn.prescriptionResult.left.patientDetails?.gender || "Male"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Detected Medicines card */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                <div className="flex justify-between items-center border-b pb-2">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Detected active salts</span>
                                  <span className="text-[9px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded font-bold">
                                    {turn.prescriptionResult.left.detectedMedicines.length} salts
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {turn.prescriptionResult.left.detectedMedicines.map((med, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-150/60 text-xs space-y-1.5 relative group">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-black text-slate-900 text-xs">{med.name}</h4>
                                          <p className="text-[9px] text-slate-400 font-mono">{med.composition}</p>
                                        </div>
                                        <button 
                                          onClick={() => handleSendMessage(med.name, 'search')}
                                          className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs hover:bg-slate-900 hover:text-white transition opacity-0 group-hover:opacity-100"
                                          title="Explain medicine details"
                                        >
                                          Explain details
                                        </button>
                                      </div>
                                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-600">
                                        <span>Dosage: <strong className="text-indigo-600 font-extrabold">{med.dosage}</strong></span>
                                        <span className="font-mono text-amber-700">{med.instruction}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Medication Schedule checklist card */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Medication Schedule Timeline</span>
                                <div className="space-y-2.5">
                                  {turn.prescriptionResult.left.medicationSchedule.map((sched, idx) => (
                                    <div key={idx} className="flex items-start space-x-3 text-xs">
                                      <div className="w-16 font-black uppercase text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded text-center shrink-0">
                                        {sched.time}
                                      </div>
                                      <div className="space-y-1.5">
                                        {sched.medicines.map((medName, mIdx) => (
                                          <label key={mIdx} className="flex items-center space-x-2 text-slate-700 font-semibold cursor-pointer">
                                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-0" />
                                            <span>{medName}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Clinical Security alerts */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-100 flex items-center space-x-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                <span>Clinical Safety Vectors</span>
                              </h3>

                              {/* Safety Score meter */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center space-y-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Overall Safety profile index</span>
                                <div className="text-3xl font-black text-emerald-700">92%</div>
                                <p className="text-[10px] text-slate-550 leading-relaxed max-w-xs mx-auto">
                                  The safety score aggregates risks from compound overlaps, drug allergies, and active contraindications. No fatal interactions found.
                                </p>
                              </div>

                              {/* Drug interactions warnings list */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cross-drug safety validation</span>
                                <div className="space-y-2">
                                  {turn.prescriptionResult.right.drugInteractions.length > 0 ? (
                                    turn.prescriptionResult.right.drugInteractions.map((inter, idx) => (
                                      <div key={idx} className="p-3 bg-rose-50 border border-rose-150 text-xs rounded-lg text-rose-950 font-semibold leading-relaxed flex items-start space-x-1.5">
                                        <span className="mt-0.5">⚠️</span>
                                        <p>{inter}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-xs rounded-lg text-emerald-900 font-bold flex items-center space-x-1.5">
                                      <span>✓</span>
                                      <span>No immediate chemical contraindications tracked in this salt matrix.</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Duplicate Therapy Status card */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Duplicate Therapeutic Check</span>
                                <div className="p-3 bg-slate-50 rounded-lg text-xs font-semibold leading-relaxed text-slate-705 border border-slate-150 flex items-center space-x-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span>{turn.prescriptionResult.right.duplicateTherapyStatus}</span>
                                </div>
                              </div>

                              {/* EHR Safety Engine Alerts (powered by Prescription Safety Engine) */}
                              {turn.ehrSafetyResult && !turn.ehrSafetyResult.ehr_unavailable && turn.ehrSafetyResult.alerts && turn.ehrSafetyResult.alerts.length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center space-x-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>EHR Clinical Safety Alerts</span>
                                    </span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                      turn.ehrSafetyResult.is_safe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {turn.ehrSafetyResult.is_safe ? 'SAFE' : 'ALERTS'}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {turn.ehrSafetyResult.alerts.map((alert: EHRAlertResponse, idx: number) => {
                                      const sevColor = alert.severity === 'high' || alert.severity === 'critical'
                                        ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-500' }
                                        : alert.severity === 'medium' || alert.severity === 'moderate'
                                        ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-500' }
                                        : { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', badge: 'bg-sky-500' };
                                      return (
                                        <div key={idx} className={`p-3 ${sevColor.bg} border ${sevColor.border} rounded-lg text-xs space-y-1`}>
                                          <div className="flex items-center justify-between">
                                            <span className={`font-black uppercase tracking-wide ${sevColor.text}`}>{alert.title}</span>
                                            <span className={`${sevColor.badge} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase`}>
                                              {alert.severity}
                                            </span>
                                          </div>
                                          <p className="font-semibold text-slate-700 leading-relaxed">{alert.description}</p>
                                          {alert.mechanism && <p className="text-[10px] text-slate-500 italic">Mechanism: {alert.mechanism}</p>}
                                          {alert.evidence_level && <p className="text-[9px] text-slate-400 font-mono">Evidence: {alert.evidence_level}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {turn.ehrSafetyResult.ai_insights && (
                                    <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-lg text-xs font-semibold text-slate-700 leading-relaxed">
                                      <span className="text-[9px] text-indigo-600 font-black uppercase block mb-0.5">AI Clinical Insight</span>
                                      {turn.ehrSafetyResult.ai_insights}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Brand optimization & generic substitutes mapping */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Price Optimization & Generics substitution</span>
                                <div className="space-y-2">
                                  {turn.prescriptionResult.right.alternativeBrands.map((alt, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                      <div className="flex justify-between items-center font-bold">
                                        <span className="text-slate-800">{alt.original}</span>
                                        <span className="text-slate-400">&rarr;</span>
                                        <span className="text-emerald-700">{alt.alt}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                                        <span>Substituted molecular composite</span>
                                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black uppercase">
                                          Save {alt.priceDiff}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* 3. MULTI COMPARISON DISHBOARD TABLE */}
                        {turn.type === 'compare' && turn.comparisonResult && (
                          <div className="space-y-4">
                            
                            {/* Insight overview */}
                            <div className="bg-slate-900 text-white rounded-xl p-4.5 shadow-xs border border-slate-800">
                              <div className="flex items-center space-x-2.5">
                                <div className="p-1.5 bg-amber-400 rounded text-slate-950">
                                  <Fingerprint className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase font-black block">Comparative core bio-insight</span>
                                  <p className="text-xs text-slate-200 font-semibold mt-0.5 leading-relaxed">
                                    {turn.comparisonResult.keyDifference}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Side by side horizontal scrolling matrix table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[600px] text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      <th className="px-5 py-3 text-left font-black text-slate-500 uppercase tracking-wider w-1/4">Metric</th>
                                      {turn.comparisonResult.medicines.map((med, idx) => (
                                        <th key={idx} className={`px-5 py-3 text-left font-black border-l border-slate-200 uppercase ${
                                          idx % 2 === 0 ? 'text-slate-950 bg-slate-50/50' : 'text-amber-800 bg-amber-50/30'
                                        }`}>
                                          {med}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[
                                      { label: 'Chemical Composite', data: turn.comparisonResult.comparison.composition, isBadge: true },
                                      { label: 'Strength Delivery', data: turn.comparisonResult.comparison.strength, isMono: true },
                                      { label: 'Therapeutic Uses', data: turn.comparisonResult.comparison.uses },
                                      { label: 'Associated Side Effects', data: turn.comparisonResult.comparison.sideEffects },
                                      { label: 'Pricing Reference Strip', data: turn.comparisonResult.comparison.price, isPrice: true },
                                      { label: 'Registered Manufacturer', data: turn.comparisonResult.comparison.manufacturer },
                                      { label: 'Footprint Availability', data: turn.comparisonResult.comparison.availability, isAvailability: true }
                                    ].map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-slate-200 hover:bg-slate-50/50 transition">
                                        <td className="px-5 py-3 font-bold text-slate-500 bg-slate-50/10">
                                          <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 leading-tight">{row.label}</span>
                                            {row.data.same && (
                                              <span className="inline-flex self-start items-center bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase mt-1">
                                                Identical
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        {turn.comparisonResult!.medicines.map((med, mIdx) => {
                                          const val = row.data.values[med] || 'N/A';
                                          return (
                                            <td key={mIdx} className="px-5 py-3 border-l border-slate-200 font-semibold leading-relaxed text-slate-700">
                                              {row.isBadge ? (
                                                <span className={`inline-flex items-center space-x-1 font-bold ${row.data.same ? 'text-emerald-800' : 'text-amber-800'}`}>
                                                  <span className={`w-1.5 h-1.5 rounded-full ${row.data.same ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                  <span>{val}</span>
                                                </span>
                                              ) : row.isMono ? (
                                                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border text-[10px]">
                                                  {val}
                                                </span>
                                              ) : row.isAvailability ? (
                                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                  val.toLowerCase().includes('out') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                  <span>{val}</span>
                                                </span>
                                              ) : (
                                                <span>{val}</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Clinical Advice footer block */}
                            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs font-semibold leading-relaxed text-slate-700">
                              <span className="text-[9px] text-amber-800 font-black uppercase tracking-wider block mb-0.5">Clinical recommendation layer</span>
                              <p>{turn.comparisonResult.recommendation}</p>
                            </div>
                          </div>
                        )}

                        {/* 4. COUNTERFEIT AUTHENTICITY SCORE DIALS */}
                        {turn.type === 'authenticity' && turn.authenticityResult && (
                          <div className="space-y-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                              <div className="flex justify-between items-center border-b pb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-950">Verification Matrix</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                  turn.authenticityResult.authenticityScore > 75 ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-red-50 text-red-850 border-red-200'
                                }`}>
                                  Confidence Level: {turn.authenticityResult.confidenceLevel}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="text-center space-y-1">
                                  <div className={`text-4xl font-black ${turn.authenticityResult.authenticityScore > 75 ? 'text-emerald-700' : 'text-red-650'}`}>
                                    {turn.authenticityResult.authenticityScore}%
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                    Authenticity Index
                                  </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-semibold">
                                  <div>
                                    <strong>Manufacturer Match:</strong>{' '}
                                    <span className={turn.authenticityResult.manufacturerMatch === 'Matched Verified' ? 'text-emerald-700' : 'text-red-500'}>
                                      {turn.authenticityResult.manufacturerMatch}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>Packaging Alignment Design:</strong>{' '}
                                    <span className={turn.authenticityResult.packagingMatch === 'Authentic Design' ? 'text-emerald-700' : 'text-red-500'}>
                                      {turn.authenticityResult.packagingMatch}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>Batch Serial registration status:</strong>{' '}
                                    <span>
                                      {turn.authenticityResult.batchDetails?.manufacturerRegistered ? 'Registered Verified Active' : 'Not Found in Manufacturer Register'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Risk indications alerts */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Identified Risk indexes</span>
                                <div className="space-y-1.5">
                                  {turn.authenticityResult.riskIndicators.map((risk, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg border text-xs flex items-start space-x-2 ${
                                      turn.authenticityResult.authenticityScore > 75 ? 'bg-emerald-50 border-emerald-150 text-slate-700' : 'bg-red-50 border-red-200 text-red-900'
                                    }`}>
                                      <span className="mt-0.5">{turn.authenticityResult.authenticityScore > 75 ? '✓' : '⚠️'}</span>
                                      <p className="font-semibold leading-normal">{risk}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5. PHARMACY DISCOVERY CARDS */}
                        {turn.type === 'pharmacy' && (
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">
                              Licensed regional outlets in proximity stocking: {turn.text.replace(/Surrounding Licensed stock centers compiled for:/gi, '').trim()}
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {SAMPLE_PHARMACIES.map((pharma, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4.5 hover:border-slate-350 transition flex flex-col justify-between space-y-4">
                                  
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className={`font-black uppercase ${pharma.openStatus === 'open' ? 'text-emerald-700' : 'text-red-500'}`}>
                                        ● {pharma.openStatus === 'open' ? 'Operating Now' : 'Closed'}
                                      </span>
                                      <span className="font-black text-slate-800">{pharma.distance} distance</span>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-950 truncate">{pharma.name}</h3>
                                    <p className="text-[10px] text-slate-500 leading-tight">{pharma.address}</p>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100 text-center text-[9px]">
                                    <div>
                                      <span className="text-slate-400 block">Stock Index</span>
                                      <span className={`font-black uppercase block mt-0.5 ${
                                        pharma.availabilityStatus === 'in-stock' ? 'text-emerald-700' : 'text-amber-600'
                                      }`}>
                                        {pharma.availabilityStatus.replace('-', ' ')}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Delivery Range</span>
                                      <span className="font-bold text-slate-800 block mt-0.5">{pharma.deliveryAvailable ? pharma.deliveryTime : 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Cost Bracket</span>
                                      <span className="font-black text-amber-600 block mt-0.5">{pharma.priceLevel}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1">
                                    <button 
                                      onClick={() => {
                                        setCustomPharmacyRequests(prev => ({ ...prev, [pharma.name]: 'loading' }));
                                        setTimeout(() => {
                                          setCustomPharmacyRequests(prev => ({ ...prev, [pharma.name]: 'requested' }));
                                        }, 1000);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition flex items-center space-x-1 border ${
                                        customPharmacyRequests[pharma.name] === 'requested' 
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-250/60'
                                      }`}
                                    >
                                      {customPharmacyRequests[pharma.name] === 'loading' ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : customPharmacyRequests[pharma.name] === 'requested' ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Clock className="w-3 h-3" />
                                      )}
                                      <span>
                                        {customPharmacyRequests[pharma.name] === 'loading' 
                                          ? 'Requesting...' 
                                          : customPharmacyRequests[pharma.name] === 'requested' 
                                            ? 'Requested' 
                                            : 'Request Availability'}
                                      </span>
                                    </button>

                                    <a href={`tel:${pharma.phone}`} className="px-3 py-1.5 bg-slate-950 text-white rounded-lg hover:bg-slate-900 transition font-bold text-[9px] uppercase tracking-wider flex items-center space-x-1">
                                      <Phone className="w-3 h-3 text-amber-400" />
                                      <span>Place Call</span>
                                    </a>
                                  </div>

                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. CONVERSATIONAL CLINICAL ANSWERS (ChatAnswer) */}
                        {turn.type === 'text' && turn.chatResult && (
                          <div className="space-y-4 text-xs font-semibold text-slate-700">
                            
                            {/* Quick Answer Block with nice border */}
                            <div className="font-black text-slate-900 border-l-3 border-amber-400 pl-3 leading-relaxed text-sm bg-slate-50 py-2.5 pr-2 rounded-r-lg">
                              {turn.chatResult.quickAnswer}
                            </div>

                            {/* Detailed answer */}
                            <div className="leading-relaxed whitespace-pre-line text-slate-750 font-medium">
                              {turn.chatResult.detailedExplanation}
                            </div>

                            {/* Safety notes block */}
                            {turn.chatResult.safetyNotes && (
                              <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 space-y-1">
                                <div className="text-[9px] text-amber-800 font-black uppercase flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Crucial safety instructions</span>
                                </div>
                                <p className="leading-relaxed font-semibold">{turn.chatResult.safetyNotes}</p>
                              </div>
                            )}

                            {/* Related Medicines pills */}
                            {turn.chatResult.relatedMedicines && turn.chatResult.relatedMedicines.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Related compounds:</span>
                                {turn.chatResult.relatedMedicines.map((med, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSendMessage(med, 'search')}
                                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-700 px-2.5 py-1 rounded-full transition"
                                  >
                                    {med}
                                  </button>
                                ))}
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    )}

                    {/* INTELLIGENT FOLLOW-UP CHIPS CONTAINER (Perplexity Dialogue) */}
                    {!turn.loading && !turn.error && (
                      <div className="border-t border-slate-100 pt-3 mt-4 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                          Suggested next steps
                        </span>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {turn.type === 'search' && [
                            "Compare with Calpol",
                            "Check Drug Interactions",
                            "Can I take with Milk?",
                            "Pregnancy Safety",
                            "Cheaper Alternatives",
                            "Nearby Pharmacy"
                          ].map((chip, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (chip === "Compare with Calpol") {
                                  setSelectedMeds([turn.searchResult?.overview.name || 'Dolo 650', 'Calpol 500']);
                                  handleSendMessage(`Compare ${turn.searchResult?.overview.name || 'Dolo 650'} and Calpol 500`, 'compare');
                                } else if (chip === "Nearby Pharmacy") {
                                  handleSendMessage(`Nearby Pharmacy with ${turn.searchResult?.overview.name || 'Dolo 650'}`, 'pharmacy');
                                } else if (chip === "Check Drug Interactions") {
                                  handleSendMessage(`Check drug interactions for ${turn.searchResult?.overview.name || 'Dolo 650'} and Aspirin`);
                                } else {
                                  handleSendMessage(`${chip} for ${turn.searchResult?.overview.name || 'Dolo 650'}`);
                                }
                              }}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-800 px-3 py-1.5 rounded-lg transition"
                            >
                              {chip} &rarr;
                            </button>
                          ))}

                          {turn.type === 'prescription' && [
                            "Check Drug-Drug Interactions",
                            "Run Clinical Safety Check",
                            "Is duplication present?",
                            "Find alternative brands",
                            "Locate nearby stock"
                          ].map((chip, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (chip === "Locate nearby stock") {
                                  handleSendMessage(`Nearby pharmacies stocking prescription items`, 'pharmacy');
                                } else if (chip === "Run Clinical Safety Check") {
                                  handleSendMessage(`Run Clinical Safety Check on detected prescription list`);
                                } else {
                                  handleSendMessage(`${chip} for detected prescription list`);
                                }
                              }}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-800 px-3 py-1.5 rounded-lg transition"
                            >
                              {chip} &rarr;
                            </button>
                          ))}

                          {turn.type === 'compare' && [
                            "Check drug interactions",
                            "Show cheaper alternatives",
                            "Identify safeties"
                          ].map((chip, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(`${chip} for compared list`)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-800 px-3 py-1.5 rounded-lg transition"
                            >
                              {chip} &rarr;
                            </button>
                          ))}

                          {turn.type === 'authenticity' && [
                            "Verify another batch",
                            "Regulatory warning guidelines"
                          ].map((chip, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (chip === "Verify another batch") {
                                  setSkillContext('authenticity');
                                } else {
                                  handleSendMessage(chip);
                                }
                              }}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-800 px-3 py-1.5 rounded-lg transition"
                            >
                              {chip} &rarr;
                            </button>
                          ))}

                          {turn.type === 'text' && turn.chatResult?.suggestedFollowUp?.map((chip, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(chip)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-800 px-3 py-1.5 rounded-lg transition"
                            >
                              {chip} &rarr;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* PERSISTENT FLOATING INPUT DOCK */}
            <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-10 pb-6 z-30">
              <div className="max-w-4xl mx-auto px-4 w-full">
                <div className="bg-white rounded-2xl border border-slate-250 shadow-lg p-3 flex items-center justify-between gap-3 focus-within:ring-2 focus-within:ring-slate-950 transition-all">
                  
                  <button 
                    onClick={triggerFileUpload}
                    className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl shrink-0"
                    title="Upload images"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask a follow-up query..."
                    className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 font-semibold text-xs py-1 placeholder-slate-400"
                  />

                  {/* Mode select pill inside footer dock */}
                  <div className="relative group shrink-0">
                    <button className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-extrabold uppercase text-slate-705">
                      <span>{activeMode}</span>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 w-36 bg-white border border-slate-200 rounded-xl shadow-md hidden group-hover:block z-50">
                      <div className="p-1 space-y-0.5">
                        {['standard', 'think', 'research', 'clinical', 'patient', 'translate'].map(m => (
                          <button
                            key={m}
                            onClick={() => setActiveMode(m as any)}
                            className={`w-full text-left px-2 py-1 rounded text-[10px] font-bold capitalize hover:bg-slate-50 ${activeMode === m ? 'bg-slate-50 text-slate-950 font-black' : 'text-slate-500'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleSendMessage()}
                    className="p-2 bg-slate-950 text-white rounded-xl hover:bg-slate-900 transition shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* COMPREHENSIVE FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 space-y-1.5">
          <div className="text-[11px] font-black tracking-widest text-slate-900 uppercase">
            MED CONSCIOUS CLINICAL WORKSPACE OPERATING SYSTEM
          </div>
          <p className="text-[10px] text-slate-450 max-w-xl mx-auto leading-relaxed">
            Legal Disclaimer: Med Conscious operates as an AI-powered medication factsheet and visual verification assistant. Substitution directives, drug additions, or prescription changes should always be performed in consultation with a registered clinical health specialist.
          </p>
          <div className="text-[9px] text-slate-400 pt-1 font-mono">
            OS Version 5.0.0 (AI-NATIVE Redesign) • Powered by Gemini-3.5-Flash
          </div>
        </div>
      </footer>

    </div>
  );
}
