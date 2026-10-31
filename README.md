# Deepak Jain, portfolio

A one-page portfolio: an interactive 3D map of projects and skills, work shown as expandable rows, a journey log, a live in-browser self-check, and a resume download.

Plain HTML, CSS and JavaScript. No build step.

## Structure
```
index.html            page content
assets/css/styles.css all styles (design tokens at the top)
assets/js/main.js     motion, scroll, hover previews, live checks
assets/js/map.js      the 3D map (Three.js)
images/               screenshots, WebP
resume/               resume PDF
```

## Run it locally
Serve the folder with any static server and open it in a browser, for example `npx serve .`

## Notes
- GSAP, ScrollTrigger, Lenis and Three.js load from a CDN. Without them the page still shows all of its content.
- The resume PDF has no phone number.
- Respects reduced-motion settings; the custom cursor and hover previews are desktop only.