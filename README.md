# TIPÓ

Suite of generative visual tools for motion type, kinetic typography, AI stills, and dithering. The tools run in the browser; Fotograma can optionally use a private local bridge for the authenticated Higgsfield CLI.

## Tools

### Video Depth Map
Convert video into a temporally stabilized grayscale depth reference for Seedance. Depth Anything V2 Small runs locally with WebGPU FP16 when available and a WASM q8 fallback; export is silent H.264 MP4 via WebCodecs.

### Fotograma
Create cinematic, advertising, and music-video stills. A permanent tool rail also exposes the audited Higgsfield workflows: Multi Angle, Animation Styles, aspect-ratio Expand, and Remove BG (beta), plus a shortcut to Video Depth Map. Google AI Studio/Vertex remains responsible for visual direction and can also generate the final image. An optional Higgsfield provider exposes Nano Banana Pro/2, Seedream 4.5/5, and GPT Image 2 with the estimated CLI credit cost shown before generation.

### Dithering
Transform images and videos into visual art using custom SVGs in place of pixels. 7-level shadow-to-highlight mapping with 60+ built-in shapes.

### Kinetic Type (23 modes)
Real-time animated/kinetic typography. Type text and watch it transform:

| Category | Modes |
|----------|-------|
| **3D** | Cylinder, Field, Stripes, Coil, Flag, Cascade, Ribbon, Morisawa |
| **2D** | Layers, Danger, String |
| **Composition** | Badge, Clutter, Construct, Duplicator |
| **Animation** | Snap, Flash, Pow, Crash, Crash Clock, Vessel, Shine, Boost |

Each mode has sliders, color pickers, and presets.

### Export
- PNG (screenshot)
- SVG (vector — dithering only)
- MP4 (video recording, 8 or 16 Mbps)

## Stack
- HTML/CSS/JS (no frameworks, no build tools)
- p5.js (WEBGL + 2D)
- WebCodecs + mp4-muxer for MP4 recording
- Transformers.js + Depth Anything V2 Small for local depth estimation
- Static site — deploy anywhere
- Optional Node.js localhost bridge for the Higgsfield CLI

Video Depth Map works best in current Chrome or Edge. Model weights are downloaded on first use; source media never leaves the browser. Depth Anything V2 Small is distributed under Apache-2.0.

## Run locally

```bash
npx http-server -p 8080
```

Open `http://localhost:8080`

### Optional Higgsfield provider

The Higgsfield CLI must already be installed and authenticated. JPEG/WebP normalization uses the local `ffmpeg-static` package when installed, otherwise `ffmpeg` must be available on `PATH`. Start the private bridge in a second terminal:

```bash
node higgsfield-bridge.mjs
```

In Fotograma, open the key/provider popover and test `http://127.0.0.1:4789`. Select **Higgsfield CLI** inside Create, or open one of the specialized tools in the left rail. Google stays connected for the Director and reference analysis, but is not required for the specialized Higgsfield tools. The bridge accepts only curated models and operations, converts JPEG/WebP references to PNG before upload, and never sends the Higgsfield session to the browser. The official `https://tipo-steel.vercel.app` origin is allowed out of the box.

For a deployed Tipó origin, explicitly allow that exact HTTPS origin when starting the bridge:

```bash
TIPO_HIGGSFIELD_ORIGINS=https://your-tipo.example node higgsfield-bridge.mjs
```

Higgsfield CLI generations consume credits. The website's Unlimited mode does not apply to CLI jobs, and Fotograma never retries or falls back to a paid provider silently.

## License

All rights reserved.
