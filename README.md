# WorkTracker

WorkTracker is a local desktop time tracker built with Electron, React, and SQLite.

## Features

- Start and stop work tracking.
- Continue timing in the background and from the system tray.
- Sample the active application and window title every second.
- Exclude idle time from active work time using OS mouse/keyboard inactivity.
- Store all data locally in SQLite.
- Show current session, today's totals, top applications, and 30-day history.
- Retain only the last 90 days of tracking history.

## Run

```bash
npm install
npm run dev
```

The SQLite database is stored in Electron's user data directory as `worktracker.db`.

## Add To Linux Apps And Startup

Build the app and install launcher entries:

```bash
npm run desktop:install
```

This creates:

- `~/.local/share/applications/worktracker.desktop` for the app menu.
- `~/.config/autostart/worktracker.desktop` to launch WorkTracker when you log in.

After that, search for `WorkTracker` in your applications menu. It will also start automatically after your next login.

If the app menu launch fails, check:

```bash
tail -n 80 ~/.local/state/worktracker/launcher.log
```
