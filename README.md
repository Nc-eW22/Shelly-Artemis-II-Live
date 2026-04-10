# ⚡ SPARK_LABS · Shelly Artemis II Mission Control

![Artemis II UI](Artemis_II_UI.png)

> Turn any Shelly Gen3 / Gen4 device into a live Artemis II mission-control dashboard.

🥀 *One red rose per crew member. One white rose for those we lost.*
✨ *One stargazer lily for everyone watching from Earth.*
*Tradition upheld at Houston since STS-26, 1988.*

---

## What it does

A single Shelly script polls three public NASA-relay endpoints and pipes live Artemis II telemetry into virtual components on your device — viewable from the Shelly app like any other sensor, with full history logging built in.

No extra hardware. No cloud middleware. No home server. Just a Shelly, Wi-Fi, and a script.

## Live telemetry

**9 virtual components**

- 🌍 Distance from Earth (km)
- ☄️ Velocity (km/h)
- 🎢 G-Force
- 🚀 Pitch (°)
- 🔄 Roll (°)
- 🔥 Active RCS Thrusters (live count, 0–14)
- 📋 Mission State (enum: Nominal / Stale / LOS / Error / Boot)
- 📊 **Mission Status** — combined readout: `🥀✨ MET 7d 21h 12m | Mode 85 | Canberra DSS43 | RTLT 1.58s`
- 🪟 **Solar Wings** — live angle of all 4 ESM solar arrays

## Hardware

Any Shelly Gen3 / Gen4 device with script support and virtual components. Wi-Fi internet access required. No physical wiring — the device doesn't control anything.

## Install

> ⚠️ **Important — use a clean Shelly**
>
> This project is designed to run on a **dedicated Shelly device with no existing virtual components or scripts**. The installer assumes it owns the VC ID space (`enum:200`, `number:200–205`, `text:200–201`, `group:200`) and runs a pad-clearance sweep before assembly.
>
> If the target device already has VCs or scripts from other projects:
> - **Back them up first** (copy any scripts you want to keep)
> - Either flip `WIPE = true` in the installer and accept that **all** existing VCs will be deleted, or
> - Edit the installer to use a different ID range that won't collide
>
> For the best experience and to match the screenshots and Shelly Smart Control layout shown in this README, run it on a factory-fresh or freshly-wiped Shelly. One Shelly, one mission. Keep it clean.

1. Open device web UI → **Scripts** → upload `Artemis_II_Installer.js`
2. Run it. Watch the HOUSTON console (T-minus countdown included)
3. Once HOUSTON signs off, follow the post-install checklist printed in the console:
   - Open Shelly Smart Control
   - Each number VC → edit → enable **event logs** → Statistics: **measurements**
   - Group → **Extract as virtual device** (Shelly Premium)
   - Upload mission patch image to the group
   - Verify `webIcon` on every component
4. Upload `Artemis_II_Live.js` and start it — telemetry begins

## Data sources

Public community relay of NASA AROW + JPL Horizons + DSN Now data:

- `https://artemis.cdnspace.ca/api/orbit` — distance, velocity, altitude, G-force
- `https://artemis.cdnspace.ca/api/arow` — attitude, mode, thrusters, solar arrays
- `https://artemis.cdnspace.ca/api/dsn` — active Deep Space Network dish + signal lag

Polled every 60 s. Not affiliated with NASA. Credit to the relay operators.

## Pro tip

Pair with Shelly Premium and Scenes to trigger smart-home events on live mission data. RGBW strips that change colour for orbital manoeuvres, engine burns, or a Mission State drop to LOS. Real spacecraft, real notifications.

## Built with

Shelly Gen3 / Gen4 mJS scripting.

## 🤝 Credits & Attribution

**Telemetry & Data**
- **NASA AROW** — Artemis Real-time Orbit Website, the official public telemetry feed
- **NASA JPL Horizons** — ephemeris computation service for Orion spacecraft (ID −1024)
- **NASA DSN Now** — Deep Space Network real-time ground station status
- **artemis.cdnspace.ca** — community-run JSON relay that aggregates all of the above into clean endpoints. Huge thanks to the relay operators for keeping it free, fast, and open.

**Mission imagery**
- Artemis II mission patch — NASA / Lockheed Martin (public domain)
- Dashboard icons — Shelly Smart Control built-in webIcon library

**Code foundations**
- **Shelly Academy** — the `Shelly.call('HTTP.GET', ...)`, `Virtual.getHandle()`, and `handle.setValue()` patterns used throughout this script all trace back to Academy material and the official Shelly script examples repository
- Shelly API documentation — RPC reference for `HTTP.GET`, `Virtual.*`, `Timer.*`

**Tradition**
- The **Shelton family of Texas** — for the roses on the Houston Mission Control console since STS-26 in 1988. One red rose per crew member, one white for those we lost.
- Every nerd watching the sky from down here 🌍

## 📝 Changelog

### v1.0.3 — April 2026
- Field-level guards across all three fetches (keeps last known values through API hiccups like Cloudflare 502s)
- Thruster counter fix — `for...in` iteration over `rcsThrusters.thrusters` object (was always reading 0)
- Slow 1-per-second T-minus countdown on boot
- Floral tribute header + `🥀✨` prefix in combined status line

### v1.0.2 — April 2026
- Initial public release — 9 VCs, combined status line, HOUSTON-voiced installer with wipe/retry sweep

---

## Built on the Foundations of Shelly Academy

**⚡ SPARK_LABS** — **S**helly **P**owered **A**utomation **R**eliable **K**ontrol

Technician, Installer & Shelly Academy Graduate

[github.com/Nc-eW22](https://github.com/Nc-eW22)

*Turning everyday Shelly devices into truly smart virtual devices and appliances.*

Godspeed, Artemis II. 🚀🥀✨
