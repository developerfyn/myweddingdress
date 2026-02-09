# Product Principles

## Core Priority: Identity Preservation

**Retaining facial features and body figures is our TOP priority for all AI-generated content.**

This applies to:
- Virtual try-on results
- 3D model generation
- Any future AI visualization features

### Implications

1. **Model Selection**: Choose AI models that prioritize identity preservation over artistic interpretation
2. **Quality over Speed**: Prefer slower, higher-fidelity models if they better preserve user likeness
3. **User Trust**: Users upload their real photos expecting to see THEMSELVES in the results
4. **No Generic Faces**: Avoid models that hallucinate or generalize facial features

### Current Status

| Feature | Model | Identity Preservation |
|---------|-------|----------------------|
| Try-On | FASHN API | Good - preserves face/body |
| 3D Generation | TRELLIS | Poor - genericizes faces |

### Action Items

- [ ] Research identity-preserving 3D human reconstruction models
- [ ] Evaluate alternatives to TRELLIS that maintain facial likeness
- [ ] Consider multi-view or video-based 3D approaches if needed

---

*Last updated: 2026-02-05*
