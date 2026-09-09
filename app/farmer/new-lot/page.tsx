'use client'
import { useState } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { submitNewLot } from '@/lib/supabase/services'

// Farmer just submits produce to PACS — no grading here
// Grading is done by the PACS Operator at the hub

export default function NewLotPage() {
  const { lang } = useLang()

  const [form, setForm] = useState({
    cropType: 'Orange',
    weightKg: '',
    crates: '',
    notes: '',
  })
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [lotId] = useState(`L${Date.now().toString().slice(-4)}`)

  const handleSubmit = async () => {
    if (!form.weightKg) return
    await submitNewLot({
      id: lotId,
      farmerId: 'f1',
      farmerName: 'Ramesh Patil',
      farmerNameHi: 'रमेश पाटिल',
      crop: form.cropType,
      weightKg: parseFloat(form.weightKg),
      crates: parseInt(form.crates) || Math.round(parseFloat(form.weightKg) / 25),
      notes: form.notes,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="px-4 pt-5 max-w-lg mx-auto">
        {/* Success state */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 text-center">
          <div className="text-6xl mb-3">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            {lang === 'hi' ? 'PACS में जमा हो गया!' : 'Submitted to PACS!'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {lang === 'hi'
              ? 'आपकी फसल PACS संचालक के पास पहुँच गई। वे जाँच करेंगे और आपको श्रेणी बताएंगे।'
              : 'Your produce has been submitted to the PACS operator. They will grade it and notify you.'}
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <div className="text-xs text-orange-600 font-semibold">
              {lang === 'hi' ? 'आपका लॉट नंबर' : 'Your Lot ID'}
            </div>
            <div className="text-2xl font-bold text-orange-700 mt-1 font-mono">{lotId}</div>
            <div className="text-xs text-gray-500 mt-1">
              {lang === 'hi' ? 'यह नंबर याद रखें' : 'Keep this number safe'}
            </div>
          </div>
          <div className="space-y-2 text-left text-sm">
            {[
              {
                icon: '1️⃣',
                en: 'PACS operator will weigh and grade your produce at hub',
                hi: 'PACS संचालक आपकी फसल को तोलेंगे और गुणवत्ता जाँचेंगे',
              },
              {
                icon: '2️⃣',
                en: 'Official Grade (A/B/C) & SHA-256 certificate issued (funds locked in escrow)',
                hi: 'श्रेणी (A/B/C) व डिजिटल प्रमाण-पत्र जारी होगा (फंड एस्क्रो में सुरक्षित)',
              },
              {
                icon: '3️⃣',
                en: '70% advance released to your account upon truck booking & dispatch',
                hi: 'ट्रक बुक होकर रवाना होते ही 70% अग्रिम आपके बैंक खाते में जमा होगा',
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                <span className="text-lg">{step.icon}</span>
                <span className="text-gray-700">{step[lang]}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-5 w-full py-3 rounded-xl border border-orange-300 text-orange-600 font-semibold text-sm hover:bg-orange-50 transition"
          >
            {lang === 'hi' ? '+ और फसल जोड़ें' : '+ Add Another Lot'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800">
        {lang === 'hi' ? '➕ PACS में फसल जमा करें' : '➕ Submit Produce to PACS'}
      </h1>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-xl">ℹ️</span>
          <p className="text-sm text-blue-800">
            {lang === 'hi'
              ? 'PACS संचालक आपकी फसल की जाँच करेंगे और श्रेणी तय करेंगे। आपको सिर्फ फसल की जानकारी देनी है।'
              : 'The PACS operator will grade your produce at the hub. You just need to provide basic details.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        {/* Photo (optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {lang === 'hi' ? '📷 फसल की फोटो (वैकल्पिक)' : '📷 Photo of Produce (Optional)'}
          </label>
          <label className="flex items-center gap-3 cursor-pointer border border-dashed border-orange-300 rounded-xl p-3 hover:bg-orange-50 transition">
            <span className="text-2xl">📸</span>
            <span className="text-sm text-gray-500">
              {photoName ?? (lang === 'hi' ? 'फोटो चुनें' : 'Choose photo')}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </div>

        {/* Crop type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {lang === 'hi' ? 'फसल का नाम' : 'Crop Type'}
          </label>
          <select
            value={form.cropType}
            onChange={(e) => setForm({ ...form, cropType: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="Orange">{lang === 'hi' ? '🍊 संतरा' : '🍊 Orange'}</option>
            <option value="Tomato">{lang === 'hi' ? '🍅 टमाटर' : '🍅 Tomato'}</option>
            <option value="Onion">{lang === 'hi' ? '🧅 प्याज' : '🧅 Onion'}</option>
            <option value="Mango">{lang === 'hi' ? '🥭 आम' : '🥭 Mango'}</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {lang === 'hi' ? 'अनुमानित वजन (किलो)' : 'Approximate Weight (kg)'}
          </label>
          <input
            type="number"
            placeholder={lang === 'hi' ? 'जैसे: 500' : 'e.g. 500'}
            value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-900 bg-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Number of crates */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {lang === 'hi' ? 'क्रेट/टोकरी की संख्या' : 'Number of Crates / Baskets'}
          </label>
          <input
            type="number"
            placeholder={lang === 'hi' ? 'जैसे: 20' : 'e.g. 20'}
            value={form.crates}
            onChange={(e) => setForm({ ...form, crates: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-900 bg-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {lang === 'hi' ? 'कोई बात बताना है? (वैकल्पिक)' : 'Any notes for operator? (Optional)'}
          </label>
          <textarea
            rows={2}
            placeholder={lang === 'hi' ? 'जैसे: कुछ फल पके हैं, रात को तोड़ा था...' : 'e.g. Harvested last night, some early ripening...'}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-900 bg-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.weightKg}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-green-600 text-white font-bold text-lg shadow hover:opacity-90 transition disabled:opacity-40"
        >
          {lang === 'hi' ? '📤 PACS में जमा करें' : '📤 Submit to PACS'}
        </button>
      </div>

      {/* What happens next */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="font-semibold text-gray-700 mb-3">
          {lang === 'hi' ? '⏭️ आगे क्या होगा?' : '⏭️ What happens next?'}
        </div>
        {[
          { icon: '⚖️', en: 'Operator weighs crates at PACS hub', hi: 'PACS हब पर संचालक क्रेट तोलेंगे' },
          { icon: '🔬', en: 'Quality checked & graded with SHA-256 certificate', hi: 'प्रमाणित PACS संचालक गुणवत्ता जाँचेंगे व डिजिटल सर्टिफ़िकेट देंगे' },
          { icon: '🔒', en: '100% Produce value secured in Escrow Rail', hi: '100% फसल का मूल्य बैंक एस्क्रो में सुरक्षित होगा' },
          { icon: '🚛', en: '70% advance released when truck booking is confirmed', hi: 'ट्रक बुक होकर रवाना होते ही 70% अग्रिम खाते में जमा होगा' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="text-xl">{s.icon}</span>
            <span className="text-sm text-gray-700">{s[lang]}</span>
          </div>
        ))}
      </div>

      <div className="pb-8" />
    </div>
  )
}
