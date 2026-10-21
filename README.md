# DVC Resort & Stay Planner

A browser-based Disney Vacation Club stay comparison tool with bundled official point charts for the remaining 2026 dates and all of 2027.

## Run

Open `index.html` directly in a browser. No package installation, build step, server, or database is required.

Choose an earliest check-in date and select a resort, room, and view/category. The comparison appears when the date and all resort selections are ready. Each night loads the rate for its actual date automatically. Select **Manual Points Entry** at the bottom of the resort list to enter your own rates. Before rates are available, point values display as dashes.

## Compare stays

- Compare up to three resort/room/period selections, including manual rates. Use the resort tabs above the main table or in the selection panel to switch the active selection. Each checkout result lists one points row per resort.
- Seven columns compare the earliest check-in date and the following six dates, with the chosen date’s weekday first. Date and weekday headings stay aligned across the main table and all results.
- Add colored checkout lines and drag them to change stay lengths. Each line sits below its checkout day; checkout-day points are excluded.
- Friday/Saturday nights use weekend points. Saturday/Sunday days are weekend days for activity planning.
- Rest-day intervals normally count after arrival: every other day means days 3, 5, 7, etc. Counting travel days as park days moves rests one day earlier to days 2, 4, 6, etc. Travel days themselves remain park days when the checkbox is enabled.
- The main table always shows 30 days. Rest Days settings live in a separate collapsed white panel above Stay totals on desktop and above the main table on mobile.
- Park days exclude rest days. An optional checkbox counts arrival and departure as park days; it starts unchecked and also updates park-day ranking tie-breakers.
- Checkout lines, rest intervals, and park/travel-day counts are shared across resort tabs.
- Enable rankings within Stay totals to compare the seven options separately for each stay. Rankings use the active resort tab; inactive resort point rows are not colored as winners or losers. Drag the rule grips or use the arrow buttons to reorder priorities. Lower-priority rules only break ties; all tied Best/Worst columns are marked.
- Mobile layouts stack day/point labels and provide collapsible controls. The chart initially shows three days after the latest checkout (at least eight rows). Show 7 more days reveals additional rows; Hide extra days trims them again. Dragging checkout lines stays within the visible rows and does not reveal rows or scroll automatically; use Show 7 more days to extend the table. Desktop always shows all 30 rows.

## Share comparisons

Use **Share Comparison** in Stay totals to copy a versioned URL snapshot. **Show encoded link** exposes the full URL for manual copying. Opening it restores the earliest check-in, up to three resort/room/view selections or manual rates, active tab, checkout lines and colors, rest/travel settings, ranking rule order and preferences, and expanded checkout details. Chart rates and results are recalculated from the bundled data.

State is stored in the URL fragment (`#comparison=v1.…`), with no server storage. Restored dates may be earlier than today if they are still within the bundled coverage. Invalid or unsupported links show a message without replacing the current comparison. When clipboard access is unavailable, the app selects the URL for manual copying.

Share from a hosted copy of the planner for links others can open. A link generated from a local `file:` page retains that local path and requires access to the same files. Copy again after changing settings to generate a new snapshot.

Run share-link encoding checks with `node --test tests/sharing.test.cjs`.

## Chart data

`points-2027.json` is the structured dataset. `points-2027.js` bundles the same data for direct browser use without a server. The 17 official resort charts cover 829 room/view-and-period rate combinations. Animal Kingdom Villas uses one chart for Jambo House and Kidani Village.

Source index: https://disneyvacationclub.disney.go.com/vacation-planning/points-charts

Each resort includes its official chart URL and source PDF SHA-256. Original source PDFs are retained in `work/charts/`. Data was retrieved October 20, 2026. `points-2026.json` and `points-2026.js` contain only October 20–December 31, 2026: 475 room/view-and-period combinations. `points-data.js` merges the years for the browser. Source 2026 PDFs and their URL manifest live in `work/charts-2026/`.

To regenerate and validate the data (Python with `pdfplumber` required):

```sh
python3 work/build-points.py
python3 work/build-points-2026.py
```

The generator checks nightly rates against every printed weekly total and verifies that each resort's periods cover the full year without overlaps or gaps. For syntax checks:

```sh
node --check app.js
node --check points-2027.js
```

## Current limits

Verified chart coverage starts October 20, 2026 and ends December 31, 2027. The date picker excludes past dates using the browser’s local date, and allows check-ins through December 31, 2027. The following six arrival options and stay nights may extend into 2028 using labeled estimates. 2028 nights are estimated from the matching month/day in the 2027 chart, classified using the actual night’s weekday/weekend. February 29 uses February 28. Estimated nightly values and totals have a ~ prefix, and checkout results explain when rankings may depend on estimates. Rates beyond 2028 remain unavailable. Manual rates remain fixed across dates. Point charts do not indicate availability. Accommodation taxes at Aulani and Disneyland Hotel are separate from point totals.

## License

Original software and documentation are licensed under the [MIT License](LICENSE),
Copyright (c) 2026 Adam Seidl.

Disney's source charts and branding are not covered by that license. See
[Third-party notices](THIRD_PARTY_NOTICES.md) for scope, source attribution, and
trademark information. This is an independent project and is not affiliated with
or endorsed by Disney.
