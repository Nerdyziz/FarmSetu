'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip
} from 'recharts'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_LOTS } from '@/lib/mock-data'
import { gradeFromInputs, GradeResult } from '@/lib/grading'
import { fetchLots, recordLotGrade, LotRecord } from '@/lib/supabase/services'


interface YoloDetection {
  id: number
  label: string
  confidence: number
  box: { top: number; left: number; width: number; height: number }
  status: 'sound' | 'blemish' | 'rot'
}

interface YoloScanData {
  imageSrc: string
  crateName: string
  totalFruits: number
  soundCount: number
  blemishCount: number
  rotCount: number
  defectPct: number
  uniformityPct: number
  estimatedBrix: number
  inferenceMs: number
  detections: YoloDetection[]
}

const PRESET_CRATES: Record<'A' | 'B' | 'C', YoloScanData> = {
  A: {
    imageSrc: 'preset-a',
    crateName: 'Nagpur Mandarin - Grade A Export Crate Sample',
    totalFruits: 30,
    soundCount: 29,
    blemishCount: 1,
    rotCount: 0,
    defectPct: 3.2,
    uniformityPct: 94,
    estimatedBrix: 12.4,
    inferenceMs: 38,
    detections: [
      { id: 1, label: 'Sound', confidence: 0.98, box: { top: 15, left: 12, width: 22, height: 22 }, status: 'sound' },
      { id: 2, label: 'Sound', confidence: 0.96, box: { top: 16, left: 40, width: 21, height: 22 }, status: 'sound' },
      { id: 3, label: 'Sound', confidence: 0.97, box: { top: 14, left: 68, width: 23, height: 23 }, status: 'sound' },
      { id: 4, label: 'Sound', confidence: 0.95, box: { top: 44, left: 16, width: 22, height: 22 }, status: 'sound' },
      { id: 5, label: 'Blemish (Minor)', confidence: 0.89, box: { top: 43, left: 45, width: 21, height: 22 }, status: 'blemish' },
      { id: 6, label: 'Sound', confidence: 0.97, box: { top: 45, left: 71, width: 21, height: 21 }, status: 'sound' },
      { id: 7, label: 'Sound', confidence: 0.96, box: { top: 70, left: 24, width: 23, height: 22 }, status: 'sound' },
      { id: 8, label: 'Sound', confidence: 0.98, box: { top: 69, left: 56, width: 22, height: 23 }, status: 'sound' },
    ]
  },
  B: {
    imageSrc: 'preset-b',
    crateName: 'Vidarbha Cluster - Grade B Domestic Crate Sample',
    totalFruits: 28,
    soundCount: 23,
    blemishCount: 4,
    rotCount: 1,
    defectPct: 11.5,
    uniformityPct: 79,
    estimatedBrix: 9.4,
    inferenceMs: 41,
    detections: [
      { id: 1, label: 'Sound', confidence: 0.94, box: { top: 14, left: 12, width: 21, height: 22 }, status: 'sound' },
      { id: 2, label: 'Blemish (Thrip)', confidence: 0.92, box: { top: 15, left: 41, width: 22, height: 22 }, status: 'blemish' },
      { id: 3, label: 'Sound', confidence: 0.95, box: { top: 16, left: 69, width: 20, height: 21 }, status: 'sound' },
      { id: 4, label: 'Blemish (Scar)', confidence: 0.88, box: { top: 43, left: 15, width: 21, height: 22 }, status: 'blemish' },
      { id: 5, label: 'Sound', confidence: 0.96, box: { top: 44, left: 43, width: 22, height: 22 }, status: 'sound' },
      { id: 6, label: 'Rot / Fungal', confidence: 0.91, box: { top: 45, left: 70, width: 22, height: 22 }, status: 'rot' },
      { id: 7, label: 'Blemish (Sun)', confidence: 0.86, box: { top: 71, left: 26, width: 20, height: 21 }, status: 'blemish' },
      { id: 8, label: 'Sound', confidence: 0.94, box: { top: 70, left: 57, width: 22, height: 22 }, status: 'sound' },
    ]
  },
  C: {
    imageSrc: 'preset-c',
    crateName: 'Distress / Blemished Crate (Processor Candidate)',
    totalFruits: 26,
    soundCount: 16,
    blemishCount: 7,
    rotCount: 3,
    defectPct: 26.8,
    uniformityPct: 63,
    estimatedBrix: 7.2,
    inferenceMs: 44,
    detections: [
      { id: 1, label: 'Blemish (Spot)', confidence: 0.95, box: { top: 14, left: 14, width: 22, height: 22 }, status: 'blemish' },
      { id: 2, label: 'Rot / Mold', confidence: 0.94, box: { top: 15, left: 42, width: 21, height: 22 }, status: 'rot' },
      { id: 3, label: 'Blemish', confidence: 0.91, box: { top: 16, left: 69, width: 21, height: 21 }, status: 'blemish' },
      { id: 4, label: 'Sound', confidence: 0.92, box: { top: 44, left: 15, width: 22, height: 22 }, status: 'sound' },
      { id: 5, label: 'Rot / Puncture', confidence: 0.96, box: { top: 43, left: 44, width: 22, height: 22 }, status: 'rot' },
      { id: 6, label: 'Blemish (Scar)', confidence: 0.88, box: { top: 45, left: 70, width: 21, height: 21 }, status: 'blemish' },
      { id: 7, label: 'Sound', confidence: 0.90, box: { top: 70, left: 27, width: 21, height: 21 }, status: 'sound' },
      { id: 8, label: 'Blemish', confidence: 0.89, box: { top: 69, left: 56, width: 22, height: 22 }, status: 'blemish' },
    ]
  }
}

