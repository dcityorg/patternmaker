# Contributing

PatternMaker is open source under the MIT license. Contributions are welcome!

## Ways to Contribute

- **Bug reports** — use [GitHub Issues](../../issues/new?template=bug_report.md)
- **Feature requests** — use [GitHub Issues](../../issues/new?template=feature_request.md) or the [Ideas discussion](../../discussions)
- **Share your designs** — post in the [Design Gallery](../../discussions) discussion
- **Code contributions** — pull requests welcome

## Development Setup

PatternMaker is pure HTML/CSS/JS — no framework, no build step.

```bash
git clone https://github.com/dcityorg/patternmaker
cd patternmaker
# Open index.html in a browser, or serve locally:
python3 -m http.server 8080
# Open http://localhost:8080
```

## Adding a New Pattern

Each pattern is a standalone module in `/patterns/`. To add a new one:

1. Create `/patterns/yourpattern.js` — export `name`, `defaultConfig`, `controls`, `render(canvas, config)`
2. Register it in `app.js` — add to imports and the `patterns` object
3. Add help content in `help-content.js`
4. Add a `<option>` in the pattern selector in `index.html`

## Code Style

- Vanilla JS, no dependencies
- Each pattern is self-contained — it only receives a canvas and its config object
- The `render()` function draws to the canvas and must handle seamless tiling

## Questions?

Open a [Discussion](../../discussions) or [Issue](../../issues).
