# Fulfillment Autopilot — PRD v1.0

**Client**: Fierce Health (Raleigh Williams, Chandler Woodward) | **Date**: 2026-04-16 | **Build Type**: New

---

## One-Line Summary

Eliminates Albert's manual tracking-number hunt across pharmacy portals — agent polls WellSync + Pharmacy Hub every few hours, pushes new tracking numbers into Shopify, updates the internal ops sheet, and flags orders stuck at any stage so none of Fierce Health's ~1,000 monthly orders fall through the cracks.

---

## Build Spec

_Share this section with the customer for approval before starting the build._

- Poll the pharmacy portals (WellSync/BoomRx + Pharmacy Hub) every few hours for new tracking numbers and carrier info (FedEx/UPS)
- Push new tracking numbers into the matching Shopify order, mark it fulfilled, and let Shopify's native notification email the customer
- Keep the existing "Orders To Send To Pharmacy" Google Sheet in sync so Albert's current visibility workflow is preserved
- Flag orders sitting at the pharmacy with no tracking after 2 business days so the team can nudge WellSync/Pharmacy Hub
- Flag patients whose intake form has been submitted but not approved by a nurse practitioner after X days so the team can escalate internally
- Ship a lightweight internal dashboard so Albert and Chandler can see what the agent did, what it's flagging, and what it's stuck on

---

## Company & Problem Context

**Company:** Fierce Health (fiercehealth.com) is a direct-to-consumer telehealth brand selling GLP-1 weight loss programs (Semaglutide, Tirzepatide, microdose variants) and longevity peptides (NAD+, Methylene Blue, Ivermectin). Shopify-first commerce, Tellescope as the EHR/CRM (handles intake, nurse approvals, and all patient comms), WellSync/BoomRx + The Pharmacy Hub as fulfillment partners, Recharge for subscriptions. ~50,000 customers, ~1,000 orders/month. Raleigh Williams is the founder; Chandler Woodward runs operations.

**Problem:** Fierce Health's orders move through four systems — Shopify (purchase) → Tellescope (intake + nurse approval) → WellSync or Pharmacy Hub (fulfillment) → Shopify again (tracking + customer notification). The last hop is fully manual. Albert, the customer-support lead, logs into each pharmacy portal several times a day, scans for orders with newly-generated tracking numbers, copy-pastes each tracking number into the matching Shopify order, picks the carrier, and clicks "Mark as fulfilled" — which triggers Shopify's native shipping email to the customer. He also keeps a Google Sheet ("New Orders To Send To Pharmacy", 6,700+ rows across multiple tabs) that mirrors pharmacy state so the team has visibility outside the portals. Raleigh estimates 50-100 orders/month (5-10% of volume) fall through the cracks — some get a "massive fall through the crack," many more are just communication faux-pas where a tracking number existed in WellSync for a day or two before Albert happened to log in and move it. Beyond that, there's no structured visibility into orders stuck at the nurse-practitioner review stage or the pharmacy stage, so problems get discovered when frustrated customers reach out. This build automates the Shopify-update loop, removes Albert's manual polling, and surfaces stuck orders proactively to the team.

---

## Developer Brief

_Quick context for the engineer. Expands on the Build Spec bullets._