export default function OperatorQualityPage() {
  const { lang } = useLang()

  // ── Live lots from Supabase ──────────────────────────────────
  const [allLots, setAllLots] = useState<LotRecord[]>([])
  const [loadingLots, setLoadingLots] = useState(true)

  useEffect(() => {
    async function loadLots() {
      setLoadingLots(true)
      const res = await fetchLots()
      setAllLots(res.lots)
      setLoadingLots(false)
    }
    loadLots()

    const handleSync = () => {
      loadLots()
    }
    window.addEventListener('farmsetu_lots_updated', handleSync)
    window.addEventListener('farmsetu_simulation_update', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('farmsetu_lots_updated', handleSync)
      window.removeEventListener('farmsetu_simulation_update', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // Refresh lots from Supabase (called after grading)
  const refreshLots = async () => {
    const res = await fetchLots()
    setAllLots(res.lots)
  }

  const [selectedLot, setSelectedLot] = useState<LotRecord | null>(null)
  const [gradedLots, setGradedLots] = useState<Record<string, GradeResult>>({})
  const [form, setForm] = useState({ brixPct: '', blemishPct: '', uniformity: '', actualWeightKg: '' })
  const [grading, setGrading] = useState(false)

  // Lots waiting to be graded = status is 'pending' OR has no grade/certHash yet
  const ungraded = allLots.filter((l) =>
    l.status === 'pending' || (!l.certHash && !gradedLots[l.id])
  )
  // Completed = graded this session OR already has a certHash in DB
  const completed = allLots.filter((l) =>
    gradedLots[l.id] || (l.certHash && l.certHash !== '' && l.status !== 'pending')
  )

  // YOLOv8 scan states
  const [yoloScanning, setYoloScanning] = useState(false)
  const [yoloActiveData, setYoloActiveData] = useState<YoloScanData | null>(null)
  const [customImageUri, setCustomImageUri] = useState<string | null>(null)
  const [appliedAiAlert, setAppliedAiAlert] = useState(false)

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const uri = event.target?.result as string
      setCustomImageUri(uri)
      // Run synthetic scan on custom upload
      runScanSimulation(file.name, uri)
    }
    reader.readAsDataURL(file)
  }

  const runScanSimulation = (name: string, customUri?: string) => {
    setYoloScanning(true)
    setAppliedAiAlert(false)
    setTimeout(() => {
      // Pick dynamic scan values based on lot or random variance
      const defect = parseFloat((Math.random() * 8 + 2.5).toFixed(1))
      const uniformity = Math.round(96 - defect * 1.5)
      const brix = parseFloat((12.5 - defect * 0.25).toFixed(1))

      setYoloActiveData({
        imageSrc: customUri ?? 'preset-custom',
        crateName: name,
        totalFruits: 32,
        soundCount: Math.round(32 * (1 - defect / 100)),
        blemishCount: Math.max(1, Math.round(32 * (defect / 100))),
        rotCount: defect > 15 ? 2 : 0,
        defectPct: defect,
        uniformityPct: uniformity,
        estimatedBrix: brix,
        inferenceMs: Math.round(32 + Math.random() * 15),
        detections: PRESET_CRATES.A.detections.map((d, i) => ({
          ...d,
          status: i === 4 && defect > 5 ? 'blemish' : i === 6 && defect > 15 ? 'rot' : 'sound',
          label: i === 4 && defect > 5 ? 'Blemish' : i === 6 && defect > 15 ? 'Rot / Defect' : 'Sound Fruit',
          confidence: parseFloat((0.92 + Math.random() * 0.07).toFixed(2))
        }))
      })
      setYoloScanning(false)
    }, 1200)
  }

  const selectPresetCrate = (type: 'A' | 'B' | 'C') => {
    setCustomImageUri(null)
    setYoloScanning(true)
    setAppliedAiAlert(false)
    setTimeout(() => {
      setYoloActiveData(PRESET_CRATES[type])
      setYoloScanning(false)
    }, 800)
  }

  const applyAiValuesToForm = () => {
    if (!yoloActiveData) return
    setForm((prev) => ({
      ...prev,
      blemishPct: yoloActiveData.defectPct.toString(),
      uniformity: yoloActiveData.uniformityPct.toString(),
      brixPct: yoloActiveData.estimatedBrix.toString(),
    }))
    setAppliedAiAlert(true)
    setTimeout(() => setAppliedAiAlert(false), 4000)
  }

  const handleGrade = () => {
    if (!selectedLot || !form.brixPct || !form.blemishPct || !form.uniformity) return
    setGrading(true)
    setTimeout(async () => {
      const brix = parseFloat(form.brixPct)
      const blemish = parseFloat(form.blemishPct)
      const uniformity = parseFloat(form.uniformity)
      const result = gradeFromInputs({
        cropType: selectedLot.crop,
        brixPct: brix,
        blemishPct: blemish,
        weightUniformity: uniformity,
      })
      await recordLotGrade(
        selectedLot.id,
        result,
        form.actualWeightKg ? parseFloat(form.actualWeightKg) : undefined,
        brix,
        blemish,
        uniformity
      )
      setGradedLots((prev) => ({ ...prev, [selectedLot.id]: result }))
      setGrading(false)
      setForm({ brixPct: '', blemishPct: '', uniformity: '', actualWeightKg: '' })
      setYoloActiveData(null)
      setCustomImageUri(null)
      setSelectedLot(null)
      // Refresh lots from Supabase so farmer/buyer pages see updated data
      await refreshLots()
    }, 1000)
  }



  // Radar data
  const radarData = [
    { attr: lang === 'hi' ? 'मिठास' : 'Brix',        A: 88, B: 65, C: 42 },
    { attr: lang === 'hi' ? 'साफ़ी' : 'Cleanliness',  A: 95, B: 72, C: 44 },
    { attr: lang === 'hi' ? 'आकार' : 'Uniformity',    A: 92, B: 75, C: 60 },
    { attr: lang === 'hi' ? 'वजन' : 'Weight',          A: 90, B: 80, C: 65 },
    { attr: lang === 'hi' ? 'ताजगी' : 'Freshness',    A: 94, B: 70, C: 50 },
  ]

  const gradeColors: Record<string, string> = {
    A: 'grade-a',
    B: 'grade-b',
    C: 'grade-c',
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {lang === 'hi' ? '🔬 गुणवत्ता जाँच और YOLOv8 विज़न स्कैन' : '🔬 Quality Grading & YOLOv8 Vision Scan'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'hi'
              ? 'PACS हब ऑपरेटर: क्रेट फोटो अपलोड करें, YOLOv8 द्वारा स्वतः सतह दोष जाँचें और डिजिटल सर्टिफिकेट जारी करें'
              : 'PACS Hub Operator: Upload crate photos, run edge YOLOv8 detection for blemishes & issue certified grades'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span>YOLOv8-Agri Edge INT8 Active</span>
          </span>
        </div>
      </div>

      {/* ── PENDING LOTS QUEUE ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xs border border-orange-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📥</span>
            <h2 className="font-bold text-sm sm:text-base text-orange-800">
              {lang === 'hi' ? 'जाँच बाकी लॉट (किसानों द्वारा जमा)' : 'Lots Awaiting PACS Grading (Farmer Drop-offs)'}
            </h2>
          </div>
          <span className="bg-orange-500 text-white text-[11px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-full font-bold">
            {loadingLots ? '…' : ungraded.length} {lang === 'hi' ? 'बाकी' : 'Pending'}
          </span>
        </div>

        {loadingLots ? (
          <div className="p-6 text-center text-gray-400 animate-pulse text-xs sm:text-sm">
            {lang === 'hi' ? '⏳ Supabase से लोड हो रहा है…' : '⏳ Loading from Supabase…'}
          </div>
        ) : ungraded.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm">{lang === 'hi' ? 'सभी लॉट जाँचे जा चुके हैं' : 'All dropped-off lots are graded!'}</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ungraded.map((lot) => (
              <div key={lot.id} className="px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition">
                <div>
                  <div className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    <span>{lang === 'hi' ? lot.farmerNameHi : lot.farmerName}</span>
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-medium">{lot.id}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    🍊 {lot.crop} · {lot.weightKg} kg
                  </div>
                  <div className="text-[11px] sm:text-xs text-orange-600 mt-0.5 font-semibold">
                    ⏳ {lang === 'hi' ? 'जाँच बाकी — PACS में पहुँचा' : 'Awaiting inspection — arrived at PACS'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedLot(lot)
                    selectPresetCrate('A')
                  }}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 flex-shrink-0 active:scale-95"
                >
                  <span>📷</span>
                  <span>{lang === 'hi' ? 'YOLOv8 से जाँचें' : 'Scan & Grade with YOLOv8'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ── GRADING MODAL / PANEL WITH YOLOv8 SCANNER ──────── */}
      {selectedLot && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-3.5 sm:p-6 transition-all">
          <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔬</span>
                <h2 className="text-xl font-bold text-blue-900">
                  {lang === 'hi' ? 'PACS ऑपरेटर ग्रेडिंग वर्कस्टेशन' : 'PACS Operator Grading & Vision Workstation'}
                </h2>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {lang === 'hi' ? 'किसान:' : 'Farmer:'} <strong>{lang === 'hi' ? selectedLot.farmerNameHi : selectedLot.farmerName}</strong>
                {' '} | {lang === 'hi' ? 'लॉट:' : 'Lot:'} <span className="font-mono text-blue-700 font-bold">{selectedLot.id}</span>
                {' '} | {selectedLot.weightKg} kg · 🍊 {selectedLot.crop}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedLot(null)
                setYoloActiveData(null)
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl font-bold"
            >✕</button>
          </div>

          {/* ── FEATURE: YOLOv8 IMAGE SCANNER SECTION ─────── */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 mb-6 shadow-inner border border-indigo-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-xl">
                  📷
                </div>
                <div>
                  <h3 className="font-bold text-base text-blue-200">
                    {lang === 'hi' ? 'YOLOv8 कंप्यूटर विज़न क्रेट स्कैनर' : 'YOLOv8 Computer Vision Crate Scanner'}
                  </h3>
                  <p className="text-xs text-indigo-300">
                    {lang === 'hi' ? 'क्रेट की फोटो अपलोड करें या कैमरा स्कैन करें (सटीक सतह दोष और आकार विश्लेषण)' : 'Upload or capture crate photo for edge AI surface defect & uniformity detection'}
                  </p>
                </div>
              </div>

              {/* Upload trigger */}
              <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-blue-400 shadow">
                <span>📤</span>
                <span>{lang === 'hi' ? 'फोटो अपलोड करें' : 'Upload Crate Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCustomImageUpload}
                />
              </label>
            </div>

            {/* Test Presets Quick Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              <span className="text-indigo-300 font-medium w-full sm:w-auto">
                {lang === 'hi' ? 'त्वरित टेस्ट नमूना चुनें:' : 'Or choose verified crate sample:'}
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => selectPresetCrate('A')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-medium transition text-[11px] sm:text-xs"
                >
                  🍊 Sample A (Grade A)
                </button>
                <button
                  type="button"
                  onClick={() => selectPresetCrate('B')}
                  className="px-2.5 py-1.5 rounded-lg bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-500/50 text-yellow-300 font-medium transition text-[11px] sm:text-xs"
                >
                  🍊 Sample B (Grade B)
                </button>
                <button
                  type="button"
                  onClick={() => selectPresetCrate('C')}
                  className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 font-medium transition text-[11px] sm:text-xs"
                >
                  🍊 Sample C (Grade C)
                </button>
              </div>
            </div>

            {/* YOLOv8 Scanning Viewport with Bounding Boxes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Image Preview & Box Overlay Container */}
              <div className="lg:col-span-7 relative bg-slate-950/90 rounded-xl overflow-hidden border border-slate-700 min-h-[260px] flex items-center justify-center">
                {customImageUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customImageUri}
                    alt="Uploaded crate"
                    className="w-full h-64 object-cover opacity-80"
                  />
                ) : (
                  // Realistic crate SVG background representing orange crate
                  <div className="w-full h-64 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 p-4 relative flex flex-col justify-between select-none">
                    <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded w-fit border border-emerald-500/30">
                      LIVE_FEED: PACS_CAMERA_CAM02 // ONNX_INT8
                    </div>
                    {/* Simulated crate matrix */}
                    <div className="grid grid-cols-4 gap-3 my-auto px-6 opacity-60">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 via-amber-400 to-yellow-300 shadow-lg border border-orange-300 mx-auto" />
                      ))}
                    </div>
                    <div className="text-[10px] text-gray-400 text-center font-mono">
                      [HDPE Crate 400x300mm Standard - Tare: 1.8kg]
                    </div>
                  </div>
                )}

                {/* Laser scan animation line */}
                {yoloScanning && (
                  <div className="absolute inset-0 bg-blue-500/15 pointer-events-none flex flex-col justify-center items-center backdrop-blur-[1px]">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-pulse" />
                    <div className="mt-3 px-4 py-1.5 bg-slate-900/90 rounded-full border border-cyan-400/50 text-cyan-300 font-mono text-xs animate-bounce">
                      ⚡ YOLOv8 Inference: Processing crate frame (38ms)...
                    </div>
                  </div>
                )}

                {/* Bounding boxes overlay */}
                {yoloActiveData && !yoloScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    {yoloActiveData.detections.map((det) => {
                      const color =
                        det.status === 'sound'
                          ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                          : det.status === 'blemish'
                          ? 'border-yellow-400 text-yellow-300 bg-yellow-500/15'
                          : 'border-red-500 text-red-300 bg-red-500/20'

                      return (
                        <div
                          key={det.id}
                          className={`absolute border-2 rounded-lg ${color} transition-all duration-300`}
                          style={{
                            top: `${det.box.top}%`,
                            left: `${det.box.left}%`,
                            width: `${det.box.width}%`,
                            height: `${det.box.height}%`,
                          }}
                        >
                          <span className="absolute -top-3.5 left-0 text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900/90 whitespace-nowrap border border-current font-bold">
                            {det.label} ({Math.round(det.confidence * 100)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* YOLOv8 AI Insights & Metric Output */}
              <div className="lg:col-span-5 space-y-3">
                {yoloActiveData ? (
                  <div className="bg-slate-900/80 rounded-xl p-4 border border-indigo-800/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-900">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                        Detection Metrics
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        ⏱️ {yoloActiveData.inferenceMs} ms
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-800/90 rounded-lg p-2 border border-slate-700">
                        <div className="text-gray-400 text-[10px]">Total Scanned</div>
                        <div className="text-lg font-bold text-white mt-0.5">{yoloActiveData.totalFruits}</div>
                        <div className="text-[9px] text-emerald-400">{yoloActiveData.soundCount} sound</div>
                      </div>
                      <div className="bg-slate-800/90 rounded-lg p-2 border border-slate-700">
                        <div className="text-gray-400 text-[10px]">Blemish Rate</div>
                        <div className="text-lg font-bold text-yellow-400 mt-0.5">{yoloActiveData.defectPct}%</div>
                        <div className="text-[9px] text-yellow-300">{yoloActiveData.blemishCount} defects</div>
                      </div>
                      <div className="bg-slate-800/90 rounded-lg p-2 border border-slate-700">
                        <div className="text-gray-400 text-[10px]">Uniformity</div>
                        <div className="text-lg font-bold text-cyan-400 mt-0.5">{yoloActiveData.uniformityPct}%</div>
                        <div className="text-[9px] text-cyan-300">Grade Index</div>
                      </div>
                    </div>

                    <div className="text-xs bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/60 flex items-center justify-between">
                      <span className="text-indigo-300">
                        🍬 NIR Brix Estimation (Correlated):
                      </span>
                      <span className="font-bold text-white text-sm">
                        {yoloActiveData.estimatedBrix}% Brix
                      </span>
                    </div>

                    {/* Button to populate form */}
                    <button
                      type="button"
                      onClick={applyAiValuesToForm}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <span>⚡</span>
                      <span>
                        {lang === 'hi'
                          ? 'AI परिणाम नीचे फॉर्म में भरें'
                          : 'Apply AI Values to Grading Form'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-indigo-900 text-center text-xs text-indigo-300">
                    <p className="mb-2">
                      {lang === 'hi'
                        ? '👆 ऊपर से क्रेट की फोटो अपलोड करें या टेस्ट सैंपल पर क्लिक करें।'
                        : '👆 Upload a crate photo above or click a test sample to trigger YOLOv8 detection.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectPresetCrate('A')}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold rounded-lg"
                    >
                      {lang === 'hi' ? 'डेमो स्कैन चलाएं' : 'Run Demo Scan'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {appliedAiAlert && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✅</span>
              <span>
                {lang === 'hi'
                  ? 'YOLOv8 विज़न परिणाम फॉर्म में भर दिए गए हैं! ऑपरेटर वास्तविक वजन भरें और ग्रेड जारी करें।'
                  : 'YOLOv8 vision results applied to the form! Operator can verify weighed scale weight and issue certificate.'}
              </span>
            </div>
          )}

          {/* ── MANUAL VERIFICATION & NIR FORM ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Actual weight */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'hi' ? '⚖️ तुला वजन (kg) [PACS वेईब्रिज / कांटा]' : '⚖️ Weighed Weight (kg) [PACS Weighbridge Scale]'}
              </label>
              <input
                type="number"
                placeholder={`Farmer declared: ${selectedLot.weightKg} kg`}
                value={form.actualWeightKg}
                onChange={(e) => setForm({ ...form, actualWeightKg: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              {form.actualWeightKg && Math.abs(parseFloat(form.actualWeightKg) - selectedLot.weightKg) > selectedLot.weightKg * 0.05 && (
                <div className="text-xs text-red-600 mt-1">⚠️ {lang === 'hi' ? 'वजन में 5% से अधिक अंतर - पुनः मिलान आवश्यक' : 'Weight mismatch >5% with farmer declaration'}</div>
              )}
            </div>

            {/* Brix */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'hi' ? '🍬 Brix % (NIR स्पेक्ट्रोमीटर / रिफ्रैक्टोमीटर)' : '🍬 Brix % (NIR Spectrometer / Refractometer)'}
              </label>
              <input
                type="number" step="0.1" min="0" max="20"
                placeholder="e.g. 11.5"
                value={form.brixPct}
                onChange={(e) => setForm({ ...form, brixPct: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Blemish */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'hi' ? '🔍 सतह दाग % (YOLOv8 स्कैन से प्राप्त)' : '🔍 Surface Blemish % (From YOLOv8 AI Scan)'}
              </label>
              <input
                type="number" step="0.1" min="0" max="100"
                placeholder="e.g. 4.2"
                value={form.blemishPct}
                onChange={(e) => setForm({ ...form, blemishPct: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Uniformity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'hi' ? '📏 आकार एकसमानता % (0–100)' : '📏 Size Uniformity % (0–100)'}
              </label>
              <input
                type="number" step="1" min="0" max="100"
                placeholder="e.g. 92"
                value={form.uniformity}
                onChange={(e) => setForm({ ...form, uniformity: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Grade thresholds guide */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="font-semibold text-gray-700">{lang === 'hi' ? 'सरकारी Agmarknet / FSSAI श्रेणी मापदंड:' : 'Agmarknet / FSSAI Official Grade Thresholds:'}</span>
              <span className="text-gray-400 text-[10px]">Algorithm: ATC-YOLOv5 + ResNet50 NIR</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="grade-a p-2 rounded-lg border border-emerald-300">
                <strong>Grade A (Premium):</strong> Brix ≥ 10, Blemish ≤ 8%, Uniformity ≥ 85%
              </div>
              <div className="grade-b p-2 rounded-lg border border-yellow-300">
                <strong>Grade B (Domestic):</strong> Brix 8–10, Blemish 8–20%
              </div>
              <div className="grade-c p-2 rounded-lg border border-red-300">
                <strong>Grade C (Processing):</strong> Residual produce → Divert to juice plants
              </div>
            </div>
          </div>

          {/* Escrow note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-900 flex items-start gap-2">
            <span className="text-base flex-shrink-0">ℹ️</span>
            <div>
              <strong>{lang === 'hi' ? 'एस्क्रो फंड प्रक्रिया:' : 'Escrow Fund Protocol:'}</strong>
              <span className="ml-1">
                {lang === 'hi'
                  ? 'सर्टिफिकेट जारी होने पर 100% फंड एस्क्रो में सुरक्षित हो जाता है। किसान को 70% अग्रिम तब जारी होगा जब इस लॉट का ट्रक बुक व कन्फर्म होगा।'
                  : 'Certifying locks 100% produce value in the escrow vault. The 70% advance is released to the farmer when a consolidated truck is booked & dispatched.'}
              </span>
            </div>
          </div>

          <button
            onClick={handleGrade}
            disabled={grading || !form.brixPct || !form.blemishPct || !form.uniformity}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm transition shadow-md disabled:opacity-40 flex items-center justify-center gap-2 text-center"
          >
            {grading ? (
              <span>⏳ {lang === 'hi' ? 'SHA-256 सर्टिफिकेट और श्रेणी तैयार हो रही है…' : 'Generating SHA-256 Certificate & Grade…'}</span>
            ) : (
              <span>✅ {lang === 'hi' ? 'प्रमाणित श्रेणी जारी करें (एस्क्रो सुरक्षित करें — ट्रक बुकिंग पर 70% अग्रिम)' : 'Certify Lot & Lock in Escrow (70% releases on truck booking)'}</span>
            )}
          </button>
        </div>
      )}

      {/* ── COMPLETED GRADES ──────────────────────────────── */}
      {completed.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          <div className="px-5 py-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <h2 className="font-bold text-green-800">
                {lang === 'hi' ? 'जाँचे गए व प्रमाणित लॉट' : 'Graded & SHA-256 Certified Lots (Ready for Consolidation)'}
              </h2>
            </div>
            <span className="text-xs text-green-700 font-semibold bg-green-200/60 px-2.5 py-0.5 rounded-full">
              {completed.length} Certified
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {completed.map((lot) => {
              const certHash = gradedLots[lot.id]?.certHash || lot.certHash || ''
              const grade = (gradedLots[lot.id]?.grade || lot.grade || 'B') as 'A' | 'B' | 'C'
              const score = gradedLots[lot.id]?.score ?? lot.score ?? 75
              return (
                <div key={lot.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-800">
                      {lang === 'hi' ? lot.farmerNameHi : lot.farmerName}
                      <span className="ml-2 text-xs text-gray-500 font-mono">{lot.id}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      🍊 {lot.crop} · {lot.weightKg} kg
                    </div>
                    {certHash && (
                      <div className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block border border-emerald-200">
                        🔐 {certHash.slice(0, 28)}…
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${gradeColors[grade] || 'grade-b'}`}>
                      Grade {grade}
                    </span>
                    <div className="text-xs text-gray-500">Score: {score}/100</div>
                    <Link
                      href={`/operator/certificate/${lot.id}`}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1"
                    >
                      🔐 {lang === 'hi' ? 'प्रमाण-पत्र देखें' : 'View Certificate'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ANALYTICS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">
            {lang === 'hi' ? 'श्रेणी के अनुसार गुणवत्ता' : 'Quality Attributes by Grade'}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="attr" tick={{ fontSize: 11 }} />
              <Radar name="Grade A" dataKey="A" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} />
              <Radar name="Grade B" dataKey="B" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.15} />
              <Radar name="Grade C" dataKey="C" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality pipeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">
            {lang === 'hi' ? 'जाँच प्रक्रिया' : 'Grading Pipeline Steps'}
          </h2>
          {[
            { step: lang === 'hi' ? '1. YOLOv8 सतह स्कैन'      : '1. YOLOv8 Surface Scan',           pct: 100, color: 'bg-blue-500' },
            { step: lang === 'hi' ? '2. NIR / Brix जाँच'        : '2. NIR / Brix Check',               pct: 85,  color: 'bg-blue-400' },
            { step: lang === 'hi' ? '3. वजन मिलान'               : '3. Weighbridge Reconciliation',     pct: 92,  color: 'bg-green-500' },
            { step: lang === 'hi' ? '4. SHA-256 प्रमाण-पत्र'     : '4. SHA-256 Certificate Issued',     pct: 78,  color: 'bg-green-400' },
            { step: lang === 'hi' ? '5. 2–5% गंतव्य पुनः-जाँच'  : '5. 2–5% Destination Re-check',     pct: 12,  color: 'bg-orange-500' },
          ].map((s, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{s.step}</span>
                <span className="text-gray-500">{s.pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`${s.color} h-2.5 rounded-full`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Re-check flags from existing graded lots */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-orange-100 bg-orange-50 flex items-center gap-2">
          <span className="text-orange-600 text-lg">⚠️</span>
          <h2 className="font-bold text-orange-800">
            {lang === 'hi' ? '2–5% यादृच्छिक पुनः-जाँच सूची' : '2–5% Random Re-check Required (Anti-Fraud Gate)'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'लॉट' : 'Lot'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'श्रेणी' : 'Grade'}</th>
                <th className="px-4 py-3 text-left">Brix %</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'दाग %' : 'Blemish %'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'कारण' : 'Flag Reason'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_LOTS.slice(0, 2).map((lot) => (
                <tr key={lot.id} className="hover:bg-orange-50">
                  <td className="px-4 py-3 font-mono text-xs">{lot.id}</td>
                  <td className="px-4 py-3 font-medium">{lang === 'hi' ? lot.farmerNameHi : lot.farmerName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold grade-${lot.grade.toLowerCase()}`}>{lot.grade}</span>
                  </td>
                  <td className="px-4 py-3">{lot.brixPct}</td>
                  <td className="px-4 py-3">{lot.blemishPct}%</td>
                  <td className="px-4 py-3 text-orange-700 text-xs">
                    {lang === 'hi' ? 'यादृच्छिक नमूना — गंतव्य पर जाँच करें' : 'Random sample — verify at destination'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
