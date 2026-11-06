# Plugin install & verify — Creator Studio MCP

Ye plugin AntiGem ke extension system se Creator Studio app se baat karta hai.
Agent ko 18 `studio_*` tools + built-in skills ka access milta hai.

## Install (ZIP se)

1. Pehle app me **Studio ek baar khol lo** (floating switcher → Studio icon) — server start ho jayega.
2. GitHub release page se **`CreatorStudio-MCP-plugin.zip`** download karo (v1.0.1 se attached hai).
3. App me: **Settings → Skills & Plugins (WebView Extensions) → Install** → ZIP select karo.
4. Install ke baad plugin list me **Creator Studio MCP** enabled dikhna chahiye.

## Agent me connect karna (MCP)

1. App: **Settings → MCP → Custom AntiGem Plugin MCP** → `creator-studio` select karo.
2. Chat kholo aur test karo:

   > studio_health tool chala ke dekho

   Agent `{ready: true}` dikhaye to connection perfect hai.

## Tools (18)

| Tool | Kaam |
| --- | --- |
| `studio_health` | Server live check |
| `studio_ideas_list` / `studio_idea_add` / `studio_idea_update` | Idea Bank manage |
| `studio_pipeline_list` / `studio_pipeline_start` / `studio_stage_next` / `studio_run_retry` | 8-stage production run chalana |
| `studio_videos_list` / `studio_video_record` | Video records + upload package (title/description/tags/chapters/pinned comment) save |
| `studio_brain_overview` / `studio_brain_question_add` / `studio_brain_experiment_toggle` | Research brain |
| `studio_dashboard` | Channel health summary |
| `studio_settings_get` / `studio_settings_set` | Settings (keys masked) |
| `studio_skills_list` / `studio_skill_get` | Skill playbooks padhna |

## Troubleshooting

- **"server band hai" error** → app me Studio kholo, 10-30s do, phir tool retry.
- **Tools list me nahi aa rahe** → Settings → MCP me refresh karo; plugin enabled hai confirm karo.
- **Permission denied type errors** → Local Tools install nahi hai — Settings → Local Tools complete karo.
