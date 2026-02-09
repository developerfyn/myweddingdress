# Credit Protection & Abuse Prevention Plan

## Executive Summary

This document outlines a comprehensive strategy to protect API credits and prevent abuse in the MyWeddingDress virtual try-on application.

---

## Current State: Critical Vulnerabilities

### Your API is Wide Open

```
/api/tryon        → NO AUTH, NO RATE LIMIT, NO USAGE TRACKING
/api/generate-3d  → NO AUTH, NO RATE LIMIT, NO USAGE TRACKING
```

**Anyone with your URL can:**
1. Call `/api/tryon` directly via curl/Postman - bypassing all frontend checks
2. Drain your FASHN credits ($0.075 per call)
3. Drain your Replicate credits ($0.0014/sec, ~$0.05-0.10 per 3D model)
4. There's no record of who used what

### Current Cost Per Operation

| Operation | Provider | Cost |
|-----------|----------|------|
| Virtual Try-On | FASHN.AI | ~$0.075 per request |
| 3D Generation | Replicate (TRELLIS) | ~$0.0014/sec (~$0.05-0.10 per model) |

---

## Recommended Protection Layers

### 1. Server-Side Authentication (CRITICAL - Day 1) - fixed on 4 feb

**Problem:** API routes have zero authentication - anyone can call them directly.

**Solution:** Verify user authentication on every API request.

```typescript
// In /api/tryon/route.ts
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Continue with try-on...
}
```

**Files to modify:**
- `/app/api/tryon/route.ts`
- `/app/api/generate-3d/route.ts`

---

### 2. Usage Tracking Table (CRITICAL - Day 1) -fixed on 4 feb

**Problem:** No visibility into who is using credits and how much.

**Solution:** Create a Supabase table to track all API usage.

```sql
-- Create usage_logs table
CREATE TABLE usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action VARCHAR(50) NOT NULL,  -- 'tryon', '3d_generation'
  credits_used DECIMAL(10,4) NOT NULL,
  dress_id VARCHAR(100),
  photo_index INT,
  request_id VARCHAR(100),
  status VARCHAR(20),  -- 'success', 'failed', 'pending'
  error_message TEXT,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_usage_user_date ON usage_logs(user_id, created_at DESC);

-- Index for analytics
CREATE INDEX idx_usage_action_date ON usage_logs(action, created_at DESC);

-- RLS Policy: Users can only see their own usage
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert" ON usage_logs
  FOR INSERT WITH CHECK (true);
```

**Usage in API:**
```typescript
// Log usage after successful API call
await supabase.from('usage_logs').insert({
  user_id: user.id,
  action: 'tryon',
  credits_used: 1,
  dress_id: dressId,
  request_id: requestId,
  status: 'success',
  processing_time_ms: totalTime,
});
```

---

### 3. Credit/Quota System (HIGH - Week 1) - fixed 4 feb


**Problem:** No limits on how many API calls a user can make.

**Solution:** Implement a credit system tied to subscription tiers.

#### Database Schema Changes

```sql
-- Add credit columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN monthly_credits INT DEFAULT 5;
ALTER TABLE subscriptions ADD COLUMN credits_used INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN credits_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add 3D generation credits separately (more expensive)
ALTER TABLE subscriptions ADD COLUMN monthly_3d_credits INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN credits_3d_used INT DEFAULT 0;

-- Function to reset credits monthly
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    credits_used = 0,
    credits_3d_used = 0,
    credits_reset_at = NOW()
  WHERE credits_reset_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Scheduled job (run via Supabase cron or external service)
-- SELECT cron.schedule('reset-credits', '0 0 1 * *', 'SELECT reset_monthly_credits()');
```

#### Current Pricing Plans

| Plan | Price | Trial | Database Value |
|------|-------|-------|----------------|
| Free | $0 | - | `'free'` |
| Quarterly (PRO) | $39.99 | None | `'quarterly'` |

**Features advertised for PRO (quarterly) plan:**
- Access 500+ designer dresses
- Unlimited try-ons
- Early access to new styles

**Database schema (`Subscription` type):**
```typescript
plan: 'free' | 'quarterly'
```

#### Proposed Credit Tier Structure

