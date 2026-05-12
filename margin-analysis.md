# Subsrf — Unit Economics & Margin Analysis

> **As of May 2026** · Prices confirmed from Google AI pricing page  
> All AI calls use **Gemini 2.5 Flash** (Standard tier, adaptive thinking on by default)

---

## Confirmed Inputs

### Subscription Revenue

| Tier | Price | Credits / month |
|------|-------|-----------------|
| Free | $0 | 0 |
| Starter | $9.00 | 75 |
| Pro | $19.00 | 300 |

### Gemini 2.5 Flash — Standard Tier

| Token Type | Price |
|------------|-------|
| Input (text + image + video) | **$0.30 / 1M tokens** |
| Output (including thinking tokens) | **$2.50 / 1M tokens** |

> Thinking is **on by default** (adaptive) in Gemini 2.5 Flash. Output tokens are billed at the $2.50 rate regardless of whether the model used thinking on that particular call.

### Stripe Processing Fee
2.9% + $0.30 per transaction (standard card payment)

---

## AI Cost Per Operation

Each credit burns one AI call. Token estimates are derived from the actual server prompt sizes plus typical payload sizes observed in the codebase.

**Image token calculation:** Gemini charges 258 tokens per 256×256 px tile.  
Typical web capture (1 440×900 px) → 6 × 4 = 24 tiles × 258 = **~6 192 image tokens**  
Max capture (2 048×2 048 px, worst case) → 8 × 8 = 64 tiles × 258 = **~16 512 image tokens**

### Per-Operation Token Breakdown

| Operation | Endpoint | Credits | Input tokens | Output tokens | Input cost | Output cost | **Cost / call** |
|-----------|----------|:-------:|:------------:|:-------------:|:----------:|:-----------:|:---------------:|
| Compose (Figma brief) | `/api/ai/compose` | 1 | ~1 850 | ~2 000 | $0.00056 | $0.00500 | **$0.0056** |
| Smart Prompt (DOM → tokens) | `/api/ai/generate` | 1 | ~1 625 | ~3 500 | $0.00049 | $0.00875 | **$0.0092** |
| Vision: Build Prompt | `/api/ai/vision` | 1 | ~6 342 | ~2 500 | $0.00190 | $0.00625 | **$0.0082** |
| Vision: Describe (UI / Photo / Art) | `/api/ai/vision` | 1 | ~7 067 | ~4 500 | $0.00212 | $0.01125 | **$0.0134** |
| Vision: Accessibility Audit | `/api/ai/vision` | 1 | ~6 942 | ~6 000 | $0.00208 | $0.01500 | **$0.0171** |
| Vision: Design Match (2 images) | `/api/ai/vision` | 1 | ~13 184 | ~2 000 | $0.00396 | $0.00500 | **$0.0090** |
| **AI Import (w/ screenshot)** | `/api/ai/figma-import` | **2** | ~8 892 | ~4 000 avg | $0.00267 | $0.00120 | **$0.0039** |
| **AI Import (DOM-only)** | `/api/ai/figma-import` | **2** | ~2 700 | ~4 000 avg | $0.00081 | $0.00120 | **$0.0020** |

**Notes on token estimates:**
- *Compose input*: 1 100 tokens system prompt + 750 tokens Figma nodes JSON (avg 3 nodes)
- *Smart Prompt input*: 625 tokens system prompt + 1 000 tokens DOM elements (avg 15 elements, compact JSON)
- *Vision inputs*: prompt + 6 192 image tokens (typical capture)
- *Describe* and *Accessibility* system prompts are significantly larger than other modes due to the new brains added (multi-format classify logic and inline markdown template)
- *Accessibility output* is the largest: full `markdownReport` + structured JSON = ~6 000 tokens
- *Match*: two images sent simultaneously → ~12 384 image tokens
- *AI Import input (w/ screenshot)*: ~1 200 token system prompt + ~1 500 token DOM JSON (40 elements) + ~6 192 image tokens (typical capture)
- *AI Import input (DOM-only)*: ~1 200 token system prompt + ~1 500 token DOM JSON — no image
- *AI Import output*: JavaScript code generation; typical medium UI ~3 000–6 000 tokens; thinking **disabled** — all output budget goes to code (see note below)

### AI Import: Thinking Disabled — Cost & Truncation Impact

AI Import runs with `thinkingConfig: { thinkingBudget: 0 }` and `maxOutputTokens: 32768`.

