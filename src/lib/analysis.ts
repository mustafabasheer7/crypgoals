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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

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
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
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
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    )
    trs.push(tr)
  }

  if (trs.length < period) return null
  const first = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  let prev = first
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period
  }
  return prev
}

// Simple clustering: bucket prices by bucketPct of lastPrice
function clusterLevels(levels: number[], lastPrice: number, bucketPct = 0.002) {
  const bucket = lastPrice * bucketPct
  const map = new Map<number, { level: number; count: number }>()
  for (const lvl of levels) {
    const key = Math.round(lvl / bucket)
    const item = map.get(key)
    if (!item) map.set(key, { level: lvl, count: 1 })
    else {
      // update centroid
      item.count += 1
      item.level = item.level + (lvl - item.level) / item.count
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).map(x => x.level)
}

// Pivot points: local highs/lows
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

export function analyseCandles(
  pair: string,
  candles: Candle[]
): AnalysisResult {
    console.log(pair,"pair");
  const cleanPair = pair.trim().toUpperCase().replace(/-/g, "/")
  const quote = cleanPair.split("/")[1] ?? "USD"

  const closes = candles.map(c => c.close)
  const lastPrice = closes[closes.length - 1]

  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const rsi14 = rsi(closes, 14)
  const atr14 = atr(candles, 14)

  // Trend (simple + robust)
  let trend: "Bull" | "Bear" | "Range" = "Range"
  if (ema50 != null && ema200 != null) {
    if (ema50 > ema200 && lastPrice >= ema50) trend = "Bull"
    else if (ema50 < ema200 && lastPrice <= ema50) trend = "Bear"
    else trend = "Range"
  }

  // Support / Resistance from pivots, clustered
  const { lows, highs } = pivots(candles.slice(-300), 2)
  const lowClusters = clusterLevels(lows, lastPrice, 0.002)
  const highClusters = clusterLevels(highs, lastPrice, 0.002)

  const support = lowClusters.find(l => l < lastPrice) ?? null
  const resistance = highClusters.find(l => l > lastPrice) ?? null

  // Swing range for fib: use last 200 candles high/low
  const lookback = candles.slice(-200)
  const swingLow = Math.min(...lookback.map(c => c.low))
  const swingHigh = Math.max(...lookback.map(c => c.high))
  const range = swingHigh - swingLow || 1

  const fib = {
    "0.236": swingHigh - range * 0.236,
    "0.382": swingHigh - range * 0.382,
    "0.5": swingHigh - range * 0.5,
    "0.618": swingHigh - range * 0.618,
    "0.786": swingHigh - range * 0.786,
  }

  // Entry / Stop / Targets (heuristic)
  const atrPct = atr14 ? (atr14 / lastPrice) * 100 : 0
  const rsiVal = rsi14 ?? 50

  const fibCandidates = Object.values(fib).sort((a, b) => a - b)

  const supportFallback =
    [...fibCandidates, swingLow]
      .filter((x) => x < lastPrice)
      .pop() ?? swingLow

  const resistanceFallback =
    [swingHigh, ...fibCandidates.slice().reverse()]
      .filter((x) => x > lastPrice)[0] ?? swingHigh

  const supportBase = support != null && support < lastPrice ? support : supportFallback
  const resistanceBase = resistance != null && resistance > lastPrice ? resistance : resistanceFallback

  // Entry: small zone above support
  let entryLow = supportBase * 1.002
  let entryHigh = supportBase * 1.012
  let entryMid = (entryLow + entryHigh) / 2

  if (entryLow >= lastPrice) {
    entryLow = lastPrice * 0.99
    entryHigh = lastPrice * 0.995
    entryMid = (entryLow + entryHigh) / 2
  }

  // Stop: below support by ATR or 0.8%
  const stop = Math.min(
    supportBase * 0.992,
    entryMid - (atr14 ?? (lastPrice * 0.008))
  )

  // Targets: use resistance and fib extensions
  const risk = Math.max(entryMid - stop, lastPrice * 0.001) // avoid divide by 0
  const t1 = Math.max(resistanceBase, entryMid + risk * 1.5)
  const t2 = Math.max(entryMid + risk * 2.5, swingHigh)
  const t3 = Math.max(entryMid + risk * 3.5, swingHigh + range * 0.272)

  const rrToT1 = (t1 - entryMid) / risk
  const rrToT2 = (t2 - entryMid) / risk
  const rrToT3 = (t3 - entryMid) / risk

  // Verdict rules
  const reasons: string[] = []
  let verdict: Verdict = "Wait"

  const oversold = rsiVal < 35
  const overbought = rsiVal > 70

  if (trend === "Bull") reasons.push("Trend filter: bullish (EMA50 above EMA200 and price holding).")
  if (trend === "Bear") reasons.push("Trend filter: bearish (EMA50 below EMA200 and price weak).")
  if (trend === "Range") reasons.push("Trend filter: ranging (no clear EMA alignment).")

  if (support != null) reasons.push(`Nearest support detected near ${formatPrice(support, quote)}.`)
  else reasons.push("No clean pivot support found, using fib-based support estimate.")

  if (resistance != null) reasons.push(`Nearest resistance detected near ${formatPrice(resistance, quote)}.`)
  else reasons.push("No clean pivot resistance found, using recent swing high estimate.")

  reasons.push(`RSI(14) = ${round(rsiVal, 1)}.`)
  reasons.push(`ATR(14) volatility ≈ ${round(atrPct, 2)}%.`)
  reasons.push(`Risk-to-reward (mid-entry): T1 ${round(rrToT1, 2)}, T2 ${round(rrToT2, 2)}, T3 ${round(rrToT3, 2)}.`)

  if (trend === "Bear") {
    verdict = "Avoid"
    reasons.push("Bear trend makes long entries lower probability.")
  } else if (overbought) {
    verdict = "Wait"
    reasons.push("RSI is high. Timing risk is higher (pullback more likely).")
  } else if (rrToT2 >= 2 && (trend === "Bull" || oversold)) {
    verdict = "Buy"
    reasons.push("Good R:R to target 2 with acceptable trend/timing.")
  } else {
    verdict = "Wait"
    reasons.push("Setup is not strong enough yet. Wait for better entry or confirmation.")
  }

  // Risk level
  let riskLevel: RiskLevel = "Medium"
  if (atrPct < 1.2) riskLevel = "Low"
  else if (atrPct > 3.0) riskLevel = "High"

  // Confidence: simple confluence scoring
  let score = 0
  if (trend === "Bull") score += 2
  if (!overbought) score += 1
  if (support != null) score += 1
  if (rrToT2 >= 2) score += 2
  if (atrPct > 3.0) score -= 1

  let confidence: Confidence = "Medium"
  if (score >= 5) confidence = "High"
  else if (score <= 2) confidence = "Low"

  const tradePlan: TradePlan = {
    entryZone: `${formatPrice(entryLow, quote)} - ${formatPrice(entryHigh, quote)}`,
    stopLoss: formatPrice(stop, quote),
    target1: formatPrice(t1, quote),
    target2: formatPrice(t2, quote),
    target3: formatPrice(t3, quote),
  }

  return {
    verdict,
    levels: { entryLow, entryHigh, entryMid, stop, t1, t2, t3 },
    tradePlan,
    riskSummary: { riskLevel, confidence, reasons },
    meta: {
      trend,
      rsi: round(rsiVal, 2),
      atrPct: round(atrPct, 3),
      rrToT1: round(rrToT1, 3),
      rrToT2: round(rrToT2, 3),
      rrToT3: round(rrToT3, 3),
      support: support ? round(support, guessDp(support)) : null,
      resistance: resistance ? round(resistance, guessDp(resistance)) : null,
      fib: Object.fromEntries(
        Object.entries(fib).map(([k, v]) => [k, round(v, guessDp(v))])
      ),
      lastPrice: round(lastPrice, guessDp(lastPrice)),
      quote,
    },
  }
}
