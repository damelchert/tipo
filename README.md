# TIPÓ

Suite of generative visual tools for motion type, kinetic typography, AI stills, and dithering. The tools run in the browser; Fotograma can optionally use a private local bridge for the authenticated Higgsfield CLI.

## Tools

### Video Depth Map
Convert video into a temporally stabilized grayscale depth reference for Seedance. Depth Anything V2 Small runs locally with WebGPU FP16 when available and a WASM q8 fallback; export is silent H.264 MP4 via WebCodecs.

### Fotograma
Create cinematic, advertising, and music-video stills. A permanent tool rail also exposes the audited Higgsfield workflows: Multi Angle, Animation Styles, aspect-ratio Expand, and Remove BG (beta), plus a shortcut to Video Depth Map. Google AI Studio/Vertex remains responsible for visual direction and can also generate the final image. An optional Higgsfield provider exposes Nano Banana Pro/2, Seedream 4.5/5, and GPT Image 2 with the estimated CLI credit cost shown before generation. Create accepts scene briefs up to 12,000 characters and can launch 1–4 independent Higgsfield images per click. Reveal remains available while jobs run: repeated clicks append new batches to a visible queue, with four active jobs and up to 48 active/queued images. Progress cards appear immediately with locally estimated percentage and remaining time.

Fotograma stores the complete gallery as image blobs in this browser's IndexedDB and asks the browser for persistent-storage protection. It no longer hides older records after reload or automatically evicts them. This is local persistence, not cloud synchronization: clearing site data, using a private window, switching browser profiles/devices, or exhausting the browser's storage can still remove or prevent new saved images. Download important outputs separately.

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

The Higgsfield CLI must be installed on the Mac. JPEG/WebP normalization uses the local `ffmpeg-static` package when installed, otherwise `ffmpeg` must be available on `PATH`. Install the private bridge once as a macOS background service:

```bash
./support/macos/install-higgsfield-bridge.zsh
```

The LaunchAgent starts at login and restarts the bridge if it exits, so no terminal has to remain open. Fotograma reconnects on boot, focus, restored network and a periodic health check. If the CLI session expires, **Entrar** launches Higgsfield's official browser OAuth flow; the page never asks for or receives a password, code or token. On current Chrome versions, allow **Local network access** once when prompted. If it was denied, reopen the page permissions from the address-bar lock/settings icon and enable it.

The always-on service trusts only the official Tipó origin by default. To use the local development URL, reinstall it with that origin explicitly enabled:

```bash
TIPO_HIGGSFIELD_ORIGINS=http://localhost:8080 ./support/macos/install-higgsfield-bridge.zsh
```

Select **Higgsfield** inside Create or open a specialized tool in the left rail. Google is optional when Higgsfield is selected: when connected it can enrich the Director and analyze automatic references; without it, Create uses deterministic local direction and asks you to assign reference roles manually. The bridge accepts only curated models and operations, converts JPEG/WebP references to PNG before upload, opts into the browser's private-network preflight only for allowlisted origins, runs at most four image jobs concurrently, and never sends the Higgsfield session to the browser. Connection checks time out after 30 seconds, while image jobs may remain open for up to 23 minutes. The official `https://tipo-steel.vercel.app` origin is allowed out of the box.

Every specialized-tool upload accepts both files from the computer and images dragged directly from the Fotograma gallery.

For a different deployed Tipó origin, add that exact HTTPS origin to the LaunchAgent environment before loading the service, or use it while running the bridge manually:

```bash
TIPO_HIGGSFIELD_ORIGINS=https://your-tipo.example node higgsfield-bridge.mjs
```

Higgsfield CLI generations consume credits. The website's Unlimited mode does not apply to CLI jobs, and Fotograma never retries or falls back to a paid provider silently.

## License

All rights reserved.
