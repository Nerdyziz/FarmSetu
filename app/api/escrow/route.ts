import { NextRequest, NextResponse } from 'next/server'

type EscrowState = 'PENDING' | 'LOCKED' | 'PARTIAL_RELEASED' | 'FULLY_RELEASED'

// In-memory store for demo (replace with Supabase in production)
const escrowStore: Record<string, EscrowState> = {}

const VALID_TRANSITIONS: Record<EscrowState, EscrowState[]> = {
  PENDING: ['LOCKED'],
  LOCKED: ['PARTIAL_RELEASED'],
  PARTIAL_RELEASED: ['FULLY_RELEASED'],
  FULLY_RELEASED: [],
}

export async function POST(req: NextRequest) {
  try {
    const { lotId, action } = await req.json()

    if (!lotId || !action) {
      return NextResponse.json({ error: 'lotId and action required' }, { status: 400 })
    }

    const current: EscrowState = escrowStore[lotId] ?? 'PENDING'
    const next = VALID_TRANSITIONS[current][0]

    if (!next) {
      return NextResponse.json({ state: current, message: 'Already fully settled' })
    }

    escrowStore[lotId] = next

    const messages: Record<EscrowState, { en: string; hi: string }> = {
      LOCKED: { en: 'Funds locked in escrow', hi: 'पैसा एस्क्रो में सुरक्षित' },
      PARTIAL_RELEASED: { en: '70% released to farmer within 24h', hi: '70% किसान को 24 घंटे में मिला' },
      FULLY_RELEASED: { en: 'Full payment settled', hi: 'पूरा भुगतान हो गया' },
      PENDING: { en: 'Pending', hi: 'बाकी है' },
    }

    return NextResponse.json({
      lotId,
      previousState: current,
      newState: next,
      message: messages[next],
    })
  } catch {
    return NextResponse.json({ error: 'Escrow transition failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lotId = searchParams.get('lotId')
  if (!lotId) return NextResponse.json({ error: 'lotId required' }, { status: 400 })
  return NextResponse.json({ lotId, state: escrowStore[lotId] ?? 'PENDING' })
}
