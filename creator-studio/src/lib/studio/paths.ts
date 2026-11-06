// Studio data base dir — ek hi jagah decide hota hai.
//  - Dev/local: <project>/data  (process.cwd())
//  - Device   : AntiGem StudioServerManager STUDIO_DATA_DIR env set karta hai
//               (~/creator-studio/data) — APK update par build files badal
//               jaate hain par user ka data yahin preserve rehta hai.
export const DATA_BASE = process.env.STUDIO_DATA_DIR ?? process.cwd();