- **Poll pharmacy portals for tracking numbers**: Albert logs into WellSync (branded as BoomRx at `pharmacy-portal.wellsync.com/en-US/boomrx/...`) and The Pharmacy Hub several times a day to see which prescriptions have tracking generated. The agent replaces this loop. Access mechanism is the biggest open question — see Data Sources. WellSync markets itself as "API-driven" but developer docs aren't publicly accessible; Pharmacy Hub markets an "open API architecture." If partner API access isn't obtainable quickly, browser automation against the existing pharmacy portal logins is a viable fallback (see Implementation Considerations under User Story 1).
- **Update Shopify with tracking + fulfillment**: Well-trod path — Shopify Admin API + Fulfillment API. Adding a tracking number and marking fulfilled automatically triggers Shopify's shipping notification email, which is already what Albert relies on. Carrier is auto-detected from the tracking number format (Albert confirmed: "It will show UPS or FedEx"). Orders use the `#FC-XXXXX` naming pattern and have subscription metadata from Recharge.
- **Keep Google Sheet in sync**: Albert's sheet is at a known Google Sheets URL with tabs including "Orders To Fill 2026," "Orders To Fill 2025," "Intake Form – GLP," "Intake Form – Ivermectin," "Inventory," etc. The sheet is load-bearing for team visibility today — keep writing to it even as we automate, so the team's workflow doesn't break. Chandler floated replacing it with Shopify's fulfillment filter ("can we use the Shopify fulfilled or not fulfilled thing") but deferred because the sheet tracks intake-form state Shopify doesn't see. For Phase 1: keep the sheet authoritative.
- **Flag pharmacy delays**: Albert said WellSync has a "two-day processing" SLA for tracking number generation. Orders with no tracking 2+ business days after being sent to pharmacy get flagged on the agent's dashboard and escalated via internal email/Tellescope ticket. No customer-facing message in Phase 1 — just internal visibility.
- **Flag nurse approval delays**: Tellescope holds all intake forms and nurse approval state. When a patient has submitted an intake form but no approval has landed in X days (starting assumption: 3 days, configurable), flag internally. Specifically called out by name — "Nurse Antonio" has a backlog Albert was actively chasing during the call. Again, internal flag only in Phase 1.
- **Internal dashboard**: Simple server-rendered dashboard showing today's agent run results, current flags, and a tracking-fulfillment audit log. Albert and Chandler need to see what's happening, not customers.

---

## Prototype

**What the prototype delivers:**
- A working dashboard showing: (a) today's poll results — "3 new tracking numbers found at WellSync, 1 at Pharmacy Hub, 4 Shopify orders fulfilled," (b) a flag board — "2 orders at pharmacy >2 days, 1 intake form pending nurse approval >3 days," (c) an audit log — every tracking number pushed, with timestamps and Shopify order links.
- A "Run Agent Now" button that triggers a simulated poll cycle against synthetic pharmacy data. Watching this end-to-end shows exactly what the live agent will do: pull mock tracking numbers → match them to mock Shopify orders → push updates → update the mock sheet → refresh the dashboard.
- Synthetic orders modeled on Fierce Health's real product mix (Tirzepatide Microdose Monthly, Semaglutide Weight Loss Monthly, NAD+, Ivermectin) and the `#FC-XXXXX` Shopify order pattern. Addresses and patient names generated to resemble the real tracking sheet (visible at 55:00, screenshot 153).
- A "flagged orders" detail view so Albert can see exactly what the agent would surface and click through to the (mocked) source system.

**What's simulated (demo mode):**
- WellSync/BoomRx and Pharmacy Hub are replaced with mock data generators producing realistic order records with tracking numbers appearing on a time delay (some same-day, some 1-2 days, some "stuck" past the 2-day SLA so the flag logic is visible).
- Shopify order updates are performed against a test store OR an in-app mock that visualizes "before" and "after" states of an order (preferable — no live Shopify dependency to build the prototype).
- Tellescope intake/nurse-approval state is mocked with a small pool of synthetic patients, some with stale approvals so the nurse-delay flag shows.
- The Google Sheet sync is demonstrated against a throwaway sheet the Sagan team owns, or an in-app visualization of what the sheet update would look like.
- Nothing goes to real customers. Shopify "notification" emails are shown in-app as a preview, never sent.

**To complete (what we need from the customer after prototype approval):**
- WellSync/BoomRx access path — either partner API credentials (preferred, requires WellSync approval) or a service account for browser automation using Albert's current portal login
- Pharmacy Hub API credentials (they advertise open API; likely the easier of the two)
- Shopify Admin API access token via a custom app scoped to `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`
- Tellescope API key (Organization-level) and confirmation of which endpoints cover intake-form submission state and nurse-approval events — webhooks preferred
- Google Sheet share — service account email added as editor to the "New Orders To Send To Pharmacy" sheet, or consensus to move sheet ownership into the app
- Confirmation of flag thresholds: "orders at pharmacy >2 business days" and "intake submitted but not approved >3 days" — Chandler/Raleigh to set final numbers

---

## Stack Suggestions

