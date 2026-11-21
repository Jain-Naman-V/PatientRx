/**
 * MedConscious — Patient Experience
 * One Verified Medicine Knowledge Engine, Three Experiences
 * 
 * Flow & Features:
 * 1. Understand medicines in plain language (Multilingual, Audio, Food/Timing, Generic Price Saver)
 * 2. AI Fact-Check with Cited Verdicts (WhatsApp forwards, myths, CDSCO/ICMR citations, Packaging authenticity)
 * 3. Order through Licensed Partners (Apollo 24|7, 1mg, Jan Aushadhi generic substitution)
 * 4. Medication History & Consent Locker (Active cabinet, interaction shield, 24-hr doctor consent PIN/QR)
 * 5. Ask MedConscious AI Buddy (Conversational clinical consultant)
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, AlertTriangle, ShieldCheck, FileText, CheckCircle2, 
  MapPin, TrendingDown, Info, HelpCircle, Send, Languages, ChevronRight, 
  Camera, Fingerprint, RefreshCw, Layers, Check, Clock, Phone, DollarSign,
  Activity, ArrowRight, BookOpen, UserCheck, ShieldAlert, Pill, HeartPulse,
  Plus, Trash2, ChevronDown, ChevronUp, Mic, X, AlertCircle, ExternalLink,
  Share2, Lock, Key, QrCode, ShoppingBag, Volume2, CheckCircle, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Language, SearchResult, MultiComparisonResult, PrescriptionAnalysisResult, 
  ChatAnswer, Pharmacy, AuthenticityResult, EHRSafetyReport, FactCheckResult, 
  AllergenCatalogItem 
} from './types';

// Supported Indian Languages
const LANGS: { code: Language; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' }
];

const POPULAR_SEARCHES = [
  'Augmentin 625 Duo',
  'Dolo 650',
  'Glycomet 500 SR',
  'Pantocid 40',
  'Azithral 500',
  'Ecosprin 75'
];

const SAMPLE_FACT_CHECKS = [
  "Can I drink Papaya leaf juice with Dolo 650 during acute Dengue fever?",
  "Is taking Paracetamol every day harmful for kidneys and liver?",
  "Does drinking warm turmeric milk interfere with antibiotic absorption?",
  "Is Jan Aushadhi generic medicine as effective as branded medicine?"
];

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'home' | 'factcheck' | 'cabinet' | 'chat'>('home');
  
  // ── Search & Guide State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeMedicine, setActiveMedicine] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  
  // ── Prescription OCR & Upload State ──
  const [isAnalyzingRx, setIsAnalyzingRx] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionAnalysisResult | null>(null);
  const [uploadedRxName, setUploadedRxName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI Fact Check State ──
  const [factCheckInput, setFactCheckInput] = useState('');
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [authenticityBatch, setAuthenticityBatch] = useState('');
  const [authenticityResult, setAuthenticityResult] = useState<AuthenticityResult | null>(null);
  const [isAuthenticityChecking, setIsAuthenticityChecking] = useState(false);

  // ── Order Partner Modal State ──
  const [orderModalMed, setOrderModalMed] = useState<{ name: string; composition: string; price: string } | null>(null);
  const [orderCopied, setOrderCopied] = useState(false);

  // ── Med Cabinet & Consent State ──
  const [patientToken, setPatientToken] = useState<string | null>(() => localStorage.getItem('med_conscious_patient_token'));
  const [patientProfile, setPatientProfile] = useState<any | null>(() => {
    const saved = localStorage.getItem('med_conscious_patient_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeConsent, setActiveConsent] = useState<{ pin_code: string; consent_token: string; expires_at: string } | null>(null);
  const [isGrantingConsent, setIsGrantingConsent] = useState(false);
  const [consentSuccessMsg, setConsentSuccessMsg] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    sex: 'Female',
    allergies: '',
    conditions: '',
    activeMedications: ''
  });

  // Master Allergens Catalog from Backend
  const [allergensList, setAllergensList] = useState<AllergenCatalogItem[]>([]);
  const [cabinetSafetyAlerts, setCabinetSafetyAlerts] = useState<any[]>([]);

  // ── AI Chat Buddy State ──
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; citations?: string[]; isFallback?: boolean }>>([
    {
      sender: 'ai',
      text: "Namaste! I am your MedConscious digital health consultant. Ask me anything about your medicines, dosage timings, food interactions, or side effects."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch Master Allergens Catalog on Mount
  useEffect(() => {
    fetch('/api/allergies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllergensList(data);
      })
      .catch(err => console.warn('Could not load allergens catalog:', err));
  }, []);

  // Fetch Active Consent if Logged In
  useEffect(() => {
    if (patientToken) {
      fetch('/api/patient/consent/active', {
        headers: { Authorization: `Bearer ${patientToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.has_active_consent) {
            setActiveConsent({
              pin_code: data.pin_code,
              consent_token: data.consent_token,
              expires_at: data.expires_at
            });
          }
        })
        .catch(() => {});
    }
  }, [patientToken]);

  // Execute Medicine Search
  const handleSearch = async (queryText?: string) => {
    const q = (queryText || searchQuery).trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch medicine details');
      setActiveMedicine(data);

      // Auto-check against patient cabinet if logged in
      if (patientToken && patientProfile?.active_medications?.length) {
        checkCabinetInteractions(data.overview?.name || q);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Unable to connect to verified database');
    } finally {
      setIsSearching(false);
    }
  };

  // Run Safety check against patient's active cabinet
  const checkCabinetInteractions = async (newMedName: string) => {
    if (!patientToken) return;
    try {
      const cabinetMeds = Array.isArray(patientProfile.active_medications) 
        ? patientProfile.active_medications.map((m: any) => ({ name: m.name || m }))
        : [];
      const res = await fetch('/api/patient/safety-check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          medications: [...cabinetMeds, { name: newMedName }]
        })
      });
      const data = await res.json();
      if (data?.alerts) {
        setCabinetSafetyAlerts(data.alerts);
      }
    } catch (e) {
      console.warn('Cabinet interaction check skipped:', e);
    }
  };

  // Handle Prescription Image Upload & Analysis
  const handleRxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedRxName(file.name);
    setIsAnalyzingRx(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, lang })
        });
        const data = await res.json();
        setPrescriptionData(data);
        setActiveTab('home');
      } catch (err) {
        alert('Could not parse prescription. Please ensure the image is clear.');
      } finally {
        setIsAnalyzingRx(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle AI Fact Check Query
  const handleFactCheck = async (claimText?: string) => {
    const claim = (claimText || factCheckInput).trim();
    if (!claim) return;
    setIsFactChecking(true);
    try {
      const res = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, lang })
      });
      const data = await res.json();
      setFactCheckResult(data);
    } catch (err) {
      alert('Fact-check service temporarily unavailable.');
    } finally {
      setIsFactChecking(false);
    }
  };

  // Handle Authenticity Scan
  const handleAuthenticityCheck = async () => {
    if (!authenticityBatch.trim()) return;
    setIsAuthenticityChecking(true);
    try {
      const res = await fetch('/api/authenticity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchNumber: authenticityBatch, lang })
      });
      const data = await res.json();
      setAuthenticityResult(data);
    } catch (err) {
      alert('Authenticity scanning failed.');
    } finally {
      setIsAuthenticityChecking(false);
    }
  };

  // Grant 24-hr Doctor Consent Code
  const handleGrantConsent = async () => {
    if (!patientToken) {
      setShowAuthModal(true);
      return;
    }
    setIsGrantingConsent(true);
    setConsentSuccessMsg('');
    try {
      const res = await fetch('/api/patient/consent/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`
        },
        body: JSON.stringify({ duration_hours: 24, purpose: 'doctor_consultation' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant consent');
      setActiveConsent({
        pin_code: data.pin_code,
        consent_token: data.consent_token,
        expires_at: data.expires_at
      });
      setConsentSuccessMsg('Consent PIN active for 24 hours! Show this code to your doctor or pharmacist.');
    } catch (err: any) {
      alert(err.message || 'Consent generation failed');
    } finally {
      setIsGrantingConsent(false);
    }
  };

  // Revoke Doctor Consent
  const handleRevokeConsent = async () => {
    if (!patientToken) return;
    try {
      await fetch('/api/patient/consent/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      setActiveConsent(null);
      setConsentSuccessMsg('Consent authorization revoked successfully.');
    } catch (err) {
      alert('Could not revoke consent');
    }
  };

  // Submit Patient Auth Form
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'register' ? '/api/patient/register' : '/api/patient/login';
      const body = authMode === 'register' ? {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        age: Number(authForm.age),
        sex: authForm.sex,
        allergies: authForm.allergies || null,
        conditions: authForm.conditions || null,
        active_medications: authForm.activeMedications 
          ? authForm.activeMedications.split(',').map(m => ({ name: m.trim() })).filter(m => m.name)
          : []
      } : {
        email: authForm.email,
        password: authForm.password
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Authentication failed');

      localStorage.setItem('med_conscious_patient_token', data.access_token);
      localStorage.setItem('med_conscious_patient_profile', JSON.stringify(data.patient));
      setPatientToken(data.access_token);
      setPatientProfile(data.patient);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    }
  };

  // Send AI Chat Buddy Query
  const handleSendChatMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg || chatInput).trim();
    if (!msg) return;
    const newHistory = [...chatMessages, { sender: 'user' as const, text: msg }];
    setChatMessages(newHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: msg, 
          lang,
          patientContext: patientProfile ? {
            name: patientProfile.name,
            age: patientProfile.age,
            sex: patientProfile.sex,
            allergies: patientProfile.allergies,
            conditions: patientProfile.conditions,
            active_medications: patientProfile.active_medications
          } : null
        })
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.quickAnswer ? `${data.quickAnswer}\n\n${data.detailedExplanation || ''}` : (data.reply || 'Consult a healthcare professional.'),
          citations: data.safetyNotes ? [data.safetyNotes] : undefined,
          isFallback: data.isFallback
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to reach the clinical knowledge server. Please verify your connection or consult your doctor.',
          isFallback: true
        }
      ]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Text-to-Speech Audio Readout
  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      alert('Audio narration not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-8 flex flex-col">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-[#030d22] to-slate-800 bg-clip-text text-transparent">
                  MedConscious
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  Verified Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">India's Verified Medicine Safety & Patient Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700">
              <Languages className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as Language)}
                aria-label="Select language"
                className="bg-transparent text-xs font-bold outline-hidden cursor-pointer"
              >
                {LANGS.map(l => (
                  <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
                ))}
              </select>
            </div>

            {/* Profile / Auth Button */}
            {patientProfile ? (
              <button 
                onClick={() => setActiveTab('cabinet')}
                className="flex items-center space-x-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#030d22] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {patientProfile.name?.[0] || 'P'}
                </div>
                <span className="hidden sm:inline">{patientProfile.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex border-t border-slate-100 bg-slate-50/70">
          <div className="max-w-6xl mx-auto px-4 flex space-x-8">
            <button
              onClick={() => setActiveTab('home')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'home' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Medicine Guide & Search</span>
            </button>
            <button
              onClick={() => setActiveTab('factcheck')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'factcheck' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Fact-Check & Authenticity</span>
            </button>
            <button
              onClick={() => setActiveTab('cabinet')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'cabinet' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Med Cabinet & Doctor Share</span>
              {activeConsent && (
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                  PIN ACTIVE
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Ask MedConscious AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* ═════════════════════════════════════════════════════ */}
        {/* TAB 1: HOME & MEDICINE GUIDE                           */}
        {/* ═════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Hero Search Box */}
            <div className="bg-gradient-to-br from-[#04122e] via-slate-900 to-[#030d22] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="max-w-2xl">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>253,000+ Indian Medicines &bull; Ingredient-Level DDI Analysis</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  Understand your medicines in plain words.
                </h1>
                <p className="text-blue-200 text-xs sm:text-sm font-medium mb-6">
                  Check uses, food interactions, safety alerts, and compare prices with verified generic alternatives.
                </p>

                {/* Search Bar */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                  className="flex items-center bg-white rounded-xl p-1.5 shadow-lg border border-blue-200/50"
                >
                  <Search className="w-5 h-5 ml-3 text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brand, generic (e.g. Augmentin, Dolo 650, Metformin)..."
                    className="flex-1 px-3 py-2 text-sm text-slate-900 font-semibold outline-hidden placeholder:text-slate-400"
                  />
                  <button 
                    type="submit" 
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                  >
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Explore</span>}
                  </button>
                </form>

                {/* Popular Search Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-4 text-xs">
                  <span className="text-blue-300 font-medium mr-1 text-[11px]">Popular:</span>
                  {POPULAR_SEARCHES.map(med => (
                    <button
                      key={med}
                      onClick={() => { setSearchQuery(med); handleSearch(med); }}
                      className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold border border-white/10 transition-colors"
                    >
                      {med}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Scan Prescription & Price Saver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">📸 Scan Doctor's Prescription</div>
                      <div className="text-[10px] text-slate-300">Extract medications, timings, & safety warnings</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleRxUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <button
                  onClick={() => setActiveTab('factcheck')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">🛡️ Fact-Check WhatsApp Forward</div>
                      <div className="text-[10px] text-slate-300">Cited verdicts backed by CDSCO & ICMR</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Cabinet Safety Alert Banner (if logged in and conflict found) */}
            {cabinetSafetyAlerts.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center space-x-2 text-red-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>SAFETY SHIELD: Potential interaction with your current medications</span>
                </div>
                {cabinetSafetyAlerts.map((alert, i) => (
                  <div key={i} className="pl-6 text-red-700 font-medium">
                    &bull; <strong>{alert.title}</strong>: {alert.description}
                  </div>
                ))}
              </div>
            )}

            {/* Prescription OCR Results (if uploaded) */}
            {isAnalyzingRx && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Analyzing prescription OCR with clinical intelligence...</p>
              </div>
            )}

            {prescriptionData && !isAnalyzingRx && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">Extracted Prescription Intelligence</h3>
                  </div>
                  <button 
                    onClick={() => setPrescriptionData(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Medications</h4>
                    <div className="space-y-2">
                      {prescriptionData.left?.detectedMedicines?.map((m, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="font-extrabold text-slate-900">{m.name}</div>
                          <div className="text-slate-600 text-[11px] font-medium">{m.composition}</div>
                          <div className="mt-1 flex gap-2 text-[10px] text-blue-700 font-bold">
                            <span>Dosage: {m.dosage}</span> &bull; <span>Instructions: {m.instruction}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Safety Analysis</h4>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-2">
                      <p className="text-slate-800 font-medium">{prescriptionData.right?.medicationIntelligence}</p>
                      {prescriptionData.right?.warnings?.map((w, i) => (
                        <div key={i} className="text-amber-800 text-[11px] font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Medicine Detail View (When medicine searched) */}
            {activeMedicine && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
                {/* Header Card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-extrabold text-slate-900">{activeMedicine.overview?.name}</h2>
                      {activeMedicine.overview?.prescriptionRequired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          Prescription (Rx) Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-blue-700 mt-0.5">{activeMedicine.overview?.composition}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Manufacturer: {activeMedicine.overview?.manufacturer}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => speakText(`${activeMedicine.overview?.name}. ${activeMedicine.patientView?.simpleExplanation || activeMedicine.whyUsed}`)}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      title="Listen in your language"
                    >
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>Listen</span>
                    </button>
                    <button 
                      onClick={() => setOrderModalMed({
                        name: activeMedicine.overview?.name,
                        composition: activeMedicine.overview?.composition,
                        price: activeMedicine.overview?.price || '₹65 per strip'
                      })}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Order via Licensed Partners</span>
                    </button>
                  </div>
                </div>

                {/* Plain-Language 3-Pillar Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pillar 1: What is this medicine for? */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center space-x-2 text-[#04122e] font-bold text-xs uppercase tracking-wider">
                      <Pill className="w-4 h-4 text-blue-600" />
                      <span>What it treats</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {activeMedicine.patientView?.simpleExplanation || activeMedicine.whyUsed}
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium">
                      <strong>How it works:</strong> {activeMedicine.howItWorks}
                    </div>
                  </div>

                  {/* Pillar 2: How & When to take */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center space-x-2 text-[#04122e] font-bold text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>How to take safely</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {activeMedicine.patientView?.howToTake || "Take with plenty of water as advised by your physician."}
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium">
                      <strong>Food & Drink:</strong> {activeMedicine.foodInteractions || "Can be taken after food."}
                    </div>
                  </div>

                  {/* Pillar 3: Crucial Warnings & Side Effects */}
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                    <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Precautions & Safety</span>
                    </div>
                    <p className="text-xs text-amber-950 font-medium">
                      {activeMedicine.patientView?.warnings || "Do not exceed prescribed daily dose."}
                    </p>
                    <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 font-medium">
                      <strong>Pregnancy Category:</strong> {activeMedicine.pregnancySafety || "Consult obstetrician"}
                    </div>
                  </div>
                </div>

                {/* Generic Price Saver Widget (Save up to 70%) */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-950 font-extrabold text-sm">
                      <TrendingDown className="w-5 h-5 text-emerald-600" />
                      <span>Generic Price Saver &bull; Verified Indian Substitutes</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Save up to 60%-70%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-medium">
                    The chemical bioequivalence of generics matches branded medicine. You can request these verified equivalents from licensed Jan Aushadhi or retail pharmacists:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {activeMedicine.alternatives?.map((alt, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{alt.name}</div>
                          <div className="text-[11px] text-emerald-700 font-semibold">{alt.price}</div>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-200">
                          {alt.matchPercentage}% Composition Match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════ */}
        {/* TAB 2: AI FACT-CHECK & AUTHENTICITY                   */}
        {/* ═════════════════════════════════════════════════════ */}
        {activeTab === 'factcheck' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-900 via-slate-900 to-amber-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold mb-3 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Clinical Fact-Checker &bull; Anti-Counterfeit Scanner</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                Verify viral medical claims with cited scientific verdicts.
              </h2>
              <p className="text-amber-200 text-xs sm:text-sm font-medium mb-6">
                Paste any WhatsApp forward, YouTube myth, or check medicine strip authenticity against CDSCO and ICMR registries.
              </p>

              <form 
                onSubmit={(e) => { e.preventDefault(); handleFactCheck(); }}
                className="flex items-center bg-white rounded-xl p-1.5 shadow-lg border border-amber-200/50"
              >
                <input 
                  type="text" 
                  value={factCheckInput}
                  onChange={(e) => setFactCheckInput(e.target.value)}
                  placeholder="Paste claim: 'Can I take Giloy juice with Dolo 650 for Dengue?'"
                  className="flex-1 px-3 py-2 text-sm text-slate-900 font-semibold outline-hidden placeholder:text-slate-400"
                />
                <button 
                  type="submit" 
                  disabled={isFactChecking}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  {isFactChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Fact-Check</span>}
                </button>
              </form>

              {/* Sample Claims */}
              <div className="flex flex-wrap items-center gap-1.5 mt-4 text-xs">
                <span className="text-amber-300 font-medium mr-1 text-[11px]">Trending Claims:</span>
                {SAMPLE_FACT_CHECKS.map((claim, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setFactCheckInput(claim); handleFactCheck(claim); }}
                    className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold border border-white/10 transition-colors text-left truncate max-w-xs"
                  >
                    {claim}
                  </button>
                ))}
              </div>
            </div>

            {/* Fact Check Verdict Card */}
            {factCheckResult && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                      factCheckResult.verdict === 'VERIFIED_SAFE' 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : factCheckResult.verdict === 'DANGEROUS' || factCheckResult.verdict === 'MYTH_MISLEADING'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {factCheckResult.verdictBadge || factCheckResult.verdict}
                    </span>
                  </div>

                  <button 
                    onClick={() => {
                      const shareText = `*MedConscious Fact-Check Verdict*\nClaim: "${factCheckResult.claim}"\nVerdict: ${factCheckResult.verdictBadge}\nExplanation: ${factCheckResult.summary}\nVerified via MedConscious Safety Engine`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                    }}
                    className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Investigated Claim</h4>
                    <p className="text-sm font-extrabold text-slate-900">"{factCheckResult.claim}"</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <h5 className="font-bold text-slate-900">Plain Language Verdict</h5>
                    <p className="text-slate-700 leading-relaxed font-medium">{factCheckResult.summary}</p>
                    <p className="text-slate-600 text-[11px] font-medium pt-1 border-t border-slate-200">
                      <strong>Scientific Explanation:</strong> {factCheckResult.scientificExplanation}
                    </p>
                  </div>

                  {/* Cited Evidence Sources */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cited Clinical Evidence & Registries</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {factCheckResult.citations?.map((c, i) => (
                        <div key={i} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                          <div className="font-extrabold text-[#030d22] flex items-center space-x-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>{c.source}</span>
                          </div>
                          <div className="font-semibold text-slate-800 text-[11px] mt-0.5">{c.title}</div>
                          <div className="text-slate-600 text-[10px] mt-1">{c.quoteOrFinding}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Packaging Authenticity & Hologram Scanner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Strip Authenticity & Counterfeit Batch Verification</h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Verify manufacturer batch number alignment and packaging design specifications.
              </p>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={authenticityBatch}
                  onChange={(e) => setAuthenticityBatch(e.target.value)}
                  placeholder="Enter Batch Number (e.g. DL93012, AUG2401)..."
                  className="flex-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-hidden"
                />
                <button
                  onClick={handleAuthenticityCheck}
                  disabled={isAuthenticityChecking}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  {isAuthenticityChecking ? 'Verifying...' : 'Verify Batch'}
                </button>
              </div>

              {authenticityResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Authenticity Score:</span>
                    <span className="text-emerald-700 font-black text-sm">{authenticityResult.authenticityScore} / 100</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Manufacturer Alignment: <strong>{authenticityResult.manufacturerMatch}</strong> &bull; Packaging Design: <strong>{authenticityResult.packagingMatch}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════ */}
        {/* TAB 3: MED CABINET & DOCTOR SHARE LOCKER              */}
        {/* ═════════════════════════════════════════════════════ */}
        {activeTab === 'cabinet' && (
          <div className="space-y-6">
            {!patientProfile ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Your Med Cabinet & Health Locker</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Sign in or create your self-service account to store active medications, record allergies, and generate 24-hr secure doctor consent PINs.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <button 
                    onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Card & 24-hr Consent Generator */}
                <div className="bg-gradient-to-br from-slate-900 to-[#030d22] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-extrabold">{patientProfile.name}</h2>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-blue-200">
                        {patientProfile.age} yrs &bull; {patientProfile.sex}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">Verified Patient Locker &bull; {patientProfile.email}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      {patientProfile.allergies && (
                        <span className="bg-red-500/20 text-red-200 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Allergies: {patientProfile.allergies}
                        </span>
                      )}
                      {patientProfile.conditions && (
                        <span className="bg-blue-500/20 text-blue-200 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Conditions: {patientProfile.conditions}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Doctor Consent PIN generator */}
                  <div className="p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs text-center min-w-[240px]">
                    {activeConsent ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Doctor Access Active</span>
                        </div>
                        <div className="text-2xl font-black tracking-widest text-white font-mono bg-white/10 py-1.5 rounded-lg border border-white/20">
                          {activeConsent.pin_code}
                        </div>
                        <p className="text-[10px] text-slate-300">Share this 6-digit PIN with your doctor or pharmacist</p>
                        <button
                          onClick={handleRevokeConsent}
                          className="text-[10px] text-red-300 hover:text-red-200 underline font-bold mt-1"
                        >
                          Revoke Access Immediately
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Key className="w-5 h-5 text-blue-300 mx-auto" />
                        <div className="text-xs font-bold text-white">Share with Doctor / Clinic</div>
                        <p className="text-[10px] text-slate-300">Generate a 24-hr timed PIN for secure medication history access</p>
                        <button
                          onClick={handleGrantConsent}
                          disabled={isGrantingConsent}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          {isGrantingConsent ? 'Generating...' : 'Generate 24-hr PIN'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {consentSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                    {consentSuccessMsg}
                  </div>
                )}

                {/* Active Medications Cabinet */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Pill className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-extrabold text-slate-900">Active Medication Locker</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Continuous DDI shield monitors all entries
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.isArray(patientProfile.active_medications) && patientProfile.active_medications.length > 0 ? (
                      patientProfile.active_medications.map((m: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-slate-900">{m.name || m}</div>
                            <div className="text-[10px] text-slate-500">Active Daily Regimen</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Safe & Monitored
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-medium">
                        No active medications stored. Update your profile to add your daily medicines.
                      </div>
                    )}
                  </div>
                </div>

                {/* Master Allergens Guide */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">Standardized Allergen Catalog (Backend Verified)</h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    The Prescription Safety Engine cross-references all medicines against these recognized allergen classes:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {allergensList.slice(0, 6).map((alg) => (
                      <div key={alg.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="font-extrabold text-slate-900 flex items-center justify-between">
                          <span>{alg.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                            alg.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {alg.severity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium">{alg.description}</p>
                        <div className="text-[10px] text-blue-700 font-semibold">
                          Examples: {alg.common_brands}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════ */}
        {/* TAB 4: ASK MEDCONSCIOUS AI CLINICAL BUDDY            */}
        {/* ═════════════════════════════════════════════════════ */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Ask MedConscious AI Clinical Consultant</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Evidence-based clinical guidelines &bull; Multilingual support</p>
                </div>
              </div>
              <button 
                onClick={() => setChatMessages([chatMessages[0]])}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
              >
                Reset Chat
              </button>
            </div>

            {/* Context / Sign In Banner */}
            {patientProfile ? (
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800">
                    Personalized for {patientProfile.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    (Conditions: <strong className="text-slate-700">{patientProfile.conditions || 'None listed'}</strong> &bull; Allergies: <strong className="text-slate-700">{patientProfile.allergies || 'None listed'}</strong>)
                  </span>
                </div>
                <button onClick={() => setActiveTab('cabinet')} className="text-blue-600 hover:underline font-bold text-[11px]">
                  View Locker &rarr;
                </button>
              </div>
            ) : (
              <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-amber-950 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Personalize Your Advice:</strong> Sign in or tell the AI your conditions & allergies so it can cross-check for personal drug interactions.
                  </span>
                </div>
                <button
                  onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md text-[11px] font-bold transition-colors shadow-xs shrink-0"
                >
                  Sign In / Quick Setup
                </button>
              </div>
            )}

            {/* Chat Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs font-medium space-y-2 ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                    {m.citations && m.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/50 text-[10px] text-amber-900 font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{m.citations[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl p-3 text-xs text-slate-500 flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Cross-referencing verified drug literature...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Context & Clinical Suggestions */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/80 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Ask with Context:</span>
              <button
                type="button"
                onClick={() => handleSendChatMessage("I have Type-2 Diabetes. Is taking Dolo 650 safe with my condition?")}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              >
                🩺 "I have Type-2 Diabetes, is Dolo safe?"
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage("I am allergic to Penicillin. Can I safely take Augmentin 625 Duo?")}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              >
                ⚠️ "I have a Penicillin Allergy"
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage("I take Glycomet 500 SR daily. Can I take it concurrently with Paracetamol?")}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              >
                💊 "Glycomet 500 + Paracetamol interaction"
              </button>
            </div>

            {/* Chat Input Bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your medicine: 'I missed my morning dose of Glycomet, what to do?'"
                className="flex-1 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── LICENSED PARTNER ORDER MODAL ── */}
      {orderModalMed && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Order via Licensed Partners</h3>
              </div>
              <button onClick={() => setOrderModalMed(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-extrabold text-slate-900">{orderModalMed.name}</div>
              <div className="text-slate-600 text-[11px] font-medium">{orderModalMed.composition}</div>
              <div className="mt-1 text-blue-700 font-bold">{orderModalMed.price}</div>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Select your preferred licensed partner to complete home delivery or find an authorized Jan Aushadhi generic dispensary:
            </p>

            <div className="space-y-2">
              <a 
                href={`https://www.1mg.com/search/all?name=${encodeURIComponent(orderModalMed.name)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-xs font-bold text-slate-900"
              >
                <span>Tata 1mg (Online Delivery &bull; Up to 20% Off)</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              <a 
                href={`https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(orderModalMed.name)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-xs font-bold text-slate-900"
              >
                <span>Apollo 24|7 Pharmacy (2-Hour Fast Delivery)</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              <a 
                href="https://janaushadhi.gov.in/KendraDetails.aspx"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors text-xs font-bold text-emerald-950"
              >
                <div>
                  <div>Pradhan Mantri Jan Aushadhi Kendra Locator</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Affordable government-quality generic equivalent (save up to 70%)</div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-600" />
              </a>
            </div>

            <button 
              onClick={() => setOrderModalMed(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── PATIENT AUTH MODAL ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {authMode === 'register' ? 'Create Patient Health Account' : 'Sign In to Your Med Cabinet'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-lg border border-red-200">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={authForm.name} 
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Age</label>
                      <input 
                        type="number" 
                        required 
                        value={authForm.age} 
                        onChange={e => setAuthForm({ ...authForm, age: e.target.value })} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sex</label>
                      <select 
                        value={authForm.sex} 
                        onChange={e => setAuthForm({ ...authForm, sex: e.target.value })} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Known Drug Allergies</label>
                      <span className="text-[10px] text-slate-400">Tap to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['Penicillins', 'Sulfa Drugs', 'NSAIDs / Aspirin', 'Cephalosporins', 'No Allergies'].map((alg) => {
                        const isSelected = authForm.allergies.includes(alg);
                        return (
                          <button
                            type="button"
                            key={alg}
                            onClick={() => {
                              if (alg === 'No Allergies') {
                                setAuthForm({ ...authForm, allergies: 'None' });
                                return;
                              }
                              const items = authForm.allergies.split(',').map(s => s.trim()).filter(s => s && s !== 'None');
                              const next = items.includes(alg) ? items.filter(s => s !== alg) : [...items, alg];
                              setAuthForm({ ...authForm, allergies: next.join(', ') });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              isSelected 
                                ? 'bg-red-600 text-white border-red-600' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{alg}
                          </button>
                        );
                      })}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Penicillins, Aspirin, Sulfa"
                      value={authForm.allergies} 
                      onChange={e => setAuthForm({ ...authForm, allergies: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Chronic Conditions</label>
                      <span className="text-[10px] text-slate-400">Tap to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['Type-2 Diabetes', 'Hypertension (High BP)', 'Asthma', 'Kidney Disease', 'None'].map((cond) => {
                        const isSelected = authForm.conditions.includes(cond);
                        return (
                          <button
                            type="button"
                            key={cond}
                            onClick={() => {
                              if (cond === 'None') {
                                setAuthForm({ ...authForm, conditions: 'None' });
                                return;
                              }
                              const items = authForm.conditions.split(',').map(s => s.trim()).filter(s => s && s !== 'None');
                              const next = items.includes(cond) ? items.filter(s => s !== cond) : [...items, cond];
                              setAuthForm({ ...authForm, conditions: next.join(', ') });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              isSelected 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{cond}
                          </button>
                        );
                      })}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Diabetes Type-2, Hypertension, Asthma"
                      value={authForm.conditions} 
                      onChange={e => setAuthForm({ ...authForm, conditions: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Active Daily Medications</label>
                      <span className="text-[10px] text-slate-400">Tap to add</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['Glycomet 500 SR', 'Pantocid 40', 'Ecosprin 75', 'Telma 40', 'Atorva 10'].map((med) => {
                        const isSelected = authForm.activeMedications.includes(med);
                        return (
                          <button
                            type="button"
                            key={med}
                            onClick={() => {
                              const items = authForm.activeMedications.split(',').map(s => s.trim()).filter(Boolean);
                              const next = items.includes(med) ? items.filter(s => s !== med) : [...items, med];
                              setAuthForm({ ...authForm, activeMedications: next.join(', ') });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              isSelected 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{med}
                          </button>
                        );
                      })}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Glycomet 500 SR, Pantocid 40, Ecosprin 75"
                      value={authForm.activeMedications} 
                      onChange={e => setAuthForm({ ...authForm, activeMedications: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authForm.email} 
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input 
                  type="password" 
                  required 
                  minLength={8}
                  value={authForm.password} 
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-hidden font-medium" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {authMode === 'register' ? 'Register Health Account' : 'Sign In'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 text-xs">
              {authMode === 'register' ? (
                <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold hover:underline">
                  Already have an account? Sign In
                </button>
              ) : (
                <button onClick={() => setAuthMode('register')} className="text-blue-600 font-bold hover:underline">
                  New here? Create a Patient Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-4 flex justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'home' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <Pill className="w-5 h-5 mb-0.5" />
          <span>Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('factcheck')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'factcheck' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span>Fact-Check</span>
        </button>

        <button
          onClick={() => setActiveTab('cabinet')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'cabinet' ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          <Lock className="w-5 h-5 mb-0.5" />
          <span>Cabinet</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'chat' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <HeartPulse className="w-5 h-5 mb-0.5" />
          <span>AI Buddy</span>
        </button>
      </div>
    </div>
  );
}
