# NodeSet Connection Scenarios

This document explains how NodeSets can connect with each other and with other media nodes (image-set, video-set, text-set, media-set).

## Key Concepts

### 1. NodeSet Output Mode (`outputMode`)
Controls how a NodeSet sends data to downstream nodes:
- **`loop` (individual)**: Each media-set in the nodeList is treated as a separate component
- **`direct` (integrated)**: All media-sets are flattened into one combined set

### 2. Media Set Output Mode (`setOutputMode`)
Controls how image-set, video-set, text-set, and media-set nodes output data:
- **`individual`**: Each media item becomes a separate output
- **`integrated`**: All media items are combined into one unit

### 3. NodeSet Input Mode (`inputMode`)
Controls how a NodeSet processes its upstream inputs:
- **`sequence`**: Pairs inputs by index (a1+b1, a2+b2, a3+b3, ...)
- **`cross`**: Creates Cartesian product of all inputs (a1+b1, a1+b2, a2+b1, a2+b2, ...)
- **`append`**: Simply concatenates inputs as separate media-sets

## Connection Scenarios

### Scenario 1: Two NodeSets with Sequence Mode

**Setup:**
- NodeSet A: `[a1, a2]` with `outputMode='loop'` (individual)
- NodeSet B: `[b1, b2]` with `outputMode='loop'` (individual)
- NodeSet C: `inputMode='sequence'`

**Result:**
```
C.nodeList = [
  media-set([a1].append([b1])),  // First pair
  media-set([a2].append([b2]))   // Second pair
]
```

**Explanation:** In sequence mode with individual output, each media-set from A pairs with the corresponding media-set from B by index.

---

### Scenario 2: Two NodeSets with Cross Mode

**Setup:**
- NodeSet A: `[a1, a2]` with `outputMode='loop'` (individual)
- NodeSet B: `[b1, b2]` with `outputMode='loop'` (individual)
- NodeSet C: `inputMode='cross'`

**Result:**
```
C.nodeList = [
  media-set([a1].append([b1])),  // a1 × b1
  media-set([a1].append([b2])),  // a1 × b2
  media-set([a2].append([b1])),  // a2 × b1
  media-set([a2].append([b2]))   // a2 × b2
]
```

**Explanation:** Cross mode creates all possible combinations (Cartesian product) of media-sets from A and B.

---

### Scenario 3: NodeSet (integrated) + Image Set (individual) → Sequence

**Setup:**
- NodeSet A: `[a1, a2, a3]` with `outputMode='direct'` (integrated) - counts as 1 item
- Image Set B: `[b1, b2]` with `setOutputMode='individual'` - counts as 2 items
- NodeSet C: `inputMode='sequence'`

**Result:**
```
❌ VALIDATION ERROR: Sequence mode requires equal lengths
A has length 1 (integrated)
B has length 2 (individual)
```

**Fix:** Change B to `setOutputMode='integrated'` or A to `outputMode='loop'`

---

### Scenario 4: NodeSet (individual) + Image Set (individual) → Sequence

**Setup:**
- NodeSet A: `[a1, a2]` with `outputMode='loop'` (individual)
- Image Set B: `[b1, b2]` with `setOutputMode='individual'`
- NodeSet C: `inputMode='sequence'`

**Result:**
```
C.nodeList = [
  media-set([a1].append(b1)),  // First pair
  media-set([a2].append(b2))   // Second pair
]
```

**Explanation:** Each media-set from A pairs with each image from B.

---

### Scenario 5: NodeSet (individual) + Image Set (individual) → Cross

**Setup:**
- NodeSet A: `[a1, a2]` with `outputMode='loop'` (individual)
- Image Set B: `[b1, b2]` with `setOutputMode='individual'`
- NodeSet C: `inputMode='cross'`

**Result:**
```
C.nodeList = [
  media-set([a1].append(b1)),
  media-set([a1].append(b2)),
  media-set([a2].append(b1)),
  media-set([a2].append(b2))
]
```

---

### Scenario 6: MediaSet with Mixed Types (Special Rule)

**IMPORTANT:** This restriction **ONLY applies to MediaSet nodes** with **MIXED media types**. Image-set, video-set, and text-set have **NO restrictions** and can use individual or integrated mode freely.

