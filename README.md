# Wealth Loop — Financial Strategy Game

A responsive browser-based, pass-and-play financial board game inspired by the broad financial-independence simulation genre. It uses an original visual identity and original card wording. The game runs locally in the browser; it has no account system, backend, external API, or online multiplayer.

## Play locally

1. Install Node.js 20 or newer.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev` and open the local URL printed by Vite.

## Publish to GitHub Pages

This repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repository, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
3. Push to `main`. The workflow installs the dependencies, runs the production build, and deploys `dist/` to Pages.

The app uses relative asset paths so it can be hosted under a repository path. The game save is stored in the same browser's `localStorage`; it does not sync between browsers or devices.

## Currency and card values

The game engine stores its balancing units as GM. The interface displays them as Bangladeshi taka at **1 GM = ৳1,000 BDT** so the fictional profession and investment figures remain balanced. These are game values, not financial advice or forecasts.

## What is implemented

- 2–6 player local setup, unique names, profession selection, Dream selection, configurable victory mode and optional rules.
- 24-space Rat Race board and 16-space Fast Track board, state-driven player tokens, dice rolls, Payday/Cash Flow Day settlement, Charity dice choice, Baby, Downsized, and the opportunity/event/market spaces.
- Fictional profession, small/big investment, business, expense, life-event, market, and Dream decks.
- Purchase impact previews, property financing, share/unit purchases, asset sales through the specified market-buyer event, Bank Loans (20 GM limit, interest-only payments), principal repayments, bankruptcy and optional restart.
- Financial statement, assets/liabilities view, activity log filters, cash-flow chart, Rat Race exit check, Fast Track business purchases, Dream victory, cash-flow victory, turn-limit results.
- Local autosave/resume, undo history, pass-and-play handover, responsive interface, keyboard focus styling, reduced-motion preference, sound toggle, and compact display preference.

## Known limitations

- Online multiplayer and cross-device synchronization are not implemented.
- Financial card values and several event effects are intentionally simplified for game balance. The app is a fictional game, not a real-world finance simulator.
- Local dependencies could not be installed in the authoring environment because the npm registry was unreachable. Run `npm install`, `npm run build`, and `npm test` in an environment with internet access before release. The core engine was separately type-checked in the authoring environment.

## Commands

- `npm run dev` — development server
- `npm run build` — type-check and production build
- `npm test` — focused game-engine tests
