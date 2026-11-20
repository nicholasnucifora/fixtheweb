# Homepage: habits and controls

Added to the selected local homepage 34 and its index alias on 18 November 2026,
immediately after “Learn from what you watch”. Keep these saved pages synchronized;
do not rerun historical homepage renderers.

“See the pattern. Change it right there.” explains the benefit of seeing activity
and editing settings together. The example uses fictional activity only. It has
no account, network, storage or app-setting writes.

`watch-pattern-demo.css` retains the Villow web app’s WatchFreeTimeDemo animation,
including desktop drag and phone tap sequences and their original ten-second loop.
The app itself has not been changed. `watch-pattern-section.css` supplies homepage
layout, Inter within the example, unobtrusive weekday selection, and a two-line
drawer with abbreviated day names. The explicitly requested explanatory loop
continues under reduced motion, overriding this homepage’s legacy global reset
only within this section. Other motion behavior is unaffected.

`watch-pattern-settings.js` changes SVG paths and Y coordinates in place, leaving
animation elements and timing intact. `watch-pattern-geometry.js` and
`watch-pattern-spline.js` provide the original spline geometry and fictional
weekday variations. Empty selection and all seven days show the default curve.

The implementation came from Fix the Web’s VillowReflectionExample, originally
ported from disconnect’s WatchFreeTimeDemo.tsx and monotone-spline utility. The
illustration has been removed from Fix the Web’s principles section, keeping its
six principles at equal visual weight. Do not add Daily use, playback controls or
manual editing forms here. This is a local preview change, not a publication.
