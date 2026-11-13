# Home cottage artwork

Created with the built-in imagegen tool for the starting Home scene. The generated images are kept as original PNG assets with their transparency. Runtime canvas drawing uses the furniture atlas directly; no bitmap repainting was used.

- `room.png`: cutaway cottage with wood floor, windows, beams and rug.
- `furniture.png`: six separate generated furniture sprites.
- `furniture.json`: measured source rectangles and floor anchors for door, arcade, record cabinet, sofa, bookcase and plant.
- `cloud-sea.png`: opaque watercolor cloud sea, drawn to cover the whole viewport with gentle drift and parallax.
- `cloud-cradle.png`: transparent cloud cushion beneath the cottage floor. The room and its contents float together, with a still version for reduced motion.

## Cloud sea prompt

Use case: stylized-concept.
Asset type: opaque background illustration behind a floating cottage in a hand-drawn game.
Create a dreamy SEA OF CLOUDS viewed from above, as if a little magical house is flying high over the cloud tops. Landscape 3:2 image around 1536x1024, full bleed. The entire canvas is sky and clouds; NO horizon line, no ground, no ocean, no buildings, no islands, no text.
Art direction: a cozy illustrated sketchbook world, soft gouache/watercolor washes, warm ivory clouds, pale powder-blue sky gaps, gentle blue-gray and muted lavender shadows, delicate occasional warm graphite contours. Large softly rounded layered cloud banks around the lower and side edges, smaller distant cottony clouds toward the top, atmospheric depth. The broad central region should be visually calm, because an existing cottage will be drawn over it. Cloud shapes should continue naturally beyond all edges. A few very small distant V-shaped birds are allowed near the far edges, but keep the image peaceful and uncluttered.
Lighting: warm late-morning sun, airy and luminous, restrained soft contrast so black UI labels remain readable. Handmade and slightly imperfect, matching a warm wooden ink-and-gouache cottage; no photorealism, no glossy 3D, no hard white halos, no huge dark storm clouds. Opaque RGB background, no transparency.

## Cloud cradle prompt

Generated using `room.png` and `cloud-sea.png` as visual references, with transparent output enabled.

Use case: stylized-concept.
Asset type: one transparent PNG cloud cushion / floating foundation sprite for a cozy hand-drawn flying cottage.
The attached room and cloud-sea images are STYLE REFERENCES ONLY. Do not reproduce the house, furniture, background, walls, floor, or any scene. Generate ONE isolated wide horizontal cloud bank to sit just beneath the existing cottage, as if the cottage is carried on soft clouds.
Composition: a single cloud cushion about FOUR TIMES WIDER than it is tall, centered on a landscape 3:2 canvas, with generous completely transparent margins. Its broad upper edge is relatively flat and low so it can tuck behind the floor edge of the separate house. The lower silhouette is gently scalloped and irregular, with soft rounded cotton clouds, a few wispy curls drifting out at both ends. A few short honey-oak wooden floor joists may peek from the upper center, mostly swallowed by the clouds; no continuous deck and no new building.
Style: delicate hand-painted gouache / watercolor, warm ivory and cream light, pale powder-blue and muted lavender shaded undersides, faint imperfect graphite-brown accents. Harmonize with the two reference images. The main clouds have opaque creamy centers and soft translucent edges. Airy, luminous, quiet, whimsical, believable as a cloud support for a floating house. No cartoon faces, no balloons, no rope, no grass, no land, no rock, no water, no text, no symbols, no character.
CRITICAL: true transparent alpha everywhere around the single cloud sprite. No opaque sky, solid backdrop, scene, vignette, horizon or checkerboard. Do not draw any part of the reference room.

## Room prompt

