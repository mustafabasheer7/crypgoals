"use client"

import { useState, FormEvent } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Verdict = "Buy" | "Wait" | "Avoid"
type RiskLevel = "Low" | "Medium" | "High"
type Confidence = "Low" | "Medium" | "High"

interface TradePlan {
  entryZone: string
  stopLoss: string
  target1: string
  target2: string
  target3: string
}

interface RiskSummary {
  riskLevel: RiskLevel
  confidence: Confidence
  reasons: string[]
}

interface AnalysisResult {
  verdict: Verdict
  tradePlan: TradePlan
  riskSummary: RiskSummary
}

const PAIR_REGEX = /^[A-Z0-9]{2,10}[\/-][A-Z0-9]{2,10}$/i

function validatePair(value: string): boolean {
  if (!value.trim()) return true
  return PAIR_REGEX.test(value.trim())
}

/** Placeholder: replace with real /api/analyse call later */
async function fetchAnalysis(pair: string): Promise<AnalysisResult> {
  // TODO: fetch(`/api/analyse?pair=${encodeURIComponent(pair)}`) and return response
  return {
    verdict: "Buy",
    tradePlan: {
      entryZone: "$42,500 - $43,200",
      stopLoss: "$41,800",
      target1: "$44,500",
      target2: "$45,800",
      target3: "$47,200",
    },
    riskSummary: {
      riskLevel: "Medium",
      confidence: "High",
      reasons: [
        "Strong support level identified at current price range",
        "Volume indicators show increasing interest",
        "Technical pattern suggests potential upward movement",
      ],
    },
  }
}

export default function HomePage() {
  const [pair, setPair] = useState("")
  const [isValidPair, setIsValidPair] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPair(value)
    setIsValidPair(validatePair(value))
    if (result) {
      setResult(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pair.trim() || !isValidPair) return

    setIsLoading(true)
    setResult(null)

    try {
      const cleanPair = pair.trim().toUpperCase().replace(/-/g, "/")
      const data = await fetchAnalysis(cleanPair)
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed"
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setPair("")
    setIsValidPair(true)
    setResult(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pair.trim() && isValidPair) {
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const canSubmit = pair.trim() !== "" && isValidPair

  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case "Buy":
        return {
          text: "text-emerald-400",
          border: "border-emerald-500/40",
          accent: "from-emerald-500 to-teal-500",
        }
      case "Wait":
        return {
          text: "text-amber-400",
          border: "border-amber-500/40",
          accent: "from-amber-500 to-orange-500",
        }
      case "Avoid":
        return {
          text: "text-rose-400",
          border: "border-rose-500/40",
          accent: "from-rose-500 to-pink-500",
        }
    }
  }

  const getRiskStyle = (level: RiskLevel) => {
    if (level === "Low") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    if (level === "Medium") return "text-amber-400 bg-amber-500/10 border-amber-500/30"
    return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  }

  const getConfidenceStyle = (confidence: Confidence) => {
    if (confidence === "High") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    if (confidence === "Medium") return "text-amber-400 bg-amber-500/10 border-amber-500/30"
    return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  }

  const verdictStyle = result ? getVerdictStyle(result.verdict) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-950 relative">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.02),transparent_50%)] pointer-events-none"></div>

      <div className="container mx-auto px-4 py-16 sm:py-20 max-w-5xl relative z-10">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4">
            Crypto Verdict
          </h1>
          <p className="text-zinc-400 text-lg font-normal max-w-2xl mx-auto leading-relaxed">
            Enter a market pair to generate a trade plan with entry, stop loss, targets, and verdict.
          </p>
        </header>

        {/* Main Card */}
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
                    onKeyDown={handleKeyDown}
                    className="bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                    disabled={isLoading}
                  />
                  {pair && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 h-11 px-4"
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
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  "Generate Plan"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="mt-16 space-y-6">
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
              {/* Verdict Card */}
              <Card
                className={`bg-zinc-900/50 border ${verdictStyle?.border} backdrop-blur-sm rounded-xl shadow-xl overflow-hidden`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${verdictStyle?.accent}`}
                ></div>
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-white text-xs font-semibold uppercase tracking-wide">
                    Verdict
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <span
                      className={`text-4xl font-bold tracking-tight ${verdictStyle?.text}`}
                    >
                      {result.verdict}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Plan Card */}
              <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm sm:col-span-2 rounded-xl shadow-xl">
                <CardHeader className="pb-4 border-b border-zinc-800/50">
                  <CardTitle className="text-white text-xs font-semibold uppercase tracking-wide">
                    Trade Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">
                        Entry Zone
                      </p>
                      <p className="text-xl font-semibold text-white">
                        {result.tradePlan.entryZone}
                      </p>
                    </div>
                    <Separator className="bg-zinc-800/50" />
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">
                        Stop Loss
                      </p>
                      <p className="text-xl font-semibold text-rose-400">
                        {result.tradePlan.stopLoss}
                      </p>
                    </div>
                    <Separator className="bg-zinc-800/50" />
                    <div className="grid grid-cols-3 gap-5">
                      {[
                        result.tradePlan.target1,
                        result.tradePlan.target2,
                        result.tradePlan.target3,
                      ].map((target, idx) => (
                        <div key={idx}>
                          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">
                            Target {idx + 1}
                          </p>
                          <p className="text-xl font-semibold text-emerald-400">
                            {target}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Summary Card */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm rounded-xl shadow-xl">
              <CardHeader className="pb-4 border-b border-zinc-800/50">
                <CardTitle className="text-white text-xs font-semibold uppercase tracking-wide">
                  Risk Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-zinc-500 mb-2.5 uppercase tracking-wider font-medium">
                        Risk Level
                      </p>
                      <Badge
                        variant="outline"
                        className={`${getRiskStyle(result.riskSummary.riskLevel)} border font-medium text-xs px-3 py-1.5`}
                      >
                        {result.riskSummary.riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2.5 uppercase tracking-wider font-medium">
                        Confidence
                      </p>
                      <Badge
                        variant="outline"
                        className={`${getConfidenceStyle(result.riskSummary.confidence)} border font-medium text-xs px-3 py-1.5`}
                      >
                        {result.riskSummary.confidence}
                      </Badge>
                    </div>
                  </div>
                  <Separator className="bg-zinc-800/50" />
                  <div>
                    <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider font-medium">
                      Key Reasons
                    </p>
                    <ul className="space-y-3">
                      {result.riskSummary.reasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-zinc-300 flex items-start gap-3 text-sm leading-relaxed"
                        >
                          <span className="text-indigo-400 mt-1 font-semibold">
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

            {/* Disclaimer */}
            <div className="text-center pt-4">
              <p className="text-xs text-zinc-500 font-normal">
                Educational only. Not financial advice. Prices can be wrong. You are responsible for your decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}