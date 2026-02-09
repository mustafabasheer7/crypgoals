"use client";

import { useState, FormEvent, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Verdict = "Strong Buy" | "Buy" | "Accumulate" | "Neutral" | "Avoid";
type EntryType = "Breakout" | "Pullback" | "Current" | "None";
type PositionSize = "Full" | "Half" | "Quarter" | "None";
type RiskLevel = "Low" | "Medium" | "High" | "Very High";
type Confidence = "Low" | "Medium" | "High";

interface TradePlan {
  entryZone: string;
  stopLoss: string;
  target1: string;
  target2: string;
  target3: string;
}

interface RiskSummary {
  riskLevel: RiskLevel;
  confidence: Confidence;
  reasons: string[];
}

interface SignalScore {
  trend: number;
  momentum: number;
  volatility: number;
  structure: number;
  volume: number;
  composite: number;
}

interface IndicatorValues {
  rsi14: number;
  rsi7: number;
  ema20: number;
  ema50: number;
  ema200: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  atr14: number;
  atrPercent: number;
  stochK: number;
  stochD: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  obvTrend: "Rising" | "Falling" | "Flat";
  adx: number;
  plusDI: number;
  minusDI: number;
}

interface AnalysisResult {
  verdict: Verdict;
  entryType: EntryType;
  positionSize: PositionSize;
  tradePlan: TradePlan;
  riskSummary: RiskSummary;
  levels: {
    entryLow: number;
    entryHigh: number;
    entryMid: number;
    stop: number;
    t1: number;
    t2: number;
    t3: number;
  };
  meta: {
    trend: "Strong Bull" | "Bull" | "Neutral" | "Bear" | "Strong Bear";
    adx: number;
    indicators: IndicatorValues;
    signals: SignalScore;
    support: number | null;
    resistance: number | null;
    swingHigh: number;
    swingLow: number;
    lastPrice: number;
    quote: string;
  };
}

const PAIR_REGEX = /^[A-Z0-9]{2,10}[\/-][A-Z0-9]{2,10}$/i;

function validatePair(value: string): boolean {
  if (!value.trim()) return true;
  return PAIR_REGEX.test(value.trim());
}

function normalisePair(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, "/");
}

