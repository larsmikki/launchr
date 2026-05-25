# Linky

A lightweight, self-hosted web launcher. Organize your bookmarks into a drag-and-drop grid with collapsible groups and auto-fetched favicons.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-larsmikki%2Flinky-blue?logo=docker)](https://hub.docker.com/r/larsmikki/linky)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-larsmikki%2Flinky-blue?logo=github)](https://github.com/larsmikki/linky/pkgs/container/linky)
[![Last Commit](https://img.shields.io/github/last-commit/larsmikki/linky)](https://github.com/larsmikki/linky/commits/main)

![Linky screenshot](resources/screenshot.png)

## Getting started

Pick whichever install path matches your setup. All paths land on [http://localhost:3020](http://localhost:3020).

### 1. Docker (Docker Desktop, NAS, or any Docker server)

Works on Synology, Unraid, TrueNAS, QNAP, Proxmox, or a plain Docker host.

```bash
docker run -d \
  --name linky \
  -p 3020:3020 \
  -v linky-data:/app/data \
  --restart unless-stopped \
  larsmikki/linky:latest
```

Or pull the published Compose file:

```bash
curl -O https://raw.githubusercontent.com/larsmikki/linky/main/docker-compose.yml
docker compose up -d
```

### 2. Local install on Windows

Requires [Git for Windows](https://git-scm.com/download/win) and [Node.js 20+](https://nodejs.org/).

```powershell
git clone https://github.com/larsmikki/linky.git
cd linky
npm run setup
npm run dev
```

For a production build: `npm run build && npm start`.

### 3. Local install on macOS

```bash
brew install node git
git clone https://github.com/larsmikki/linky.git
cd linky
npm run setup
npm run dev
```

For a production build: `npm run build && npm start`.

### 4. Local install on Linux

Debian/Ubuntu:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

git clone https://github.com/larsmikki/linky.git
cd linky
npm run setup
npm run dev
```

On Fedora/RHEL use `dnf install nodejs git`; on Arch use `pacman -S nodejs npm git`.

For a production build: `npm run build && npm start`.

## Usage

- **Right-click** the background to add shortcuts or groups
- **Right-click** a shortcut or group to edit, move, or delete
- **Long-press** on touch devices works the same way
- Enable **Arrange Mode** from the context menu to drag items around the grid

## Features

- Grid layout with drag-and-drop repositioning
- Auto-fetched favicons with local caching
- Collapsible groups with custom colors
- Manual icon upload with fallback letter tiles
- 10 built-in themes including light and dark modes
- Row and column layout modes
- Import / export for backup and migration
- Responsive — works on mobile and desktop
- Data persisted in SQLite

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `PORT` | `3020` | Port the server listens on |
| `DATA_DIR` | `/app/data` | Directory for database and icon cache |
| `ALLOWED_ORIGINS` | `http://localhost:3020` | Comma-separated allowed CORS origins |

## Data Persistence

Data is stored in a Docker volume (`linky-data`) at `/app/data` inside the container. Back up via Settings → Export, or copy the volume contents directly.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Express, TypeScript
- **Database:** SQLite (via sql.js)
- **Icons:** Sharp for image processing

## Support

If you find Linky useful, consider [buying me a coffee](https://buymeacoffee.com/larsmikki). Linky is and always will be free, open source, and self-hosted.
