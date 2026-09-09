'use client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { HARVEST_SLOTS } from '@/lib/mock-data'

const DEMO_FARMER_ID = 'f1'

const daysOfWeek = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
}

const months = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  hi: ['जन','फर','मार','अप्र','मई','जून','जुल','अग','सित','अक्त','नव','दिस'],
}

// Maps advice → how many days the range spans
const RANGE_SPAN: Record<string, number> = {
  now: 2,   // harvest today or tomorrow
  soon: 3,  // harvest within a 3-day window
  wait: 3,  // wait, then harvest in a 3-day window
}

function formatDateRange(startDateStr: string, span: number, lang: 'en' | 'hi') {
  const start = new Date(startDateStr)
  const end = new Date(startDateStr)
  end.setDate(start.getDate() + span - 1)

  const startDay = start.getDate()
  const endDay = end.getDate()
  const startMonth = months[lang][start.getMonth()]
  const endMonth = months[lang][end.getMonth()]
  const startDow = daysOfWeek[lang][start.getDay()]
  const endDow = daysOfWeek[lang][end.getDay()]

  if (lang === 'hi') {
    return {
      short: `${startDay}–${endDay} ${startMonth}`,
      full: `${startDow} ${startDay} ${startMonth} से ${endDow} ${endDay} ${endMonth} तक`,
    }
  }
  return {
    short: `${startMonth} ${startDay}–${endDay}`,
    full: `${startDow} ${startMonth} ${startDay} to ${endDow} ${endMonth === startMonth ? '' : endMonth + ' '}${endDay}`,
  }
}

const adviceConfig = {
  now: {
    en: { label: 'Harvest Now — 2-Day Window', note: 'Best price expected. Plan over next 2 days.' },
    hi: { label: 'अभी काटें — 2 दिन का मौका', note: 'भाव सबसे अच्छा है। अगले 2 दिनों में काट लें।' },
    emoji: '🟢',
    rangeBg: 'bg-green-500',
    border: 'border-green-400',
    bg: 'bg-green-50',
  },
  soon: {
    en: { label: 'Harvest Soon — 3-Day Window', note: 'Price rises in a few days. Stay ready and plan.' },
    hi: { label: '3 दिन में काटें', note: 'कुछ दिनों में भाव बढ़ेगा। तैयार रहें, 3 दिन में काट लें।' },
    emoji: '🟡',
    rangeBg: 'bg-yellow-500',
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
  },
  wait: {
    en: { label: 'Wait, Then Harvest — 3-Day Window', note: 'Market oversupplied now. Wait, then harvest in this window.' },
    hi: { label: 'रुकें, फिर इन 3 दिनों में काटें', note: 'अभी बाजार में माल ज्यादा है। रुकें, फिर इस 3 दिन की खिड़की में काटें।' },
    emoji: '🔵',
    rangeBg: 'bg-blue-500',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
  },
}