**Setup:**
- MediaSet A: Has both images AND videos (mixed types)
- NodeSet C: `inputMode='sequence'` or `cross`

**Requirement:**
```
✅ MediaSet A MUST have setOutputMode='integrated'
❌ MediaSet A CANNOT have setOutputMode='individual'
```

**Reason:** When MediaSet contains **mixed** media types (e.g., images + videos + text), it must be treated as an integrated unit in cross/sequence modes to ensure type safety. Individual mode would split different media types, potentially causing type mismatches.

**What's NOT Restricted:**
- ✅ Image-set with individual mode → NodeSet (any mode) - **ALLOWED**
- ✅ Video-set with individual mode → NodeSet (any mode) - **ALLOWED**
- ✅ Text-set with individual mode → NodeSet (any mode) - **ALLOWED**
- ✅ MediaSet with ONLY images (single type) + individual mode → NodeSet - **ALLOWED**
- ❌ MediaSet with images + videos (mixed types) + individual mode → NodeSet (cross/sequence) - **BLOCKED**

---

### Scenario 7: Image Set (integrated) + Text Set (integrated) → Sequence

**Setup:**
- Image Set A: `[img1, img2, img3]` with `setOutputMode='integrated'` - counts as 1
- Text Set B: `[txt1, txt2]` with `setOutputMode='integrated'` - counts as 1
- NodeSet C: `inputMode='sequence'`

**Result:**
```
C.nodeList = [
  media-set([img1, img2, img3].append([txt1, txt2]))
]
```

**Explanation:** Both inputs are integrated, so they count as 1 item each, creating a single combined media-set.

---

### Scenario 8: Multiple Individual Frames → NodeSet

**Setup:**
- Image Frame 1: `img1`
- Image Frame 2: `img2`
- Text Frame 3: `txt1`
- NodeSet A: `inputMode='sequence'`

**Result:**
```
C.nodeList = [
  media-set([img1, img2, txt1])  // All frames combined
]
```

**Explanation:** Multiple individual frames are automatically combined into a single MediaSet.

---

## Special Behaviors

### 1. MediaSet Type Safety (ONLY for Mixed Types)
**IMPORTANT:** These restrictions **ONLY apply to MediaSet nodes** with **multiple media types** (e.g., images + videos, images + text + videos).

When a MediaSet node contains **mixed** media types, it **must** use `setOutputMode='integrated'` when connecting to a NodeSet with `inputMode='sequence'` or `cross`. This ensures type consistency across media-sets.

**Image-set, Video-set, and Text-set have NO restrictions** - they can always use individual or integrated mode freely.

### 2. NodeSet as Component
When NodeSet A connects to NodeSet B:
- If A has `outputMode='loop'`: Each media-set in A.nodeList is treated as a separate component
- If A has `outputMode='direct'`: All media-sets in A.nodeList are flattened and treated as ONE component

### 3. Validation Rules
- **Cross mode**: Requires at least 2 inputs
- **Sequence mode**: Requires all inputs to have equal length (considering integrated/individual modes)
- **MediaSet mixed types**: Must be integrated in cross/sequence modes

---

## Visual Summary

### Output Modes
```
NodeSet with outputMode='loop' (individual):
  [a1, a2, a3] → each treated separately → 3 components

NodeSet with outputMode='direct' (integrated):
  [a1, a2, a3] → all flattened together → 1 component
```

### Input Modes
```
Sequence Mode (parallel processing):
  A: [a1, a2, a3]
  B: [b1, b2, b3]
  →  [a1+b1, a2+b2, a3+b3]

Cross Mode (all combinations):
  A: [a1, a2]
  B: [b1, b2]
  →  [a1+b1, a1+b2, a2+b1, a2+b2]

Append Mode (concatenation):
  A: [a1, a2]
  B: [b1, b2]
  →  [a1, a2, b1, b2]
```

---

## Implementation Notes

The behavior is consistent across all media set types:
- **image-set**: Handles image collections
- **video-set**: Handles video collections
- **text-set**: Handles text collections
- **media-set**: Handles mixed media (unified format)

All follow the same `setOutputMode` logic and can connect to NodeSets in the same way.
