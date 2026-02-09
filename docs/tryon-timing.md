# Try-On Timing

## Summary
- **Total time**: ~20 seconds
- **FASHN API**: ~16s (80% of total)
- **Other steps**: ~4s (auth, validation, caching)

## Breakdown

| Step | Duration |
|------|----------|
| Auth & security checks | ~2s |
| FASHN API (quality mode) | ~16s |
| Fetch result image | ~1.5s |
| Cache save | ~0.5s |

## Notes
- Results are cached for 7 days
- Subsequent tries with same photo + dress are instant
- "Quality" mode is slower but produces better results
