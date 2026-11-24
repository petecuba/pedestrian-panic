# Pedestrian Panic

A reverse infinite runner where your goal is to get in everyone's way on a busy sidewalk — without getting pushed off the top of the screen!

## How to Play
- **Steer:** `←` / `→` (or `A` / `D`) on desktop, or tap **Enable Tilt Steering** on mobile (works over HTTPS on iOS Safari & Android).
- **Slow Down:** Hold `Space` or press & hold the screen (up to `1.0s`, `0.75s` cooldown) to brake, shove up to 4 stacked pedestrians back, and recover toward center. Watch out — 5+ stacked pedestrians will overpower your brake!
- **Scoring:** Block pedestrians directly or build multi-person chains (`Hero → Ped → Ped`) for bonus points.

## Local Playtest
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080/`.
