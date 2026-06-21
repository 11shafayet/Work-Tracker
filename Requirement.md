Build a desktop application named WorkTracker using Electron, React, and SQLite.

Requirements:

1. Start and stop work tracking.
2. Run timer in the background.
3. Detect active application and active window title every second.
4. Track duration spent in each application.
5. Detect user idle time from mouse and keyboard inactivity.
6. Automatically exclude idle time from productive work time.
7. Store all data locally in SQLite.
8. Show dashboard with:
   - Current session time
   - Today's tracked time
   - Active time
   - Idle time
   - Top applications used
   - last 30 days history.
   - we will only keep last 90 days history. 
9. Support system tray and continue tracking when minimized.
10. No screenshots, cloud sync, user accounts, or team management.

Architecture:
- Electron
- React
- SQLite
- Clean folder structure
- Service layer for tracking
- Repository layer for database access

Generate the project step-by-step. Start with project structure and database schema first. Then move on.