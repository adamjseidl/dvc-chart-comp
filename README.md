# DVC Chart Comp

A browser-based Disney Vacation Club stay comparison tool with bundled official 2027 point-chart data.

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

## 2027 data

`points-2027.json` is the structured dataset. `points-2027.js` bundles the same data for direct browser use without a server. The 17 official resort charts cover 829 room/view-and-period rate combinations. Animal Kingdom Villas uses one chart for Jambo House and Kidani Village.

Source index: https://disneyvacationclub.disney.go.com/vacation-planning/points-charts

Each resort includes its official chart URL and source PDF SHA-256. Original source PDFs are retained in `work/charts/`. Data was retrieved October 20, 2026.

To regenerate and validate the data (Python with `pdfplumber` required):

```sh
python3 work/build-points.py
```

The generator checks nightly rates against every printed weekly total and verifies that each resort's periods cover the full year without overlaps or gaps. For syntax checks:

```sh
node --check app.js
node --check points-2027.js
```

## Current limits

Only 2027 chart data is bundled. Earliest check-in can be any date in 2027, including December 31. The following six arrival options and stay nights may extend into 2028 using labeled estimates. 2028 nights are estimated from the matching month/day in the 2027 chart, classified using the actual night’s weekday/weekend. February 29 uses February 28. Estimated nightly values and totals have a ~ prefix, and checkout results explain when rankings may depend on estimates. Rates beyond 2028 remain unavailable. Manual rates remain fixed across dates. Point charts do not indicate availability. Accommodation taxes at Aulani and Disneyland Hotel are separate from point totals.

Disney charts and resort names belong to their respective owners. This is an independent planning tool; it is not affiliated with Disney.
