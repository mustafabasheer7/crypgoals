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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg
              className="w-8 h-8 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h1 className="text-4xl sm:text-5xl font-bold text-white">
              Crypto Verdict
            </h1>
          </div>
          <p className="text-slate-300 text-base sm:text-lg">
            Paste a coin link to generate a trade plan (entry, stop, targets,
            verdict).
          </p>
        </header>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Coin Analysis</CardTitle>
            <CardDescription className="text-slate-400">
              Enter a coin page URL from CoinGecko or CoinMarketCap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="coin-url"
                  className="text-sm font-medium text-slate-300"
                >
                  Coin URL
                </label>
                <div className="flex gap-2">
                  <Input
                    id="coin-url"
                    type="url"
                    placeholder="https://www.coingecko.com/en/coins/bitcoin or https://coinmarketcap.com/currencies/bitcoin/"
                    value={url}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
                    disabled={isLoading}
                  />
                  {url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-slate-400 hover:text-white"
                      disabled={isLoading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {!isValidUrl && url.trim() && (
                  <p className="text-sm text-red-400">
                    Please enter a valid URL starting with http:// or https://
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Press Enter to submit, or click the button below
                </p>
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Generating plan...
                  </span>
                ) : (
                  "Generate plan"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="mt-8 space-y-6">
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
              {/* Verdict Card */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Verdict</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-4">
                    <Badge
                      variant="outline"
                      className={`text-2xl px-6 py-3 border-2 ${
                        result.verdict === "Buy"
                          ? "border-green-500 text-green-400"
                          : result.verdict === "Wait"
                          ? "border-yellow-500 text-yellow-400"
                          : "border-red-500 text-red-400"
                      }`}
                    >
                      {result.verdict}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Plan Card */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm sm:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Trade Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Entry Zone</p>
                      <p className="text-lg font-semibold text-white">
                        {result.tradePlan.entryZone}
                      </p>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Stop Loss</p>
                      <p className="text-lg font-semibold text-red-400">
                        {result.tradePlan.stopLoss}
                      </p>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Target 1</p>
                        <p className="text-lg font-semibold text-green-400">
                          {result.tradePlan.target1}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Target 2</p>
                        <p className="text-lg font-semibold text-green-400">
                          {result.tradePlan.target2}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Target 3</p>
                        <p className="text-lg font-semibold text-green-400">
                          {result.tradePlan.target3}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Summary Card */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-xl">Risk Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Risk Level</p>
                      <Badge
                        variant="outline"
                        className={
                          result.riskSummary.riskLevel === "Low"
                            ? "border-green-500 text-green-400"
                            : result.riskSummary.riskLevel === "Medium"
                            ? "border-yellow-500 text-yellow-400"
                            : "border-red-500 text-red-400"
                        }
                      >
                        {result.riskSummary.riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Confidence</p>
                      <Badge
                        variant="outline"
                        className={
                          result.riskSummary.confidence === "High"
                            ? "border-green-500 text-green-400"
                            : result.riskSummary.confidence === "Medium"
                            ? "border-yellow-500 text-yellow-400"
                            : "border-red-500 text-red-400"
                        }
                      >
                        {result.riskSummary.confidence}
                      </Badge>
                    </div>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Key Reasons</p>
                    <ul className="space-y-2">
                      {result.riskSummary.reasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-purple-400 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="text-center">
              <p className="text-xs text-slate-500 italic">
                Educational only. Not financial advice. Prices can be wrong. You
                are responsible for your decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