| Layer | Tool | Rationale |
|-------|------|-----------|
| Hosting | Railway | Sagan default per stack.md. Cron polling + lightweight dashboard + SQLite on a volume — one service handles everything. |
| Frontend | HTML + Tailwind CSS + htmx | Sagan default per stack.md. Dashboard is a small internal tool: list views, detail views, a few buttons — classic htmx territory. No justification for React. |
| Backend | Hono (Node.js + TypeScript) | Sagan default per stack.md. Small API surface, one service. |
| Database | SQLite on Railway volume | Per stack.md — low-medium volume default. ~1,000 orders/month of fulfillment state + audit log easily fits; no relational complexity justifies Postgres. |
| Integrations | Direct API for Shopify, Tellescope, Google Sheets, Pharmacy Hub. n8n only if orchestration complexity grows. Browser automation (Playwright on Railway) for WellSync if no API access. | Per stack.md — "if the service has a well-documented API, call it directly from the backend." WellSync is the wildcard: if we get partner API access, direct; if not, Playwright-in-a-container for the portal. |
| Scheduling | Railway cron | Per stack.md — "Railway cron for all scheduled tasks. Never n8n." 4 polling runs per day, plus a lighter delay-check run. |
| AI | Lightweight tier (via OpenRouter) | Per stack.md — used for: (a) fuzzy-matching pharmacy-portal records to Shopify orders when IDs don't map cleanly (patient name + email + product), (b) normalizing tracking-number/carrier outputs across pharmacy portals, (c) parsing WellSync portal HTML if we're doing browser automation. No customer-facing content — no need for SoTA. |

**Environment Variables**: `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_STORE_DOMAIN`, `TELLESCOPE_API_KEY`, `TELLESCOPE_ORG_ID`, `WELLSYNC_USERNAME`, `WELLSYNC_PASSWORD`, `WELLSYNC_API_KEY`, `PHARMACY_HUB_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `OPENROUTER_API_KEY`, `INTERNAL_ALERT_EMAIL`, `AGENT_ADMIN_PASSWORD`

---

## Screen Share Timestamps

_Moments in the recording where the customer shared their screen._

| Timestamp | Screenshots | Description | Relevance |
|-----------|-------------|-------------|-----------|
| 42:30 | 77_42m30s.jpg | Albert showed Tellescope patient profile (Araceli Sanchez) with the intake-form reminder email and tickets assigned to Albert F | Confirms Tellescope is the EHR of record (URL: `business.tellescope.com`); shows patient schema, ticket model, care team fields, and the Tellescope portal link format for reminders |
| 43:00 | 86_43m00s.jpg | Same patient view with the "URGENT: Intake Form Needed" email and a Tellescope SMS reminder visible at the bottom | Shows the existing intake-reminder flow (Albert clicks a ticket button to send); pattern to preserve when removing the manual click |
| 49:52 – 50:36 | 106_49m52s.jpg, 118_50m36s.jpg | Albert opened WellSync — the "BoomRx" tenant for Fierce Health at `pharmacy-portal.wellsync.com/en-US/boomrx/patients`. Shows 725 patients, 91 pages, left-nav: Billing / Patients / Prescriptions / Profile | Canonical screenshot of the pharmacy portal we'll need to integrate with. Prescriptions tab (not opened here) is where tracking numbers live. Confirms multi-tenant structure (Fierce Health org within WellSync/BoomRx) |
| 55:00 | 153_55m00s.jpg | Albert showed the "New Orders To Send To Pharmacy" Google Sheet — 6,732 rows with columns: Order Date, Notes, Shipped, Dosage, Pharmacy, Product Name, First/Last Name, Email, Phone, Address, City, State, Zip, Tracking Number | Defines the sheet schema the agent must keep in sync. Tabs visible: "Orders To Fill 2026/2025," "Intake Form – GLP," "Intake Form – Ivermectin," "OLD Orders To Fill," "Inventory" |
| 55:44 | 162_55m44s.jpg | Albert walked through a Shopify order (#FC-38942, Alyssa Acker, Tirzepatide Microdose Program Monthly, $250) — showed the "Mark as fulfilled" dropdown and "Create shipping label" button | Canonical target for the Shopify write path. Note: order source is "Recharge Subscriptions" — subscription orders behave the same way from a fulfillment standpoint |

---

## Key Definitions

| Term | Meaning | Examples |
|------|---------|----------|
| Intake form | Tellescope form a patient fills out post-purchase with medical history the nurse practitioner needs to approve a prescription | Collected per-product; some patients bounce without completing |
| Nurse practitioner approval | The clinical-review step in Tellescope where a licensed NP reviews the intake and approves (or declines) the prescription | Zaki saw "Nurse Antonio" mentioned as having a backlog during the call |
| Prescription fulfillment | The pharmacy step — WellSync/BoomRx or Pharmacy Hub compounds and ships the medication, then generates a tracking number | WellSync SLA per Albert: 2 business days to tracking |
| BoomRx | The pharmacy brand that runs on WellSync's platform for Fierce Health (one of the "two main pharmacies") | URL: `pharmacy-portal.wellsync.com/en-US/boomrx/...` |
| The Pharmacy Hub | Fierce Health's second pharmacy partner — not to be confused with generic "pharmacy hub" language | thepharmacyhub.com — markets open API |
| Tellescope | EHR/CRM that owns patient records, intake forms, tickets, SMS, email, and the patient portal | `business.tellescope.com` — distinct from "Telescope Health" (unrelated company) |
| Orders-to-fill sheet | Google Sheet Albert maintains as the team's source-of-truth view of pharmacy state, separate from Shopify's own fulfilled/unfulfilled flag | "New Orders To Send To Pharmacy," 6,700+ rows, multiple tabs per product and year |
| Order ID pattern | Shopify `#FC-XXXXX` | Example shown: #FC-38942 |