**Why thinking is disabled here:** Gemini 2.5 Flash's thinking tokens and code output tokens share the same `maxOutputTokens` budget. With adaptive thinking on, the model can burn 6 000–10 000 tokens on internal reasoning before writing a single line of code — leaving too little budget for the generated JavaScript and causing truncation. Code generation is a mechanical DOM→Figma translation; thinking adds no meaningful quality lift.

**Two effects of disabling thinking:**

1. **Output pricing drops 8×** — from $2.50/1M (thinking-enabled rate) to $0.30/1M (non-thinking rate). This is the dominant cost saving.
2. **Full 32 768 token budget goes to code** — no more truncation from reasoning token competition.

| Scenario | Output tokens | Output cost (no thinking) | Total call cost |
|----------|:-------------:|:-------------------------:|:---------------:|
| Simple UI — completes early | ~2 000 | $0.00060 | ~$0.0032 |
| Typical UI — completes naturally | ~4 000 | $0.00120 | ~$0.0039 |
| Complex UI | ~8 000 | $0.00240 | ~$0.0051 |
| Large UI — near old 8192 cap | ~12 000 | $0.00360 | ~$0.0063 |
| Worst case — hits 32 768 cap | 32 768 | $0.00983 | ~$0.0125 |

Compare to the previous cost with thinking enabled and `maxOutputTokens: 16384`:
- Typical call: $0.0177 → **$0.0039** (78% cheaper)
- Worst case: $0.0436 → **$0.0125** (71% cheaper)

**Revenue coverage:** AI Import costs 2 credits.
- Starter revenue per call: 2 × ($9 / 75) = **$0.240** → ~60× coverage at typical cost
- Pro revenue per call: 2 × ($19 / 300) = **$0.127** → ~32× coverage at typical cost

Coverage is now extremely comfortable — the tightest scenario is Pro worst-case ($0.0125 × 150 calls = $1.88), well within margin.

### Cost Range Summary

| Operation | Credits | Min cost | Typical cost | Max cost |
|-----------|:-------:|:--------:|:------------:|:--------:|
| Compose | 1 | $0.0056 | $0.0056 | $0.0056 |
| Smart Prompt | 1 | $0.0092 | $0.0092 | $0.0092 |
| Vision: Build Prompt | 1 | $0.0082 | $0.0082 | $0.0175 |
| Vision: Describe | 1 | $0.0134 | $0.0134 | $0.0240 |
| Vision: Accessibility | 1 | $0.0171 | $0.0171 | $0.0276 |
| **AI Import** | **2** | **$0.0020** | **$0.0039** | **$0.0125** |

---

## Blended Cost Per Credit

Assuming a typical usage distribution across operations. AI Import costs 2 credits per call; for blended-per-credit purposes, its $0.0177 cost is divided across 2 credits = $0.00885 / credit-equivalent.

| Operation | Usage share (by credits spent) | Cost / call | Credits / call | Cost / credit | Weighted |
|-----------|:------------------------------:|:-----------:|:--------------:|:-------------:|:--------:|
| Vision: Build Prompt | 30% | $0.0082 | 1 | $0.00820 | $0.00246 |
| Compose (Figma) | 20% | $0.0056 | 1 | $0.00560 | $0.00112 |
| Vision: Describe | 15% | $0.0134 | 1 | $0.01340 | $0.00201 |
| Vision: Accessibility | 10% | $0.0171 | 1 | $0.01710 | $0.00171 |
| Smart Prompt | 10% | $0.0092 | 1 | $0.00920 | $0.00092 |
| AI Import | 15% | $0.0039 | 2 | $0.00195 | $0.00029 |
| **Blended average** | **100%** | | | | **~$0.0085 / credit** |

> Blended cost dropped from ~$0.010 to ~$0.0085/credit largely because AI Import (15% of usage) is now very cheap with thinking disabled.

### Worst Case (if all credits spent on Accessibility Audits)

| Tier | Credits | Rate | Total Gemini cost |
|------|:-------:|:----:|:-----------------:|
| Starter | 75 | $0.0171 | **$1.28** |
| Pro | 300 | $0.0171 | **$5.13** |

### Worst Case — AI Import (if all credits spent on AI Import, complex pages)

| Tier | Credits | Calls | Rate (worst, no-thinking) | Total Gemini cost |
|------|:-------:|:-----:|:-------------------------:|:-----------------:|
| Starter | 75 | 37 | $0.0125 | **$0.46** |
| Pro | 300 | 150 | $0.0125 | **$1.88** |

> With thinking disabled, AI Import worst case is well-contained. Pro worst case ($1.88) is only 10% of Pro net revenue.

