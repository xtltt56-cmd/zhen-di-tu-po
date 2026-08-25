# 视觉重制 V4 · ImageGen 完整提示词记录

生成方式：Codex 内置 ImageGen。透明素材使用 ImageGen 技能附带的官方 `remove_chroma_key.py` 进行色键移除、despill 与边缘检查。

## 俯视建筑图集

### 初始提示词

```text
Use case: stylized-concept
Asset type: production-ready 2D game building sprite atlas for a modern military urban battlefield
Primary request: Create one original 1024x1024 square sprite atlas divided into an invisible, exact 2x2 grid of four equal 512x512 cells. Place exactly one different modern urban building in each cell, using this fixed order: TOP LEFT = fortified military command post; TOP RIGHT = industrial warehouse hall; BOTTOM LEFT = concrete apartment block; BOTTOM RIGHT = damaged civilian house.
Scene/backdrop: the entire canvas and every gap around every building must be a perfectly flat, completely uniform solid #ff00ff chroma-key background. No grid lines or cell borders.
Subjects: Top-left command post: compact reinforced-concrete operations building with armored roof hatches, ventilation units, a small radio antenna base and subtle functional rooftop details, no insignia. Top-right industrial warehouse: long rectangular corrugated-metal industrial hall with weathered roof panels, vents and roof ridges. Bottom-left apartment block: dense rectangular mid-rise concrete apartment building with believable rooftop access structures, vents and worn urban materials. Bottom-right damaged house: small masonry residential building with a partially collapsed roof, exposed rafters and contained rubble, clearly damaged but still a readable single-building silhouette.
Style/medium: high-detail realistic game art, grounded modern military urban materials, crisp production sprite rendering, realistic concrete, corrugated steel, brick, tar roofing and restrained wear. Original designs only.
Composition/framing: STRICT orthographic 90-degree bird's-eye view looking straight down. Absolutely no isometric angle, no visible facades caused by perspective, no horizon, no camera tilt. Each building must be separately centered inside its own 512x512 cell, oriented identically with its long axes exactly horizontal/vertical, occupy roughly 65-75% of its cell, leave generous clean magenta padding on all four sides, and never touch or overlap another cell. Four clearly separated silhouettes.
Lighting/mood: identical neutral daylight material lighting across all four buildings, baked surface detail only. No cast shadows, no contact shadows, no ambient shadow on the background, no glow, no reflections outside the silhouettes.
Color palette: realistic charcoal gray, concrete gray, muted tan, brown brick, dull olive and subdued rust accents. Do not use magenta, hot pink, fuchsia, purple-pink or #ff00ff anywhere inside any building.
Constraints: exactly four buildings and no other objects; background must be one exact flat #ff00ff color with no variation; no ground patches, roads, terrain, grass, debris outside the damaged-house silhouette, people, vehicles, trees, fences, smoke, fire, clouds, text, numbers, symbols, flags, logos, insignia, trademarks, borders, watermark or signature. Crisp closed edges suitable for automatic chroma-key removal. Preserve equal 2x2 spacing and fixed cell order.
Avoid: isometric perspective, oblique view, visible horizon, side-view facades, uneven scaling, overlapping cells, cropped buildings, magenta fringe, colored background gradients, shadows, checkerboard transparency preview.
```

### 严格俯视修正

```text
Edit the immediately previous generated 2x2 building atlas. Change ONLY the camera/viewpoint geometry to a mathematically strict orthographic 90-degree bird's-eye view looking straight down for all four buildings. Eliminate every visible vertical facade, wall face, doorway face, window facade, horizon cue, isometric slant and perspective convergence; show roofs and directly overhead rooftop details only. Keep the exact same 1024x1024 square canvas, fixed 2x2 order (command post top-left, industrial warehouse top-right, apartment block bottom-left, damaged house bottom-right), one centered building per equal cell, identical orientation, generous gaps, approximate coverage, realistic materials, damage details contained within the damaged-house silhouette, crisp edges, and exactly four subjects. Preserve the perfectly flat uniform solid #ff00ff background everywhere outside the four silhouettes. No shadows, ground, gradients, texture, reflections, grid lines, text, symbols, logos, watermark, people, vehicles, plants, smoke, fire, or extra objects. Do not introduce magenta inside any subject. Production-ready top-down game sprites suitable for chroma-key removal.
```

