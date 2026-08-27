# Travorien Consumer Experience V2 — Demo Scenarios

All route metrics, vehicle and hotel inventory, prices, availability and Reality
signals are local `demo-mock` data. Editorial Drive content is `demo-content`.
Driving-policy facts are separately marked `VERIFIED`, linked to official sources and
dated. There is no live booking, payment, navigation, traffic, weather or permit filing.

## Journey A — inspiration first

1. Open `/` and read **Drive China Your Way** in the first viewport.
2. Scroll through the five Great Drives of China and open **Yunnan Hidden China**.
3. Review the full ten-day daily journey, driving profile, seasons, parking guidance,
   road-trip stays and three variants.
4. Note the explicit **Transaction-ready demo** label. Other Drive pages say
   **Content-ready · no inventory**.
5. Choose **Customize with AI**, keep Yunnan, and choose **Build this road trip**.
6. Review the validated Kunming → Dali → Shaxi → Lijiang → Shangri-La RoutePlan.
7. Open vehicle offers and inspect the distance, elevation and luggage reasons behind
   each ranking.
8. Confirm one local demo vehicle. Either choose road-fit stays or choose **No, I'll
   arrange my own stays**.
9. Enter My Drive. The no-hotel path still shows the same connected route, confirmed
   demo car, day preview and Road Updates.

## Journey B — AI first

1. Open `/plan?prompt=10%20days%20in%20October%2C%20scenic%2C%20no%20big%20cities`.
2. The Advisor compares Yunnan and Western Sichuan using their structured difficulty,
   altitude, service and daily-drive profiles.
3. Choose Yunnan to enter the same PlanningSession as Journey A.
4. Choose Western Sichuan to see its content-ready boundary rather than fabricated
   transaction controls.
5. Ask **I changed my mind—Hainan**. The Advisor clears the prior direction and shows
   the Hainan content-ready journey with no Yunnan inventory.

## Journey C — readiness first

1. Open `/driving-in-china`.
2. Enter nationality Germany, licence issued by Germany, valid licence Yes, arrival
   Beijing and stay length 14 days.
3. The result is **Action required: likely able to apply**, never “approved to drive.”
4. Review the passport, valid overseas licence, Chinese translation and photo checklist,
   plus the two current official Beijing links and check dates.
5. Choose **Choose an easy first road trip**. The same Advisor recommends Hainan first,
   then Guangxi and Yunnan with explicit capability differences.

## Seven Advisor checks

Ask each prompt using the visible chips on `/plan`:

1. Scenic, but not touristy.
2. Yunnan or Sichuan—which is easier?
3. Maximum two hours driving per day.
4. A road trip with kids.
5. Can foreigners drive in China?
6. Route and car, no hotels.
7. I changed my mind—Hainan.

Each response must show known Drive cards, preserve content-versus-transaction status,
and avoid invented availability or eligibility. Policy answers link into the
deterministic readiness checker.

## My Drive / Road Updates

From a ready Yunnan Trip, open Road Updates and load a demo road closure, weather,
hotel or arrival update. The surface describes affected journey items and comparable
safe options. No Trip change applies until the traveler confirms one. The existing
Runtime then regenerates the current canonical assessment and option before the Trip
Engine creates one immutable revision.

## Presenter checks

- Refreshing `/` begins with discovery, not a preloaded transaction funnel.
- All five Signature Drive cards use distinct authentic road imagery and visible credit.
- Only Yunnan can produce RoutePlan, offers, booking and Trip.
- Unknown policy combinations return Unknown or Needs Information.
- Vehicle reasons name actual journey inputs; hotel cards show parking/access facts.
- Skipping hotels still creates a complete structured Trip.
- My Drive says Preview Day for the future demo date and uses consumer Road Updates
  language rather than Runtime console terminology.
- Gemini failure keeps the current planning state and does not disable the deterministic
  Advisor, Product pages, readiness, commerce validation or Reality workflow.

## Historical regression coverage

The original nine-day Golden fixture and Sprint 3.5 Dali/Kunming planning tests remain
regression fixtures. They are not default Consumer V2 entry paths.