| Plan | Monthly Try-Ons | 3D Generations | Price | Notes |
|------|-----------------|----------------|-------|-------|
| Free | 5 | 0 | $0 | Limited dress access (~33% of catalog) |
| Quarterly (PRO) | 150 | 30 | $39.99/quarter (~$13.33/month) | Full dress access (100%) |

*Note: "Unlimited" in marketing should map to a high cap (e.g., 150/month) to prevent abuse while feeling unlimited to normal users*

#### Alternative: Usage-Based Approach

If you want true "unlimited" feel for PRO users:

| Plan | Try-On Behavior | 3D Generations |
|------|-----------------|----------------|
| Free | 5 total (one-time) | 0 |
| Quarterly (PRO) | Unlimited* | 50/quarter |

*"Unlimited" = 50/day rate limit to prevent abuse (normal user won't hit this)*

#### Server-Side Credit Check

```typescript
// Check credits before expensive operation
async function checkAndDecrementCredits(
  supabase: SupabaseClient,
  userId: string,
  action: 'tryon' | '3d_generation'
): Promise<{ allowed: boolean; remaining: number; error?: string }> {

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !sub) {
    return { allowed: false, remaining: 0, error: 'No subscription found' };
  }

  // Check if credits need reset
  const resetDate = new Date(sub.credits_reset_at);
  const now = new Date();
  const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30) {
    // Reset credits
    await supabase
      .from('subscriptions')
      .update({
        credits_used: 0,
        credits_3d_used: 0,
        credits_reset_at: now.toISOString()
      })
      .eq('user_id', userId);
    sub.credits_used = 0;
    sub.credits_3d_used = 0;
  }

  const creditsField = action === 'tryon' ? 'credits_used' : 'credits_3d_used';
  const maxField = action === 'tryon' ? 'monthly_credits' : 'monthly_3d_credits';

  if (sub[creditsField] >= sub[maxField]) {
    return {
      allowed: false,
      remaining: 0,
      error: 'Monthly limit reached. Please upgrade your plan.'
    };
  }

  // Decrement BEFORE calling external API (optimistic)
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ [creditsField]: sub[creditsField] + 1 })
    .eq('user_id', userId);

  if (updateError) {
    return { allowed: false, remaining: 0, error: 'Failed to update credits' };
  }

  return {
    allowed: true,
    remaining: sub[maxField] - sub[creditsField] - 1
  };
}
```

---

### 4. Rate Limiting (HIGH - Week 1) - fixed on 4 feb

**Problem:** Users can spam requests, even within their credit limits.

**Solution:** Implement per-user rate limiting.

#### Simple In-Memory Rate Limiter (MVP)

```typescript
// /lib/rate-limiter.ts

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  userId: string,
  action: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateLimits.get(key);

  // Clean up old entries periodically
  if (rateLimits.size > 10000) {
    for (const [k, v] of rateLimits.entries()) {
      if (now > v.resetAt) rateLimits.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  entry.count++;
  return { allowed: true };
}
```

#### Production Rate Limiter (Upstash Redis)

```typescript
// /lib/rate-limiter-redis.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const tryonRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
  prefix: 'ratelimit:tryon',
});

export const generate3DRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 requests per minute
  analytics: true,
  prefix: 'ratelimit:3d',
});
```

#### Recommended Rate Limits

| Operation | Limit | Window | Reason |
|-----------|-------|--------|--------|
| Try-on | 10 | 1 minute | Prevent rapid-fire requests |
| 3D Generation | 3 | 1 minute | More expensive operation |
| Global (all users) | 100 | 1 minute | Circuit breaker |

---

### 5. PRO Dress Enforcement Server-Side (MEDIUM) -- fixed 4 feb

**Problem:** `isPro` dress check only happens on frontend - can be bypassed.

**Solution:** Validate dress access on the server.

```typescript
// /lib/dress-validation.ts
import { dressCategories } from '@/lib/dress-data';

export function validateDressAccess(
  dressId: string,
  userPlan: string
): { allowed: boolean; error?: string } {
  const allDresses = dressCategories.flatMap(cat => cat.dresses);
  const dress = allDresses.find(d => d.id === dressId);

  if (!dress) {
    return { allowed: false, error: 'Dress not found' };
  }

  if (dress.isPro && userPlan === 'free') {
    return {
      allowed: false,
      error: 'This dress requires a PRO subscription'
    };
  }

  return { allowed: true };
}
```

**Usage in API:**
```typescript
// Get dress ID from request headers or body
const dressId = request.headers.get('x-dress-id');

if (dressId) {
  const dressAccess = validateDressAccess(dressId, subscription.plan);
  if (!dressAccess.allowed) {
    return NextResponse.json({ error: dressAccess.error }, { status: 403 });
  }
}
```

---

### 6. Request Signing/CSRF Protection (MEDIUM) - fixed 4 feb 
**Problem:** API can be called from any origin, enabling CSRF attacks.

**Solution:** Implement request signing.

```typescript
// /lib/request-signing.ts
import crypto from 'crypto';

const SECRET = process.env.REQUEST_SIGNING_SECRET!;

export function generateRequestToken(): { token: string; timestamp: number } {
  const timestamp = Date.now();
  const token = crypto.randomUUID();
  return { token, timestamp };
}

export function signRequest(token: string, timestamp: number, userId: string): string {
  const data = `${token}:${timestamp}:${userId}`;
  return crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('hex');
}

export function verifyRequest(
  token: string,
  timestamp: number,
  userId: string,
  signature: string,
  maxAgeMs: number = 300000 // 5 minutes
): boolean {
  // Check timestamp freshness
  if (Date.now() - timestamp > maxAgeMs) {
    return false;
  }

  const expectedSignature = signRequest(token, timestamp, userId);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### 7. Image Validation & Size Limits (MEDIUM) - ✅ ENHANCED 4 Feb

**Problem:** No validation of input images - could receive malicious or oversized data.

**Solution:** Validate images before processing.

```typescript
// /lib/image-validation.ts

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_DIMENSION = 256;
const MAX_DIMENSION = 4096;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  format?: string;
}