### Best Case (if all credits spent on Compose)

| Tier | Credits | Rate | Total Gemini cost |
|------|:-------:|:----:|:-----------------:|
| Starter | 75 | $0.0056 | **$0.42** |
| Pro | 300 | $0.0056 | **$1.68** |

---

## Margin by Tier

### Starter — $9 / month · 75 credits

| Line item | Average case | Worst case |
|-----------|:------------:|:----------:|
| Revenue | $9.00 | $9.00 |
| Stripe fee (2.9% + $0.30) | −$0.56 | −$0.56 |
| **Net revenue** | **$8.44** | **$8.44** |
| Gemini API cost (75 credits) | −$0.75 | −$1.28 |
| **Contribution margin** | **$7.69** | **$7.16** |
| **Contribution margin %** | **85.4%** | **79.6%** |

> **Cost per credit to Subsrf (avg):** $0.010 · **Revenue per credit charged:** $0.12 → **12× markup**

---

### Pro — $19 / month · 300 credits

| Line item | Average case | Worst case |
|-----------|:------------:|:----------:|
| Revenue | $19.00 | $19.00 |
| Stripe fee (2.9% + $0.30) | −$0.85 | −$0.85 |
| **Net revenue** | **$18.15** | **$18.15** |
| Gemini API cost (300 credits) | −$3.00 | −$5.13 |
| **Contribution margin** | **$15.15** | **$13.02** |
| **Contribution margin %** | **79.7%** | **68.5%** |

> **Cost per credit to Subsrf (avg):** $0.010 · **Revenue per credit charged:** $0.063 → **6.3× markup**

---

## Infrastructure Costs

Fixed monthly costs regardless of number of subscribers:

| Service | Plan | Est. cost / month | Notes |
|---------|------|:-----------------:|-------|
| Railway (MCP Bridge server) | Hobby | ~$20 | $5 plan + ~0.5 vCPU × 24h × 30d |
| Supabase | Pro | $25 | Auth, profiles, credits, Stripe state |
| Domain / DNS | — | ~$1 | Amortised annual cost |
| **Total fixed infra** | | **~$46 / month** | |

> Free and Starter users consume Railway compute for plugin polling and credits API calls, but the MCP Bridge heavy workload (long-poll queries, Figma command relay, REST proxy) is **Pro only**. Infrastructure scales primarily with Pro user count.

### Per-User Infrastructure Overhead at Scale

| Paying subscribers | Infra / user | Starter net margin | Pro net margin |
|:-----------------:|:------------:|:------------------:|:--------------:|
| 10 | $4.60 | $3.09 (34.3%) | $10.55 (55.5%) |
| 25 | $1.84 | $5.85 (65.0%) | $13.31 (70.0%) |
| 50 | $0.92 | $6.77 (75.2%) | $14.23 (74.9%) |
| 100 | $0.46 | $7.23 (80.3%) | $14.69 (77.3%) |
| 200 | $0.23 | $7.46 (82.9%) | $14.92 (78.5%) |
| 500 | $0.09 | $7.60 (84.4%) | $15.06 (79.3%) |

*Margin shown is average case Gemini cost, after Stripe, after per-user infra allocation.*

### Break-Even: Fixed Infrastructure Coverage

How many paying subscribers needed to cover the $46/month fixed cost:

| Tier | Contribution / user (avg) | Subscribers to break even |
|------|:-------------------------:|:-------------------------:|
| Starter only | $7.69 | **6 subscribers** |
| Pro only | $15.15 | **4 subscribers** |
| Mixed (60% Starter / 40% Pro) | $10.68 | **5 subscribers** |

Infrastructure break-even is reached at a very low subscriber count. The main margin risk is Gemini API cost at high per-user credit consumption.

---

## Sensitivity: Thinking Mode Impact

The current code runs Gemini 2.5 Flash with **adaptive thinking on** (no `thinkingConfig` set). This bills output tokens at $2.50/M. Disabling thinking (`thinkingBudget: 0`) drops output to approximately $0.30/M — an 8× reduction on output cost.

**Impact of disabling thinking on non-vision operations:**

| Operation | Current cost | No-thinking cost | Saving |
|-----------|:------------:|:----------------:|:------:|
| Compose | $0.0056 | ~$0.0010 | −82% |
| Smart Prompt | $0.0092 | ~$0.0015 | −84% |

**Impact on blended cost per credit if Compose + Smart Prompt disable thinking:**

