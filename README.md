# Color Safari Wheel

A sleek, minimalist spin-the-wheel app for photo safaris.

Spin the wheel before a photo walk and photograph only things in the selected color. The wheel uses a muted adult palette inspired by the rainbow, plus black and white. You can add, edit, remove, shuffle, and reset colors.

## Features

- Interactive animated color wheel
- Click the wheel or the button to spin
- Real random winner logic
- Muted default rainbow-inspired palette
- Editable color palette
- Add custom color names and hex values
- Remove colors while keeping at least two colors
- Reset to default palette
- Shuffle palette order
- Copy selected hex value
- Local storage persistence
- Mobile-friendly responsive layout
- Dependency-free HTML, CSS, and JavaScript

## Files

- `index.html` — app markup
- `styles.css` — visual design and responsive layout
- `app.js` — wheel logic, editing, state, and local storage

## Run locally

You can open `index.html` directly in a browser.

For a local server, run one of these commands in this folder:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy on GitHub Pages

1. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your main branch and `/root`.
5. Save.

Your app will be published as a static GitHub Pages site.