function formatUsd(n: number): string {
  // Determine appropriate decimal places based on price magnitude
  let decimals: number;
  if (n >= 10000) decimals = 2;
  else if (n >= 1000) decimals = 3;
  else if (n >= 100) decimals = 4;
  else if (n >= 1) decimals = 5;
  else if (n >= 0.01) decimals = 6;
  else if (n >= 0.0001) decimals = 8;
  else decimals = 10; // For very small prices like meme coins

  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function fetchAnalysis(pair: string): Promise<AnalysisResult> {
  const res = await fetch(
    `/api/analyse?pair=${encodeURIComponent(pair)}&interval=240&limit=300`,
    { method: "GET" },
  );

  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.error ?? text ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (!data) {
    throw new Error("Empty response from /api/analyse");
  }

  return data as AnalysisResult;
}

async function fetchCurrentPrice(pair: string): Promise<number> {
  const res = await fetch(
    `/api/kraken/ohlc?pair=${encodeURIComponent(pair)}&interval=1&limit=2`,
    { method: "GET" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Price fetch failed");

  const candles = json?.candles;
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error("No price data returned");
  }

  const last = candles[candles.length - 1];
  const close = Number(last?.close);
  if (!Number.isFinite(close)) throw new Error("Invalid price data");

  return close;
}

/* ========== INFO TOOLTIP COMPONENT ========== */

function InfoTooltip({
  title,
  explanation,
  interpretation,
  importance,
}: {
  title: string;
  explanation: string;
  interpretation: string;
  importance: "High" | "Medium" | "Low";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const importanceColors = {
    High: "text-emerald-400",
    Medium: "text-amber-400",
    Low: "text-zinc-400",
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="ml-1.5 w-4 h-4 rounded-full bg-zinc-700/50 hover:bg-indigo-600/50 text-zinc-400 hover:text-white inline-flex items-center justify-center text-xs transition-all duration-200 cursor-pointer hover:scale-110"
        aria-label={`Info about ${title}`}
      >
        ?
      </button>
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl text-left">
          <div className="text-sm font-medium text-white mb-2">{title}</div>
          <p className="text-xs text-zinc-300 mb-2">{explanation}</p>
          <p className="text-xs text-zinc-400 mb-2">
            <span className="text-zinc-500">What it means: </span>
            {interpretation}
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-zinc-500">Importance:</span>
            <span className={importanceColors[importance]}>{importance}</span>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-zinc-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== SIGNAL BAR WITH INFO ========== */

const signalInfo: Record<
  string,
  {
    explanation: string;
    interpretation: string;
    importance: "High" | "Medium" | "Low";
  }
> = {
  Trend: {
    explanation:
      "Measures if the price is generally going up, down, or sideways over time. Think of it like the overall direction of a river.",
    interpretation:
      "Positive = price trending upward (good for buying). Negative = price trending downward (be careful).",
    importance: "High",
  },
  Momentum: {
    explanation:
      "Shows how fast the price is moving and if it's speeding up or slowing down. Like checking if a car is accelerating or braking.",
    interpretation:
      "Positive = price has strong upward push. Negative = price is losing steam or falling.",
    importance: "High",
  },
  Structure: {
    explanation:
      "Looks at where key price levels are - like floors (support) and ceilings (resistance) that price tends to bounce off.",
    interpretation:
      "Positive = price is near a good 'floor' to bounce from. Negative = price is near a 'ceiling' that might push it down.",
    importance: "Medium",
  },
  Volume: {
    explanation:
      "Tracks if more people are buying or selling. High buying volume with rising prices confirms the move is real.",
    interpretation:
      "Positive = more buying activity (accumulation). Negative = more selling activity (distribution).",
    importance: "Medium",
  },
  Volatility: {
    explanation:
      "Measures how wildly the price swings up and down. Higher volatility = more risk but also more opportunity.",
    interpretation:
      "Positive = calm, stable price movement. Negative = wild, unpredictable swings.",
    importance: "Low",
  },
};

function SignalBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const normalized = Math.abs(value) / max;
  const isPositive = value >= 0;
  const info = signalInfo[label];

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs items-center">
        <span className="text-zinc-400 flex items-center">
          {label}
          {info && (
            <InfoTooltip
              title={label}
              explanation={info.explanation}
              interpretation={info.interpretation}
              importance={info.importance}
            />
          )}
        </span>
        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
          {value > 0 ? "+" : ""}
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isPositive ? "bg-emerald-500" : "bg-rose-500"
          }`}
          style={{ width: `${normalized * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ========== INDICATOR INFO ========== */

const indicatorInfo: Record<
  string,
  {
    explanation: string;
    goodRange: string;
    badRange: string;
    importance: "High" | "Medium" | "Low";
  }
> = {
  "RSI (14)": {
    explanation:
      "Relative Strength Index - measures if something has been bought too much (overbought) or sold too much (oversold) over the last 14 periods.",
    goodRange:
      "Below 30 = oversold (potential buying opportunity). Between 40-60 = healthy.",
    badRange: "Above 70 = overbought (price might drop soon).",
    importance: "High",
  },
  "RSI (7)": {
    explanation:
      "Faster version of RSI that reacts more quickly to price changes. Good for spotting short-term shifts.",
    goodRange: "Below 30 = oversold. Works best when it agrees with RSI(14).",
    badRange:
      "Above 70 = overbought. Can give false signals because it's so fast.",
    importance: "Medium",
  },
  MACD: {
    explanation:
      "Moving Average Convergence Divergence - tracks the relationship between two moving averages. Shows if momentum is building or fading.",
    goodRange:
      "Positive and rising = strong upward momentum. Green bars getting taller = acceleration.",
    badRange:
      "Negative and falling = downward momentum. Red bars getting taller = selling pressure.",
    importance: "High",
  },
  "Stoch %K": {
    explanation:
      "Stochastic Oscillator - shows where the current price is relative to its recent range. Like asking 'are we near the top or bottom of recent prices?'",
    goodRange:
      "Below 20 = price near recent lows (potential bounce). Rising from bottom = bullish.",
    badRange: "Above 80 = price near recent highs (might pull back).",
    importance: "Medium",
  },
  ADX: {
    explanation:
      "Average Directional Index - measures how strong the current trend is (not the direction, just the strength).",
    goodRange:
      "Above 25 = strong trend (good for following the momentum). Above 40 = very strong.",
    badRange:
      "Below 20 = weak or no trend (choppy, sideways market - harder to trade).",
    importance: "High",
  },
  "ATR %": {
    explanation:
      "Average True Range as a percentage - measures how much the price typically moves. Higher = more volatile.",
    goodRange: "1-3% = moderate, manageable volatility.",
    badRange:
      "Above 5% = high volatility, risky. Bigger price swings mean bigger potential losses.",
    importance: "Medium",
  },
  "OBV Trend": {
    explanation:
      "On-Balance Volume - tracks whether volume is flowing in (buying) or out (selling) over time.",
    goodRange:
      "Rising = money flowing in, accumulation happening. Confirms price rises.",
    badRange:
      "Falling = money flowing out, distribution happening. Warning sign even if price is stable.",
    importance: "Medium",
  },
};

function IndicatorPill({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status: "bullish" | "bearish" | "neutral";
}) {
  const statusColors = {
    bullish: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    bearish: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    neutral: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
  };

  const statusLabels = {
    bullish: "Good",
    bearish: "Caution",
    neutral: "Neutral",
  };

  const info = indicatorInfo[label];

  return (
    <div className={`px-3 py-2 rounded-lg border ${statusColors[status]}`}>
      <div className="text-xs text-zinc-500 mb-0.5 flex items-center">
        {label}
        {info && (
          <InfoTooltip
            title={label}
            explanation={info.explanation}
            interpretation={`${info.goodRange} ${info.badRange}`}
            importance={info.importance}
          />
        )}
      </div>
      <div className="text-sm font-medium">{value}</div>
      <div className="text-xs mt-1 opacity-70">{statusLabels[status]}</div>
    </div>
  );
}

/* ========== TRADE PLAN INFO ========== */

const tradePlanInfo = {
  entryZone: {
    title: "Entry Zone",
    explanation:
      "The recommended price range to buy at. We calculate this based on nearby support levels and technical patterns.",
    interpretation:
      "Wait for the price to drop into this zone before buying. Buying here gives you a better risk-to-reward ratio.",
    importance: "High" as const,
  },
  stopLoss: {
    title: "Stop Loss",
    explanation:
      "The price where you should sell to limit your losses if the trade goes wrong. It's like a safety net.",
    interpretation:
      "Set an automatic sell order at this price. Never risk more than you can afford to lose.",
    importance: "High" as const,
  },
  target1: {
    title: "Target 1 (Conservative)",
    explanation:
      "The first profit-taking level. This is a safer, more likely target to hit.",
    interpretation:
      "Consider selling 30-50% of your position here to lock in some profits.",
    importance: "High" as const,
  },
  target2: {
    title: "Target 2 (Moderate)",
    explanation:
      "The second profit target, based on key resistance levels or Fibonacci extensions.",
    interpretation:
      "If price reaches T1 and keeps going, this is the next logical exit point.",
    importance: "Medium" as const,
  },
  target3: {
    title: "Target 3 (Ambitious)",
    explanation:
      "The stretch goal - only reached in strong moves. Based on extended Fibonacci levels.",
    interpretation:
      "Keep a small portion of your position for this. Don't be greedy if the market turns.",
    importance: "Low" as const,
  },
  support: {
    title: "Support Level",
    explanation:
      "A price 'floor' where buyers tend to step in. The price has bounced off this level before.",
    interpretation:
      "Good to buy near support. If price breaks below support, it's a warning sign.",
    importance: "High" as const,
  },
  resistance: {
    title: "Resistance Level",
    explanation:
      "A price 'ceiling' where sellers tend to appear. The price has struggled to go above this before.",
    interpretation:
      "Price might stall or reverse here. Breaking above resistance is bullish.",
    importance: "High" as const,
  },
};

const riskInfo = {
  riskLevel: {
    title: "Risk Level",
    explanation:
      "Overall assessment of how risky this trade is, based on volatility and market conditions.",
    interpretation:
      "Low = safer, smaller price swings. High/Very High = volatile, could move sharply in either direction.",
    importance: "High" as const,
  },
  confidence: {
    title: "Confidence",
    explanation:
      "How many of our signals agree with each other. More agreement = higher confidence.",
    interpretation:
      "High = most indicators point the same direction. Low = mixed signals, be more cautious.",
    importance: "High" as const,
  },
  adx: {
    title: "ADX (Trend Strength)",
    explanation:
      "Average Directional Index - measures how strong the current trend is, not the direction.",
    interpretation:
      "Above 25 = strong trend (easier to trade). Below 20 = weak/choppy market (harder to predict).",
    importance: "Medium" as const,
  },
  compositeScore: {
    title: "Composite Score",
    explanation:
      "Our overall rating from -100 to +100. Combines trend, momentum, structure, volume, and volatility.",
    interpretation:
      "Above +50 = Strong Buy. +20 to +50 = Buy. Below +20 = Wait (conditions not favorable for buying).",
    importance: "High" as const,
  },
};

/* ========== VERDICT INFO ========== */

function VerdictExplanation({
  verdict,
  score,
  trend,
}: {
  verdict: Verdict;
  score: number;
  trend: string;
}) {
  // Generate professional-style explanation
  const getExplanation = (): string => {
    switch (verdict) {
      case "Strong Buy":
        return "Professional setup: Trend, momentum, and structure all align. High conviction trade with favorable risk-reward.";
      case "Buy":
        return "Trend is in your favor with acceptable risk. Consider entering a position with appropriate size.";
      case "Accumulate":
        return "Trend is bullish but current price may be extended. Set limit orders at pullback levels or wait for better entry.";
      case "Neutral":
        return "No clear edge in either direction. Professional traders sit on their hands when uncertain.";
      case "Avoid":
        return "Bearish conditions or excessive risk detected. Protect capital - there will be better opportunities.";
      default:
        return "Review the analysis details below.";
    }
  };

  const scoreDescription =
    score >= 50
      ? "Very bullish"
      : score >= 20
      ? "Moderately bullish"
      : score >= -20
      ? "Neutral/uncertain"
      : score >= -50
      ? "Moderately bearish"
      : "Very bearish";

  return (
    <div className="mt-4 p-3 rounded-lg bg-zinc-800/30 text-xs text-zinc-400">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-zinc-500">What this means:</span>
        <InfoTooltip
          title="Verdict Explanation"
          explanation="Our recommendation is based on combining all the technical indicators with weighted importance."
          interpretation={`Score of ${score.toFixed(0)}: ${scoreDescription}`}
          importance="High"
        />
      </div>
      <p>{getExplanation()}</p>
    </div>
  );
}

export default function HomePage() {
  const searchParams = useSearchParams();

  const [pair, setPair] = useState("");
  const [isValidPair, setIsValidPair] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Function to run analysis for a given pair
  const runAnalysis = async (pairToAnalyze: string) => {
    if (!pairToAnalyze.trim() || !validatePair(pairToAnalyze)) return;

    setIsLoading(true);
    setResult(null);
    setError(null);
    setPriceError(null);
    setCurrentPrice(null);

    try {
      const cleanPair = normalisePair(pairToAnalyze);

      const [analysis, price] = await Promise.allSettled([
        fetchAnalysis(cleanPair),
        fetchCurrentPrice(cleanPair),
      ]);

      if (analysis.status === "rejected") {
        throw analysis.reason;
      }
      setResult(analysis.value);

      if (price.status === "fulfilled") {
        setCurrentPrice(price.value);
      } else {
        const msg =
          price.reason instanceof Error
            ? price.reason.message
            : "Price fetch failed";
        setPriceError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Read pair from URL query parameter (from scanner) and auto-analyze
  useEffect(() => {
    const pairParam = searchParams.get("pair");
    if (pairParam && validatePair(pairParam)) {
      setPair(pairParam);
      setIsValidPair(true);
      // Auto-trigger analysis when coming from scanner
      runAnalysis(pairParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPair(value);
    setIsValidPair(validatePair(value));
    setError(null);
    setPriceError(null);
    setCurrentPrice(null);
    if (result) setResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pair.trim() || !isValidPair) return;
    await runAnalysis(pair);
  };

  const handleClear = () => {
    setPair("");
    setIsValidPair(true);
    setResult(null);
    setError(null);
    setCurrentPrice(null);
    setPriceError(null);
  };

  const canSubmit = pair.trim() !== "" && isValidPair;

  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case "Strong Buy":
        return {
          text: "text-emerald-300",
          border: "border-emerald-500/50",
          accent: "from-emerald-400 to-teal-400",
          bg: "bg-emerald-500/10",
        };
      case "Buy":
        return {
          text: "text-emerald-400",
          border: "border-emerald-500/40",
          accent: "from-emerald-500 to-teal-500",
          bg: "bg-emerald-500/5",
        };
      case "Accumulate":
        return {
          text: "text-cyan-400",
          border: "border-cyan-500/40",
          accent: "from-cyan-500 to-blue-500",
          bg: "bg-cyan-500/5",
        };
      case "Neutral":
        return {
          text: "text-zinc-400",
          border: "border-zinc-500/40",
          accent: "from-zinc-500 to-slate-500",
          bg: "bg-zinc-500/5",
        };
      case "Avoid":
        return {
          text: "text-rose-400",
          border: "border-rose-500/40",
          accent: "from-rose-500 to-red-500",
          bg: "bg-rose-500/5",
        };
    }
  };

  const getRiskStyle = (level: RiskLevel) => {
    switch (level) {
      case "Low":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "Medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "High":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "Very High":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    }
  };

  const getConfidenceStyle = (confidence: Confidence) => {
    if (confidence === "High")
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (confidence === "Medium")
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  const getTrendStyle = (trend: string) => {
    if (trend.includes("Bull")) return "text-emerald-400";
    if (trend.includes("Bear")) return "text-rose-400";
    return "text-amber-400";
  };

  const verdictStyle = result ? getVerdictStyle(result.verdict) : null;
  const entryMid = result?.levels?.entryMid ?? null;

  const profitPctFrom = (target: number): string => {
    if (entryMid == null || entryMid === 0) return "N/A";
    const pct = ((target - entryMid) / entryMid) * 100;
    if (!Number.isFinite(pct)) return "N/A";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  const getRsiStatus = (rsi: number): "bullish" | "bearish" | "neutral" => {
    if (rsi < 35) return "bullish";
    if (rsi > 65) return "bearish";
    return "neutral";
  };

  const getMacdStatus = (
    histogram: number,
  ): "bullish" | "bearish" | "neutral" => {
    if (histogram > 0) return "bullish";
    if (histogram < 0) return "bearish";
    return "neutral";
  };

  const getStochStatus = (k: number): "bullish" | "bearish" | "neutral" => {
    if (k < 25) return "bullish";
    if (k > 75) return "bearish";
    return "neutral";
  };

  const getAdxStatus = (
    adx: number,
    plusDI: number,
    minusDI: number,
  ): "bullish" | "bearish" | "neutral" => {
    if (adx < 20) return "neutral";
    return plusDI > minusDI ? "bullish" : "bearish";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.02),transparent_50%)] pointer-events-none"></div>

      <div className="container mx-auto px-4 py-16 sm:py-20 max-w-6xl relative z-10">
        <header className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4">
            Crypto Verdict
          </h1>
          <p className="text-zinc-400 text-lg font-normal max-w-2xl mx-auto leading-relaxed">
            Smart analysis that combines multiple signals to help you make
            better trading decisions.
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            Click the{" "}
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700/50 text-zinc-400 text-xs mx-1">
              ?
            </span>{" "}
            icons for explanations
          </p>
          <div className="mt-6">
            <Link href="/scan">
              <Button
                variant="outline"
                className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 cursor-pointer transition-all duration-200"
              >
                Scan All Coins for Opportunities
              </Button>
            </Link>
          </div>
        </header>

        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl">
          <CardHeader className="pb-5">
            <CardTitle className="text-white text-xl font-semibold">
              Analysis Request
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm font-normal mt-1.5">
              Enter a Kraken trading pair like BTC/USD, ETH/USD, SOL/USD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <label
                  htmlFor="market-pair"
                  className="text-sm font-medium text-zinc-300 block"
                >
                  Market Pair
                </label>
                <div className="flex gap-3">
                  <Input
                    id="market-pair"
                    type="text"
                    placeholder="BTC/USD"
                    value={pair}
                    onChange={handleInputChange}
                    className="bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                    disabled={isLoading}
                  />
                  {pair && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-11 px-4 cursor-pointer transition-all duration-200"
                      disabled={isLoading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {!isValidPair && pair.trim() && (
                  <p className="text-sm text-rose-400 mt-1.5 font-normal">
                    Enter a valid market pair like BTC/USD
                  </p>
                )}
                {error && (
                  <p className="text-sm text-rose-400 mt-1.5 font-normal">
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 text-white h-11 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "Generate Analysis"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="mt-12 space-y-6">
            {/* Verdict and Signal Scores */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Verdict Card */}
              <Card
                className={`bg-zinc-900/50 border ${verdictStyle?.border} backdrop-blur-sm rounded-xl shadow-xl overflow-hidden relative`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${verdictStyle?.accent}`}
                ></div>
                <CardHeader className="pb-2 pt-6">
                  <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center">
                    Verdict
                    <InfoTooltip
                      title="What is the Verdict?"
                      explanation="Our final recommendation based on analyzing multiple technical indicators. It's like a summary of what all the signals are saying."
                      interpretation="Strong Buy/Buy = favorable conditions. Wait = uncertain. Sell/Strong Sell = unfavorable conditions."
                      importance="High"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-6">
                  <div className="text-center">
                    <span
                      className={`text-4xl font-bold tracking-tight ${verdictStyle?.text}`}
                    >
                      {result.verdict}
                    </span>
                    {/* Entry Type & Position Size */}
                    {result.entryType !== "None" && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <Badge
                          variant="outline"
                          className="text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                        >
                          {result.entryType} Entry
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${
                            result.positionSize === "Full"
                              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                              : result.positionSize === "Half"
                              ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                              : "text-zinc-400 border-zinc-500/30 bg-zinc-500/10"
                          }`}
                        >
                          {result.positionSize} Position
                        </Badge>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-xs text-zinc-500">Trend:</span>
                      <span
                        className={`text-sm font-medium ${getTrendStyle(
                          result.meta.trend,
                        )}`}
                      >
                        {result.meta.trend}
                      </span>
                      <span className="text-xs text-zinc-500 ml-2">ADX:</span>
                      <span
                        className={`text-sm font-medium ${
                          result.meta.adx > 25
                            ? "text-emerald-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {result.meta.adx.toFixed(0)}
                      </span>
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {result.meta.signals.composite > 0 ? "+" : ""}
                      {result.meta.signals.composite.toFixed(0)}
                      <span className="text-sm text-zinc-500 ml-1">/100</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center justify-center">
                      Signal Score
                      <InfoTooltip
                        title={riskInfo.compositeScore.title}
                        explanation={riskInfo.compositeScore.explanation}
                        interpretation={riskInfo.compositeScore.interpretation}
                        importance={riskInfo.compositeScore.importance}
                      />
                    </p>
                    <VerdictExplanation
                      verdict={result.verdict}
                      score={result.meta.signals.composite}
                      trend={result.meta.trend}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signal Scores Card */}
              <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl lg:col-span-2">
                <CardHeader className="pb-4 border-b border-zinc-800/50">
                  <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center">
                    Signal Breakdown
                    <InfoTooltip
                      title="Signal Breakdown"
                      explanation="We analyze 5 different aspects of the market. Each one gets a score from -100 (very bad) to +100 (very good)."
                      interpretation="Green/positive = bullish signal. Red/negative = bearish signal. The longer the bar, the stronger the signal."
                      importance="High"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <SignalBar
                      label="Trend"
                      value={result.meta.signals.trend}
                    />
                    <SignalBar
                      label="Momentum"
                      value={result.meta.signals.momentum}
                    />
                    <SignalBar
                      label="Structure"
                      value={result.meta.signals.structure}
                    />
                    <SignalBar
                      label="Volume"
                      value={result.meta.signals.volume}
                    />
                    <SignalBar
                      label="Volatility"
                      value={result.meta.signals.volatility}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 flex items-center">
                        Money Flow
                        <InfoTooltip
                          title="Money Flow (OBV Trend)"
                          explanation={indicatorInfo["OBV Trend"].explanation}
                          interpretation={`${indicatorInfo["OBV Trend"].goodRange} ${indicatorInfo["OBV Trend"].badRange}`}
                          importance={indicatorInfo["OBV Trend"].importance}
                        />
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          result.meta.indicators.obvTrend === "Rising"
                            ? "text-emerald-400 border-emerald-500/30"
                            : result.meta.indicators.obvTrend === "Falling"
                            ? "text-rose-400 border-rose-500/30"
                            : "text-zinc-400 border-zinc-500/30"
                        }
                      >
                        {result.meta.indicators.obvTrend === "Rising"
                          ? "Buying"
                          : result.meta.indicators.obvTrend === "Falling"
                          ? "Selling"
                          : "Neutral"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Indicators */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl">
              <CardHeader className="pb-4 border-b border-zinc-800/50">
                <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center">
                  Technical Indicators
                  <InfoTooltip
                    title="Technical Indicators"
                    explanation="These are mathematical calculations based on price and volume history. Each one tells us something different about the market."
                    interpretation="Green = bullish/good. Red = bearish/caution. Gray = neutral. Click each indicator's ? for details."
                    importance="High"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <IndicatorPill
                    label="RSI (14)"
                    value={result.meta.indicators.rsi14.toFixed(1)}
                    status={getRsiStatus(result.meta.indicators.rsi14)}
                  />
                  <IndicatorPill
                    label="RSI (7)"
                    value={result.meta.indicators.rsi7.toFixed(1)}
                    status={getRsiStatus(result.meta.indicators.rsi7)}
                  />
                  <IndicatorPill
                    label="MACD"
                    value={
                      result.meta.indicators.macdHistogram > 0
                        ? "Bullish"
                        : result.meta.indicators.macdHistogram < 0
                        ? "Bearish"
                        : "Neutral"
                    }
                    status={getMacdStatus(result.meta.indicators.macdHistogram)}
                  />
                  <IndicatorPill
                    label="Stoch %K"
                    value={result.meta.indicators.stochK.toFixed(1)}
                    status={getStochStatus(result.meta.indicators.stochK)}
                  />
                  <IndicatorPill
                    label="ADX"
                    value={result.meta.indicators.adx.toFixed(1)}
                    status={getAdxStatus(
                      result.meta.indicators.adx,
                      result.meta.indicators.plusDI,
                      result.meta.indicators.minusDI,
                    )}
                  />
                  <IndicatorPill
                    label="ATR %"
                    value={`${result.meta.indicators.atrPercent.toFixed(2)}%`}
                    status={
                      result.meta.indicators.atrPercent < 3
                        ? "neutral"
                        : "bearish"
                    }
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-zinc-800/30">
                    <div className="text-xs text-zinc-500 mb-1 flex items-center justify-center">
                      Short-term Avg
                      <InfoTooltip
                        title="EMA 20 (Short-term Average)"
                        explanation="The average price over the last 20 periods. Shows the short-term trend direction."
                        interpretation="Price above this = short-term bullish. Price below = short-term bearish."
                        importance="Medium"
                      />
                    </div>
                    <div className="text-sm font-medium text-white">
                      {result.meta.indicators.ema20.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/30">
                    <div className="text-xs text-zinc-500 mb-1 flex items-center justify-center">
                      Medium-term Avg
                      <InfoTooltip
                        title="EMA 50 (Medium-term Average)"
                        explanation="The average price over the last 50 periods. Shows the medium-term trend."
                        interpretation="Often used as a key support/resistance level. Price crossing above it is bullish."
                        importance="Medium"
                      />
                    </div>
                    <div className="text-sm font-medium text-white">
                      {result.meta.indicators.ema50.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/30">
                    <div className="text-xs text-zinc-500 mb-1 flex items-center justify-center">
                      Long-term Avg
                      <InfoTooltip
                        title="EMA 200 (Long-term Average)"
                        explanation="The average price over the last 200 periods. The most important trend indicator."
                        interpretation="Price above = long-term uptrend (bull market). Price below = long-term downtrend (bear market)."
                        importance="High"
                      />
                    </div>
                    <div className="text-sm font-medium text-white">
                      {result.meta.indicators.ema200.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade Plan */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl">
              <CardHeader className="pb-4 border-b border-zinc-800/50">
                <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center">
                  Trade Plan
                  <InfoTooltip
                    title="Trade Plan"
                    explanation="A complete trading strategy with where to buy, where to take profits, and where to cut losses if things go wrong."
                    interpretation="Following a plan helps remove emotion from trading. Always use a stop loss to protect your capital."
                    importance="High"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {/* Current Price */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-medium">
                        Current Price
                      </p>
                      {currentPrice != null ? (
                        <p className="text-2xl font-semibold text-white">
                          {formatUsd(currentPrice)}
                        </p>
                      ) : priceError ? (
                        <p className="text-sm text-rose-400">{priceError}</p>
                      ) : (
                        <p className="text-sm text-zinc-500">Unavailable</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 mb-1 flex items-center justify-end">
                        Support
                        <InfoTooltip
                          title={tradePlanInfo.support.title}
                          explanation={tradePlanInfo.support.explanation}
                          interpretation={tradePlanInfo.support.interpretation}
                          importance={tradePlanInfo.support.importance}
                        />
                      </p>
                      <p className="text-sm text-emerald-400">
                        {result.meta.support
                          ? formatUsd(result.meta.support)
                          : "N/A"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-2 mb-1 flex items-center justify-end">
                        Resistance
                        <InfoTooltip
                          title={tradePlanInfo.resistance.title}
                          explanation={tradePlanInfo.resistance.explanation}
                          interpretation={
                            tradePlanInfo.resistance.interpretation
                          }
                          importance={tradePlanInfo.resistance.importance}
                        />
                      </p>
                      <p className="text-sm text-rose-400">
                        {result.meta.resistance
                          ? formatUsd(result.meta.resistance)
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-zinc-800/50" />

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium flex items-center">
                        Entry Zone
                        <InfoTooltip
                          title={tradePlanInfo.entryZone.title}
                          explanation={tradePlanInfo.entryZone.explanation}
                          interpretation={
                            tradePlanInfo.entryZone.interpretation
                          }
                          importance={tradePlanInfo.entryZone.importance}
                        />
                      </p>
                      <p className="text-xl font-semibold text-white">
                        {result.tradePlan.entryZone}
                      </p>
                      {entryMid != null && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Midpoint: {formatUsd(entryMid)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium flex items-center">
                        Stop Loss
                        <InfoTooltip
                          title={tradePlanInfo.stopLoss.title}
                          explanation={tradePlanInfo.stopLoss.explanation}
                          interpretation={tradePlanInfo.stopLoss.interpretation}
                          importance={tradePlanInfo.stopLoss.importance}
                        />
                      </p>
                      <p className="text-xl font-semibold text-rose-400">
                        {result.tradePlan.stopLoss}
                      </p>
                      {entryMid != null && result.levels.stop && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Risk:{" "}
                          {(
                            ((entryMid - result.levels.stop) / entryMid) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-zinc-800/50" />

                  <div className="grid grid-cols-3 gap-5">
                    {[
                      {
                        label: "Target 1",
                        key: "target1" as const,
                        price: result.levels.t1,
                        text: result.tradePlan.target1,
                      },
                      {
                        label: "Target 2",
                        key: "target2" as const,
                        price: result.levels.t2,
                        text: result.tradePlan.target2,
                      },
                      {
                        label: "Target 3",
                        key: "target3" as const,
                        price: result.levels.t3,
                        text: result.tradePlan.target3,
                      },
                    ].map((t) => (
                      <div key={t.label}>
                        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium flex items-center">
                          {t.label}
                          <InfoTooltip
                            title={tradePlanInfo[t.key].title}
                            explanation={tradePlanInfo[t.key].explanation}
                            interpretation={tradePlanInfo[t.key].interpretation}
                            importance={tradePlanInfo[t.key].importance}
                          />
                        </p>
                        <p className="text-lg sm:text-xl font-semibold text-emerald-400">
                          {t.text}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Profit: {profitPctFrom(t.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl">
              <CardHeader className="pb-4 border-b border-zinc-800/50">
                <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wide flex items-center">
                  Risk Analysis
                  <InfoTooltip
                    title="Risk Analysis"
                    explanation="An assessment of how risky this trade is and how confident we are in our signals."
                    interpretation="Lower risk + higher confidence = better setup. Always consider your own risk tolerance."
                    importance="High"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-zinc-500 mb-2.5 uppercase tracking-wider font-medium flex items-center">
                        Risk Level
                        <InfoTooltip
                          title={riskInfo.riskLevel.title}
                          explanation={riskInfo.riskLevel.explanation}
                          interpretation={riskInfo.riskLevel.interpretation}
                          importance={riskInfo.riskLevel.importance}
                        />
                      </p>
                      <Badge
                        variant="outline"
                        className={`${getRiskStyle(
                          result.riskSummary.riskLevel,
                        )} border font-medium text-xs px-3 py-1.5`}
                      >
                        {result.riskSummary.riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2.5 uppercase tracking-wider font-medium flex items-center">
                        Confidence
                        <InfoTooltip
                          title={riskInfo.confidence.title}
                          explanation={riskInfo.confidence.explanation}
                          interpretation={riskInfo.confidence.interpretation}
                          importance={riskInfo.confidence.importance}
                        />
                      </p>
                      <Badge
                        variant="outline"
                        className={`${getConfidenceStyle(
                          result.riskSummary.confidence,
                        )} border font-medium text-xs px-3 py-1.5`}
                      >
                        {result.riskSummary.confidence}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2.5 uppercase tracking-wider font-medium flex items-center">
                        Trend Strength
                        <InfoTooltip
                          title={riskInfo.adx.title}
                          explanation={riskInfo.adx.explanation}
                          interpretation={riskInfo.adx.interpretation}
                          importance={riskInfo.adx.importance}
                        />
                      </p>
                      <Badge
                        variant="outline"
                        className={`${
                          result.meta.adx > 25
                            ? "text-emerald-400 border-emerald-500/30"
                            : "text-amber-400 border-amber-500/30"
                        } border font-medium text-xs px-3 py-1.5`}
                      >
                        {result.meta.adx > 25 ? "Strong" : "Weak"} (
                        {result.meta.adx.toFixed(0)})
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-zinc-800/50" />

                  <div>
                    <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider font-medium">
                      Analysis Summary
                    </p>
                    <ul className="space-y-2.5">
                      {result.riskSummary.reasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-zinc-300 flex items-start gap-3 text-sm leading-relaxed"
                        >
                          <span className="text-indigo-400 mt-0.5 font-semibold">
                            •
                          </span>
                          <span className="font-normal">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center pt-4">
              <p className="text-xs text-zinc-500 font-normal">
                Educational purposes only. Not financial advice. Past
                performance does not guarantee future results. Always do your
                own research.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
