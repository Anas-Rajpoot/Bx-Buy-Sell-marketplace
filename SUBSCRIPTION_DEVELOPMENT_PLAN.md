# Subscription System - Development Implementation Plan

## Phase 1: Database Foundation (Day 1)

### Task 1.1: Update Prisma Schema
**File:** `Backend/prisma/schema.prisma`

**Changes:**
1. Add new enums
2. Add UserSubscription model
3. Update Plan model
4. Add Payment model
5. Update User model relations

**Code Changes:**
```prisma
// Add enums
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

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  REFUNDED
}

// Add UserSubscription model
model UserSubscription {
  id                    String              @id @default(uuid()) @map("_id")
  userId                String              @unique
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  planId                String
  plan                  Plan                @relation(fields: [planId], references: [id])
  stripeCustomerId      String?             @unique
  stripeSubscriptionId  String?             @unique
  stripePriceId         String?
  stripeCurrentPeriodEnd DateTime?
  status                SubscriptionStatus  @default(ACTIVE)
  billingCycle          BillingCycle        @default(MONTHLY)
  startDate             DateTime            @default(now())
  endDate               DateTime?
  cancelledAt           DateTime?
  trialEndsAt           DateTime?
  created_at            DateTime            @default(now())
  updated_at            DateTime            @updatedAt
}

// Add Payment model
model Payment {
  id                    String         @id @default(uuid()) @map("_id")
  userId                String
  user                  User           @relation(fields: [userId], references: [id])
  stripePaymentIntentId String?        @unique
  stripeInvoiceId       String?
  stripeChargeId        String?
  amount                String
  currency              String         @default("usd")
  status                PaymentStatus
  planId                String?
  plan                  Plan?          @relation(fields: [planId], references: [id])
  subscriptionId        String?
  billingCycle          BillingCycle?
  description           String?
  metadata              Json?
  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt
}

// Update Plan model - add new fields
model Plan {
  // ... existing fields ...
  slug                  String   @unique  // Add this
  monthlyPrice          String   @default("0")  // Add this
  yearlyPrice           String   @default("0")  // Add this
  stripeMonthlyPriceId  String?  // Add this
  stripeYearlyPriceId   String?  // Add this
  stripeProductId       String?  // Add this
  maxListings           Int      @default(0)  // Add this
  maxPhotos             Int      @default(5)  // Add this
  maxVideoDuration      Int      @default(0)  // Add this
  canUseAnalytics       Boolean  @default(false)  // Add this
  prioritySupport       Boolean  @default(false)  // Add this
  featuredListing       Boolean  @default(false)  // Add this
  canBoostListing       Boolean  @default(false)  // Add this
  customBranding        Boolean  @default(false)  // Add this
  isActive              Boolean  @default(true)  // Add this
  isDefault             Boolean  @default(false)  // Add this
  sortOrder             Int      @default(0)  // Add this
  subscriptions         UserSubscription[]  // Add this
  payments              Payment[]  // Add this
}

// Update User model - add relations
model User {
  // ... existing fields ...
  subscription  UserSubscription?
  payments      Payment[]
}
```

**Commands:**
```bash
cd Backend
npx prisma format
npx prisma db push
npx prisma generate
```

---

## Phase 2: Backend Core (Day 1-2)

### Task 2.1: Install Stripe SDK
**Commands:**
```bash
cd Backend
npm install stripe @nestjs/config
```

### Task 2.2: Environment Configuration
**File:** `Backend/.env`
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder

# Subscription Settings
SUBSCRIPTION_TRIAL_DAYS=14
SUBSCRIPTION_GRACE_PERIOD_DAYS=3
```

**File:** `Backend/src/config/stripe.config.ts`
```typescript
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: '2023-10-16' as const,
};
```

### Task 2.3: Create Subscription Module
**Structure:**
```
Backend/src/subscription/
├── subscription.module.ts
├── subscription.controller.ts
├── subscription.service.ts
├── stripe.service.ts
├── webhook.controller.ts
├── guards/
│   └── subscription.guard.ts
└── dto/
    ├── create-checkout.dto.ts
    ├── subscription.dto.ts
    └── webhook.dto.ts
```

**File:** `Backend/src/subscription/subscription.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [SubscriptionController, WebhookController],
  providers: [SubscriptionService, StripeService, PrismaService],
  exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule {}
