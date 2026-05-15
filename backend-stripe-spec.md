# Backend Stripe Endpoints — Required for Dashboard

Add these two routes to the Railway Express backend (`api.subsrf.dev`).
Both routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

---

## GET /api/stripe/subscription

Returns the user's current Stripe subscription details.

### Implementation

```js
router.get('/api/stripe/subscription', requireAuth, async (req, res) => {
  const customerId = req.user.stripe_customer_id  // from profiles table
  if (!customerId) return res.status(404).json({ error: 'No billing account' })

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
    expand: ['data.schedule'],
  })

  const sub = subscriptions.data[0]
  if (!sub) return res.status(404).json({ error: 'No active subscription' })

  // Check for a scheduled downgrade (subscription schedule)
  let scheduledTier = null
  let scheduledDate = null
  if (sub.schedule) {
    const schedule = typeof sub.schedule === 'string'
      ? await stripe.subscriptionSchedules.retrieve(sub.schedule)
      : sub.schedule

    // The current phase is index 0; the next phase (if any) is the downgrade
    if (schedule.phases?.length > 1) {
      const nextPhase = schedule.phases[1]
      const priceId = nextPhase.items[0]?.price
      // Map price ID → tier name using your existing PRICE_IDS map
      scheduledTier = PRICE_TO_TIER[priceId] || null
      scheduledDate = nextPhase.start_date   // Unix timestamp
    }
  }

  res.json({
    periodEnd: sub.current_period_end,     // Unix timestamp
    scheduledTier,                          // 'starter' | null
    scheduledDate,                          // Unix timestamp | null
    status: sub.status,                    // 'active' | 'past_due' etc.
  })
})
```

### Response shape

```json
{
  "periodEnd": 1751155200,
  "scheduledTier": "starter",
  "scheduledDate": 1751155200,
  "status": "active"
}
```

`scheduledTier` and `scheduledDate` are `null` when no change is scheduled.

---

## POST /api/stripe/upgrade-preview

Returns a proration preview: how much the user pays **today** to upgrade from Starter → Pro for the remainder of their billing period.

Called only when the user is on Starter. The frontend fetches this on Dashboard load to show the charge before they click.

### Implementation

```js
router.post('/api/stripe/upgrade-preview', requireAuth, async (req, res) => {
  const customerId = req.user.stripe_customer_id
  if (!customerId) return res.status(404).json({ error: 'No billing account' })

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  const sub = subscriptions.data[0]
  if (!sub) return res.status(404).json({ error: 'No active subscription' })

  const priceId = TIER_TO_PRICE['pro']  // your Pro price ID env var

  const preview = await stripe.invoices.retrieveUpcoming({
    customer: customerId,
    subscription: sub.id,
    subscription_items: [{ id: sub.items.data[0].id, price: priceId }],
    subscription_proration_behavior: 'always_invoice',
  })

  // Sum only the proration line items (amount_due excludes next cycle charge)
  const prorationAmount = preview.lines.data
    .filter(l => l.proration)
    .reduce((sum, l) => sum + l.amount, 0)

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: preview.currency.toUpperCase(),
  }).format(prorationAmount / 100)

  res.json({
    prorationAmount,   // integer, cents
    formatted,         // e.g. "$12.34"
    currency: preview.currency,
  })
})
```

### Response shape

```json
{
  "prorationAmount": 1234,
  "formatted": "$12.34",
  "currency": "usd"
}
```

---

## Webhook: write periodEnd to profiles on renewal

When Stripe fires `invoice.paid` or `customer.subscription.updated`, write
`subscription_period_end` back to the profiles table so the data stays fresh
even if the user doesn't open the dashboard:

```js
case 'customer.subscription.updated':
case 'invoice.paid': {
  const sub = event.data.object.subscription
    ? await stripe.subscriptions.retrieve(event.data.object.subscription)
    : event.data.object

  if (sub.current_period_end) {
    await supabase
      .from('profiles')
      .update({ subscription_period_end: new Date(sub.current_period_end * 1000).toISOString() })
      .eq('stripe_customer_id', sub.customer)
  }
  break
}
```

This is optional — the `GET /api/stripe/subscription` endpoint reads live from
Stripe so the dashboard doesn't depend on this column.