export function validateBase64Image(base64: string): ImageValidationResult {
  // Check format
  const formatMatch = base64.match(/^data:(image\/\w+);base64,/);
  if (!formatMatch) {
    return { valid: false, error: 'Invalid image format' };
  }

  const format = formatMatch[1];
  if (!VALID_FORMATS.includes(format)) {
    return {
      valid: false,
      error: `Unsupported format: ${format}. Use JPEG, PNG, or WebP.`
    };
  }

  // Check size
  const base64Data = base64.split(',')[1];
  const sizeInBytes = Buffer.from(base64Data, 'base64').length;

  if (sizeInBytes > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image too large: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB. Max 5MB.`
    };
  }

  if (sizeInBytes < 1000) {
    return { valid: false, error: 'Image too small or corrupted' };
  }

  return { valid: true, size: sizeInBytes, format };
}

// Optional: Check image dimensions (requires image processing library)
export async function validateImageDimensions(
  base64: string
): Promise<ImageValidationResult> {
  // This would require sharp or similar library
  // Implement if needed
  return { valid: true };
}
```

---

### 8. Server-Side Caching Layer (MEDIUM - Week 2) - ✅ COMPLETED 4 Feb

**Problem:** Same person + dress combination generates new API call every time.

**Solution:** Cache results in database.

#### Database Schema

```sql
CREATE TABLE tryon_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  person_image_hash VARCHAR(64) NOT NULL,
  garment_image_hash VARCHAR(64) NOT NULL,
  result_url TEXT NOT NULL,
  result_base64 TEXT, -- Optional: store base64 directly
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  access_count INT DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, person_image_hash, garment_image_hash)
);

-- Index for fast lookups
CREATE INDEX idx_tryon_cache_lookup ON tryon_cache(user_id, person_image_hash, garment_image_hash);

-- Index for cleanup
CREATE INDEX idx_tryon_cache_expires ON tryon_cache(expires_at);

-- RLS Policy
ALTER TABLE tryon_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own cache" ON tryon_cache
  FOR ALL USING (auth.uid() = user_id);
```

#### Cache Implementation

```typescript
// /lib/tryon-cache.ts
import crypto from 'crypto';

export function hashImage(base64: string): string {
  return crypto
    .createHash('sha256')
    .update(base64)
    .digest('hex');
}

export async function getCachedResult(
  supabase: SupabaseClient,
  userId: string,
  personImage: string,
  garmentImage: string
): Promise<string | null> {
  const personHash = hashImage(personImage);
  const garmentHash = hashImage(garmentImage);

  const { data, error } = await supabase
    .from('tryon_cache')
    .select('result_url, result_base64')
    .eq('user_id', userId)
    .eq('person_image_hash', personHash)
    .eq('garment_image_hash', garmentHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (data) {
    // Update access count
    await supabase
      .from('tryon_cache')
      .update({
        access_count: data.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('person_image_hash', personHash)
      .eq('garment_image_hash', garmentHash);

    return data.result_base64 || data.result_url;
  }

  return null;
}

export async function setCachedResult(
  supabase: SupabaseClient,
  userId: string,
  personImage: string,
  garmentImage: string,
  resultUrl: string,
  resultBase64?: string
): Promise<void> {
  const personHash = hashImage(personImage);
  const garmentHash = hashImage(garmentImage);

  await supabase
    .from('tryon_cache')
    .upsert({
      user_id: userId,
      person_image_hash: personHash,
      garment_image_hash: garmentHash,
      result_url: resultUrl,
      result_base64: resultBase64,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
}
```

---

### 9. Abuse Detection & Monitoring (MEDIUM - Week 2) - ✅ COMPLETED 4 Feb

**Problem:** No visibility into unusual usage patterns.

**Solution:** Implement monitoring and alerting.

#### Anomaly Detection

```typescript
// /lib/abuse-detection.ts

interface AbuseCheckResult {
  flagged: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}

export async function checkForAbuse(
  supabase: SupabaseClient,
  userId: string
): Promise<AbuseCheckResult> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

  // Check hourly usage
  const { count: hourlyCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (hourlyCount && hourlyCount > 50) {
    return {
      flagged: true,
      reason: `Excessive hourly usage: ${hourlyCount} requests`,
      severity: 'high'
    };
  }

  // Check daily usage
  const { count: dailyCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo);

  if (dailyCount && dailyCount > 200) {
    return {
      flagged: true,
      reason: `Excessive daily usage: ${dailyCount} requests`,
      severity: 'medium'
    };
  }

  // Check error rate
  const { count: errorCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'failed')
    .gte('created_at', oneHourAgo);

  if (errorCount && hourlyCount && errorCount / hourlyCount > 0.5) {
    return {
      flagged: true,
      reason: `High error rate: ${errorCount}/${hourlyCount} failed`,
      severity: 'low'
    };
  }

  return { flagged: false, severity: 'low' };
}
```

#### Admin Notification

```typescript
// /lib/admin-alerts.ts

export async function notifyAdmin(
  message: string,
  severity: 'low' | 'medium' | 'high',
  metadata?: Record<string, any>
): Promise<void> {
  // Option 1: Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[${severity.toUpperCase()}] ${message}`,
        attachments: metadata ? [{
          fields: Object.entries(metadata).map(([k, v]) => ({
            title: k,
            value: String(v),
            short: true
          }))
        }] : undefined
      })
    });
  }

  // Option 2: Email via Supabase Edge Function or external service
  // Option 3: Log to monitoring service (Sentry, LogRocket, etc.)

  console.warn(`[ADMIN ALERT] [${severity}] ${message}`, metadata);
}
```

---

### 10. Cost Alerting & Circuit Breaker (LOW - Ongoing)

**Problem:** No protection against runaway costs.

**Solution:** Implement cost tracking and circuit breaker.

#### Cost Tracking

```sql
-- Daily cost aggregation view
CREATE VIEW daily_costs AS
SELECT
  DATE(created_at) as date,
  action,
  COUNT(*) as request_count,
  SUM(credits_used) as total_credits,
  SUM(CASE
    WHEN action = 'tryon' THEN 0.075
    WHEN action = '3d_generation' THEN 0.075
    ELSE 0
  END) as estimated_cost_usd
