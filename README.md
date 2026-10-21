# DVC Chart Comp

A browser-based Disney Vacation Club stay comparison tool with bundled official 2027 point-chart data.

## Run

Open `index.html` directly in a browser. No package installation, build step, server, or database is required.

Select a resort, room, view/category, and travel period to load nightly points automatically. Select **Manual Points Entry** at the bottom of the resort list to enter your own rates. Before rates are available, point values display as dashes.

## Compare stays

- Seven columns compare the possible arrival weekdays.
- Add colored checkout lines and drag them to change stay lengths. Each line sits below its checkout day; checkout-day points are excluded.
- Friday/Saturday nights use weekend points. Saturday/Sunday days are weekend days for activity planning.
- Rest-day intervals count after arrival: every other day means days 3, 5, 7, etc.
- Park days exclude arrival, departure, and rest days.
- Enable rankings within Stay totals to compare the seven options separately for each stay. Drag the rule grips or use the arrow buttons to reorder priorities. Lower-priority rules only break ties; all tied Best/Worst columns are marked.
- Mobile layouts stack day/point labels and provide collapsible controls.

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

A selected travel period applies to the whole hypothetical stay. Actual arrival dates and nightly changes across travel periods are not implemented yet. Point charts do not indicate availability. Accommodation taxes at Aulani and Disneyland Hotel are separate from point totals.

Disney charts and resort names belong to their respective owners. This is an independent planning tool; it is not affiliated with Disney.
