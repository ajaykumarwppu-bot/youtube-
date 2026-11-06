# YouTube Setup — Beginner Guide (step-by-step)

Creator Studio ko YouTube ke saath connect karne ke liye ek baar ye setup karna hota hai.
Time: ~20-30 minute. Sab kuch browser me hota hai, phir keys Studio ke Settings me paste hoti hain.

## 1. Google Cloud Project banao

1. [console.cloud.google.com](https://console.cloud.google.com) kholo → Google account se login.
2. Top bar → **Select a project → New Project** → Naam: `creator-studio` → **Create**.
3. Naya project select karo.

## 2. APIs enable karo

1. Left menu → **APIs & Services → Library**.
2. Search: **YouTube Data API v3** → **Enable**.
3. Search: **YouTube Analytics API** → **Enable**.

## 3. OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. App name: `Creator Studio` → User support email → Developer email → **Save**.
4. **Scopes** step: skip (Add or remove scopes kuch mat karo) → **Save**.
5. **Test users** step: **+ Add users** → apna Gmail (jiske channel par upload karna hai) → **Save**.
   - Ye sabse zaroori step hai — iske bina "Access blocked" error aayega.

## 4. OAuth Client (Refresh Token ke liye)

1. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** me add karo: `https://developers.google.com/oauthplayground`
4. **Create** → **Client ID** + **Client Secret** copy kar lo (dono Studio me jayenge).

## 5. Refresh Token generate karo

1. [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground) kholo.
2. Right side gear (⚙️) → **Use your own OAuth credentials** tick karo → Client ID/Secret paste karo.
3. Left side **Step 1** me niche type karo:
   `https://www.googleapis.com/auth/youtube` → **Authorize APIs** → apna account select → "App not verified" aaye to **Advanced → Go to creator-studio (unsafe)** → **Allow**.
4. **Step 2**: **Exchange authorization code for tokens** → **Refresh token** copy kar lo.
   - Refresh token kabhi expire nahi hota (test mode me 7 din baad maal ho sakta hai — us case me phir se generate).

## 6. Keys Studio me daalo

1. App me **Studio** kholo (floating switcher → Studio icon).
2. **Settings tab** → **Integrations** → **YouTube** card:
   - Client ID → paste
   - Client Secret → paste
   - Refresh Token → paste
3. Save. Status **connected** dikhna chahiye.

## 7. Test

Studio ke **Dashboard** kholo — agar YouTube connect hai to channel ka data dikhega.
Ya chat me agent se bolo: *"studio_settings_get chala ke dekho YouTube connected hai ya nahi"*.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Access blocked: app not verified` | Consent screen → Test users me apna Gmail add karo (step 3.5) |
| `invalid_grant` | Refresh token purana/galat — OAuth playground se naya generate karo |
| `quotaExceeded` | YouTube Data API free quota 10,000 units/day — kal try karo ya ek chhota project aur banao |
| 7 din baad token fail | Consent screen "Testing" mode ki limit — Google Cloud me **Publish app** dabao (verification maangega hi nahi, sirf apna use hai) |

## Data safety

- Saari keys sirf **aapke phone ke andar** (`~/creator-studio/data/`) save hoti hain — kisi server par nahi jati.
- App me koi telemetry/analytics nahi hai.
