# ARTHIKA website prototype

A standalone landing page in the same repository as the Expo mobile app. Built with HTML, CSS, and vanilla JavaScript. It uses copies of the existing ARTHIKA vector logos and self-hosted Manrope (variable, 200–800) and Instrument Serif fonts. No photos, external font requests, runtime packages, or app imports. Node.js 22 or newer runs the local tools; production is static files.

## Structure

```text
Arthika-Expense/
├── src/                     Existing Expo app; unchanged
├── assets/                  Existing app assets; unchanged
├── app.json                 Existing Expo configuration; unchanged
├── package.json             Existing mobile scripts/dependencies; unchanged
└── website/                 Independent website project
    ├── index.html           Page structure and content
    ├── src/
    │   ├── styles.css       Website-only theme and responsive layout
    │   └── main.js          Sample interactions and release status
    ├── assets/
    │   ├── brand/           Copies of the original ARTHIKA SVG logos
    │   └── fonts/           Self-hosted fonts and their OFL licenses
    ├── scripts/
    │   ├── build.mjs        Copies only public files into dist
    │   └── serve.mjs        Local static server on port 4173
    ├── package.json         Website-only commands; no dependencies
    ├── vercel.json          Website-only Vercel build settings
    └── dist/                Generated static deployment; ignored by Git
```

## Run alongside the mobile app

From the repository root, in one terminal:

```sh
npm start
```

In another terminal, also from the repository root:

```sh
npm --prefix website run dev
```

Open <http://127.0.0.1:4173>. No website install command is required. Refresh after edits; this minimal server does not provide hot reload. The website uses port 4173 independently of Expo. To change it in PowerShell, set `$env:PORT = "4174"` in the website terminal before running the command.

Build and preview the exact static output:

```sh
npm --prefix website run check
npm --prefix website run build
npm --prefix website run preview
```

Stop the dev server first if preview uses the same port. Ctrl+C stops either server.

## Deploy to Vercel from GitHub

Push this folder with the rest of the repository, import the GitHub repository as a Vercel project, and use:

| Setting | Value |
| --- | --- |
| Root Directory | `website` |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `echo No website dependencies to install` |
| Node.js | 22 or newer supported LTS |

The last three build settings are provided by [vercel.json](./vercel.json). Set Root Directory in the Vercel dashboard: it is not set by that file. Turn **off** “Include files outside the root directory in the Build Step”; the website does not need app files. Do not select the repository root as the website project root. The deployment does not run Expo, build an APK, or start a mobile server. Once Git integration is connected, later pushes can trigger website deployments independently of local mobile development.

Official reference: [Vercel build configuration and root directory](https://vercel.com/docs/builds/configure-a-build).

## Separation from mobile development

- All files introduced for the prototype are under this folder. There is no root workspace setup and no change to the Expo configuration, routing, scripts, dependencies, or lockfile.
- Build and serve scripts resolve paths relative to this folder and never import application source. The build copies three public page files and this folder's public assets; app files and project documentation are not published.
- The CSS colors are copied from the app's palette; there is no dependency on the app's theme module.
- Website code uses `.js` and `.mjs`, avoiding the root TypeScript configuration's `**/*.ts` and `**/*.tsx` patterns.
- A separate website build does not rebuild or update an installed mobile app. These projects share Git history, so a future repository-wide CI rule or accidental cross-import could couple them; the separation is an architectural boundary, not a guarantee against every future edit.
- If the site later needs React/Vite, replace tooling inside this folder. Keep its dependencies local and review root lint/TypeScript scopes before introducing JSX or TypeScript.

## Download button

There is intentionally no fake APK link. The release button reports that the Android build is not published. Once a signed standalone APK exists, replace it with an anchor pointing at the public release asset and update the status copy. Store APK binaries in GitHub Releases or another artifact host, rather than application source. The interactive balances and examples are clearly labeled sample data.

This prototype does not add analytics, sign-up, persistence, or a backend.

## Asset sources

The SVGs in [assets/brand](./assets/brand) are unmodified copies of the color horizontal logo, reversed horizontal logo, and color symbol in the repository's original [ARTHIKA logo assets](../assets/ARTHIKA-logos/svg). The original app assets stay untouched. Website branding is self-contained for deployment with Vercel's outside-root access disabled.

[Manrope](https://fonts.google.com/specimen/Manrope) (variable, weights 200–800) and [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) (italic) are served locally. Their SIL Open Font License files are included in [assets/fonts](./assets/fonts).
