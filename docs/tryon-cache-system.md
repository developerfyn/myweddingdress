# Try-On Cache System

## Overview

The try-on cache system prevents duplicate API calls to FASHN.AI by caching results based on unique combinations of user photos and dresses. Each FASHN API call costs **$0.075**, so caching is critical for cost control.

## How It Works

### Cache Key Strategy

The cache uses different keys depending on the type of garment:

| Garment Type | Cache Key | Why |
|--------------|-----------|-----|
| **Catalog Dress** | `user_id` + `person_hash` + `dress_id` | Catalog dresses have stable IDs (e.g., `vera-wang-romantic-1`) |
| **Custom Upload** | `user_id` + `person_hash` + `garment_hash` | User uploads don't have IDs, so we hash the image |

### Why Not Always Hash the Garment Image?

Hashing the garment image for catalog dresses is **unreliable** because:

1. The same dress image fetched twice may have slight differences (compression, timing, metadata)
2. Different quality settings could produce different base64 data
3. This causes **cache misses** even for identical dress + photo combinations

Using `dress_id` for catalog dresses provides **100% reliable cache hits**.

## Cache Flow

```
User tries on dress
        │
        ▼
┌───────────────────────────────────┐
│ 1. Hash person photo (SHA-256)    │
│ 2. Get dress_id (or hash garment) │
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ Check cache:                      │
│ - First: lookup by dress_id       │
│ - Fallback: lookup by garment_hash│
└───────────────────────────────────┘
        │
        ├──── CACHE HIT ────▶ Return cached result ($0 cost)
        │
        ▼
    CACHE MISS
        │
        ▼
┌───────────────────────────────────┐
│ Call FASHN API ($0.075)           │
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ Save result to cache              │
│ - Expires in 7 days               │
│ - Track access count              │
└───────────────────────────────────┘
        │
        ▼
    Return result
```

## Database Schema

### Table: `tryon_cache`

```sql
CREATE TABLE tryon_cache (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- Owner of this cache entry
  person_image_hash VARCHAR(64),       -- SHA-256 of person photo
  garment_image_hash VARCHAR(64),      -- SHA-256 of garment (for custom uploads)
  dress_id VARCHAR(100),               -- Catalog dress ID (for catalog dresses)
  result_url TEXT,                     -- URL of generated result
  result_base64 TEXT,                  -- Base64 of result (for instant return)
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,              -- 7 days from creation
  access_count INT,                    -- How many times accessed
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(user_id, person_image_hash, garment_image_hash)
);
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `get_cached_tryon_v2()` | Lookup cache (prefers dress_id, falls back to garment_hash) |
| `save_tryon_cache_v2()` | Save result to cache |
| `cleanup_expired_cache()` | Delete expired entries (run periodically) |

## TypeScript API

### Check Cache

```typescript
import { checkTryonCache } from '@/lib/tryon-cache';

const cacheResult = await checkTryonCache(
  supabase,
  userId,
  personImageBase64,
  dressId,        // e.g., "vera-wang-romantic-1" (preferred)
  garmentImage    // fallback for custom uploads
);

if (cacheResult?.found) {
  // Return cached result - no API call needed!
  return cacheResult.result_base64;
}
```

### Save to Cache

```typescript
import { saveTryonCache } from '@/lib/tryon-cache';

const result = await saveTryonCache(
  supabase,
  userId,
  personImageBase64,
  dressId,           // catalog dress ID
  garmentImageBase64,
  resultUrl,
  resultBase64
);

if (result.success) {
  console.log(`Cached with ID: ${result.cache_id}`);
}
```

### Get Cache Stats

```typescript
import { getUserCacheStats } from '@/lib/tryon-cache';

const stats = await getUserCacheStats(supabase, userId);
// { total: 15, hits: 42, savedCost: "$3.15" }
```

## Cost Savings

### Example Scenario

User tries on 10 different dresses with the same photo:
- **Without cache**: 10 API calls × $0.075 = **$0.75**
- **With cache**: 10 API calls × $0.075 = **$0.75**

User then re-tries 5 of those dresses again:
- **Without cache**: 5 more API calls × $0.075 = **$0.375**
- **With cache**: 5 cache hits × $0 = **$0** (saved $0.375)

### Projected Savings

| Scenario | Without Cache | With Cache (40% hit rate) |
|----------|---------------|---------------------------|
| 1,000 users × 20 try-ons each | $1,500 | $900 |
| **Monthly savings** | - | **$600** |

## Cache Expiration

- Entries expire **7 days** after creation
- Expiration is extended on each access (refresh TTL)
- Expired entries are cleaned up by `cleanup_expired_cache()`

## Logs

The API route logs cache activity:

```
[tryon-xxx] 💾 Step 1.8: Checking cache...
[tryon-xxx]    - Key: dress_id="vera-wang-romantic-1"
[tryon-xxx] ✅ CACHE HIT! Returning cached result
[tryon-xxx] ⏱️  Cache lookup: 45ms
[tryon-xxx] 💰 Cost: $0 (cached - saved $0.075)
```

Or on cache miss:

```
[tryon-xxx] 💾 Step 1.8: Checking cache...
[tryon-xxx]    - Key: dress_id="vera-wang-romantic-1"
[tryon-xxx] ℹ️ Step 1.8: Cache miss, proceeding with API call
...
[tryon-xxx] 💾 Saving result to cache...
[tryon-xxx]    - Key: dress_id="vera-wang-romantic-1"
[tryon-xxx] ✅ Result cached for 7 days (id: abc-123)
```

## Files

| File | Purpose |
|------|---------|
| `/lib/tryon-cache.ts` | TypeScript cache utilities |
| `/supabase/migrations/20260204000005_create_tryon_cache.sql` | Initial cache table |
| `/supabase/migrations/20260204000007_improve_tryon_cache.sql` | Improved v2 functions with dress_id support |
| `/app/api/tryon/route.ts` | API route with cache integration |

---

*Last updated: 2026-02-04*
