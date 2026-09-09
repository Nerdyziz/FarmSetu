import { NextRequest, NextResponse } from 'next/server'
import { gradeFromInputs } from '@/lib/grading'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cropType, brixPct, blemishPct, weightUniformity } = body

    if (brixPct === undefined || blemishPct === undefined || weightUniformity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = gradeFromInputs({ cropType, brixPct, blemishPct, weightUniformity })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 })
  }
}
