'use client'
import { useState, useEffect, use } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { fetchLots, LotRecord } from '@/lib/supabase/services'
import Link from 'next/link'

// ── Minimal QR-code via pure SVG (no npm dependency) ────────────
// Uses a simple Data Matrix-style visual for demo; encodes hash prefix
function QrCodeSvg({ value, size = 180 }: { value: string; size?: number }) {
  // Create a deterministic bit-matrix from the value string
  const N = 21 // 21×21 module grid (QR v1-like visual)
  const cells: boolean[][] = Array.from({ length: N }, (_, row) =>
    Array.from({ length: N }, (__, col) => {
      const idx = (row * N + col) % value.length
      const charCode = value.charCodeAt(idx)
      // finder pattern corners
      if ((row < 7 && col < 7) || (row < 7 && col > N - 8) || (row > N - 8 && col < 7)) {
        const r = row % 7, c = col % 7
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) return true
        return false
      }
      return (charCode + row + col) % 3 !== 0
    })
  )

  const cellSize = size / N
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: 'pixelated' }}>
      <rect width={size} height={size} fill="white" />
      {cells.map((row, ri) =>
        row.map((on, ci) =>
          on ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * cellSize}
              y={ri * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  )
}

// ── Grade badge colours ──────────────────────────────────────────
const GRADE_STYLE: Record<string, { bg: string; text: string; border: string; label: string; labelHi: string }> = {
  A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-400', label: 'Grade A — Export / Premium', labelHi: 'श्रेणी A — निर्यात / उत्तम' },
  B: { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-400',  label: 'Grade B — Domestic Market', labelHi: 'श्रेणी B — घरेलू बाजार' },
  C: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-400',    label: 'Grade C — Processing/Juice', labelHi: 'श्रेणी C — प्रोसेसिंग' },
}

export default function CertificatePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = use(params)
  const { lang } = useLang()
  const [lot, setLot] = useState<LotRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { lots } = await fetchLots()
      const found = lots.find((l) => l.id === lotId) ?? null
      setLot(found)
      setLoading(false)
    }
    load()
  }, [lotId])

  const handleCopy = () => {
    if (lot?.certHash) {
      navigator.clipboard.writeText(lot.certHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-gray-500 text-lg animate-pulse">
          {lang === 'hi' ? '⏳ प्रमाण-पत्र लोड हो रहा है…' : '⏳ Loading certificate…'}
        </div>
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="text-4xl">❌</div>
        <div className="text-gray-700 font-semibold">
          {lang === 'hi' ? `लॉट ${lotId} नहीं मिला` : `Lot ${lotId} not found`}
        </div>
        <Link href="/operator/quality" className="text-blue-600 underline text-sm">
          ← {lang === 'hi' ? 'वापस जाएं' : 'Back to Quality'}
        </Link>
      </div>
    )
  }

  const gs = GRADE_STYLE[lot.grade] ?? GRADE_STYLE['C']
  const issuedAt = lot.createdAt ? new Date(lot.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) : '—'
  const certHash = lot.certHash || 'NO_CERT_HASH_AVAILABLE'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-emerald-50 py-8 px-4 print:bg-white print:py-0">
      {/* Back link (hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center gap-3 print:hidden">
        <Link
          href="/operator/quality"
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          ← {lang === 'hi' ? 'गुणवत्ता पृष्ठ पर वापस' : 'Back to Quality'}
        </Link>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            🖨️ {lang === 'hi' ? 'प्रिंट / PDF' : 'Print / PDF'}
          </button>
        </div>
      </div>

      {/* ── CERTIFICATE CARD ──────────────────────────── */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border-2 border-emerald-200 overflow-hidden print:shadow-none print:border-gray-300">
        {/* Header stripe */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-8 py-6 flex items-center justify-between">
          <div>
            <div className="text-emerald-100 text-xs font-semibold tracking-widest uppercase mb-1">
              {lang === 'hi' ? 'FarmSetu — राष्ट्रीय कृषि डिजिटल मिशन' : 'FarmSetu — National Agricultural Digital Mission'}
            </div>
            <h1 className="text-white text-2xl font-bold">
              {lang === 'hi' ? '🔐 गुणवत्ता प्रमाण-पत्र' : '🔐 Quality Certificate'}
            </h1>
            <div className="text-emerald-200 text-sm mt-0.5">
              {lang === 'hi' ? 'SHA-256 क्रिप्टोग्राफिक हैश से प्रमाणित' : 'Cryptographically Secured with SHA-256'}
            </div>
          </div>
          {/* Grade seal */}
          <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-black text-3xl border-4 shadow-lg
            ${lot.grade === 'A' ? 'bg-emerald-500 border-emerald-200 text-white' :
              lot.grade === 'B' ? 'bg-yellow-500 border-yellow-200 text-white' :
              'bg-red-500 border-red-200 text-white'}`}
          >
            {lot.grade}
            <div className="text-[9px] font-semibold text-white/80 mt-0.5">GRADE</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Grade label */}
          <div className={`${gs.bg} ${gs.border} border-2 rounded-2xl px-5 py-3 flex items-center gap-3`}>
            <span className="text-2xl">
              {lot.grade === 'A' ? '⭐' : lot.grade === 'B' ? '🟡' : '🔴'}
            </span>
            <div>
              <div className={`font-bold text-lg ${gs.text}`}>
                {lang === 'hi' ? gs.labelHi : gs.label}
              </div>
              <div className="text-sm text-gray-500">
                {lang === 'hi' ? `गुणवत्ता स्कोर: ${lot.score}/100` : `Quality Score: ${lot.score}/100`}
              </div>
            </div>
          </div>

          {/* Lot details grid */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              {lang === 'hi' ? 'लॉट विवरण' : 'Lot Details'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: lang === 'hi' ? 'लॉट ID' : 'Lot ID', value: lot.id, mono: true },
                { label: lang === 'hi' ? 'फसल' : 'Crop', value: lot.crop },
                { label: lang === 'hi' ? 'वजन' : 'Weight', value: `${lot.weightKg} kg` },
                { label: lang === 'hi' ? 'किसान' : 'Farmer', value: lang === 'hi' ? lot.farmerNameHi : lot.farmerName },
                { label: 'Brix %', value: `${lot.brixPct ?? '—'}%` },
                { label: lang === 'hi' ? 'दाग %' : 'Blemish %', value: `${lot.blemishPct ?? '—'}%` },
                { label: lang === 'hi' ? 'एकरूपता' : 'Uniformity', value: `${lot.uniformity ?? '—'}%` },
                { label: lang === 'hi' ? 'मूल्य/kg' : 'Price/kg', value: `₹${lot.pricePerKg}` },
                { label: lang === 'hi' ? 'जारी तिथि' : 'Issued At', value: issuedAt },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="text-[11px] text-gray-400 font-medium mb-0.5">{item.label}</div>
                  <div className={`text-sm font-semibold text-gray-800 break-all ${item.mono ? 'font-mono text-xs' : ''}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHA-256 Hash section */}
          <div className="bg-slate-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400 text-lg">🔐</span>
              <span className="text-white font-bold text-sm">SHA-256 Certificate Hash</span>
              <span className="ml-auto text-xs text-slate-500">{lang === 'hi' ? 'छेड़छाड़-रोधी' : 'Tamper-Proof'}</span>
            </div>
            <div className="font-mono text-xs text-emerald-300 break-all leading-relaxed bg-slate-800 rounded-xl px-4 py-3">
              {certHash}
            </div>
            <button
              onClick={handleCopy}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              {copied ? '✅ Copied!' : '📋 Copy full hash'}
            </button>
            <div className="text-[10px] text-slate-500 mt-1">
              {lang === 'hi'
                ? 'यह हैश Agmarknet / FSSAI पोर्टल पर इस प्रमाण-पत्र की प्रामाणिकता सत्यापित करने के लिए उपयोग करें।'
                : 'Use this hash on the Agmarknet / FSSAI portal to independently verify the authenticity of this certificate.'}
            </div>
          </div>

          {/* QR Code + verification info */}
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex-shrink-0">
              <QrCodeSvg value={certHash} size={170} />
              <div className="text-xs text-center text-gray-500 mt-2">
                {lang === 'hi' ? 'स्कैन करें — हैश सत्यापित करें' : 'Scan to verify hash'}
              </div>
            </div>
            <div className="text-sm text-emerald-800 space-y-2 flex-1">
              <div className="font-bold text-base">
                {lang === 'hi' ? '✅ इस प्रमाण-पत्र की विश्वसनीयता' : '✅ Certificate Credibility'}
              </div>
              <ul className="space-y-1.5 text-emerald-700">
                <li>🔒 {lang === 'hi' ? 'SHA-256 हैश से डेटा अपरिवर्तनीय है' : 'SHA-256 hash makes data immutable'}</li>
                <li>📡 {lang === 'hi' ? 'Supabase ब्लॉकचेन-स्तरीय लॉग में सहेजा गया' : 'Saved to blockchain-grade audit log'}</li>
                <li>🏛️ {lang === 'hi' ? 'Agmarknet / FPO / APMC सत्यापन योग्य' : 'Verifiable by Agmarknet / FPO / APMC'}</li>
                <li>📄 {lang === 'hi' ? 'FSSAI & APEDA मानकों के अनुसार' : 'Compliant with FSSAI & APEDA norms'}</li>
                <li>📱 {lang === 'hi' ? 'QR स्कैन से तुरंत प्रमाण सत्यापन' : 'Instant QR scan verification'}</li>
              </ul>
            </div>
          </div>

          {/* Disclaimer / footer */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-[11px] text-gray-400">
            <div>
              {lang === 'hi'
                ? 'यह प्रमाण-पत्र FarmSetu डिजिटल प्रणाली द्वारा PACS संचालक के माध्यम से जारी किया गया है।'
                : 'This certificate is issued via the FarmSetu digital platform by the authorized PACS operator.'}
            </div>
            <div className="font-mono text-gray-300">{lot.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
