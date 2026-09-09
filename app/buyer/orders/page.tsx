'use client'
import { useState } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_ORDERS } from '@/lib/mock-data'

export default function BuyerOrdersPage() {
  const { lang } = useLang()
  const [orders, setOrders] = useState(MOCK_ORDERS)

  const confirmDelivery = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, escrowState: 'FULLY_RELEASED', deliveryStatus: 'delivered' }
          : o
      )
    )
  }

  const escrowLabel: Record<string, { en: string; hi: string }> = {
    LOCKED: { en: '🔒 Funds Locked', hi: '🔒 पैसा सुरक्षित' },
    PARTIAL_RELEASED: { en: '✅ 70% Paid to Farmer', hi: '✅ 70% किसान को मिला' },
    FULLY_RELEASED: { en: '🎉 Fully Settled', hi: '🎉 पूरा भुगतान हुआ' },
  }

  const deliveryColor: Record<string, string> = {
    'en-route': 'text-blue-600 bg-blue-50',
    delivered: 'text-green-700 bg-green-50',
  }

  return (
    <div className="max-w-4xl w-full space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
        {lang === 'hi' ? '📋 मेरे ऑर्डर' : '📋 My Orders'}
      </h1>

      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-50">
            <div>
              <div className="font-bold text-gray-800">Order {order.id}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {lang === 'hi' ? 'लॉट:' : 'Lot:'} {order.lotId} · {new Date(order.placedAt).toLocaleDateString()}
              </div>
            </div>
            <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold ${deliveryColor[order.deliveryStatus] ?? 'bg-gray-100 text-gray-500'}`}>
              {order.deliveryStatus === 'en-route'
                ? (lang === 'hi' ? '🚚 रास्ते में' : '🚚 En Route')
                : (lang === 'hi' ? '✅ डिलीवर हुआ' : '✅ Delivered')}
            </span>
          </div>

          <div className="px-4 sm:px-5 py-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-xs sm:text-sm">
              <div>
                <div className="text-[11px] sm:text-xs text-gray-400">{lang === 'hi' ? 'श्रेणी' : 'Grade'}</div>
                <div className={`font-bold grade-${order.lotGrade.toLowerCase()} inline-block px-2 rounded`}>Grade {order.lotGrade}</div>
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-gray-400">{lang === 'hi' ? 'मात्रा' : 'Quantity'}</div>
                <div className="font-semibold text-gray-800">{order.totalKg} kg</div>
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-gray-400">{lang === 'hi' ? 'कुल मूल्य' : 'Total Value'}</div>
                <div className="font-semibold text-gray-800">₹{order.totalValue.toLocaleString()}</div>
              </div>
            </div>

            {/* Escrow status */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <div className="text-xs text-gray-500 mb-1">{lang === 'hi' ? 'एस्क्रो स्थिति:' : 'Escrow Status:'}</div>
              <div className="font-semibold text-sm">
                {escrowLabel[order.escrowState]?.[lang] ?? order.escrowState}
              </div>
              {/* Progress bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width:
                      order.escrowState === 'LOCKED'
                        ? '5%'
                        : order.escrowState === 'PARTIAL_RELEASED'
                        ? '70%'
                        : '100%',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{lang === 'hi' ? 'लॉक' : 'Locked'}</span>
                <span>70%</span>
                <span>100%</span>
              </div>
            </div>

            {order.deliveryStatus === 'en-route' && (
              <button
                onClick={() => confirmDelivery(order.id)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow text-center"
              >
                {lang === 'hi' ? '✅ डिलीवरी पक्की करें — 30% जारी होगा' : '✅ Confirm Delivery — Release 30%'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