---

## User Stories

_Each user story maps to a Build Spec bullet. The assigned engineer will review the transcript independently and make their own implementation decisions._

### User Story 1: Poll pharmacy portals for new tracking numbers

**Implementation Considerations:**
- WellSync access is the single biggest unknown. Their public marketing mentions an API-driven platform, but developer docs aren't publicly available — API access is almost certainly partner-gated (see stack.md "Vertical SaaS" note — budget weeks, not hours). Approach: (a) try to get partner API access immediately after kickoff so the build can use it, (b) in parallel, build against browser automation (Playwright on Railway, headless) using Albert's portal login as a fallback. The architecture should abstract "get new tracking numbers from WellSync" so either backend works without touching the rest of the app.
- The Pharmacy Hub advertises "open API architecture" (LinkedIn posts, their marketing site). Confidence that direct API is viable here is higher. Engineer should verify on the first day of kickoff by reaching out to Pharmacy Hub's integrations contact.
- Poll cadence: Albert said "a couple of times a day" — Zaki proposed "4 times a day" and Albert agreed. Start there, make it configurable. Railway cron, never n8n for scheduling (per stack.md).
- Matching pharmacy records to Shopify orders is non-trivial. The portals show patient name + email + product; Shopify has `#FC-XXXXX` and customer email. Primary match: customer email + product name. When that's ambiguous, a Lightweight-tier model can handle fuzzy matching — but log every non-exact match for human review before the agent pushes the update.
- Carrier detection: Albert confirmed the tracking number itself encodes the carrier ("It will show UPS or FedEx"). Shopify's fulfillment API accepts a `tracking_company` field — pattern-match on the tracking number format (UPS: `1Z...`, FedEx: 12 or 15 digits, USPS: 20-22 digits, etc.). Keep a small lookup and fall back to "Other" with the raw number if unsure — Shopify will still show a working track link.
- Idempotency: same tracking number should never be pushed twice. Keep an internal record keyed by (pharmacy_order_id → shopify_order_id → tracking_number) and short-circuit if already seen.

### User Story 2: Push tracking number into Shopify and mark fulfilled

**Implementation Considerations:**
- Standard Shopify Admin API path. Create a fulfillment on the order with `tracking_number`, `tracking_company`, and `notify_customer: true` — Shopify's native shipping email handles the rest (Albert's exact current behavior).
- Some orders originate from Recharge Subscriptions (visible in the screenshot at 55:44). These still appear as normal Shopify orders for fulfillment purposes — no Recharge-specific handling needed for Phase 1.
- Respect Shopify's API rate limits (40 requests/2s per store via REST; higher via GraphQL). At ~1,000 orders/month fulfillment volume, rate limits are not a real concern, but implement standard backoff.
- Scope the custom-app access token as narrowly as possible: `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`. No need for customer-PII scopes beyond what's already on the order.
- The "Mark as fulfilled" Shopify screenshot at 55:44 shows `admin.shopify.com/store/fitness-carli/orders/...` — note the store handle is `fitness-carli`, not `fierce-health`. Confirm the correct Shopify store when collecting credentials.
- Log every write. If Shopify rejects (e.g., order already fulfilled externally), surface it on the dashboard rather than silently dropping.