Use case: stylized-concept.
Asset type: one transparent PNG background plate for the starting HOME interior in a small hand-drawn walking game.
Primary request: a cozy, personal cottage room shown as a roof-removed cutaway, with an open front, designed to place a separate walking character and furniture sprites on top.
Composition: landscape 3:2 canvas, approximately 1536x1024. The room is centered and fills almost the canvas with a small transparent margin. Straight-on orthographic RPG perspective seen from moderately above: a rectangular floor, horizontal back wall, short visible inner side walls, parallel vertical side edges. NOT a diamond/isometric room, no perspective vanishing point. The floor plane must be a wide open rectangle, spanning approximately x=8% to 92%, y=30% to 92% of the canvas. The back wall spans y=8% to 30%. The front wall and roof are removed so the entire playable floor is visible.
Room: warm ivory plaster walls, honey-oak floorboards with a few gently uneven ink lines; chunky exposed wooden beams and skirting; two modest square windows in the rear wall, one on the left quarter and one on the right quarter, showing muted blue-green foliage and linen curtains. Leave the middle third of the rear wall completely plain and empty for a separate front-door sprite. A small soft russet-and-cream woven rug lies at the center of the floor. All other floor areas are empty and walkable. No furniture, people, floor plants, stairs, or fireplaces in this background plate.
Style: affectionate loose black-ink doodle with slightly irregular confident contour lines and muted gouache/watercolor fills, like a personal sketchbook and a cozy indie game. Hand-drawn character, simple legible shapes, subtle grain within objects, no glossy 3D, no photorealism. Warm cream, honey wood, soft sage and dusty terracotta palette; restrained shading. All interior surfaces opaque. True transparent alpha outside the room, no paper rectangle behind the room, no shadow extending far past its edges.
No labels, no text, no interface, no characters. A single room background only.

## Room cutout refinement

Use case: background-extraction.
Edit the attached cottage-room image. Preserve the room itself, its exact composition, every beam, wall, window, floorboard, rug, and all colors. Remove ONLY the brown blurred vignette/background OUTSIDE the physical outer outline of the room. Every pixel outside the room's wooden outer silhouette must be fully transparent alpha, including the top margin, side margins and bottom margin. The room interior must remain opaque. No replacement backdrop, no paper-colored rectangle, no exterior drop shadow. Do not redraw or rearrange the room. Return a clean production transparent PNG cutout of exactly this room.

## Furniture prompt

Use case: stylized-concept.
Asset type: transparent PNG furniture sprite atlas for a cozy hand-drawn cottage game.
Create EXACTLY SIX standalone furniture cutouts in a precise 3-column by 2-row grid, one object per cell, generous fully transparent gutters. Landscape 3:2 canvas, approximately 1536x1024. Each object is centered horizontally in its cell with its bottom at 88% of the cell height. Full objects visible, no cropping, no overlaps, no grid lines, no text or labels.
View: orthographic RPG furniture seen from the front and slightly above, facing south toward the viewer. Vertical sides remain vertical. Match a straight-on cutaway cottage with honey wood floors and cream plaster walls.
Top row, left to right:
1. A tall arched honey-oak cottage front door in a substantial wooden frame, with a small round blue-green glazed window and brass handle. Include the threshold. Front view. This door is the game's gateway to The World.
2. A charming small sage-green vintage arcade cabinet with a charcoal screen containing tiny abstract pixel stars, two colored buttons and a joystick. No text, no logo.
3. A low walnut record cabinet with two short legs, a cream turntable and a black vinyl record on top, plus several colorful muted record sleeves in the cubby. An angled warm brass gramophone horn rises from the left side, recognizable at small scale.
Bottom row, left to right:
4. A compact two-seat sage-green linen sofa with rounded arms, a cream pillow, a tiny rust pillow, and four short wooden feet. Front view.
5. A tall narrow honey-wood bookcase with three shelves of varied books, a small ceramic mug, and a tiny trailing plant on top.
6. A potted leafy indoor fig tree, several large sage and olive leaves, thin brown trunk, simple terracotta pot.
Style: loose and charming hand-inked black/brown outlines, subtle uneven sketch contours, softly textured gouache fill. Muted warm ivory, sage green, walnut and honey wood, dusty terracotta. Warm and personal, not glossy, not 3D, not photorealistic. Keep each object self-contained and readable at around 100–160px in the game.
CRITICAL: all space surrounding and between the six objects is genuinely transparent alpha, not beige, white, gray or checkerboard. No floor, walls, room, scene, paper background or ambient vignette. No ground shadow. Objects themselves have opaque interiors.
