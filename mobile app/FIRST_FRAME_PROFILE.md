# First Frame Profile

Captured with `Timeline.startSync()` / `Timeline.finishSync()` and `Timeline.now`.
Mode: profile
Device: RMX3511 (Android 13, profile build)

## Widget build times (first frame)

HomeScreen......................0 ms
MobileSearchBar.................0 ms
HeroBannerCarousel..............1 ms
CategoryNavSection..............1 ms
AppShell........................0 ms
TabSwipeShell...................0 ms
Banner paint....................0 ms
Provider rebuild................0 ms

## Async / post-frame events

Image decode....................43 ms
First network image completion..1789 ms
First provider completion.......966 ms

## Ranked (slowest widget builds)

1. HeroBannerCarousel — 1 ms
2. CategoryNavSection — 1 ms
3. AppShell — 0 ms
4. Provider rebuild — 0 ms
5. Banner paint — 0 ms
6. MobileSearchBar — 0 ms
7. HomeScreen — 0 ms
8. TabSwipeShell — 0 ms

## Notes

- Widget builds are measured during the first Flutter frame (`markFirstFrame` on first `addPostFrameCallback`). On cold start, hero/categories are still in loading/skeleton state — builds are cheap; network-bound work shows up under provider/image metrics.
- `First provider completion` (966 ms) was the first home `FutureProvider` to return (see `First provider:` line in logcat on next run).
- `First network image completion` (1789 ms) is wall time from `markAppStart` to first decoded `AppNetworkImage` frame.
- Re-run on device: `flutter run --profile` then read logcat between `===FIRST_FRAME_PROFILE_START===` / `===FIRST_FRAME_PROFILE_END===` (report auto-prints 5 s after first frame).
