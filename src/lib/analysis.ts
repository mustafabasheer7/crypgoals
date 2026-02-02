/**
 * Technical Analysis Engine for Cryptocurrency Trading (LONG-ONLY)
 * 
 * This module implements a multi-factor scoring system combining:
 * - Trend Analysis (EMA crossovers, ADX, market structure)
 * - Momentum Indicators (RSI, MACD, Stochastic)
 * - Volatility Measures (ATR, Bollinger Bands)
 * - Price Structure (Support/Resistance, Fibonacci levels)
 * - Volume Analysis (OBV trend, volume confirmation)
 * 
 * The verdict is derived from a weighted composite score,
 * not a single condition, ensuring nuanced recommendations.
 * 
 * NOTE: This is a LONG-ONLY engine. Bearish conditions result in "Wait"
 * rather than "Sell" since we only generate long (buy) trade plans.
 */

export type Verdict = "Strong Buy" | "Buy" | "Wait"
export type RiskLevel = "Low" | "Medium" | "High" | "Very High"
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

export interface IndicatorValues {
  rsi14: number
  rsi7: number
  ema20: number
  ema50: number
  ema200: number
  macdLine: number
  macdSignal: number
  macdHistogram: number
  atr14: number
  atrPercent: number
  stochK: number
  stochD: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbWidth: number
  obvTrend: "Rising" | "Falling" | "Flat"
  adx: number
  plusDI: number
  minusDI: number
}

export interface SignalScore {
  trend: number        // -100 to +100
  momentum: number     // -100 to +100
  volatility: number   // -100 to +100
  structure: number    // -100 to +100
  volume: number       // -100 to +100
  composite: number    // -100 to +100
}

export interface AnalysisResult {
  verdict: Verdict
  tradePlan: TradePlan
  riskSummary: RiskSummary
  levels: TradeLevels
  meta: {
    trend: "Strong Bull" | "Bull" | "Neutral" | "Bear" | "Strong Bear"
    adx: number  // ADX value indicating trend strength (>25 = strong trend)
    indicators: IndicatorValues
    signals: SignalScore
    support: number | null
    resistance: number | null
    fib: {
      level236: number
      level382: number
      level500: number
      level618: number
      level786: number
      ext1272: number
      ext1618: number
      ext2000: number
    }
    swingHigh: number
    swingLow: number
    lastPrice: number
    quote: string
    analysisTimestamp: number
  }
}

/* ========== UTILITY FUNCTIONS ========== */

function round(n: number, dp: number): number {
  const p = 10 ** dp
  return Math.round(n * p) / p
}

function guessDp(price: number): number {
  if (price >= 10000) return 2
  if (price >= 1000) return 3
  if (price >= 100) return 4
  if (price >= 1) return 5
  if (price >= 0.01) return 6
  return 8
}