### User Story 3: Keep the "Orders To Send To Pharmacy" Google Sheet in sync

**Implementation Considerations:**
- Sheet schema is visible at 55:00 (screenshot 153) — include at minimum: Order Date, Notes, Shipped checkbox, Dosage, Pharmacy, Product Name, First Name, Last Name, Customer Email, Phone Number, Address, City, State, Zip, Tracking Number. Mirror Albert's existing columns exactly — don't redesign the sheet.
- Tabs: "Orders To Fill 2026" is the active one; older tabs are archives. Append to the current-year tab; don't touch the others.
- Chandler asked "could we do the… use the Shopify fulfilled or not fulfilled thing" to replace the sheet — deferred because the sheet also tracks intake-form state Shopify doesn't surface. Keep the sheet for Phase 1. Phase 2 can revisit whether sheet becomes redundant.
- Google Sheets API via a service account. Share the sheet with the service account email as editor.
- At 6,700+ rows today, the sheet will keep growing. No cleanup in scope — just appends and updates. Watch for the Google Sheets row-count limit (10M cells); unlikely to hit in Phase 1.

### User Story 4: Flag pharmacy delays (no tracking after 2 business days)

**Implementation Considerations:**
- "2 business days" per Albert's description of WellSync's SLA. Calendar-aware: if an order lands with the pharmacy on Friday, Tuesday close-of-business is the flag trigger.
- No customer-facing comms in Phase 1 — flag surfaces on the internal dashboard and fires an email (or Tellescope ticket) to the team. Zaki explicitly deferred customer messaging at 57:06 when he asked "should we still do that proactive stuff?" and narrowed Phase 1 to internal-only.
- Escalation behavior: when a flag fires, the dashboard shows it and the agent drafts a follow-up email to the pharmacy (drafted, not sent) so Albert or Chandler can review and send. Stretch goal — auto-send the email and parse the reply — explicitly discussed by Zaki at 28:00 as Phase 2 territory.
- Store the flag state so a delay that gets resolved (tracking shows up on day 3) clears automatically without spamming the dashboard.

### User Story 5: Flag nurse-approval delays (intake submitted, not approved in X days)

**Implementation Considerations:**
- Tellescope is the source for both events. Per Tellescope's docs, they offer webhooks and a REST API; the engineer should confirm which Tellescope object holds "intake form submitted" and "nurse approval granted" timestamps and subscribe to those webhooks (preferred) or poll as a fallback.
- Threshold: Chandler to confirm, but Zaki suggested "3 days" in the call as a working number. Make it configurable per-product in case GLP-1 vs. Ivermectin need different SLAs.
- Flag style: internal dashboard + email. Explicitly named "Nurse Antonio" had a backlog at the time of the call — the flag should be attributable per-nurse so the team can see who's behind.
- Watch the "abandoned intake" case: Tellescope already runs an automated reminder flow for patients who haven't submitted the form (visible on screenshot 77_42m30s — the "URGENT: Intake Form Needed" email). That flow is separate from this flag; only trigger the nurse-delay flag after the patient HAS submitted.

### User Story 6: Internal dashboard for Albert and Chandler

**Implementation Considerations:**
- Server-rendered with htmx (per stack.md). No SPA needed.
- Auth: Better Auth with Google Workspace SSO restricted to `@fiercehealth.com` domain (`hd` parameter) — per stack.md. Sagan admin access via email/password super-admin for `sagan-admin@getsagan.ai`.
- Views: (a) Today's run summary, (b) Flag board (pharmacy delays, nurse delays, match-ambiguity cases awaiting review), (c) Audit log of tracking pushes with Shopify/pharmacy links, (d) Simple settings page for cron cadence and delay thresholds.
- Mobile-responsive — Albert operates from anywhere, and Chandler mentioned computers being "in the car" during the call. Tailwind defaults handle this without extra work.
- Don't expose customer PII unnecessarily on the dashboard — show patient initials + order number; reveal full name/email only on click. Tellescope is still the system of record for PHI.

---

