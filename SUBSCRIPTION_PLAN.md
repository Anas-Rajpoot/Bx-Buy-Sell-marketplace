# BX Buy-Sell Marketplace - Subscription System

## Overview
Complete Stripe-based subscription system with Free and Pro tiers.

---
WhatsApp Anas Rajpoot Nm Soft
anasrajpoot945@gmail.com 

Anas-Rajpoot
## Plans

### Free Plan
- **Price:** $0
- **Max Listings:** 2
- **Max Photos per Listing:** 5
- **Features:**
  - Browse all listings
  - Chat with sellers/buyers
  - Basic listing creation
  - Standard support
  - Community access

### Pro Plan
- **Price:** $45/month or $450/year (save $90)
- **Max Listings:** Unlimited
- **Max Photos per Listing:** Unlimited
- **Features:**
  - Everything in Free
  - Unlimited business listings
  - Unlimited photos & videos
  - Advanced analytics dashboard
  - Priority support (24h response)
  - Featured listing badge
  - Listing boost/promotion
  - Early access to new features
  - Custom branding options
  - Export analytics data

---

## Database Schema

### UserSubscription Model
```prisma
model UserSubscription {
  id                String   @id @default(uuid()) @map("_id")
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  planId            String
  plan              Plan     @relation(fields: [planId], references: [id])
  
  // Stripe data
  stripeCustomerId      String?  @unique
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?
  stripeCurrentPeriodEnd DateTime?
  
  // Subscription status
  status            SubscriptionStatus @default(ACTIVE)
  billingCycle      BillingCycle       @default(MONTHLY)
  
  // Dates
  startDate         DateTime  @default(now())
  endDate           DateTime?
  cancelledAt       DateTime?
  trialEndsAt       DateTime?
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  PAST_DUE
  TRIALING
  INCOMPLETE
}

enum BillingCycle {
  MONTHLY
  YEARLY
}
```

### Updated Plan Model
```prisma
model Plan {
  id                String   @id @default(uuid()) @map("_id")
  name              String   @unique  // "Free", "Pro"
  slug              String   @unique  // "free", "pro"
  title             String
  description       String
  
  // Pricing
  monthlyPrice      String   @default("0")
  yearlyPrice       String   @default("0")
  
  // Stripe IDs (set after creating products in Stripe)
  stripeMonthlyPriceId  String?
  stripeYearlyPriceId   String?
  stripeProductId       String?
  
  // Feature Limits
  features          String[]
  maxListings       Int      @default(0)  // 0 = unlimited
  maxPhotos         Int      @default(5)
  maxVideoDuration  Int      @default(0)  // minutes, 0 = none
  canUseAnalytics   Boolean  @default(false)
  prioritySupport   Boolean  @default(false)
  featuredListing   Boolean  @default(false)
  canBoostListing   Boolean  @default(false)
  customBranding    Boolean  @default(false)
  
  // Metadata
  isActive          Boolean  @default(true)
  isDefault         Boolean  @default(false)
  sortOrder         Int      @default(0)
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  // Relations
  subscriptions     UserSubscription[]
  payments          Payment[]
}
```

### Payment Model
```prisma
model Payment {
  id                    String   @id @default(uuid()) @map("_id")
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  
  // Stripe data
  stripePaymentIntentId String?  @unique
  stripeInvoiceId       String?
  stripeChargeId        String?
  
  // Payment details
  amount                String
  currency              String   @default("usd")
  status                PaymentStatus
  
  // Related subscription
  planId                String?
  plan                  Plan?    @relation(fields: [planId], references: [id])
  subscriptionId        String?
  
  billingCycle          BillingCycle?
  description           String?
  
  // Metadata
  metadata              Json?
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  REFUNDED
}
```

---

## API Endpoints

### Public Endpoints
```
GET  /subscription/plans - Get all active plans
```

### Authenticated Endpoints
```
GET  /subscription/current - Get user's current subscription
POST /subscription/checkout - Create Stripe checkout session
POST /subscription/cancel - Cancel subscription
POST /subscription/resume - Resume cancelled subscription
POST /subscription/upgrade - Upgrade plan
POST /subscription/change-billing - Switch monthly/yearly
GET  /subscription/portal - Get Stripe customer portal URL
GET  /subscription/usage - Get current usage stats
GET  /subscription/payment-history - Get payment history
```

### Admin Endpoints
```
GET  /subscription/admin/stats - Subscription statistics
GET  /subscription/admin/users - All user subscriptions
POST /subscription/admin/assign - Manually assign plan
POST /subscription/admin/extend - Extend subscription
POST /subscription/admin/refund - Issue refund
```