## 步兵下肢八帧步行动画

### 初始提示词

```text
Use case: stylized-concept
Asset type: production game sprite sheet, infantry lower-body walk-cycle animation source
Primary request: Create one original 1024x1024 sprite sheet arranged as exactly 4 columns by 2 rows, containing exactly eight consecutive frames of one realistic modern military infantry walking cycle.
Scene/backdrop: perfectly flat, completely uniform solid #ff00ff chroma-key background across the entire canvas.
Subject: only the same soldier's body from the waistline downward in every frame; olive-drab military trousers with believable folds and dark charcoal combat boots. Show eight clearly sequential gait poses that loop smoothly: contact, down, passing, up, opposite contact, opposite down, opposite passing, opposite up.
Style/medium: clean high-detail realistic military game sprite, opaque cutout subject, consistent anatomy and material detail.
Composition/framing: strict 90-degree orthographic top-down view, looking straight down; exactly 4 equal columns and 2 equal rows; one pose centered identically within each cell; identical character scale, waist position, orientation, camera distance, and proportions in all eight cells; generous separation from cell edges. Read frames left-to-right on the top row, then left-to-right on the bottom row.
Lighting/mood: neutral even studio illumination on the clothing itself, identical in every frame.
Color palette: olive-drab green trousers, dark charcoal boots; do not use #ff00ff anywhere on the subject.
Constraints: exactly eight poses and no duplicates; lower body only from waist down; all legs and boots fully visible; same character and clothing in every cell; seamless looping locomotion; output must be a square 1024x1024 image.
Avoid: no upper torso, chest, shoulders, arms, hands, head, face, helmet, weapon, backpack, straps, accessories, ground, floor, cast shadow, contact shadow, ambient shadow on background, reflection, glow, smoke, dust, gradients, texture, lighting variation, grid lines, borders, separators, labels, text, numbers, watermark, logos. The #ff00ff background must remain one exact flat color from corner to corner.
```

### 视角修正一

```text
Edit the previously generated sprite sheet. Change only the camera/viewpoint so every one of the eight lower-body poses is seen from a strict 90-degree orthographic bird's-eye view, looking vertically straight down at the top surfaces of the waistband, thighs, knees, trouser legs, and combat boots. Strong top-down foreshortening is required: each pair of boots must visually sit below/around the projected waist area as seen from directly overhead, never as a standing frontal view. Preserve exactly the same 1024x1024 canvas, exactly 4 columns by 2 rows, exactly eight sequential walking poses, the same olive-drab trousers and dark boots, same character identity, same centered placement and scale per cell, and the same completely flat uniform solid #ff00ff background. Keep only waist-down anatomy. Do not add upper body, weapons, objects, grid lines, text, shadows, gradients, ground, or background variation. The only intended change is correcting all eight frames from frontal view to true vertical top-down orthographic view.
```

### 最终视角收紧

```text
Refine only the viewpoint of this existing 4x2 eight-frame sprite sheet. Move the camera to the exact zenith: a strict 90-degree overhead orthographic plan view, optical axis perfectly parallel to gravity, as if a camera is mounted directly above the soldier and points straight down. Eliminate the remaining frontal/elevated perspective. The front vertical face of the trousers, fly, and long front surfaces must not dominate or read as a front view; instead show primarily the top-facing surfaces of the waist rim, thighs, knees, lower legs, and boot uppers with strong natural overhead foreshortening. Keep every other invariant unchanged: exactly eight sequential lower-body walking poses in exactly four columns and two rows, same olive-drab trousers, same dark combat boots, same character, identical per-cell center and scale, no body above the waist, completely uniform flat #ff00ff background, no shadows, no grid, no text, no weapons, no objects, no ground, no gradients.
```

## 丧尸四帧步行动画

### 初始提示词

