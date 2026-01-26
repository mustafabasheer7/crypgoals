"use client"

import { useState, FormEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [isValidUrl, setIsValidUrl] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      return true // Empty is valid (no error shown)
    }
    try {
      const urlObj = new URL(value)
      return urlObj.protocol === "http:" || urlObj.protocol === "https:"
    } catch {
      // Check if it starts with http:// or https://
      return value.startsWith("http://") || value.startsWith("https://")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUrl(value)
    setIsValidUrl(validateUrl(value))
    // Clear result when input changes
    if (result) {
      setResult(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!url.trim() || !isValidUrl) {
      return
    }

    setIsLoading(true)
    setResult(null)

    // Simulate API call with random delay between 800-1200ms
    const delay = Math.floor(Math.random() * 400) + 800
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Generate mock result
    const mockResult: AnalysisResult = {
      verdict: (["Buy", "Wait", "Avoid"] as Verdict[])[
        Math.floor(Math.random() * 3)
      ],
      tradePlan: {
        entryZone: "$42,500 - $43,200",
        stopLoss: "$41,800",
        target1: "$44,500",
        target2: "$45,800",
        target3: "$47,200",
      },
      riskSummary: {
        riskLevel: (["Low", "Medium", "High"] as RiskLevel[])[
          Math.floor(Math.random() * 3)
        ],
        confidence: (["Low", "Medium", "High"] as Confidence[])[
          Math.floor(Math.random() * 3)
        ],
        reasons: [
          "Strong support level identified at current price range",
          "Volume indicators show increasing interest",
          "Technical pattern suggests potential upward movement",
        ],
      },
    }

    setResult(mockResult)
    setIsLoading(false)
  }

  const handleClear = () => {
    setUrl("")
    setIsValidUrl(true)
    setResult(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && url.trim() && isValidUrl) {
      handleSubmit(e as any)
    }
  }

  const canSubmit = url.trim() !== "" && isValidUrl

  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case "Buy":
        return "text-emerald-400"
      case "Wait":
        return "text-amber-400"
      case "Avoid":
        return "text-red-400"
    }
  }

  const getRiskStyle = (level: RiskLevel | Confidence) => {
    if (level === "Low" || level === "High") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    if (level === "Medium") return "text-amber-400 bg-amber-400/10 border-amber-400/20"
    return "text-red-400 bg-red-400/10 border-red-400/20"
  }

  const getConfidenceStyle = (confidence: Confidence) => {
    if (confidence === "High") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    if (confidence === "Medium") return "text-amber-400 bg-amber-400/10 border-amber-400/20"
    return "text-red-400 bg-red-400/10 border-red-400/20"
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-12 sm:py-16 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white mb-4">
            Crypto Verdict
          </h1>
          <p className="text-slate-400 text-base sm:text-lg font-light max-w-2xl mx-auto">
            Paste a coin link to generate a trade plan with entry, stop loss, targets, and verdict.
          </p>
        </header>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl font-normal">Analysis Request</CardTitle>
            <CardDescription className="text-slate-400 text-sm font-light mt-1">
              Enter a coin page URL from CoinGecko or CoinMarketCap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="coin-url"
                  className="text-sm font-normal text-slate-300 block"
                >
                  Coin URL
                </label>
                <div className="flex gap-2">
                  <Input
                    id="coin-url"
                    type="url"
                    placeholder="https://www.coingecko.com/en/coins/bitcoin"
                    value={url}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 h-11"
                    disabled={isLoading}
                  />
                  {url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-11 px-4"
                      disabled={isLoading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {!isValidUrl && url.trim() && (
                  <p className="text-sm text-red-400 mt-1 font-light">
                    Please enter a valid URL starting with http:// or https://
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-11 font-normal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          <div className="mt-12 space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
              {/* Verdict Card */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg font-normal">Verdict</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <span className={`text-4xl font-light tracking-wide ${getVerdictStyle(result.verdict)}`}>
                      {result.verdict}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Plan Card */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm sm:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg font-normal">Trade Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Entry Zone</p>
                      <p className="text-lg font-light text-white">
                        {result.tradePlan.entryZone}
                      </p>
                    </div>
                    <Separator className="bg-slate-700/50" />
                    <div>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Stop Loss</p>
                      <p className="text-lg font-light text-red-400">
                        {result.tradePlan.stopLoss}
                      </p>
                    </div>
                    <Separator className="bg-slate-700/50" />
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Target 1</p>
                        <p className="text-lg font-light text-emerald-400">
                          {result.tradePlan.target1}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Target 2</p>
                        <p className="text-lg font-light text-emerald-400">
                          {result.tradePlan.target2}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Target 3</p>
                        <p className="text-lg font-light text-emerald-400">
                          {result.tradePlan.target3}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Summary Card */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg font-normal">Risk Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Risk Level</p>
                      <Badge
                        variant="outline"
                        className={`${getRiskStyle(result.riskSummary.riskLevel)} border font-light text-xs px-3 py-1`}
                      >
                        {result.riskSummary.riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-light">Confidence</p>
                      <Badge
                        variant="outline"
                        className={`${getConfidenceStyle(result.riskSummary.confidence)} border font-light text-xs px-3 py-1`}
                      >
                        {result.riskSummary.confidence}
                      </Badge>
                    </div>
                  </div>
                  <Separator className="bg-slate-700/50" />
                  <div>
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-light">Key Reasons</p>
                    <ul className="space-y-3">
                      {result.riskSummary.reasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-slate-300 flex items-start gap-3 text-sm leading-relaxed font-light"
                        >
                          <span className="text-cyan-400 mt-1.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="text-center pt-4">
              <p className="text-xs text-slate-500 font-light">
                Educational only. Not financial advice. Prices can be wrong. You are responsible for your decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
