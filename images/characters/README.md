# Hui's walking character

Generated with the built-in imagegen tool, using the Home page self-portrait (`images/self.png`) as the identity and drawing-style reference. The reference was viewed on the homepage's light paper background.

- `hui-sprite.png`: original generated transparent PNG; 4 columns × 3 rows.
- `hui-sprite.json`: measured source rectangles and foot anchors; row order is front, right, back; column order is idle, walk A, walk B, blink. Left-facing poses mirror the right-facing row at render time.
- The game draws the atlas directly. The reference avatar and approved signatures are unchanged.

## Generation prompt

Use case: stylized-concept.
Asset type: transparent PNG character sprite sheet for Hui Shen's existing hand-drawn top-down walking game, used at about 78 pixels tall.
Reference image: the attached homepage self-portrait is the identity and drawing-style reference. Preserve its personality: shoulder-length slightly wavy hair with a clear middle/soft off-center part and sweeping fringe, oversized irregular rounded glasses, large expressive black pupils, small playful cat-like :3 mouth, rounded face, gentle quirky expression, casual long-sleeve top. This is one specific character, not a generic mascot.
Create ONE production sprite sheet: EXACTLY 4 equal-width columns and 3 equal-height rows, exactly 12 separate full-body character drawings. Prefer a square 1536 x 1536 canvas. All cells must have the same character scale and baseline, with the feet centered horizontally at 85 percent of each cell's height. Generous transparent gutters, no overlapping cells, all hair and feet fully visible. No drawn grid, labels, text or background.
Rows: top row faces the viewer (south); middle row is a clear right-facing side profile (east); bottom row is the back view (north), with no visible face.
Columns in every row: 1 = relaxed standing idle pose, eyes open; 2 = first walking stride, left foot forward and opposite arm forward; 3 = opposite walking stride, right foot forward and opposite arm forward; 4 = same standing idle pose as column 1 with eyes gently closed for a blink (back view simply repeats idle).
Drawing style: preserve the reference's spontaneous uneven black-ink doodle strokes, slightly asymmetric hand-drawn glasses, confident loose contours, subtly sketchy hair strands. Paper-cut illustration for an illustrated personal map, approximately 2.3 heads tall, distinct limbs and a readable silhouette. Hair has pale warm ivory fill with a few dark ink strands, like the unfilled outlined hair in the reference; NOT a solid black helmet. Face pale warm ivory, oversized dark charcoal sweater with a few loose light crease marks, simple straight dark trousers and tiny warm brown shoes. Small areas of soft muted shading only. No glossy rendering, no photorealism, no 3D, no smooth vector-perfect outlines, no extra accessories, no ground shadows.
Every character has opaque interior fills so that scenery cannot show through face, glasses interiors or body. The surrounding canvas and all gutters are genuinely fully transparent alpha. Keep identical identity, outfit, line weight and scale across all 12 cells. The two front walking views must retain the reference's cute glasses and little cat mouth.