```text
Use case: stylized-concept
Asset type: production-ready top-down 2D game sprite animation sheet
Input image: Image 1 is a style and character-archetype reference only. Preserve its gritty hand-painted semi-realistic game-art finish and ordinary infected military-survivor feel, but create four new walking poses; do not reuse the exact pose or background.
Primary request: Create exactly one 1024x1024 square sprite sheet, conceptually divided into exactly four equal 512x512 cells arranged 2 columns by 2 rows, read in order top-left, top-right, bottom-left, bottom-right. Each cell contains the same single ordinary infected walker at one consecutive phase of a seamless four-frame walk loop.
Scene/backdrop: the entire canvas and all empty space must be one perfectly flat, completely uniform solid #00ffff chroma-key color for background removal. No visible cell lines, borders, gutters, guides, separators, panels, frames, ground, floor plane, scenery, texture, noise, lighting variation, gradient, reflection, or shadow in the background.
Subject: exactly the same adult ordinary infected in all four cells, with gray-green desaturated skin, torn dirty faded olive and beige clothing, battered boots, sparse dried blood, minor open wounds and decay. Bloody and unsettling horror, but no exposed internal organs, no dismemberment, and no extreme gore. The character design, head, clothing tears, wound placement, body proportions, colors, materials, lighting, and apparent size must be identical across all four frames.
Camera and orientation: strict 90-degree orthographic overhead view, looking straight down with zero perspective and zero three-quarter angle. In every cell the infected faces toward the top of the canvas. Keep the body fully visible, centered on the exact same cell-center anchor, at the same scale, with generous cyan padding. No part may cross into another cell or touch the outer canvas edge.
Animation poses: make the walk cycle visually clear through arms and legs while keeping torso and head stable. Top-left: left leg forward with right arm forward. Top-right: passing pose with feet close and limbs crossing naturally. Bottom-left: right leg forward with left arm forward. Bottom-right: opposite passing pose returning smoothly to the first frame. Natural shambling infected gait, readable silhouette, coherent weight shift, no pose duplication.
Style/medium: high-detail hand-painted semi-realistic strategy-game unit sprite, grungy realistic textures, crisp clean silhouette, strong small-size readability, consistent rendering across frames.
Lighting: identical soft neutral diffuse lighting in every cell; absolutely no cast shadow, contact shadow, ambient ground shadow, glow, or vignette.
Constraints: exactly four figures total, exactly one figure per cell, same character identity in every frame, no extra body parts, no props, no weapons, no cyan or cyan-like color anywhere on the subject, no text, no letters, no numbers, no watermark, no logo, no visible grid or panel boundaries.
```

### 手臂幅度与锚点修正

```text
Use case: precise-object-edit
Asset type: production-ready top-down 2D game sprite animation sheet
Input image: Image 1 is the edit target, the previously generated 2x2 infected walk-cycle sheet.
Primary request: Keep the exact same infected character identity, clothing, wound placement, colors, textures, rendering style, 2x2 layout, flat cyan background, camera angle, and overall appearance. Change only the four walking poses and their alignment so they form a smooth restrained shambling walk loop.
Pose correction: remove the exaggerated overhead raised-arm gestures from the top-left and bottom-right frames. In all four frames, keep both arms below shoulder height and relatively close to the body, swinging naturally in opposition to the legs. Top-left: left leg forward and right arm modestly forward. Top-right: first passing pose with feet close. Bottom-left: right leg forward and left arm modestly forward. Bottom-right: second passing pose that returns smoothly into frame one. All poses must be visibly distinct but differ only by believable limb motion and a very small natural torso weight shift.
Alignment correction: place the torso center on the exact same cell-center anchor in every 512x512 quadrant. Match the character's apparent body size, head size, shoulder width, total footprint, facing direction, and orientation across all four frames. The infected must face straight toward the top of the canvas in every frame with no rotation drift. Keep every silhouette fully inside its quadrant with generous padding.
Camera: preserve strict 90-degree orthographic overhead view, looking straight down, zero perspective and zero three-quarter angle.
Background invariant: preserve a perfectly flat, completely uniform solid #00ffff chroma-key background across the entire 1024x1024 canvas. No visible cell lines, borders, gutters, guides, separators, texture, noise, gradient, ground, floor plane, reflection, cast shadow, contact shadow, ambient shadow, glow, or vignette. No cyan or cyan-like color on the character.
Content invariants: exactly four figures total, exactly one same adult ordinary infected per cell, gray-green skin, torn dirty faded olive and beige clothing, battered boots, sparse dried blood and minor wounds, horror without exposed organs or extreme gore. No props, no weapons, no extra body parts, no text, no letters, no numbers, no watermark, no logo.
```
