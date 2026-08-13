# TIPÓ

Suite of generative visual tools for motion type, kinetic typography, and dithering. Runs 100% in the browser — no backend, no installation.

## Tools

### Video Depth Map
Convert video into a temporally stabilized grayscale depth reference for Seedance. Depth Anything V2 Small runs locally with WebGPU FP16 when available and a WASM q8 fallback; export is silent H.264 MP4 via WebCodecs.

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

Video Depth Map works best in current Chrome or Edge. Model weights are downloaded on first use; source media never leaves the browser. Depth Anything V2 Small is distributed under Apache-2.0.

## Run locally

```bash
npx http-server -p 8080
```

Open `http://localhost:8080`

## License

All rights reserved.