FROM usage_logs
WHERE status = 'success'
GROUP BY DATE(created_at), action
ORDER BY date DESC;
```

#### Circuit Breaker

```typescript
// /lib/circuit-breaker.ts

interface CircuitBreakerState {
  isOpen: boolean;
  dailyCost: number;
  lastReset: Date;
}

const state: CircuitBreakerState = {
  isOpen: false,
  dailyCost: 0,
  lastReset: new Date(),
};

const DAILY_COST_LIMIT = parseFloat(process.env.DAILY_COST_LIMIT || '50'); // $50 default

export function recordCost(amount: number): void {
  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (state.lastReset.toDateString() !== today) {
    state.dailyCost = 0;
    state.lastReset = new Date();
    state.isOpen = false;
  }

  state.dailyCost += amount;

  // Check thresholds
  if (state.dailyCost >= DAILY_COST_LIMIT) {
    state.isOpen = true;
    notifyAdmin(
      `Circuit breaker OPEN: Daily cost limit reached ($${state.dailyCost.toFixed(2)})`,
      'high'
    );
  } else if (state.dailyCost >= DAILY_COST_LIMIT * 0.8) {
    notifyAdmin(
      `Warning: 80% of daily cost limit reached ($${state.dailyCost.toFixed(2)})`,
      'medium'
    );
  }
}

