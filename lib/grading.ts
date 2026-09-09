// lib/grading.ts
// Simulated produce grading (replaces YOLOv8 ONNX in prototype)
// In production: swap gradeFromInputs() with a model inference call

import crypto from 'crypto'

export type Grade = 'A' | 'B' | 'C'

export interface GradeInput {
  brixPct: number       // Sugar/sweetness 0–20
  blemishPct: number    // Surface defect 0–100
  weightUniformity: number // 0–100%
  cropType: string
}

export interface GradeResult {
  grade: Grade
  score: number         // 0–100
  certHash: string      // SHA-256 of grade data
  reasons: string[]
  timestamp: string
  gradeLabel: { en: string; hi: string }
}

export function gradeFromInputs(input: GradeInput): GradeResult {
  const { brixPct, blemishPct, weightUniformity } = input

  const reasons: string[] = []
  let score = 100

  // Brix scoring (sweetness)
  if (brixPct < 7) { score -= 30; reasons.push('Low sweetness') }
  else if (brixPct < 10) { score -= 15; reasons.push('Moderate sweetness') }

  // Blemish scoring
  if (blemishPct > 20) { score -= 35; reasons.push('High surface defects') }
  else if (blemishPct > 8) { score -= 18; reasons.push('Moderate blemishes') }

  // Weight uniformity scoring
  if (weightUniformity < 70) { score -= 15; reasons.push('Poor size uniformity') }
  else if (weightUniformity < 85) { score -= 7; reasons.push('Moderate uniformity') }

  score = Math.max(0, Math.min(100, score))

  const grade: Grade = score >= 75 ? 'A' : score >= 50 ? 'B' : 'C'

  const gradeLabelMap = {
    A: { en: 'Grade A — Export / Premium Retail', hi: 'श्रेणी A — निर्यात / उत्तम' },
    B: { en: 'Grade B — Domestic Market', hi: 'श्रेणी B — घरेलू बाजार' },
    C: { en: 'Grade C — Processing / Juice', hi: 'श्रेणी C — प्रोसेसिंग / जूस' },
  }

  const timestamp = new Date().toISOString()

  // SHA-256 certificate
  const certPayload = JSON.stringify({ grade, score, timestamp, input })
  const certHash = crypto.createHash('sha256').update(certPayload).digest('hex')

  return {
    grade,
    score,
    certHash,
    reasons,
    timestamp,
    gradeLabel: gradeLabelMap[grade],
  }
}
