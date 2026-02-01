export type Verdict = "Buy" | "Wait" | "Avoid"
export type RiskLevel = "Low" | "Medium" | "High"
export type Confidence = "Low" | "Medium" | "High"

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  vwap: number
  volume: number
  count: number
}

export interface TradeLevels {
  entryLow: number
  entryHigh: number
  entryMid: number
  stop: number
  t1: number
  t2: number
  t3: number
}

export interface TradePlan {
  entryZone: string
  stopLoss: string
  target1: string
  target2: string
  target3: string
}

export interface RiskSummary {
  riskLevel: RiskLevel
  confidence: Confidence
  reasons: string[]
}

export interface AnalysisResult {
  verdict: Verdict
  tradePlan: TradePlan
  riskSummary: RiskSummary
  levels: TradeLevels
  meta: {
    trend: "Bull" | "Bear" | "Range"
    rsi: number
    atrPct: number
    rrToT1: number
    rrToT2: number
    rrToT3: number
    support: number | null
    resistance: number | null
    fib: Record<string, number>
    lastPrice: number
    quote: string
  }
}

/* ---------- helpers ---------- */

function round(n: number, dp: number) {
  const p = 10 ** dp
  return Math.round(n * p) / p
}

function guessDp(price: number) {
  if (price >= 1000) return 2
  if (price >= 1) return 4
  return 8
}

export function formatPrice(price: number, quote: string) {
  const dp = guessDp(price)
  return `${quote} ${price.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`
}

export function ema(values: number[], period: number) {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  let prev =
    values.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
  }
  return prev
}

export function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return null
  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function atr(candles: Candle[], period = 14) {
  if (candles.length < period + 1) return null
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close)
      )
    )
  }

  const first = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  let prev = first
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period
  }
  return prev
}

/* ---------- structure analysis ---------- */

function clusterLevels(levels: number[], lastPrice: number, bucketPct = 0.002) {
  const bucket = lastPrice * bucketPct
  const map = new Map<number, { level: number; count: number }>()

  for (const lvl of levels) {
    const key = Math.round(lvl / bucket)
    const item = map.get(key)
    if (!item) map.set(key, { level: lvl, count: 1 })
    else {
      item.count += 1
      item.level += (lvl - item.level) / item.count
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count).map(x => x.level)
}

function pivots(candles: Candle[], leftRight = 2) {
  const lows: number[] = []
  const highs: number[] = []

  for (let i = leftRight; i < candles.length - leftRight; i++) {
    const c = candles[i]
    let isLow = true
    let isHigh = true

    for (let j = 1; j <= leftRight; j++) {
      if (candles[i - j].low <= c.low) isLow = false
      if (candles[i + j].low <= c.low) isLow = false
      if (candles[i - j].high >= c.high) isHigh = false
      if (candles[i + j].high >= c.high) isHigh = false
    }

    if (isLow) lows.push(c.low)
    if (isHigh) highs.push(c.high)
  }

  return { lows, highs }
}

/* ---------- MAIN ---------- */

export function analyseCandles(pair: string, candles: Candle[]): AnalysisResult {
  const cleanPair = pair.trim().toUpperCase().replace(/-/g, "/")
  const quote = cleanPair.split("/")[1] ?? "USD"

  const closes = candles.map(c => c.close)
  const lastPrice = closes[closes.length - 1]

  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const rsiVal = rsi(closes, 14) ?? 50
  const atr14 = atr(candles, 14)
  const atrPct = atr14 ? (atr14 / lastPrice) * 100 : 0

  /* Trend */
  let trend: "Bull" | "Bear" | "Range" = "Range"
  if (ema50 != null && ema200 != null) {
    if (ema50 > ema200 && lastPrice >= ema50) trend = "Bull"
    else if (ema50 < ema200 && lastPrice <= ema50) trend = "Bear"
  }

  /* Support / Resistance */
  const { lows, highs } = pivots(candles.slice(-300), 2)
  const support = clusterLevels(lows, lastPrice)[0] ?? null
  const resistance = clusterLevels(highs, lastPrice)[0] ?? null

  /* Entry: ALWAYS below current price */
  const entryLow = lastPrice * 0.97
  const entryHigh = lastPrice * 0.985
  const entryMid = (entryLow + entryHigh) / 2

  /* Stop */
  const stop = entryMid - Math.max(atr14 ?? lastPrice * 0.008, entryMid * 0.02)

  /* Risk */
  const risk = Math.max(entryMid - stop, lastPrice * 0.002)

  /* Targets – strictly ordered */
  const rawT1 = entryMid + risk * 1.5
  const rawT2 = entryMid + risk * 2.5
  const rawT3 = entryMid + risk * 3.5

  let t1 = rawT1
  let t2 = resistance && resistance > entryMid ? Math.max(rawT2, resistance) : rawT2
  let t3 = Math.max(rawT3, t2 + risk)

  if (t2 <= t1) t2 = t1 + risk
  if (t3 <= t2) t3 = t2 + risk

  const rrToT1 = (t1 - entryMid) / risk
  const rrToT2 = (t2 - entryMid) / risk
  const rrToT3 = (t3 - entryMid) / risk

  /* Verdict */
  let verdict: Verdict = "Wait"
  const reasons: string[] = []

  if (trend === "Bear") {
    verdict = "Avoid"
    reasons.push("Trend filter: bearish (EMA50 below EMA200 and price weak).")
    reasons.push("Entry zone is shown as a hypothetical dip-entry, but verdict is Avoid. Use only if conditions improve.")
  } else if (rrToT2 >= 2) {
    verdict = "Buy"
    reasons.push("Bullish structure with favorable risk-to-reward.")
  } else {
    reasons.push("Setup lacks strong confirmation.")
  }

  reasons.push(`RSI(14) = ${round(rsiVal, 1)}.`)
  reasons.push(`ATR(14) volatility ≈ ${round(atrPct, 2)}%.`)
  reasons.push(`Risk-to-reward (mid-entry): T1 ${round(rrToT1, 2)}, T2 ${round(rrToT2, 2)}, T3 ${round(rrToT3, 2)}.`)

  const riskLevel: RiskLevel =
    atrPct < 1.2 ? "Low" : atrPct > 3 ? "High" : "Medium"

  const confidence: Confidence =
    verdict === "Buy" && rrToT2 >= 2 ? "High" : "Low"

  return {
    verdict,
    levels: { entryLow, entryHigh, entryMid, stop, t1, t2, t3 },
    tradePlan: {
      entryZone: `${formatPrice(entryLow, quote)} - ${formatPrice(entryHigh, quote)}`,
      stopLoss: formatPrice(stop, quote),
      target1: formatPrice(t1, quote),
      target2: formatPrice(t2, quote),
      target3: formatPrice(t3, quote),
    },
    riskSummary: { riskLevel, confidence, reasons },
    meta: {
      trend,
      rsi: round(rsiVal, 2),
      atrPct: round(atrPct, 2),
      rrToT1: round(rrToT1, 2),
      rrToT2: round(rrToT2, 2),
      rrToT3: round(rrToT3, 2),
      support,
      resistance,
      fib: {},
      lastPrice: round(lastPrice, guessDp(lastPrice)),
      quote,
    },
  }
}