### Webhook Endpoint
```
POST /subscription/webhook - Stripe webhook handler
```

---

## Frontend Pages & Components

### New Pages
1. **/pricing** - Pricing plans page
2. **/checkout/success** - Payment success
3. **/checkout/cancel** - Payment cancelled
4. **/subscription** - Manage subscription (redirect to Stripe portal)

### Updated Pages
1. **/dashboard** - Show plan limits, upgrade prompts
2. **/my-listings** - Show listing count vs limit
3. **/profile** - Show current plan
4. **/settings** - Subscription management section

### New Components
1. **PricingCard** - Plan display card
2. **SubscriptionStatus** - Current plan badge
3. **UpgradePrompt** - Modal to upgrade
4. **UsageMeter** - Progress bar for limits
5. **PaymentHistory** - Table of past payments
6. **SubscriptionManagement** - Billing controls

### Admin Components
1. **SubscriptionDashboard** - Revenue analytics
2. **UserSubscriptionTable** - All subscriptions
3. **PaymentHistoryTable** - All payments
4. **SubscriptionStats** - Charts & metrics

---

## Professional Features

### 1. **Advanced Payment Handling**
- ✅ Automatic payment retry (3 attempts over 7 days)
- ✅ Email dunning (payment reminder emails)
- ✅ Grace period (3 days after failed payment)
- ✅ Soft vs hard subscription cancellation
- ✅ Immediate vs end-of-period cancellation
- ✅ Proration calculations
- ✅ Refund processing
- ✅ Dispute handling

### 2. **Analytics & Reporting**
**User Analytics:**
- Current plan usage
- Days until renewal
- Payment history
- Download invoices

**Admin Analytics:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate
- New subscriptions (daily/weekly/monthly)
- Revenue by plan
- LTV by cohort
- Trial conversion rate
- Failed payment rate

### 3. **Smart Upgrade System**
- Proactive upgrade prompts at right moments
- Feature previews for locked features
- A/B tested pricing pages
- Discount codes/coupons
- Referral bonuses
- Seasonal promotions

### 4. **Professional Email System**
**Transactional Emails:**
- Payment confirmation
- Payment failed
- Subscription activated
- Subscription cancelled
- Renewal reminder (7 days before)
- Trial ending (3 days before)
- Downgrade confirmation
- Invoice delivery

### 5. **Compliance & Legal**
- Terms of Service agreement checkbox
- Refund policy display
- GDPR data export
- Cancel anytime guarantee
- Transparent pricing
- No hidden fees disclosure

---

## What I Need From You

### Immediate (to start development):
Nothing! I'll use **Stripe Test Mode** with placeholder keys and you can add real keys later.

### Before Going Live:
1. **Stripe Account**
   - Sign up: https://dashboard.stripe.com/register
   - Get API keys from Dashboard → Developers → API keys
   
2. **Business Information** (for Stripe)
   - Legal business name
   - Business address
   - Tax ID (optional)
   - Support email
   - Support phone number

3. **Decisions:**
   - [ ] Monthly only or Monthly + Yearly?
   - [ ] Trial period? (14 days recommended)
   - [ ] Free plan: 1 or 2 listings max?
   - [ ] What happens when Pro downgrades to Free? (keep extra listings as draft?)
   - [ ] Cancellation: immediate or end-of-period?

4. **Email Configuration** (for notifications)
   - Your current email system (SendGrid already integrated)
   - Email templates approval

---

## Development Timeline

### Week 1: Core Infrastructure
- Day 1-2: Database schema + migrations
- Day 2-3: Stripe integration + checkout
- Day 3-4: Webhooks + payment sync
- Day 4-5: Feature guards + limits

### Week 2: User Experience
- Day 1-2: Pricing page + checkout flow
- Day 2-3: Subscription management UI
- Day 3-4: Upgrade prompts + UX
- Day 4-5: Testing all flows

### Week 3: Admin & Polish
- Day 1-2: Admin subscription dashboard
- Day 2-3: Analytics implementation
- Day 3-4: Email templates
- Day 4-5: Final testing + deployment

---

## Cost Structure

**For You (Platform):**
- Stripe fees: 2.9% + $0.30 per transaction
- Example: $45 subscription = $1.61 fee, you get $43.39

**No Monthly Fees:** Stripe has no monthly fees, only per-transaction.

---

## Next Steps

I'll start building now with:
1. ✅ Database schema updates
2. ✅ Subscription backend module
3. ✅ Mock Stripe integration (real keys added later)
4. ✅ Basic pricing page
5. ✅ Feature enforcement

**You can provide Stripe keys anytime** - I'll use test mode placeholders until then.

**Starting implementation now...**
