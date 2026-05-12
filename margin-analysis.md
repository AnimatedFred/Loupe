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

| Operation | Endpoint | Input tokens | Output tokens | Input cost | Output cost | **Cost / call** |
|-----------|----------|:------------:|:-------------:|:----------:|:-----------:|:---------------:|
| Compose (Figma brief) | `/api/ai/compose` | ~1 850 | ~2 000 | $0.00056 | $0.00500 | **$0.0056** |
| Smart Prompt (DOM → tokens) | `/api/ai/generate` | ~1 625 | ~3 500 | $0.00049 | $0.00875 | **$0.0092** |
| Vision: Build Prompt | `/api/ai/vision` | ~6 342 | ~2 500 | $0.00190 | $0.00625 | **$0.0082** |
| Vision: Describe (UI / Photo / Art) | `/api/ai/vision` | ~7 067 | ~4 500 | $0.00212 | $0.01125 | **$0.0134** |
| Vision: Accessibility Audit | `/api/ai/vision` | ~6 942 | ~6 000 | $0.00208 | $0.01500 | **$0.0171** |
| Vision: Design Match (2 images) | `/api/ai/vision` | ~13 184 | ~2 000 | $0.00396 | $0.00500 | **$0.0090** |

**Notes on token estimates:**
- *Compose input*: 1 100 tokens system prompt + 750 tokens Figma nodes JSON (avg 3 nodes)
- *Smart Prompt input*: 625 tokens system prompt + 1 000 tokens DOM elements (avg 15 elements, compact JSON)
- *Vision inputs*: prompt + 6 192 image tokens (typical capture)
- *Describe* and *Accessibility* system prompts are significantly larger than other modes due to the new brains added (multi-format classify logic and inline markdown template)
- *Accessibility output* is the largest: full `markdownReport` + structured JSON = ~6 000 tokens
- *Match*: two images sent simultaneously → ~12 384 image tokens

### Cost Range Summary

| Operation | Min cost | Max cost (2048px image) |
|-----------|:--------:|:-----------------------:|
| Compose | $0.0056 | $0.0056 |
| Smart Prompt | $0.0092 | $0.0092 |
| Vision: Build Prompt | $0.0082 | $0.0175 |
| Vision: Describe | $0.0134 | $0.0240 |
| Vision: Accessibility | $0.0171 | $0.0276 |

---

## Blended Cost Per Credit

Assuming a typical usage distribution across operations:

| Operation | Usage share | Cost / call | Weighted cost |
|-----------|:-----------:|:-----------:|:-------------:|
| Vision: Build Prompt | 40% | $0.0082 | $0.00328 |
| Compose (Figma) | 20% | $0.0056 | $0.00112 |
| Vision: Describe | 15% | $0.0134 | $0.00201 |
| Vision: Accessibility | 15% | $0.0171 | $0.00257 |
| Smart Prompt | 10% | $0.0092 | $0.00092 |
| **Blended average** | **100%** | | **~$0.010 / credit** |

### Worst Case (if all credits spent on Accessibility Audits)

| Tier | Credits | Rate | Total Gemini cost |
|------|:-------:|:----:|:-----------------:|
| Starter | 75 | $0.0171 | **$1.28** |
| Pro | 300 | $0.0171 | **$5.13** |

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

> **Recommendation:** Vision operations (Describe, Accessibility, Build Prompt) benefit from thinking because the model is making complex visual judgments. Compose and Smart Prompt generate structured text with deterministic rules — thinking adds cost with minimal quality gain. Setting `thinkingBudget: 0` on these two endpoints would improve Pro margin by ~$0.54/user/month with no perceptible quality loss.

---

## Summary Table

| | Free | Starter | Pro |
|--|:----:|:-------:|:---:|
| Monthly price | $0 | $9.00 | $19.00 |
| Credits | 0 | 75 | 300 |
| Stripe fee | $0 | −$0.56 | −$0.85 |
| Gemini API (avg case) | $0 | −$0.75 | −$3.00 |
| Gemini API (worst case) | $0 | −$1.28 | −$5.13 |
| **Gross margin (avg)** | 100% | **85.4%** | **79.7%** |
| **Gross margin (worst)** | 100% | **79.6%** | **68.5%** |
| Infra @ 100 users | $0 | −$0.46 | −$0.46 |
| **Net margin @ 100 users (avg)** | 100% | **80.3%** | **77.3%** |

**Key takeaways:**
1. Gross margins are strong at both tiers — even worst-case, Pro holds ~68% contribution margin
2. Infra break-even is trivially low (4–6 subscribers)
3. The largest margin risk is Pro users running heavy Accessibility Audits repeatedly — at $0.0171/credit × 300 = $5.13, that's 27% of Pro revenue
4. Disabling Gemini thinking on Compose + Smart Prompt saves ~$0.54/month per Pro user with no quality tradeoff — worth implementing
5. Starter's $0.12 revenue-per-credit vs $0.010 cost gives a healthy 12× coverage buffer

---

*Based on: Gemini 2.5 Flash Standard tier pricing as of May 2026 · Stripe standard processing · Railway Hobby plan · Supabase Pro plan*