```

### Task 2.4: Stripe Service
**File:** `Backend/src/subscription/stripe.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: stripeConfig.apiVersion,
    });
  }

  // Create customer
  async createCustomer(email: string, name: string, metadata?: any) {
    return this.stripe.customers.create({
      email,
      name,
      metadata,
    });
  }

  // Create checkout session
  async createCheckoutSession(params: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: any;
    trialDays?: number;
  }) {
    return this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: params.trialDays
        ? { trial_period_days: params.trialDays }
        : undefined,
    });
  }

  // Get subscription
  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId: string, priceId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });
  }

  // Create customer portal session
  async createPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret,
    );
  }

  getStripe() {
    return this.stripe;
  }
}
```

### Task 2.5: Subscription Service (Core Logic)
**File:** `Backend/src/subscription/subscription.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { SubscriptionStatus, BillingCycle } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private db: PrismaService,
    private stripeService: StripeService,
  ) {}

  // Get user's current subscription
  async getCurrentSubscription(userId: string) {
    return this.db.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  // Get all active plans
  async getPlans() {
    return this.db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Create checkout session
  async createCheckoutSession(
    userId: string,
    planSlug: string,
    billingCycle: BillingCycle,
    successUrl: string,
    cancelUrl: string,
  ) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const plan = await this.db.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException('Plan not found');

    const priceId =
      billingCycle === 'MONTHLY'
        ? plan.stripeMonthlyPriceId
        : plan.stripeYearlyPriceId;
    if (!priceId) throw new Error('Stripe price ID not configured');

    let subscription = await this.getCurrentSubscription(userId);
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripeService.createCustomer(
        user.email,
        `${user.first_name} ${user.last_name}`.trim(),
        { userId },
      );
      customerId = customer.id;
    }

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: { userId, planId: plan.id, billingCycle },
      trialDays: subscription ? undefined : 14, // Trial only for first subscription
    });

    return { sessionId: session.id, url: session.url };
  }

  // Handle successful checkout
  async handleCheckoutComplete(session: any) {
    const { userId, planId, billingCycle } = session.metadata;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);

    await this.db.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        status: 'ACTIVE',
        billingCycle: billingCycle as BillingCycle,
        startDate: new Date(),
      },
      update: {
        planId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        status: 'ACTIVE',
        billingCycle: billingCycle as BillingCycle,
        cancelledAt: null,
        endDate: null,
      },
    });

    return { success: true };
  }

  // Cancel subscription
  async cancelSubscription(userId: string, immediately: boolean = false) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription');
    }

    await this.stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately,
    );

    await this.db.userSubscription.update({
      where: { userId },
      data: {
        status: immediately ? 'CANCELLED' : 'ACTIVE',
        cancelledAt: new Date(),
        endDate: immediately ? new Date() : subscription.stripeCurrentPeriodEnd,
      },
    });

    return { success: true };
  }

  // Check if user can perform action
  async canUserPerformAction(userId: string, action: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    
    // No subscription = Free plan
    if (!subscription) {
      const freePlan = await this.db.plan.findUnique({ where: { slug: 'free' } });
      return this.checkPlanPermission(freePlan, action);
    }

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      return false;
    }

    return this.checkPlanPermission(subscription.plan, action);
  }

  private checkPlanPermission(plan: any, action: string): boolean {
    switch (action) {
      case 'analytics':
        return plan?.canUseAnalytics || false;
      case 'featured':
        return plan?.featuredListing || false;
      case 'boost':
        return plan?.canBoostListing || false;
      case 'custom_branding':
        return plan?.customBranding || false;
      default:
        return true;
    }
  }

  // Get user's listing count and limit
  async getUserListingLimit(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    const listingCount = await this.db.listing.count({
      where: { userId, deleted_at: null },
    });

    let maxListings = 2; // Free default
    if (subscription && subscription.status === 'ACTIVE') {
      maxListings = subscription.plan.maxListings;
    }

    return {
      current: listingCount,
      max: maxListings,
      canCreate: maxListings === 0 || listingCount < maxListings,
    };
  }
}
```

### Task 1.2: Seed Default Plans
**File:** `Backend/prisma/seed-plans.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  await prisma.plan.upsert({
    where: { slug: 'free' },
    create: {
      name: 'Free',
      slug: 'free',
      title: 'Get Started',
      description: 'Perfect for trying out the platform',
      monthlyPrice: '0',
      yearlyPrice: '0',
      features: [
        'List up to 2 businesses',
        'Basic listing photos (5 max)',
        'Standard support',
        'Community access',
        'Chat with buyers/sellers',
      ],
      maxListings: 2,
      maxPhotos: 5,
      maxVideoDuration: 0,
      canUseAnalytics: false,
      prioritySupport: false,
      featuredListing: false,
      canBoostListing: false,
      customBranding: false,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    update: {},
  });

  await prisma.plan.upsert({
    where: { slug: 'pro' },
    create: {
      name: 'Pro',
      slug: 'pro',
      title: 'Grow Your Sales',
      description: 'Everything you need to sell successfully',
      monthlyPrice: '45',
      yearlyPrice: '450',
      features: [
        'Unlimited business listings',
        'Unlimited photos & videos',
        'Advanced analytics dashboard',
        'Priority support (24h response)',
        'Featured listing badge',
        'Listing boost/promotion',
        'Early access to new features',
        'Custom branding options',
        'Export analytics data',
      ],
      maxListings: 0, // 0 = unlimited
      maxPhotos: 0, // 0 = unlimited
      maxVideoDuration: 60,
      canUseAnalytics: true,
      prioritySupport: true,
      featuredListing: true,
      canBoostListing: true,
      customBranding: true,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    update: {},
  });

  console.log('✅ Plans seeded');
}

seedPlans()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

**Command:**
```bash
npx ts-node prisma/seed-plans.ts
```

---

## Phase 3: Backend Controllers & Endpoints (Day 2-3)

### Task 3.1: Subscription Controller
**File:** `Backend/src/subscription/subscription.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { Roles } from 'common/decorator/roles.decorator';
import { Public } from 'common/decorator/public.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private stripeService: StripeService,
  ) {}

  @Public()
  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Roles(['USER', 'SELLER', 'ADMIN'])
  @Get('current')
  async getCurrentSubscription(@Req() req: any) {
    return this.subscriptionService.getCurrentSubscription(req.user.id);
  }

  @Roles(['USER', 'SELLER', 'ADMIN'])
  @Post('checkout')
  async createCheckout(
    @Req() req: any,
    @Body() body: {
      planSlug: string;
      billingCycle: 'MONTHLY' | 'YEARLY';
    },
  ) {
    const successUrl = `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing`;

    return this.subscriptionService.createCheckoutSession(
      req.user.id,
      body.planSlug,
      body.billingCycle,
      successUrl,
      cancelUrl,
    );
  }

  @Roles(['USER', 'SELLER', 'ADMIN'])
  @Post('cancel')
  async cancelSubscription(
    @Req() req: any,
    @Body() body: { immediately?: boolean },
  ) {
    return this.subscriptionService.cancelSubscription(
      req.user.id,
      body.immediately,
    );
  }

  @Roles(['USER', 'SELLER', 'ADMIN'])
  @Get('portal')
  async getPortalUrl(@Req() req: any, @Query('returnUrl') returnUrl: string) {
    const subscription = await this.subscriptionService.getCurrentSubscription(
      req.user.id,
    );
    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await this.stripeService.createPortalSession(
      subscription.stripeCustomerId,
      returnUrl || `${process.env.FRONTEND_URL}/settings`,
    );

    return { url: session.url };
  }

  @Roles(['USER', 'SELLER', 'ADMIN'])
  @Get('usage')
  async getUsage(@Req() req: any) {
    return this.subscriptionService.getUserListingLimit(req.user.id);
  }
}
```

### Task 3.2: Webhook Controller
**File:** `Backend/src/subscription/webhook.controller.ts`
```typescript
import {
  Controller,
  Post,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { Public } from 'common/decorator/public.decorator';

@Controller('subscription')
export class WebhookController {
  constructor(
    private subscriptionService: SubscriptionService,
    private stripeService: StripeService,
  ) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = this.stripeService.verifyWebhookSignature(
      req.rawBody,
      signature,
    );

    console.log('📨 Stripe webhook received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.subscriptionService.handleCheckoutComplete(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    await this.db.userSubscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase(),
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: any) {
    await this.db.userSubscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
      },
    });
  }

  private async handlePaymentSucceeded(invoice: any) {
    const subscriptionId = invoice.subscription;
    const subscription = await this.db.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await this.db.payment.create({
        data: {
          userId: subscription.userId,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: (invoice.amount_paid / 100).toString(),
          currency: invoice.currency,
          status: 'SUCCEEDED',
          planId: subscription.planId,
          subscriptionId: subscription.id,
          billingCycle: subscription.billingCycle,
          description: invoice.description,
        },
      });
    }
  }

  private async handlePaymentFailed(invoice: any) {
    const subscriptionId = invoice.subscription;
    const subscription = await this.db.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await this.db.payment.create({
        data: {
          userId: subscription.userId,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: (invoice.amount_due / 100).toString(),
          currency: invoice.currency,
          status: 'FAILED',
          planId: subscription.planId,
          subscriptionId: subscription.id,
          billingCycle: subscription.billingCycle,
          description: invoice.description,
        },
      });

      await this.db.userSubscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }
}
```

---

## Phase 4: Frontend Implementation (Day 3-5)

### Task 4.1: Create Pricing Page
**File:** `frontend/src/pages/Pricing.tsx`
- Two-column layout (Free vs Pro)
- Feature comparison
- Billing toggle (Monthly/Yearly)
- Checkout buttons

### Task 4.2: Checkout Flow
**Files:**
- `frontend/src/pages/CheckoutSuccess.tsx`
- `frontend/src/pages/CheckoutCancel.tsx`

### Task 4.3: Subscription Management
**Component:** `frontend/src/components/subscription/SubscriptionStatus.tsx`
- Show current plan
- Next billing date
- Cancel/Manage buttons

### Task 4.4: Feature Guards
**Hook:** `frontend/src/hooks/useSubscription.ts`
- Check plan limits
- Check feature access
- Trigger upgrade prompts

### Task 4.5: Upgrade Prompts
**Component:** `frontend/src/components/subscription/UpgradePrompt.tsx`
- Modal when limit reached
- Feature preview
- Direct checkout link

---

## Phase 5: Admin Features (Day 5-6)

### Admin Pages:
1. **Subscription Dashboard** - `/admin/subscriptions`
2. **Revenue Analytics** - `/admin/revenue`
3. **Payment History** - `/admin/payments`

---

## Phase 6: Testing & Deployment (Day 6-7)

### Testing Checklist:
- [ ] Subscribe to Pro (test mode)
- [ ] Cancel subscription
- [ ] Test webhook delivery
- [ ] Test feature restrictions
- [ ] Test upgrade prompts
- [ ] Test payment failure
- [ ] Test admin views

### Deployment:
1. Set up Stripe webhook endpoint on live server
2. Add production Stripe keys to server .env
3. Create products in Stripe live mode
4. Update Plan model with live Stripe IDs
5. Test end-to-end with real card

---

## Files to Create/Modify

### Backend (New Files):
```
Backend/src/subscription/
├── subscription.module.ts
├── subscription.controller.ts
├── subscription.service.ts
├── stripe.service.ts
├── webhook.controller.ts
├── guards/subscription.guard.ts
└── dto/create-checkout.dto.ts

Backend/src/config/
└── stripe.config.ts

Backend/prisma/
└── seed-plans.ts
```

### Backend (Modified Files):
```
Backend/prisma/schema.prisma
Backend/src/app.module.ts (import SubscriptionModule)
Backend/.env (add Stripe keys)
Backend/src/listing/listing.service.ts (add limit checks)
```

### Frontend (New Files):
```
frontend/src/pages/
├── Pricing.tsx
├── CheckoutSuccess.tsx
└── CheckoutCancel.tsx

frontend/src/components/subscription/
├── PricingCard.tsx
├── SubscriptionStatus.tsx
├── UpgradePrompt.tsx
├── UsageMeter.tsx
├── PaymentHistory.tsx
└── SubscriptionManagement.tsx

frontend/src/hooks/
└── useSubscription.ts

frontend/src/lib/
└── stripe.ts
```

### Frontend (Modified Files):
```
frontend/src/App.tsx (add new routes)
frontend/src/pages/Dashboard.tsx (add limit checks)
frontend/src/pages/MyListings.tsx (show usage meter)
frontend/src/pages/Profile.tsx (show plan status)
frontend/src/lib/api.ts (add subscription endpoints)
```

---

## Stripe Setup Steps (To Do Later)

1. **Create Products in Stripe Dashboard:**
   - Product: "BX Pro Plan"
   - Monthly Price: $45
   - Yearly Price: $450

2. **Get Price IDs:**
   - Copy monthly price ID → Update Plan model
   - Copy yearly price ID → Update Plan model

3. **Set up Webhook:**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/subscription/webhook`
   - Select events: checkout.session.completed, customer.subscription.*, invoice.*
   - Copy webhook secret → .env

4. **Update .env with real keys**

---

## Implementation Order

### Day 1:
1. ✅ Update Prisma schema
2. ✅ Run migrations
3. ✅ Seed plans
4. ✅ Install Stripe SDK

### Day 2:
1. ✅ Create Stripe service
2. ✅ Create Subscription service
3. ✅ Create controllers
4. ✅ Test checkout endpoint

### Day 3:
1. ✅ Create webhook handler
2. ✅ Test webhooks (Stripe CLI)
3. ✅ Create Pricing page
4. ✅ Integrate checkout button

### Day 4:
1. ✅ Success/Cancel pages
2. ✅ Subscription status component
3. ✅ Feature guards
4. ✅ Limit enforcement

### Day 5:
1. ✅ Upgrade prompts
2. ✅ Usage meters
3. ✅ Admin subscription views
4. ✅ Payment history

### Day 6-7:
1. ✅ Full testing
2. ✅ Email templates
3. ✅ Polish UI/UX
4. ✅ Production deployment

---

## Success Metrics

After implementation, track:
- Conversion rate (Free → Pro)
- Churn rate
- MRR growth
- Payment success rate
- Customer LTV

---

**Ready to start implementation!**
