# Development Notes

## WHOOP API Endpoints & Fields

### Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /developer/v1/user/profile/basic` | Fetch user profile (email, name, whoop_id) |
| `GET /developer/v1/cycle` | Fetch physiological cycles (strain, day boundaries) |
| `GET /developer/v1/recovery` | Fetch recovery scores (recovery %, RHR, HRV) |
| `GET /developer/v1/activity/sleep` | Fetch sleep records (duration, efficiency, stages) |

### Potential Differences

- **Cycle date mapping**: We use the cycle `start` field (sliced to YYYY-MM-DD) as the "day" for a daily metric. WHOOP cycles don't always align perfectly with calendar days — they run roughly from wake to wake. If you see date alignment issues, consider using the cycle's `end` date instead.
- **Sleep assignment**: We match sleep records to days using the `end` (wake time) date. If a user wakes up after midnight, the sleep gets assigned to that next calendar day. This is usually correct since WHOOP recovery is based on the preceding sleep.
- **HRV field**: We store `hrv_rmssd_milli` from the recovery endpoint. This is HRV in milliseconds (RMSSD method). WHOOP may display this differently in their app.
- **Sleep duration**: Computed from stage summaries (light + SWS + REM), excluding awake time. This represents actual sleep time, not time in bed.
- **Strain**: Comes from the cycle score, not workout score. Daily strain accumulates across all activities.

### Rate Limits

- 100 requests/minute, 10,000 requests/day
- The sync endpoint makes 3 parallel paginated requests (cycles, recoveries, sleep). For 30 days of data this typically requires 3-6 API calls total.

### Token Handling

- Access tokens expire in 1 hour
- We proactively refresh when token expires within 60 seconds
- Using a refresh token invalidates the previous access token
- The `offline` scope must be included in the initial authorization to receive a refresh token

## Next Upgrades

### Better Statistics
- [ ] Add confidence intervals or p-values (basic t-test) for the comparison
- [ ] Track effect sizes (Cohen's d) to gauge practical significance
- [ ] Add a "minimum days" threshold before showing insights (e.g., require 5+ days in each group)

### Per-Dose Timing Analysis
- [ ] Compare morning vs evening dosing effects on recovery
- [ ] Look at dose-response: does a higher dose correlate with different outcomes?
- [ ] Analyze lag effects: compare recovery N days after taking a medication

### Data Enhancements
- [ ] Add webhook support for real-time WHOOP data updates
- [ ] Sync workout data and correlate medication with workout performance
- [ ] Add SpO2 and skin temperature tracking (when available from WHOOP)
- [ ] Support body measurement tracking (weight changes)

### UX Improvements
- [ ] Quick-log buttons for common medications (one-tap logging)
- [ ] Medication reminders / scheduling
- [ ] Export data as CSV
- [ ] Dark mode support
- [ ] Mobile-responsive optimizations
- [ ] Drag-to-select date ranges on charts

### Architecture
- [ ] Switch to NextAuth for more robust session management
- [ ] Add proper error boundaries and loading states
- [ ] Add API rate limiting on our endpoints
- [ ] Background sync via cron job instead of manual button
- [ ] Add unit tests for the insights computation
- [ ] Consider moving to edge functions for lower latency