## Data Sources

| Source | Type | Direction | Integration Method | Notes |
|--------|------|-----------|-------------------|-------|
| Shopify (store `fitness-carli` per screenshot) | API | Both | Direct Admin API via custom app token | Write: fulfillments, tracking; Read: order list, customer email, line items. Recharge subscription orders appear as normal orders. |
| Tellescope | API + Webhooks | In | Direct REST API; subscribe to webhooks for intake-submitted / nurse-approved events | EHR system of record. Confirmed on call: "Telescope looks like it's got a pretty good API" — Tellescope docs confirm robust API + webhooks. Distinct from Telescope Health (different company). |
| WellSync (BoomRx tenant) | Portal / possibly API | In | TBD: partner API (preferred — requires WellSync approval, weeks-long per stack.md vertical SaaS note) OR Playwright browser automation with Albert's portal login | `pharmacy-portal.wellsync.com/en-US/boomrx/...`. 725+ patients for Fierce Health today. Prescriptions tab holds tracking numbers. Engineer should apply for API access day 1; build behind an abstraction so either path works. |
| The Pharmacy Hub | API | In | Direct API (they market "open API architecture") | thepharmacyhub.com. Higher confidence than WellSync. CEO Antoine Mourani is named publicly on LinkedIn as the integrations contact — reach out during kickoff. |
| Google Sheet ("New Orders To Send To Pharmacy") | Sheet | Both | Google Sheets API via service account | 6,700+ rows, multi-tab. Append/update only; never replace. Schema visible in screenshot 153. |
| Shopify native shipping notification email | Email | Out | Fired automatically by Shopify on fulfillment create with `notify_customer: true` | Preserves current behavior — no new comm rails. |
| Internal alert email | Email | Out | SMTP via backend, OR Tellescope email API if we want it to land in Tellescope's record | Destination: Albert + Chandler. For pharmacy/nurse-delay flags in Phase 1. |

---

## Discussed But Not Confirmed

_These items came up in the transcript but were not explicitly committed to. Verify with the customer before including in the build._

- **Removing Albert's manual click on the intake-form reminder**: Zaki floated "we could save you a click on that, too" (42:52) and Albert agreed. Currently an automated flow in Tellescope fires the reminder, but Albert clicks a ticket button to mark it sent. This is a small tweak to an existing Tellescope-side automation, not a feature in its own right — verify Chandler/Raleigh want it in Phase 1 or would rather leave Tellescope alone until they redesign that workflow.
- **Tightening WellSync SLA from 2 days to "real-time"**: Zaki said (52:15) "check… 4 times a day… grab the tracking number in real time, we don't have to wait 2 days." The 4x/day polling cadence is committed, but the "real-time" framing was aspirational. Flag threshold for the pharmacy-delay alert (2 days vs. something tighter) is the number to confirm.
- **Nurse-delay threshold**: Zaki suggested "greater than X amount of time after intake form is filled" (45:32) without Chandler/Raleigh pinning down X. Working assumption: 3 days. Needs confirmation.

---

## Out of Scope (Future Phases)

_Discussed on the call but deferred — preserved here so nothing is lost._

- **Proactive customer communications on delays**: Zaki initially pitched this as the centerpiece ("proactive customer success agent... we send a note saying, hey, been a small delay... here's 10% off your next order") but at 57:06 he explicitly narrowed Phase 1 to "make it faster internally first, before we start doing proactive stuff." Raleigh agreed. This is the biggest natural next build.
- **Post-delivery upsell follow-up**: "Hey, I know you had a delay — here's 10% off your next order" after delivery. Discussed at 28:44-56, deferred with proactive comms.
- **Auto-send + parse reply for pharmacy-delay emails**: Zaki described the agent logging into systems, sending a follow-up email to the pharmacy, and parsing the reply to update internal state (27:53-28:43). Phase 1 drafts the email; Phase 2 can auto-send + parse.
- **Conversational unboxing/onboarding assistant (QR code to phone-based agent)**: Jon's idea — "a QR code I could text as I was opening it, being like, here's the update... hey I have a question, what the fuck is this thing you included in the package?" (12:06). Raleigh was interested; deferred because the products often ship in pharmacy-branded (not Fierce-branded) boxes.
- **Conversational EHR onboarding assistant**: Raleigh — "it actually is a pretty big onboarding lift for a customer... it's a pretty intimidating process if you've never put a needle in your ass" (12:44). Related but distinct from the unboxing idea.
- **Affiliate marketing payout/playbook automation**: Chandler mentioned at the start ("our affiliate marketing playbook that we have running"); Zaki flagged for later (27:42).
- **Developer / SRE agents (API-breakage monitor, site-load monitor)**: Chandler brought up; Jon redirected — "there's 7 different agents within what you just said." Explicitly out of scope for this build; candidate for separate future scoping.
- **Replace the Google Sheet with Shopify fulfilled/unfulfilled view**: Chandler floated it at 43:57. Deferred because the sheet also tracks intake state.
- **Predictive analytics on delays / dashboarding beyond the operational view**: Not explicitly requested, but natural next step once Phase 1 accumulates data.

