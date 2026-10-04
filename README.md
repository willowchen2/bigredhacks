# Locus Lane

## Run it
1. Put your Google Maps API key in `js/config.js`.
2. Start a local server from this folder (opening the file directly can break requests):
   - `npx serve` or `python3 -m http.server 8000`
3. Open http://localhost:8000

## Files
- index.html  home page
- walk.html   Street View walkthrough (working)
- js/palace.js  data model + save/load (edit DEMO_PALACE to change stops)
- js/walk.js    panorama stepping logic
- quiz.html / js/quiz.js  quiz mode: pins hide their facts until you click to reveal them
- js/config.js  your API key 
- css/style.css shared styles

## Next to build
api/scene.js (LLM scenes)