export default function HarvestSlotPage() {
  const { lang } = useLang()
  const slot = HARVEST_SLOTS.find((s) => s.farmerId === DEMO_FARMER_ID)
  if (!slot) return null

  const advice = slot.advice as keyof typeof adviceConfig
  const config = adviceConfig[advice]
  const span = RANGE_SPAN[advice]
  const dateRange = formatDateRange(slot.advisedDate, span, lang)

  // Generate 9-day mini calendar (3 days before window, window days, 3 days after)
  const windowStart = new Date(slot.advisedDate)
  const calStart = new Date(slot.advisedDate)
  calStart.setDate(windowStart.getDate() - 2)

  const calDays = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(calStart)
    d.setDate(calStart.getDate() + i)
    const withinWindow = i >= 2 && i < 2 + span
    // Prices: lower before window, peak during, slight drop after
    const priceOffset = withinWindow
      ? i === 2 ? 2 : i === 2 + span - 1 ? 1 : 3
      : i < 2 ? -(2 + (2 - i) * 2) : -(1 + (i - 2 - span) * 1.5)
    return {
      date: d.getDate(),
      month: months[lang][d.getMonth()],
      dayName: daysOfWeek[lang][d.getDay()],
      withinWindow,
      isStart: i === 2,
      isEnd: i === 2 + span - 1,
      price: Math.max(20, Math.round(slot.priceExpected + priceOffset)),
    }
  })

  return (
    <div className="px-3 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-5 max-w-xl mx-auto w-full">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
        {lang === 'hi' ? '📅 कब काटें?' : '📅 When to Harvest?'}
      </h1>

      {/* Main advice card */}
      <div className={`rounded-2xl p-4 sm:p-5 border-2 ${config.border} ${config.bg} shadow-xs`}>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-4xl sm:text-5xl leading-none flex-shrink-0">{config.emoji}</span>
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">{config[lang].label}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">{config[lang].note}</div>
          </div>
        </div>

        {/* Date range highlight */}
        <div className="bg-white/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs gap-3">
          <div>
            <div className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
              {lang === 'hi' ? 'कटाई खिड़की' : 'Harvest Window'}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{dateRange.short}</div>
            <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{dateRange.full}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">{lang === 'hi' ? 'अनुमानित भाव' : 'Expected Price'}</div>
            <div className="text-xl sm:text-2xl font-bold text-green-700">₹{slot.priceExpected}/kg</div>
            <div className="text-[10px] sm:text-xs text-gray-400">{lang === 'hi' ? 'औसत' : 'average'}</div>
          </div>
        </div>
      </div>

      {/* 9-day mini calendar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
        <div className="text-sm font-bold text-gray-700 mb-3">
          {lang === 'hi' ? '9 दिन का भाव अनुमान' : '9-Day Price Estimate'}
        </div>
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="grid grid-cols-9 gap-1 min-w-[340px]">
          {calDays.map((d, i) => (
            <div
              key={i}
              className={`flex flex-col items-center rounded-lg py-2 px-0.5 relative ${
                d.withinWindow
                  ? `${config.rangeBg} text-white`
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {/* Window bracket indicators */}
              {d.isStart && (
                <div className="absolute -top-1 left-0 right-0 flex justify-center">
                  <div className="text-[8px] text-gray-500 font-bold">
                    {lang === 'hi' ? '◀' : '◀'}
                  </div>
                </div>
              )}
              {d.isEnd && (
                <div className="absolute -top-1 left-0 right-0 flex justify-center">
                  <div className="text-[8px] text-gray-500 font-bold">▶</div>
                </div>
              )}
              <div className="text-[9px] font-medium leading-none">{d.dayName}</div>
              <div className="text-sm font-bold mt-0.5 leading-none">{d.date}</div>
              <div className={`text-[9px] font-semibold mt-0.5 ${d.withinWindow ? 'text-white' : 'text-green-700'}`}>
                ₹{d.price}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Window label below */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <div className={`w-4 h-4 rounded ${config.rangeBg}`} />
          <span className="text-gray-600">
            {lang === 'hi'
              ? `${span} दिन की कटाई खिड़की — इसी दौरान काटें`
              : `${span}-day harvest window — plan your harvest in this period`}
          </span>
        </div>

        <p className="text-xs text-gray-400 mt-2 italic">
          {lang === 'hi'
            ? '* यह सलाह सिर्फ आपको दी गई है — दूसरे किसानों को अलग समय मिला है ताकि बाजार में एक साथ माल न आए'
            : '* This advisory is private to you — other farmers receive different windows to prevent market glut'}
        </p>
      </div>

      {/* Planning tips */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="font-bold text-gray-800 mb-3">
          {lang === 'hi' ? '💡 योजना कैसे बनाएं?' : '💡 How to plan this window?'}
        </div>
        {(lang === 'hi' ? [
          { icon: '📦', text: `${calDays[2].date} ${calDays[2].month} को: क्रेट और मजदूर तैयार रखें` },
          { icon: '🌅', text: 'सुबह जल्दी तोड़ें — ठंडक में गुणवत्ता बेहतर रहती है' },
          { icon: '🚜', text: `${calDays[2 + span - 1].date} ${calDays[2 + span - 1].month} तक PACS में जमा कर दें` },
          { icon: '📞', text: 'PACS संचालक को पहले से बताएं — स्लॉट बुक कराएं' },
        ] : [
          { icon: '📦', text: `By ${calDays[2].dayName} ${calDays[2].date} ${calDays[2].month}: Arrange crates and labour` },
          { icon: '🌅', text: 'Harvest early morning — cooler temps preserve quality' },
          { icon: '🚜', text: `Reach PACS by ${calDays[2 + span - 1].dayName} ${calDays[2 + span - 1].date} ${calDays[2 + span - 1].month}` },
          { icon: '📞', text: 'Inform PACS operator in advance to book your slot' },
        ]).map((tip, i) => (
          <div key={i} className="flex items-start gap-3 mb-2.5">
            <span className="text-lg">{tip.icon}</span>
            <span className="text-sm text-gray-700">{tip.text}</span>
          </div>
        ))}
      </div>

      {/* Why this window */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="font-bold text-gray-800 mb-3">
          {lang === 'hi' ? '🤔 यह खिड़की क्यों?' : '🤔 Why this window?'}
        </div>
        {[
          {
            icon: '📈',
            en: 'Mumbai demand peaks mid-week due to festivals and weekend restocking',
            hi: 'त्योहारों और वीकेंड की वजह से मुंबई में मध्य-सप्ताह मांग ज्यादा होती है',
          },
          {
            icon: '🍊',
            en: 'Nagpur supply dips in this window — other cohorts harvested earlier',
            hi: 'इस दौरान नागपुर में माल कम होगा — दूसरे समूह पहले काट चुके होंगे',
          },
          {
            icon: '🌦️',
            en: 'Weather forecast shows clear skies — no transit risk',
            hi: 'मौसम साफ रहेगा — रास्ते में कोई खतरा नहीं',
          },
          {
            icon: '🤝',
            en: '3-day window lets you coordinate with PACS and nearby farmers',
            hi: '3 दिन की खिड़की से आप PACS और पड़ोसी किसानों से मिलकर योजना बना सकते हैं',
          },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm text-gray-700">{item[lang]}</span>
          </div>
        ))}
      </div>

      <div className="pb-8" />
    </div>
  )
}