---

## Confidence Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope Definition | 4/5 | Sharp agreement at the end of the call on "Level 1 = operational automation, proactive comms later." Two thresholds (pharmacy delay, nurse delay) need numeric confirmation; otherwise clear. |
| Technical Feasibility | 3/5 | Shopify + Tellescope + Google Sheets are all well-trodden paths. The Pharmacy Hub markets an API. WellSync is the real risk — API access is partner-gated with no public docs, and browser automation against a pharmacy portal is serviceable but fragile. Architecture should abstract the pharmacy adapter so either path works; engineer should start API partner-access applications on day 1. |
| Customer Impact | 5/5 | Removes Albert's entire manual polling + fulfillment-update loop, directly addresses the 50-100 orders/month Raleigh said fall through the cracks, and closes two visibility gaps (pharmacy SLA breaches + nurse-approval backlog) the team has no structured view on today. |
| **Overall** | **3/5** | **= lowest of the three (Technical Feasibility)** |

A scoped, shippable Phase 1. The one thing I'd want before quoting timelines is confirmation from WellSync on partner API access — if that materializes, this is a 4/5 build. If not, the Playwright fallback is real and works, just adds brittleness worth flagging to Chandler/Raleigh.

---

## Audit Notes

All six Build Spec items traced back to specific transcript moments:

- Pharmacy polling + Shopify push: Zaki's proposal at 52:15 and the full Albert walkthrough at 53:40-56:20, with Chandler explicitly endorsing ("That'd be awesome") at 51:52.
- Sheet sync: Albert's demonstration of the "Orders To Send To Pharmacy" sheet at 55:00 and Zaki's "throw that on this sheet" framing at 52:15.
- Pharmacy delay flag: discussed throughout the middle of the call (24:00-28:43); narrowed to internal-only at 57:06.
- Nurse-approval delay flag: discussed from 44:50 with the "Nurse Antonio" example; explicitly framed as internal at 57:06.
- Internal dashboard: implied throughout but worth calling out — the whole build needs a visibility surface; Albert can't see what the agent did without one.

**Items moved to Discussed But Not Confirmed during audit:**
- Removing Albert's manual intake-reminder click (light tweak, not clearly committed)
- Final numeric thresholds for pharmacy-delay and nurse-delay flags

**Items moved to Out of Scope during audit:**
- Proactive customer messaging — Zaki explicitly deferred at 57:06 and the room agreed. This was the originally-pitched centerpiece but got narrowed.
- Post-delivery upsell, auto-send pharmacy emails, unboxing assistant, onboarding chat, affiliate automation, developer agents, sheet replacement, predictive analytics.

**Prototype audit**: Prototype is fully buildable with synthetic data — no customer credentials required. Demonstrates the full loop end-to-end (poll → match → Shopify update → sheet update → flag surfacing). "To Complete" items are genuine post-prototype needs traceable to the transcript and the data-source map. Flagged the WellSync access question as the biggest open item.

**Transcript corrections applied** (conversationally, in this PRD; transcript file unchanged): "Telescope" → "Tellescope" (confirmed by `business.tellescope.com` URL in screenshot 77_42m30s); "Wells Center" / "Wellsing" / "VelSync" → "WellSync"; "Zepatide" → "Tirzepatide"; "legit script or whatever" → "The Pharmacy Hub" (Zaki was fumbling for the second pharmacy's name).

No red flags found — every feature in this PRD traces to at least one committed moment on the call.
