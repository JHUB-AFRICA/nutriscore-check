# NutriScore Checkout Tool (Kenya)

A Chrome extension (Manifest V3) that helps shoppers check NutriScore ratings at checkout on Kenyan grocery retailer sites, paired with a companion web app.

## Overview

This project consists of two connected components:

- **Browser Extension** — "NutriScore Checkout Tool (Kenya)", built on Manifest V3, designed to surface NutriScore information while checking out on **Naivas** and **Carrefour Kenya** online stores.
- **Website** — [nutriscore-check.vercel.app](https://nutriscore-check.vercel.app), which works alongside the extension.

The extension and website are linked together via:
- **Google OAuth** (using a client ID) for authentication
- **Extension messaging** via `externally_connectable`, allowing the website to communicate directly with the extension

## Repository

- Repo name: `nutriscore-check`
- Hosted across two collaborating GitHub accounts: `robinwanyoa7` and `JHUB-AFRICA`

## License

_Not yet specified._