export function formatPrice(price: number, quote: string): string {
  const dp = guessDp(price)
  return `${quote} ${price.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/* ========== TECHNICAL INDICATORS ========== */

/**
 * Simple Moving Average
 */
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * Exponential Moving Average
 */
export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
  }
  return prev
}

/**
 * EMA series (returns array of EMA values for MACD calculation)
 */
function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return []
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prev)
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

/**
 * Relative Strength Index
 */
export function rsi(values: number[], period = 14): number | null {
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

/**
 * Average True Range
 */
export function atr(candles: Candle[], period = 14): number | null {
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

/**
 * MACD (Moving Average Convergence Divergence)
 */
function macd(values: number[], fast = 12, slow = 26, signal = 9): {
  macdLine: number
  signalLine: number
  histogram: number
} | null {
  if (values.length < slow + signal) return null
  
  const emaFast = emaSeries(values, fast)
  const emaSlow = emaSeries(values, slow)
  
  // Align the series
  const offset = slow - fast
  const macdValues: number[] = []
  
  for (let i = 0; i < emaSlow.length; i++) {
    const fastIdx = i + offset
    if (fastIdx < emaFast.length) {
      macdValues.push(emaFast[fastIdx] - emaSlow[i])
    }
  }
  
  if (macdValues.length < signal) return null
  
  const signalEma = emaSeries(macdValues, signal)
  const lastMacd = macdValues[macdValues.length - 1]
  const lastSignal = signalEma[signalEma.length - 1]
  
  return {
    macdLine: lastMacd,
    signalLine: lastSignal,
    histogram: lastMacd - lastSignal,
  }
}

/**
 * Stochastic Oscillator
 */
function stochastic(candles: Candle[], kPeriod = 14, dPeriod = 3): {
  k: number
  d: number
} | null {
  if (candles.length < kPeriod + dPeriod) return null
  
  const kValues: number[] = []
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const slice = candles.slice(i - kPeriod + 1, i + 1)
    const high = Math.max(...slice.map(c => c.high))
    const low = Math.min(...slice.map(c => c.low))
    const close = candles[i].close
    
    if (high === low) {
      kValues.push(50)
    } else {
      kValues.push(((close - low) / (high - low)) * 100)
    }
  }
  
  const lastK = kValues[kValues.length - 1]
  const dSlice = kValues.slice(-dPeriod)
  const lastD = dSlice.reduce((a, b) => a + b, 0) / dPeriod
  
  return { k: lastK, d: lastD }
}

/**
 * Bollinger Bands
 */
function bollingerBands(values: number[], period = 20, stdDev = 2): {
  upper: number
  middle: number
  lower: number
  width: number
  percentB: number
} | null {
  if (values.length < period) return null
  
  const slice = values.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  
  const squaredDiffs = slice.map(v => (v - middle) ** 2)
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const std = Math.sqrt(variance)
  
  const upper = middle + stdDev * std
  const lower = middle - stdDev * std
  const width = ((upper - lower) / middle) * 100
  
  const lastPrice = values[values.length - 1]
  const percentB = upper !== lower ? (lastPrice - lower) / (upper - lower) : 0.5
  
  return { upper, middle, lower, width, percentB }
}

/**
 * ADX (Average Directional Index) with +DI and -DI
 */
function adx(candles: Candle[], period = 14): {
  adx: number
  plusDI: number
  minusDI: number
} | null {
  if (candles.length < period * 2) return null
  
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []
  
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]
    
    const upMove = curr.high - prev.high
    const downMove = prev.low - curr.low
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
    
    tr.push(Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    ))
  }
  
  // Smoothed averages
  const smooth = (arr: number[], p: number): number[] => {
    const result: number[] = []
    let sum = arr.slice(0, p).reduce((a, b) => a + b, 0)
    result.push(sum)
    for (let i = p; i < arr.length; i++) {
      sum = sum - sum / p + arr[i]
      result.push(sum)
    }
    return result
  }
  
  const smoothedTR = smooth(tr, period)
  const smoothedPlusDM = smooth(plusDM, period)
  const smoothedMinusDM = smooth(minusDM, period)
  
  const dx: number[] = []
  for (let i = 0; i < smoothedTR.length; i++) {
    if (smoothedTR[i] === 0) {
      dx.push(0)
      continue
    }
    const pDI = (smoothedPlusDM[i] / smoothedTR[i]) * 100
    const mDI = (smoothedMinusDM[i] / smoothedTR[i]) * 100
    if (pDI + mDI === 0) {
      dx.push(0)
    } else {
      dx.push((Math.abs(pDI - mDI) / (pDI + mDI)) * 100)
    }
  }
  
  if (dx.length < period) return null
  
  // ADX is smoothed DX
  let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < dx.length; i++) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period
  }
  
  const lastTR = smoothedTR[smoothedTR.length - 1]
  const lastPlusDI = lastTR > 0 ? (smoothedPlusDM[smoothedPlusDM.length - 1] / lastTR) * 100 : 0
  const lastMinusDI = lastTR > 0 ? (smoothedMinusDM[smoothedMinusDM.length - 1] / lastTR) * 100 : 0
  
  return {
    adx: adxVal,
    plusDI: lastPlusDI,
    minusDI: lastMinusDI,
  }
}

/**
 * On-Balance Volume trend detection
 */
function obvTrend(candles: Candle[], lookback = 20): "Rising" | "Falling" | "Flat" {
  if (candles.length < lookback + 1) return "Flat"
  
  const obvValues: number[] = []
  let obv = 0
  
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]
    
    if (curr.close > prev.close) {
      obv += curr.volume
    } else if (curr.close < prev.close) {
      obv -= curr.volume
    }
    obvValues.push(obv)
  }
  
  const recent = obvValues.slice(-lookback)
  const older = obvValues.slice(-lookback * 2, -lookback)
  
  if (older.length === 0) return "Flat"
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  
  const change = olderAvg !== 0 ? ((recentAvg - olderAvg) / Math.abs(olderAvg)) * 100 : 0
  
  if (change > 10) return "Rising"
  if (change < -10) return "Falling"
  return "Flat"
}

/* ========== STRUCTURE ANALYSIS ========== */

/**
 * Find swing highs and lows using pivot detection
 */
function findSwingPoints(candles: Candle[], leftBars = 5, rightBars = 5): {
  swingHighs: { price: number; index: number }[]
  swingLows: { price: number; index: number }[]
} {
  const swingHighs: { price: number; index: number }[] = []
  const swingLows: { price: number; index: number }[] = []
  
  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const curr = candles[i]
    let isHigh = true
    let isLow = true
    
    for (let j = 1; j <= leftBars; j++) {
      if (candles[i - j].high >= curr.high) isHigh = false
      if (candles[i - j].low <= curr.low) isLow = false
    }
    
    for (let j = 1; j <= rightBars; j++) {
      if (candles[i + j].high >= curr.high) isHigh = false
      if (candles[i + j].low <= curr.low) isLow = false
    }
    
    if (isHigh) swingHighs.push({ price: curr.high, index: i })
    if (isLow) swingLows.push({ price: curr.low, index: i })
  }
  
  return { swingHighs, swingLows }
}

/**
 * Cluster price levels to find significant support/resistance
 * @param swingPoints - Array of swing points with price and index (time order)
 * @param totalCandles - Total number of candles for recency normalization
 */
function clusterLevels(
  swingPoints: { price: number; index: number }[], 
  lastPrice: number, 
  totalCandles: number,
  bucketPct = 0.005
): number[] {
  if (swingPoints.length === 0) return []
  
  // Sort by index to ensure time order (oldest first)
  const sorted = [...swingPoints].sort((a, b) => a.index - b.index)
  
  const bucket = lastPrice * bucketPct
  const map = new Map<number, { level: number; count: number; recency: number }>()
  
  for (const point of sorted) {
    const key = Math.round(point.price / bucket)
    const item = map.get(key)
    // Recency based on actual candle index, normalized to 0-1
    const recency = totalCandles > 0 ? point.index / totalCandles : 0
    
    if (!item) {
      map.set(key, { level: point.price, count: 1, recency })
    } else {
      item.count += 1
      item.level = (item.level * (item.count - 1) + point.price) / item.count
      item.recency = Math.max(item.recency, recency)
    }
  }
  
  // Score by count * recency (more touches + more recent = more significant)
  return [...map.values()]
    .sort((a, b) => (b.count * (0.5 + b.recency)) - (a.count * (0.5 + a.recency)))
    .map(x => x.level)
}

/**
 * Detect market structure: Higher Highs/Higher Lows or Lower Highs/Lower Lows
 */
function detectMarketStructure(swingHighs: { price: number; index: number }[], swingLows: { price: number; index: number }[]): {
  structure: "Bullish" | "Bearish" | "Mixed"
  strength: number
} {
  if (swingHighs.length < 2 || swingLows.length < 2) {
    return { structure: "Mixed", strength: 0 }
  }
  
  // Check last 4 swing points
  const recentHighs = swingHighs.slice(-4)
  const recentLows = swingLows.slice(-4)
  
  let higherHighs = 0
  let lowerHighs = 0
  let higherLows = 0
  let lowerLows = 0
  
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price > recentHighs[i - 1].price) higherHighs++
    else lowerHighs++
  }
  
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price > recentLows[i - 1].price) higherLows++
    else lowerLows++
  }
  
  const bullishScore = higherHighs + higherLows
  const bearishScore = lowerHighs + lowerLows
  const total = bullishScore + bearishScore
  
  if (total === 0) return { structure: "Mixed", strength: 0 }
  
  if (bullishScore > bearishScore * 1.5) {
    return { structure: "Bullish", strength: (bullishScore / total) * 100 }
  } else if (bearishScore > bullishScore * 1.5) {
    return { structure: "Bearish", strength: (bearishScore / total) * 100 }
  }
  
  return { structure: "Mixed", strength: 50 }
}

/**
 * Calculate Fibonacci levels from swing high/low
 */
function fibonacciLevels(swingHigh: number, swingLow: number): {
  level236: number
  level382: number
  level500: number
  level618: number
  level786: number
  ext1272: number
  ext1618: number
  ext2000: number
} {
  const range = swingHigh - swingLow
  
  return {
    // Retracement levels (from high going down)
    level236: swingHigh - range * 0.236,
    level382: swingHigh - range * 0.382,
    level500: swingHigh - range * 0.5,
    level618: swingHigh - range * 0.618,
    level786: swingHigh - range * 0.786,
    // Extension levels (from low going up beyond high)
    ext1272: swingLow + range * 1.272,
    ext1618: swingLow + range * 1.618,
    ext2000: swingLow + range * 2.0,
  }
}

/* ========== SIGNAL SCORING ========== */

/**
 * Calculate trend score (-100 to +100)
 */
function calculateTrendScore(
  lastPrice: number,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null,
  adxVal: { adx: number; plusDI: number; minusDI: number } | null,
  structure: { structure: string; strength: number }
): number {
  let score = 0
  let factors = 0
  
  // EMA alignment (most important)
  if (ema20 != null && ema50 != null && ema200 != null) {
    // Perfect bullish: price > 20 > 50 > 200
    if (lastPrice > ema20 && ema20 > ema50 && ema50 > ema200) {
      score += 100
    } else if (lastPrice < ema20 && ema20 < ema50 && ema50 < ema200) {
      score -= 100
    } else if (lastPrice > ema50 && ema50 > ema200) {
      score += 50
    } else if (lastPrice < ema50 && ema50 < ema200) {
      score -= 50
    } else if (lastPrice > ema200) {
      score += 20
    } else {
      score -= 20
    }
    factors++
  }
  
  // ADX trend strength
  if (adxVal) {
    const trendStrength = adxVal.adx
    const direction = adxVal.plusDI > adxVal.minusDI ? 1 : -1
    
    if (trendStrength > 25) {
      // Strong trend
      score += direction * Math.min(trendStrength, 50)
      factors++
    } else if (trendStrength < 15) {
      // Weak/no trend - penalty for both directions
      score *= 0.5
    }
  }
  
  // Market structure
  if (structure.structure === "Bullish") {
    score += structure.strength * 0.3
    factors += 0.5
  } else if (structure.structure === "Bearish") {
    score -= structure.strength * 0.3
    factors += 0.5
  }
  
  return factors > 0 ? clamp(score / Math.max(factors, 1), -100, 100) : 0
}

/**
 * Calculate momentum score (-100 to +100)
 * @param lastPrice - Current price for normalizing MACD
 */
function calculateMomentumScore(
  rsi14: number | null,
  rsi7: number | null,
  macdData: { macdLine: number; signalLine: number; histogram: number } | null,
  stoch: { k: number; d: number } | null,
  lastPrice: number
): number {
  let score = 0
  let factors = 0
  
  // RSI analysis
  if (rsi14 !== null) {
    if (rsi14 < 30) {
      // Oversold - bullish
      score += 60 + (30 - rsi14) * 1.5
    } else if (rsi14 > 70) {
      // Overbought - bearish
      score -= 60 + (rsi14 - 70) * 1.5
    } else if (rsi14 > 50) {
      // Bullish momentum
      score += (rsi14 - 50) * 1.5
    } else {
      // Bearish momentum
      score -= (50 - rsi14) * 1.5
    }
    factors++
  }
  
  // RSI divergence (fast vs slow)
  if (rsi14 !== null && rsi7 !== null) {
    const diff = rsi7 - rsi14
    if (diff > 5) {
      score += 15 // Short-term momentum picking up
    } else if (diff < -5) {
      score -= 15 // Short-term momentum weakening
    }
  }
  
  // MACD - normalized by price to work across all price ranges
  if (macdData && lastPrice > 0) {
    // Normalize histogram by price (as percentage) then scale
    const histNorm = (macdData.histogram / lastPrice) * 100
    score += clamp(histNorm * 8, -40, 40)
    
    // Signal line crossover
    if (macdData.macdLine > macdData.signalLine && macdData.histogram > 0) {
      score += 20
    } else if (macdData.macdLine < macdData.signalLine && macdData.histogram < 0) {
      score -= 20
    }
    factors++
  }
  
  // Stochastic
  if (stoch) {
    if (stoch.k < 20 && stoch.d < 20) {
      score += 30 // Oversold
    } else if (stoch.k > 80 && stoch.d > 80) {
      score -= 30 // Overbought
    }
    
    // K crossing D
    if (stoch.k > stoch.d && stoch.k < 50) {
      score += 15 // Bullish crossover in lower zone
    } else if (stoch.k < stoch.d && stoch.k > 50) {
      score -= 15 // Bearish crossover in upper zone
    }
    factors += 0.5
  }
  
  return factors > 0 ? clamp(score / factors, -100, 100) : 0
}

/**
 * Calculate volatility score (-100 to +100)
 * Negative = high volatility (risky), Positive = controlled volatility (safer)
 */
function calculateVolatilityScore(
  atrPercent: number,
  bb: { width: number; percentB: number } | null
): number {
  let score = 0
  
  // ATR percentage (typical ranges: 1-5% for crypto)
  if (atrPercent < 2) {
    score += 50 // Low volatility
  } else if (atrPercent < 4) {
    score += 20 // Moderate volatility
  } else if (atrPercent < 6) {
    score -= 20 // High volatility
  } else {
    score -= 60 // Very high volatility
  }
  
  // Bollinger Band position
  if (bb) {
    // %B near 0.5 = stable, near 0 or 1 = extreme
    const extremity = Math.abs(bb.percentB - 0.5) * 2 // 0 = center, 1 = extreme
    
    if (extremity < 0.3) {
      score += 20 // Price near middle band
    } else if (extremity > 0.8) {
      score -= 40 // Price at extreme
      
      // But oversold extreme can be bullish
      if (bb.percentB < 0.2) {
        score += 30 // Potential bounce
      }
    }
    
    // Band width (squeeze detection)
    if (bb.width < 5) {
      score += 10 // Tight bands = potential breakout coming
    }
  }
  
  return clamp(score, -100, 100)
}

/**
 * Calculate structure score based on support/resistance proximity
 */
function calculateStructureScore(
  lastPrice: number,
  support: number | null,
  resistance: number | null,
  fib: ReturnType<typeof fibonacciLevels>
): number {
  let score = 0
  
  // Support proximity (bullish if near strong support)
  if (support != null) {
    const distToSupport = ((lastPrice - support) / lastPrice) * 100
    
    if (distToSupport > 0 && distToSupport < 3) {
      score += 50 // Very close to support (good for longs)
    } else if (distToSupport > 0 && distToSupport < 6) {
      score += 25
    } else if (distToSupport < 0) {
      score -= 30 // Below support (broken)
    }
  }
  
  // Resistance proximity (bearish if near resistance)
  if (resistance != null) {
    const distToResistance = ((resistance - lastPrice) / lastPrice) * 100
    
    if (distToResistance > 0 && distToResistance < 2) {
      score -= 40 // Very close to resistance
    } else if (distToResistance > 0 && distToResistance < 5) {
      score -= 15
    } else if (distToResistance < 0) {
      score += 30 // Above resistance (breakout)
    }
  }
  
  // Fibonacci level alignment
  const fibLevels = [fib.level382, fib.level500, fib.level618]
  for (const level of fibLevels) {
    const dist = Math.abs((lastPrice - level) / lastPrice) * 100
    if (dist < 1.5) {
      // Price at key fib level - potential reversal zone
      if (lastPrice < level) {
        score += 20 // Approaching from below
      }
      break
    }
  }
  
  return clamp(score, -100, 100)
}

/**
 * Calculate volume score
 */
function calculateVolumeScore(obvTrendVal: "Rising" | "Falling" | "Flat"): number {
  switch (obvTrendVal) {
    case "Rising":
      return 40 // Accumulation
    case "Falling":
      return -40 // Distribution
    default:
      return 0
  }
}

/* ========== MAIN ANALYSIS ========== */

export function analyseCandles(pair: string, candles: Candle[]): AnalysisResult {
  // Minimum candles required: 60 for core indicators (MACD, ADX, EMA50)
  // EMA200 will be null for newer coins - that's handled gracefully
  const MIN_CANDLES = 60
  if (candles.length < MIN_CANDLES) {
    throw new Error(`Not enough candle data for analysis. Need at least ${MIN_CANDLES} candles, got ${candles.length}. This coin may be too new.`)
  }
  
  const cleanPair = pair.trim().toUpperCase().replace(/-/g, "/")
  const quote = cleanPair.split("/")[1] ?? "USD"
  
  const closes = candles.map(c => c.close)
  const lastPrice = closes[closes.length - 1]
  
  /* ===== Calculate all indicators ===== */
  
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const rsi14Val = rsi(closes, 14) ?? 50
  const rsi7Val = rsi(closes, 7) ?? 50
  const atr14 = atr(candles, 14) ?? lastPrice * 0.02
  const atrPercent = (atr14 / lastPrice) * 100
  
  const macdData = macd(closes)
  const stochData = stochastic(candles)
  const bbData = bollingerBands(closes)
  const adxData = adx(candles)
  const obvTrendVal = obvTrend(candles)
  
  /* ===== Structure analysis ===== */
  
  const { swingHighs, swingLows } = findSwingPoints(candles.slice(-100), 3, 3)
  const structureData = detectMarketStructure(swingHighs, swingLows)
  
  // Get significant swing high/low for Fibonacci
  const recentHigh = swingHighs.length > 0 
    ? Math.max(...swingHighs.slice(-5).map(s => s.price))
    : Math.max(...candles.slice(-50).map(c => c.high))
  const recentLow = swingLows.length > 0
    ? Math.min(...swingLows.slice(-5).map(s => s.price))
    : Math.min(...candles.slice(-50).map(c => c.low))
  
  const fib = fibonacciLevels(recentHigh, recentLow)
  
  // Support/Resistance - pass full swing points with indices for proper recency
  const totalCandlesAnalyzed = Math.min(candles.length, 100)
  const supportLevels = clusterLevels(swingLows, lastPrice, totalCandlesAnalyzed)
  const resistanceLevels = clusterLevels(swingHighs, lastPrice, totalCandlesAnalyzed)
  
  const support = supportLevels.find(s => s < lastPrice) ?? null
  const resistance = resistanceLevels.find(r => r > lastPrice) ?? null
  
  /* ===== Signal scoring ===== */
  
  const trendScore = calculateTrendScore(lastPrice, ema20, ema50, ema200, adxData, structureData)
  const momentumScore = calculateMomentumScore(rsi14Val, rsi7Val, macdData, stochData, lastPrice)
  const volatilityScore = calculateVolatilityScore(atrPercent, bbData)
  const structureScore = calculateStructureScore(lastPrice, support, resistance, fib)
  const volumeScore = calculateVolumeScore(obvTrendVal)
  
  // Weighted composite score
  const compositeScore = (
    trendScore * 0.30 +      // 30% weight on trend
    momentumScore * 0.25 +   // 25% weight on momentum
    structureScore * 0.20 +  // 20% weight on price structure
    volumeScore * 0.15 +     // 15% weight on volume
    volatilityScore * 0.10   // 10% weight on volatility
  )
  
  /* ===== Determine trend ===== */
  
  let trend: "Strong Bull" | "Bull" | "Neutral" | "Bear" | "Strong Bear"
  if (trendScore > 60) trend = "Strong Bull"
  else if (trendScore > 20) trend = "Bull"
  else if (trendScore > -20) trend = "Neutral"
  else if (trendScore > -60) trend = "Bear"
  else trend = "Strong Bear"
  
  /* ===== Calculate entry zone ===== */
  
  let entryLow: number
  let entryHigh: number
  let isBreakoutEntry = false
  
  // Check if we should use breakout entry (strong trend confirmed)
  const isStrongBullishBreakout = trendScore > 60 && adxData && adxData.adx > 25 && adxData.plusDI > adxData.minusDI
  if (isStrongBullishBreakout) {
    // Breakout entry: use ATR-based range for consistency
    isBreakoutEntry = true
    entryLow = lastPrice - atr14 * 0.3  // Allow small pullback
    entryHigh = lastPrice + atr14 * 0.5  // Or slight breakout confirmation
  } else if (support != null && support > lastPrice * 0.9) {
    // Support is close - use it as entry zone base
    entryLow = support * 0.995
    entryHigh = support * 1.01
  } else if (lastPrice < fib.level618 && lastPrice > fib.level786) {
    // In golden pocket zone - use fib levels
    entryLow = fib.level786 * 0.99
    entryHigh = fib.level618 * 1.005
  } else {
    // Default: use ATR-based pullback zone
    const pullback = atr14 * 1.2
    entryLow = lastPrice - pullback * 1.5
    entryHigh = lastPrice - pullback * 0.5
  }
  
  // For non-breakout bullish trades, ensure entry is below current price
  if (compositeScore > 0 && !isBreakoutEntry) {
    entryHigh = Math.min(entryHigh, lastPrice * 0.995)
    entryLow = Math.min(entryLow, entryHigh * 0.985)
  }
  
  // Ensure entryLow <= entryHigh
  entryLow = Math.min(entryLow, entryHigh)
  
  const entryMid = (entryLow + entryHigh) / 2
  
  /* ===== Calculate stop loss ===== */
  
  let stop: number
  if (isBreakoutEntry) {
    // Breakout stop: use ATR-based stop below entry
    stop = entryMid - atr14 * 1.5
  } else if (support != null && support < entryLow) {
    // Place stop below support
    stop = support * 0.985
  } else {
    // ATR-based stop
    stop = entryMid - atr14 * 2
  }
  
  // Ensure minimum stop distance
  const minStopDist = entryMid * 0.015
  if (entryMid - stop < minStopDist) {
    stop = entryMid - minStopDist
  }
  
  // CRITICAL: Guarantee stop is always below entry, then compute risk naturally
  let risk = entryMid - stop
  if (risk <= 0) {
    stop = entryMid * 0.985
    risk = entryMid - stop
  }
  
  /* ===== Calculate targets ===== */
  
  // Cap maximum move based on ATR to prevent unrealistic targets
  const maxMovePct = atrPercent > 0 ? Math.min(atrPercent * 8, 60) : 30
  const maxT2Price = entryMid * (1 + maxMovePct / 100)
  const maxT3Price = maxT2Price * 1.15
  
  // T1: Conservative - 1.5R or minor resistance
  let t1 = entryMid + risk * 1.5
  if (resistance != null && resistance > entryMid && resistance < t1) {
    t1 = resistance * 0.995 // Just below resistance
  }
  
  // T2: Use Fibonacci extension or 2.5R
  let t2 = Math.max(fib.ext1272, entryMid + risk * 2.5)
  if (resistance != null && resistance > t1 && resistance < t2) {
    t2 = resistance * 1.005 // Just above resistance (breakout target)
  }
  
  // T3: Fibonacci 1.618 extension or 4R
  let t3 = Math.max(fib.ext1618, entryMid + risk * 4)
  
  // Ensure proper ordering with minimum gaps
  t1 = Math.max(t1, entryMid + risk * 1.2)
  t2 = Math.max(t2, t1 + risk * 0.8)
  t3 = Math.max(t3, t2 + risk * 0.8)
  
  // FINAL cap after all adjustments to prevent extreme targets
  t2 = Math.min(t2, maxT2Price)
  t3 = Math.min(t3, maxT3Price)
  
  // Re-ensure ordering after final cap
  if (t3 <= t2) t3 = t2 * 1.05
  if (t2 <= t1) t2 = t1 * 1.05
  
  const rrToT1 = risk > 0 ? (t1 - entryMid) / risk : 0
  const rrToT2 = risk > 0 ? (t2 - entryMid) / risk : 0
  const rrToT3 = risk > 0 ? (t3 - entryMid) / risk : 0
  
  /* ===== Determine verdict ===== */
  
  // LONG-ONLY ENGINE: Only outputs Strong Buy, Buy, or Wait
  // Negative scores result in "Wait" since we don't generate short trade plans
  let verdict: Verdict
  
  if (compositeScore >= 50) {
    verdict = "Strong Buy"
  } else if (compositeScore >= 20) {
    verdict = "Buy"
  } else {
    // All other cases (including negative scores) result in Wait
    verdict = "Wait"
  }
  
  // Override based on extreme conditions - but be conservative
  // Only upgrade if trend supports it (don't fight strong trends)
  const isBearishTrend = trend === "Strong Bear" || trend === "Bear"
  const isBullishTrend = trend === "Strong Bull" || trend === "Bull"
  
  if (rsi14Val < 25 && momentumScore > 0 && !isBearishTrend && trendScore > -30) {
    // Extremely oversold with momentum turning AND trend is not bearish - upgrade
    if (verdict === "Wait") verdict = "Buy"
    else if (verdict === "Buy") verdict = "Strong Buy"
  } else if (rsi14Val > 80 && momentumScore < 0 && !isBullishTrend && trendScore < 30) {
    // Extremely overbought with momentum fading AND trend is not bullish - downgrade
    if (verdict === "Buy") verdict = "Wait"
    else if (verdict === "Strong Buy") verdict = "Buy"
  }
  
  // In strong bearish trends with heavy selling, don't recommend buying
  if (isBearishTrend && volumeScore < -20 && verdict === "Buy") {
    verdict = "Wait"
  }
  if (isBearishTrend && trendScore < -50 && verdict === "Buy") {
    verdict = "Wait"
  }
  
  /* ===== Build reasons ===== */
  
  const reasons: string[] = []
  
  // Note if EMA200 is unavailable (new coin with limited data)
  if (ema200 == null) {
    reasons.push(`Limited historical data - EMA(200) unavailable. Analysis based on shorter-term indicators only.`)
  }
  
  // Breakout entry reason
  if (isBreakoutEntry) {
    reasons.push(`Strong trend breakout detected (ADX ${round(adxData?.adx ?? 0, 1)}) - ATR-based entry band around current price for pullback or confirmation.`)
  }
  
  // Trend reason
  if (trendScore > 30) {
    reasons.push(`Trend is ${trend.toLowerCase()} with EMA alignment favoring longs.`)
  } else if (trendScore < -30) {
    reasons.push(`Trend is ${trend.toLowerCase()} with EMA alignment favoring shorts.`)
  } else {
    reasons.push(`Trend is neutral - no clear directional bias.`)
  }
  
  // Momentum reason
  if (rsi14Val < 35) {
    reasons.push(`RSI(14) = ${round(rsi14Val, 1)} indicates oversold conditions - potential bounce.`)
  } else if (rsi14Val > 65) {
    reasons.push(`RSI(14) = ${round(rsi14Val, 1)} indicates overbought conditions - potential pullback.`)
  } else {
    reasons.push(`RSI(14) = ${round(rsi14Val, 1)} is in neutral territory.`)
  }
  
  // MACD reason
  if (macdData) {
    if (macdData.histogram > 0 && macdData.macdLine > macdData.signalLine) {
      reasons.push(`MACD bullish: histogram positive and above signal line.`)
    } else if (macdData.histogram < 0 && macdData.macdLine < macdData.signalLine) {
      reasons.push(`MACD bearish: histogram negative and below signal line.`)
    } else {
      reasons.push(`MACD mixed: watching for crossover confirmation.`)
    }
  }
  
  // Structure reason
  if (support != null) {
    const distToSupport = ((lastPrice - support) / lastPrice) * 100
    if (distToSupport > 0 && distToSupport < 5) {
      reasons.push(`Price is ${round(distToSupport, 1)}% above key support at ${formatPrice(support, quote)}.`)
    }
  }
  
  // Volatility reason
  reasons.push(`ATR(14) volatility = ${round(atrPercent, 2)}% (${atrPercent < 3 ? "moderate" : "high"}).`)
  
  // ADX reason
  if (adxData) {
    if (adxData.adx > 25) {
      const direction = adxData.plusDI > adxData.minusDI ? "bullish" : "bearish"
      reasons.push(`ADX = ${round(adxData.adx, 1)} indicates strong ${direction} trend.`)
    } else {
      reasons.push(`ADX = ${round(adxData.adx, 1)} indicates weak/ranging market.`)
    }
  }
  
  // R:R reason
  reasons.push(`Risk-to-reward ratios: T1 ${round(rrToT1, 2)}:1, T2 ${round(rrToT2, 2)}:1, T3 ${round(rrToT3, 2)}:1.`)
  
  // Composite score reason
  reasons.push(`Composite signal score: ${round(compositeScore, 1)}/100.`)
  
  // Add note for Wait verdicts
  if (verdict === "Wait") {
    reasons.push(`Verdict is Wait - trade levels shown are informational only. Wait for better conditions before trading.`)
  }
  
  /* ===== Risk level ===== */
  
  let riskLevel: RiskLevel
  if (atrPercent < 2 && Math.abs(compositeScore) > 30) {
    riskLevel = "Low"
  } else if (atrPercent < 4) {
    riskLevel = "Medium"
  } else if (atrPercent < 6) {
    riskLevel = "High"
  } else {
    riskLevel = "Very High"
  }
  
  /* ===== Confidence ===== */
  
  // Count BULLISH confirming signals only (long-only engine)
  // We only care about bullish alignment since we only recommend buying
  const bullishSignals = [
    trendScore > 15 ? 1 : 0,
    momentumScore > 15 ? 1 : 0,
    structureScore > 15 ? 1 : 0,
    volumeScore > 8 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)
  
  let confidence: Confidence
  // Confidence based on bullish signal alignment only
  if (bullishSignals >= 4 || (bullishSignals >= 3 && compositeScore >= 40)) {
    confidence = "High"
  } else if (bullishSignals >= 3 || (bullishSignals >= 2 && compositeScore >= 25)) {
    confidence = "Medium"
  } else {
    confidence = "Low"
  }
  
  /* ===== Build indicators object ===== */
  
  const indicators: IndicatorValues = {
    rsi14: round(rsi14Val, 2),
    rsi7: round(rsi7Val, 2),
    ema20: ema20 ? round(ema20, guessDp(ema20)) : 0,
    ema50: ema50 ? round(ema50, guessDp(ema50)) : 0,
    ema200: ema200 ? round(ema200, guessDp(ema200)) : 0,
    macdLine: macdData ? round(macdData.macdLine, 8) : 0,
    macdSignal: macdData ? round(macdData.signalLine, 8) : 0,
    macdHistogram: macdData ? round(macdData.histogram, 8) : 0,
    atr14: round(atr14, guessDp(atr14)),
    atrPercent: round(atrPercent, 2),
    stochK: stochData ? round(stochData.k, 2) : 50,
    stochD: stochData ? round(stochData.d, 2) : 50,
    bbUpper: bbData ? round(bbData.upper, guessDp(bbData.upper)) : 0,
    bbMiddle: bbData ? round(bbData.middle, guessDp(bbData.middle)) : 0,
    bbLower: bbData ? round(bbData.lower, guessDp(bbData.lower)) : 0,
    bbWidth: bbData ? round(bbData.width, 2) : 0,
    obvTrend: obvTrendVal,
    adx: adxData ? round(adxData.adx, 2) : 0,
    plusDI: adxData ? round(adxData.plusDI, 2) : 0,
    minusDI: adxData ? round(adxData.minusDI, 2) : 0,
  }
  
  const signals: SignalScore = {
    trend: round(trendScore, 1),
    momentum: round(momentumScore, 1),
    volatility: round(volatilityScore, 1),
    structure: round(structureScore, 1),
    volume: round(volumeScore, 1),
    composite: round(compositeScore, 1),
  }
  
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
      adx: adxData?.adx ?? 0,
      indicators,
      signals,
      support,
      resistance,
      fib,
      swingHigh: recentHigh,
      swingLow: recentLow,
      lastPrice: round(lastPrice, guessDp(lastPrice)),
      quote,
      analysisTimestamp: Date.now(),
    },
  }
}