export function isCircuitOpen(): boolean {
  return state.isOpen;
}

export function getCircuitState(): CircuitBreakerState {
  return { ...state };
}
```

---

## Implementation Priority Matrix

| # | Protection | Impact | Effort | Priority | Timeline |
|---|------------|--------|--------|----------|----------|
| 1 | Server-side auth | Critical | Low | **P0** | Day 1 |
| 2 | Usage logging | Critical | Low | **P0** | Day 1 |
| 3 | Credit limits | High | Medium | **P1** | Week 1 |
| 4 | Rate limiting | High | Low | **P1** | Week 1 |
| 5 | PRO dress enforcement | Medium | Low | **P1** | Week 1 |
| 6 | Image validation | Medium | Low | **P1** | Week 1 |
| 7 | Server-side caching | Medium | Medium | **P2** | Week 2 |
| 8 | Request signing | Medium | Medium | **P2** | Week 2 |
| 9 | Abuse detection | Medium | Medium | **P2** | Week 2 |
| 10 | Cost alerting | Low | Low | **P3** | Ongoing |

---

## Cost Projections

### Without Protection

If your app gets 1,000 users:
- Average 10 try-ons per user = 10,000 requests
- At $0.075/request = **$750/month** in FASHN costs alone
- One bad actor could generate 1,000 requests in an hour = **$75 burned**
- 3D generation abuse: 100 requests × $0.075 = **$7.50** per bad actor

### With Protection

| Scenario | Max API Cost/User |
|----------|-------------------|
| Free user (5 try-ons max) | $0.375/user max |
| Quarterly PRO (150 try-ons/month) | $11.25/user/month max |
| Cached results (est. 40% hit rate) | 40% savings |

### ROI Example (1,000 Users)

**Assumptions:**
- 700 free users (70%)
- 300 quarterly (PRO) subscribers (30%)

**API Costs (with proposed limits):**
| Segment | Users | Avg Try-ons/Quarter | Total Requests/Quarter | Cost @ $0.075 |
|---------|-------|---------------------|------------------------|---------------|
| Free | 700 | 3 | 2,100 | $157.50 |
| Quarterly | 300 | 100 | 30,000 | $2,250 |
| **Total** | 1,000 | - | 32,100 | **$2,407.50/quarter** |

With 40% cache hit rate: **$1,444.50/quarter** (~$481.50/month)

**Revenue (per quarter):**
- 300 quarterly × $39.99 = **$11,997/quarter**

**Quarterly margin: ~88%** ($11,997 - $1,444.50 = $10,552.50)

**Monthly equivalent:**
- Revenue: ~$4,000/month
- API Cost: ~$480/month
- **Net: ~$3,520/month**

### Break-Even Analysis

| Cost Item | Per Try-On |
|-----------|------------|
| FASHN API | $0.075 |
| Server/infra (est.) | $0.005 |
| **Total COGS** | $0.08 |

**Quarterly plan break-even:** $39.99 / $0.08 = **500 try-ons/quarter** (~167/month)

With proposed 150/month limit (450/quarter), you maintain healthy margins while "unlimited" marketing still feels true for users.

---

## Environment Variables Required

```bash
# Existing
FASHN_API_KEY=xxx
REPLICATE_API_TOKEN=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# New (for enhanced protection)
SUPABASE_SERVICE_ROLE_KEY=xxx          # For server-side operations
REQUEST_SIGNING_SECRET=xxx              # For request signing
UPSTASH_REDIS_URL=xxx                   # For rate limiting (optional)
UPSTASH_REDIS_TOKEN=xxx                 # For rate limiting (optional)
SLACK_WEBHOOK_URL=xxx                   # For admin alerts (optional)
DAILY_COST_LIMIT=50                     # Circuit breaker threshold
```

---

## Files to Create/Modify

### New Files
- `/lib/rate-limiter.ts` - Rate limiting logic
- `/lib/credit-system.ts` - Credit checking and decrementing
- `/lib/image-validation.ts` - Image validation
- `/lib/tryon-cache.ts` - Server-side caching
- `/lib/abuse-detection.ts` - Anomaly detection
- `/lib/admin-alerts.ts` - Admin notifications
- `/lib/circuit-breaker.ts` - Cost protection

### Modified Files
- `/app/api/tryon/route.ts` - Add all protections
- `/app/api/generate-3d/route.ts` - Add all protections
- `/lib/supabase-server.ts` - Enhanced server client

### Database Migrations
- `001_create_usage_logs.sql`
- `002_add_subscription_credits.sql`
- `003_create_tryon_cache.sql`

---

## Monitoring Dashboard Queries

### Daily Usage by User
```sql
SELECT
  u.email,
  COUNT(*) as requests,
  SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(ul.credits_used) as credits_used
