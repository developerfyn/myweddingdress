# My Wedding Dress - Database Schema

## Version: 1.1
## Last Updated: 2026-02-03

---

## Tables

### 1. `profiles`
Stores user profile information, auto-created on signup.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References auth.users |
| email | text | User's email |
| full_name | text | Display name |
| avatar_url | text | Profile picture URL |
| created_at | timestamptz | Account creation date |
| updated_at | timestamptz | Last update date |

### 2. `subscriptions`
Tracks user subscription status.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Subscription ID |
| user_id | uuid (FK) | References auth.users |
| plan | text | 'free' or 'quarterly' |
| status | text | 'active', 'canceled', 'expired', 'trialing' |
| current_period_start | timestamptz | Subscription start |
| current_period_end | timestamptz | Subscription end |
| created_at | timestamptz | Record creation |
| updated_at | timestamptz | Last update |

---

## Row Level Security (RLS)

- **profiles**: Users can only view/update their own profile
- **subscriptions**: Users can only view their own subscription

---

## Triggers

### `on_auth_user_created`
Automatically creates a profile and free subscription when a new user signs up.

---

## Storage Buckets

### `user-photos`
Stores user-uploaded photos for virtual try-on.

| Setting | Value |
|---------|-------|
| Bucket Name | user-photos |
| Public | Yes |
| File Size Limit | 5MB (5242880 bytes) |
| Allowed MIME Types | image/jpeg, image/png, image/webp |

**File Path Structure:** `{user_id}/{timestamp}-{random}.{ext}`

**RLS Policies:**
- **Upload**: Authenticated users can upload to their own folder (`auth.uid()::text` prefix)
- **Delete**: Users can only delete their own files
- **Read**: Public access for all files (needed for try-on display)

**SQL to create:**
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-photos', 'user-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read access for photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-photos');
```

---

## Future Tables (Planned)

- `favorites` - User's saved dresses
- `try_ons` - Try-on history
- `usage` - Daily usage tracking for free tier limits

---

## Schema Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-03 | 1.0 | Initial schema: profiles, subscriptions |
| 2026-02-03 | 1.1 | Added user-photos storage bucket for photo uploads |