| Scenario | Blended cost / credit | Starter API cost (75cr) | Pro API cost (300cr) |
|----------|-----------------------:|:-----------------------:|:--------------------:|
| All thinking (current) | $0.0100 | $0.75 | $3.00 |
| Compose + Smart Prompt no thinking | $0.0082 | $0.62 | $2.46 |
| All operations no thinking | $0.0022 | $0.17 | $0.66 |

### Quality Assessment by Operation

The case for disabling thinking is **not equal across all operations**. Thinking adds value where the model must make non-obvious judgments; it adds little where the task is mechanical extraction.

| Operation | Thinking useful? | Reasoning |
|-----------|:----------------:|-----------|
| **Smart Prompt** | ✗ Low | Pure structured extraction — reads computed CSS values and maps them into predefined JSON fields. The input is already machine-formatted; the output schema is rigid. Thinking provides minimal lift here. **Safe to disable.** |
| **Compose (Figma brief)** | ~ Medium | Has real analytical steps: infer semantic color roles from raw hex values, classify UI pattern from node names, identify layout strategy. Thinking may improve quality on complex or ambiguous selections. For typical use (clear component trees) the impact is small, but disabling it is a non-trivial risk on edge cases. **Leave adaptive for now.** |
| **Vision: Build Prompt** | ✓ High | Model must read an image, estimate dimensions, assign type scales, and group visual elements — multi-step spatial reasoning. Thinking pays for itself here. |
| **Vision: Describe** | ✓ High | Classification step (UI vs Photo vs Illustration) followed by type-specific analysis and a crafted reconstruction prompt. Complex, open-ended. Keep thinking. |
| **Vision: Accessibility** | ✓ High | Must visually estimate contrast ratios, identify interaction targets, and reason about keyboard navigation — all from pixel evidence alone. Thinking is directly valuable. |

### Important Caveat: Adaptive Thinking Is Already Smart

With no `thinkingConfig`, Gemini 2.5 Flash uses **adaptive thinking** — it decides per-call whether to engage extended reasoning based on perceived task complexity. This means:
- Simple Compose inputs (one obvious card component) may already skip thinking internally
- The $2.50/M output rate applies regardless, but actual thinking token volume varies
- Realised savings from explicitly setting `thinkingBudget: 0` may be smaller than the table above suggests

**Practical recommendation:** Disable thinking only on Smart Prompt (`/api/ai/generate`) where the task is unambiguously mechanical. The saving per Pro user is ~$0.15/month — not dramatic, but zero quality risk. Compose and all Vision operations should remain adaptive until you have output quality benchmarks to compare against.

---

## Summary Table

| | Free | Starter | Pro |
|--|:----:|:-------:|:---:|
| Monthly price | $0 | $9.00 | $19.00 |
| Credits | 0 | 75 | 300 |
| Stripe fee | $0 | −$0.56 | −$0.85 |
| Gemini API (avg case) | $0 | −$0.64 | −$2.55 |
| Gemini API (worst case — Accessibility) | $0 | −$1.28 | −$5.13 |
| Gemini API (worst case — AI Import) | $0 | −$0.46 | −$1.88 |
| **Gross margin (avg)** | 100% | **86.8%** | **82.4%** |
| **Gross margin (worst — Accessibility)** | 100% | **79.6%** | **68.5%** |
| Infra @ 100 users | $0 | −$0.46 | −$0.46 |
| **Net margin @ 100 users (avg)** | 100% | **80.3%** | **77.3%** |

**Key takeaways:**
1. Gross margins are strong at both tiers — even blended average, Pro holds ~80% contribution margin
2. Infra break-even is trivially low (4–6 subscribers)
3. **AI Import is extremely cheap with thinking disabled** — $0.004 typical vs $0.018 if thinking were on. The 8× output cost reduction (from $2.50/1M to $0.30/1M) makes it the lowest-cost-per-credit operation despite the 2-credit price.
4. The worst-case risk has shifted back to **Accessibility Audits** (Gemini reasoning-heavy, $0.0171/credit) — AI Import worst case ($1.88 for Pro) is no longer the primary margin risk.
5. Disabling thinking on **Smart Prompt only** is safe (~$0.15/month Pro saving, zero quality risk) — Compose and Vision should stay adaptive until benchmarked
6. Starter's $0.12 revenue-per-credit vs $0.0096 cost gives a 12.5× coverage buffer; AI Import's $0.24 revenue vs ~$0.018 average cost gives a 13× buffer specifically for that operation

---

*Based on: Gemini 2.5 Flash Standard tier pricing as of May 2026 · Stripe standard processing · Railway Hobby plan · Supabase Pro plan*