FROM usage_logs ul
JOIN auth.users u ON ul.user_id = u.id
WHERE ul.created_at >= NOW() - INTERVAL '1 day'
GROUP BY u.email
ORDER BY requests DESC
LIMIT 20;
```

### Hourly Cost Trend
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  SUM(credits_used * 0.075) as estimated_cost
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour;
```

### Top Abusers (Last 7 Days)
```sql
SELECT
  u.email,
  s.plan,
  COUNT(*) as total_requests,
  SUM(ul.credits_used) as total_credits,
  MAX(ul.created_at) as last_request
FROM usage_logs ul
JOIN auth.users u ON ul.user_id = u.id
JOIN subscriptions s ON ul.user_id = s.user_id
WHERE ul.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.email, s.plan
HAVING COUNT(*) > 100
ORDER BY total_requests DESC;
```

### Helper Functions (Added 4 Feb)

```sql
-- Get user's monthly usage stats
SELECT * FROM get_user_monthly_usage('user-uuid-here', 'tryon');
SELECT * FROM get_user_monthly_usage('user-uuid-here', '3d_generation');
SELECT * FROM get_user_monthly_usage('user-uuid-here', NULL); -- All actions

-- Check if user has remaining credits
SELECT * FROM check_user_credits('user-uuid-here', 'tryon', 5); -- 5 = monthly limit

-- View daily usage summary
SELECT * FROM daily_usage_summary;

-- View user usage summary (current month)
SELECT * FROM user_usage_summary WHERE user_id = 'user-uuid-here';
```

### TypeScript Utility (`/lib/usage-tracking.ts`)

```typescript
import {
  logUsageStart,
  logUsageSuccess,
  logUsageFailure,
  getUserMonthlyUsage,
  checkUserCredits,
  getCreditLimit,
  CREDIT_LIMITS
} from '@/lib/usage-tracking';

// Check user credits before API call
const credits = await checkUserCredits(supabase, userId, 'tryon', CREDIT_LIMITS.free.tryon);
if (!credits?.has_credits) {
  return { error: 'Monthly limit reached' };
}

// Log usage
const { id: usageLogId } = await logUsageStart(supabase, {
  user_id: userId,
  action: 'tryon',
  request_id: requestId,
  dress_id: dressId,
});

// On success
await logUsageSuccess(supabase, usageLogId, processingTimeMs);

// On failure
await logUsageFailure(supabase, usageLogId, errorMessage, processingTimeMs);
```

---

## Next Steps

### 1. **Server-Side Authentication (Day 1)** - ✅ COMPLETED 4 Feb
   - [x] Add server-side authentication to `/api/tryon`
   - [x] Add server-side authentication to `/api/generate-3d`
   - [x] Create `usage_logs` table in Supabase
   - [x] Log all API requests

### 2. **Usage Tracking (Day 1)** - ✅ COMPLETED 4 Feb
   - [x] Fixed RLS policies for security
   - [x] Added helper functions (`get_user_monthly_usage`, `check_user_credits`)
   - [x] Added analytics views (`daily_usage_summary`, `user_usage_summary`)
   - [x] Created TypeScript utility (`/lib/usage-tracking.ts`)

