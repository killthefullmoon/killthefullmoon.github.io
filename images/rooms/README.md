# Collection room artwork

Generated with the built-in imagegen tool. Original PNGs and their alpha channels are preserved; no raster repainting or background replacement was used.

- [game-room.png](game-room.png): teal retro game room, pixel carpet, cartridge shelf and controller light.
- [music-room.png](music-room.png): walnut listening room with vinyl shelf, amber lamps and jazz prints.
- [album-player.png](album-player.png): one universal walnut and ivory record-player cabinet, reused for every album.
- [album-player.json](album-player.json): measured sprite bounds and foot anchor for the player.

The game and music worlds now use **continuous open galleries**. Native canvas flooring, woven rugs, plants and a central promenade separate genres without doors or walls between them. One generated Home door at the head of each promenade returns to Home. The older `game-room.png` and `music-room.png` cutaway plates are retained as source artwork but are no longer loaded by the game. No raster files were repainted for the open layout.

The generated album-player cabinet remains in use for every album, alongside its real sleeve. Game cabinets, the lounge sofa and plants reuse the generated Home furniture sprites. Every exhibit exists on the same floor; new content extends it automatically. Spatial queries cull rendering and collision work, and the shared cover cache is capped at 128 images. Original item details and Spotify embeds are retained.

The data model and maintenance guide are in [collection-rooms.json](../../data/collection-rooms.json) and [COLLECTION_ROOMS.md](../../data/COLLECTION_ROOMS.md).

The two room prompts used `../home/room.png` as a style/camera reference; the player prompt used `../home/furniture.png` as a style reference. All three requested transparent output.

## Game room prompt

Use case: stylized-concept.
Asset type: transparent PNG room background for a hand-drawn top-down exploration game, landscape 3:2, 1536x1024.
Input image: the attached cottage is a STYLE AND CAMERA reference only. Generate a NEW distinctive room: a cozy collector's RETRO VIDEO GAME ROOM.
Camera and geometry: roof removed, front wall removed, straight-on orthographic cutaway seen from moderately above. Wide horizontal rear wall occupying y=8% to 30% of canvas. Straight vertical left and right room edges at x=4% and 96%. Inside floor is a very broad EMPTY RECTANGLE from x=8% to 92%, y=34% to 94%; side walls have parallel vertical inner edges. NO diamond isometric perspective, NO vanishing point.
Rear wall art: muted midnight navy / petrol teal wall panels, warm charcoal wooden beams, a narrow shelf of colorful game cartridges and a tiny retro robot ornament at the upper left, a couple of abstract pixel-art posters, a long warm cream-and-coral neon tube in a simple game-controller silhouette centered on the back wall, small warm amber wall sconces. No readable words, letters, brands or logos. Back wall decorations must stay ABOVE y=30%.
Floor: softly textured dusty blue-green carpet with tiny sparse cream and rust pixel-square motifs, understated, very low contrast, entirely empty of objects. A narrow honey-wood border. No rugs or furniture on the floor, because separate game exhibits and character sprites will be placed over it. No doorway in the background; a separate return-door sprite will be added.
Art: confident imperfect dark ink outlines with soft gouache/watercolor fills, personal sketchbook and cozy indie game, handmade texture. Match the reference's warmth and contour weight but give this room its own teal/blue/coral identity. Gentle daylight and warm accent lights; bright enough to see and read objects. No glossy 3D or photorealism.
CRITICAL: a single isolated cutaway room with genuine transparent alpha OUTSIDE its physical silhouette. All wall and floor surfaces opaque. No surrounding scene, sky, ground, white rectangle, ambient vignette or external shadow. No people.

## Music room prompt

Use case: stylized-concept.
Asset type: transparent PNG room background for a hand-drawn top-down exploration game, landscape 3:2, 1536x1024.
Input image: the attached cottage is a STYLE AND CAMERA reference only. Generate a NEW room: a warm analog LISTENING ROOM / personal record library.
Camera and geometry: roof removed, front wall removed, straight-on orthographic cutaway viewed from moderately above. Horizontal rear wall occupying y=8% to 30% of canvas. Straight vertical left and right outer room edges at x=4% and 96%; the floor is a broad EMPTY RECTANGLE from x=8% to 92%, y=34% to 94%. Parallel vertical inner side-wall edges. No diamond/isometric perspective, no converging floor edges.
Rear wall: warm cream acoustic plaster above walnut wainscoting, vertical oak slat accents, a short shallow wall-mounted shelf of colorful vinyl spines at the upper left, two small abstract jazz-art prints in slim walnut frames, round amber lamps at both sides. A little burgundy textile panel provides one warm accent. All decorations stay ABOVE y=30%, flush against the rear wall. No words, musical notation, letters, logos or brands. No doorway: a separate return-door sprite will be added.
Floor: pale honey-oak boards, soft desaturated warm tan, very subtle grain and fine dark plank seams. Completely EMPTY, no floor rugs, no sofas, no record players, no speakers, no plants or freestanding furniture: interactive album-player sprites will be added on top later. Keep the floor calm and bright for dozens of album exhibits.
Art direction: intimate hand-inked gouache and watercolor, confident slightly uneven dark brown outlines, paperlike grain within surfaces, cozy indie game and personal sketchbook. Reference-like craftsmanship with walnut / cream / amber / burgundy identity, clearly different from a blue-green game room. Soft warm afternoon light, gentle shadows, no glossy 3D or photorealism.
CRITICAL: single isolated cutaway room, genuine transparent alpha outside the wood-and-wall silhouette. All floor and walls opaque. No external backdrop, sky, ground, paper rectangle, ambient vignette, or exterior shadow. No people.

## Universal album player prompt

Use case: stylized-concept.
Asset type: ONE isolated transparent PNG furniture sprite, a universal record-player cabinet for every album in a cozy illustrated walking game.
Input image: attached furniture sheet is STYLE REFERENCE ONLY. Draw ONE new original object, NOT another sheet and NOT the brass-horn gramophone.
Subject: a compact mid-century walnut listening cabinet on four short tapered wooden legs. On top, a warm ivory turntable with one black vinyl LP, a small terracotta center label, and a delicate silver tonearm resting beside the disc. Under the turntable, a cream amplifier face with two small brass knobs and a dark speaker grille; lower cubby contains a handful of colorful vinyl spines. Friendly rounded wooden corners and a small asymmetrical detail in the grain make it feel personal. NO horn, no lid standing open, no giant speakers, no text or logo.
Composition: portrait-oriented object centered in a square 1024x1024 canvas, generous transparent margin on all four sides; entire cabinet and all feet visible. Object occupies roughly x=20%..80%, y=12%..88%. Front-facing orthographic game view, seen slightly from above so the platter is a flat ellipse; vertical sides stay vertical, front face stays level. Match the reference furniture perspective. Readable when rendered 100–130px tall.
Medium: handmade dark-brown ink contours with slight irregularity, restrained gouache fills, subtle watercolor grain. Warm walnut brown, ivory controls, charcoal record, muted sage and terracotta sleeve spines. Soft highlights, no gloss, no photorealism, no 3D render.
CRITICAL: true transparent alpha everywhere outside the single cabinet silhouette; no floor, wall, scene, paper rectangle, gradient, vignette, checkerboard or ground shadow. Cabinet interior and wood are opaque. Do not draw album cover artwork; each album's real cover will be drawn beside this universal cabinet by the game.