### 3. **Credit/Quota System** - ✅ COMPLETED 4 Feb
   - [x] Add credit columns to `subscriptions` table
   - [x] Implement credit checking before API calls (`can_user_perform_action`)
   - [x] Frontend handles 429 errors with user-friendly messages

### 4. **Rate Limiting** - ✅ COMPLETED 4 Feb
   - [x] Created `/lib/rate-limiter.ts` (in-memory, upgradeable to Redis)
   - [x] Per-user rate limits: 10/min for try-on, 3/min for 3D
   - [x] Global rate limit: 100/min total (circuit breaker)
   - [x] Returns 429 with `Retry-After` header

### 5. **Image Validation** - ✅ ENHANCED 4 Feb
   - [x] Created `/lib/image-validation.ts`
   - [x] Validates format (JPEG, PNG, WebP only)
   - [x] Validates size (min 1KB, max 5MB)
   - [x] Validates dimensions (min 256x256, max 4096x4096)
   - [x] Magic bytes validation (ensures content matches declared format)
   - [x] Dimension parsing for PNG, JPEG, WebP headers
   - [x] Logs invalid image attempts as abuse (low severity)
   - [x] Returns 400 with specific error message

### 6. **PRO Dress Validation** - ✅ COMPLETED 4 Feb
   - [x] Created `/lib/dress-validation.ts`
   - [x] Server-side check for `isPro` dresses
   - [x] Returns 403 if free user tries PRO dress
   - [x] Includes `requiresUpgrade: true` in response

### 7. **Request Signing/CSRF Protection** - ✅ COMPLETED 4 Feb
   - [x] Created `/lib/request-signing.ts` (client-side)
   - [x] Created `/lib/request-verification.ts` (server-side)
   - [x] HMAC-SHA256 signature with timestamp
   - [x] 5-minute request expiry
   - [x] Backwards compatible (unsigned requests logged but allowed)
   - [x] Add `REQUEST_SIGNING_SECRET` to `.env` for production

### 8. **Server-Side Caching** - ✅ IMPROVED 4 Feb
   - [x] Created `tryon_cache` table in Supabase
   - [x] Created `get_cached_tryon_v2()` and `save_tryon_cache_v2()` PostgreSQL functions
   - [x] Created `/lib/tryon-cache.ts` TypeScript utility
   - [x] Integrated cache check in `/api/tryon` (checks before API call)
   - [x] Saves successful results to cache (7-day expiry)
   - [x] Returns `cached: true/false` in response
   - [x] **IMPROVED**: Uses `dress_id` for catalog dresses (100% reliable cache hits)
   - [x] **IMPROVED**: Falls back to garment hash for custom uploads
   - [x] **DOCUMENTED**: See `/docs/tryon-cache-system.md` for full details

### 9. **Abuse Detection** - ✅ COMPLETED 4 Feb
   - [x] Created `abuse_logs` table (tracks suspicious activity)
   - [x] Created `blocked_entities` table (user/IP blocking)
   - [x] Created PostgreSQL functions: `is_user_blocked()`, `is_ip_blocked()`, `log_abuse()`, `get_abuse_score()`, `check_burst_activity()`, `auto_block_abuser()`
   - [x] Created `/lib/abuse-detection.ts` TypeScript utility
   - [x] Integrated into `/api/tryon` and `/api/generate-3d`:
     - Checks if user/IP is blocked before processing
     - Logs rate limit violations (medium severity)
     - Logs invalid signatures (high severity)
     - Logs credit exhaustion attempts (low severity)
     - Auto-blocks users with abuse score >= 100

### 10. **Remaining Tasks**
   - [ ] Configure admin alerts (Slack/email)
   - [ ] Set up `SLACK_WEBHOOK_URL` in environment

### 11. **Ongoing**
   - [ ] Monitor usage patterns
   - [ ] Adjust rate limits based on data
   - [ ] Optimize cache hit rates
   - [ ] Review and update credit tiers
   - [ ] A/B test pricing

---

*Document created: 2026-02-04*
*Last updated: 2026-02-04 (Improved: Cache system now uses dress_id for reliable lookups)*
