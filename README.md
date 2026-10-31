# Luma — modern chat platform

A Next.js App Router starter for a Messenger-style social messaging product. The UI is Hungarian-first and responsive, with a clean purple/indigo visual identity.

## Included

- Email/username + password registration and login; hashed passwords and signed, HTTP-only session cookie
- Neon PostgreSQL data model via Prisma
- User search and friend requests (send, accept, reject)
- One-to-one conversations created when a friend request is accepted
- Text messages, image messages, emoji picker, GIF search/send (Tenor)
- Notifications and incoming friend request list
- Ably real-time message publishing/subscription (with a short polling fallback)
- LiveKit microphone voice-room token endpoint and client connection
- Cloudinary signed image upload
- Responsive desktop/mobile layout

## Stack

- Next.js 15 / React 19 / TypeScript
- Neon Postgres + Prisma
- Ably for realtime events
- LiveKit Cloud for voice calls
- Cloudinary for image storage
- Tenor API for GIF search

## Run locally

1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET`.
3. Create a Neon project and paste its pooled Postgres connection string into `DATABASE_URL`.
4. Install and initialize:

   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

5. Open http://localhost:3000.

## External services

The application starts with Neon + `AUTH_SECRET`. The following features require their respective keys:

- **Ably**: create an Ably app and set `ABLY_API_KEY`. Without it, the app uses 8-second message refresh as a fallback.
- **LiveKit**: create a LiveKit Cloud project; set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL`. The call control is audio-only at this stage.
- **Cloudinary**: set cloud name, API key, and API secret for image upload.
- **Tenor**: set `TENOR_API_KEY` for GIF search.

## Deploy to Vercel + Neon

1. Push this folder to a GitHub repository.
2. Import it in Vercel.
3. Add all required environment variables in Vercel Project Settings.
4. Set `DATABASE_URL` to the Neon pooled connection string (`-pooler` host is recommended for serverless).
5. Add a deploy build command if needed: `npx prisma generate && next build`.
6. After creating the Neon database, run `npx prisma db push` from a local terminal with the production `DATABASE_URL` (or use a migration workflow).
7. Add the deployed Vercel domain to any provider allowlists and update `NEXT_PUBLIC_APP_URL`.

## Important production work still required

This is a functional starter, not a production-hardened Messenger replacement. Before opening it publicly, add rate limiting and abuse prevention to auth/search/message endpoints, email verification and password reset, account deletion/export, blocking/reporting/moderation, message read receipts and delivery states, robust push notifications, upload size/type validation and malware scanning, content security policy, privacy/terms pages, logging/monitoring, and database migrations/backups. Use a transactional outbox or retry queue for reliable event publishing. Voice call invitations/ringing and multi-device call lifecycle are not implemented; the current LiveKit endpoint supplies a room token for a member of an existing chat.

## Database

Prisma schema is in `prisma/schema.prisma`. The first version stores messages and notifications in Neon. Image/GIF message content stores a hosted media URL. Do not put private API secrets in `NEXT_PUBLIC_*` variables.

## Luma – csoportok, személyre szabás és Stories

A további funkciók bekerültek:
- Csoportos beszélgetés létrehozása (név és tagok kiválasztása).
- Beszélgetésenként közös háttérkép URL, közös gyors reakció és tag-becenév.
- Sötét mód kapcsoló.
- Luma Stories: 24 órás lejárat, ismerősök és saját történetek listázása, publikálás HTTPS kép URL-lel.

A módosított Prisma sémát telepítéskor futtasd:
```bash
npx prisma generate
npx prisma db push
```
A sötét mód jelenleg a böngészőben futó felület állapota; a háttérkép, gyors reakció és becenév adatbázisba kerül, ezért minden résztvevő ugyanazt látja. A Stories képfeltöltéséhez jelenleg egy publikus HTTPS kép URL szükséges.


## Javított regisztráció és telepítési ellenőrzőlista

A regisztrációs API hibáját javítottuk: korábban a teljes űrlap-adatot továbbította a Prisma `User.create()` hívásnak, így a nem létező `password` mező miatt a felhasználó létrehozása hibára futott. Most csak a Prisma-modell mezői kerülnek mentésre, a jelszó pedig kizárólag `passwordHash` formában.

A Vercel projektben kötelező környezeti változók: `DATABASE_URL` (Neon PostgreSQL URL) és `AUTH_SECRET` (legalább 32 karakteres véletlenszerű titok).

A Prisma séma egyszeri telepítése a projekt mappájából: `npx prisma db push`. Ezt olyan terminálból futtasd, ahol a `DATABASE_URL` a Neon adatbázisra mutat. A Vercel Build Command maradhat: `npx prisma generate && next build`. A `postinstall` a Prisma Client generálását is lefuttatja telepítéskor. A `db push` nem fut automatikusan minden deploymentnél.

Ha a regisztráció továbbra is hibát ad, a Vercel → Deployments → legutóbbi deployment → Functions / Runtime Logs naplóban keresd az `[auth/register]` sort.


## Admin felhasználó és üdvözlő üzenet

A regisztráció első alkalommal automatikusan létrehozza a Luma admin felhasználót, és minden új felhasználóhoz külön privát beszélgetést nyit. Az admin automatikus üdvözlő üzenetet küld; az üzenet szövege a `WELCOME_MESSAGE` környezeti változóval módosítható.

Vercel Environment Variables:
- `ADMIN_EMAIL` – az admin belépési e-mail-címe (ajánlott beállítani)
- `ADMIN_USERNAME` – admin felhasználónév (ajánlott beállítani)
- `ADMIN_NAME` – megjelenített név (opcionális, alapértelmezés: Luma Admin)
- `ADMIN_PASSWORD` – admin jelszó (erősen ajánlott beállítani; ha nincs megadva, véletlenszerű, nem ismert jelszó készül)
- `WELCOME_MESSAGE` – új felhasználónak küldött üdvözlő üzenet (opcionális)

## Új funkciók adatbázis-frissítése

A Prisma modell új mezőket kapott (`User.role`, `ChatMember.archivedAt`, `ChatMember.mutedUntil`, `ChatMember.deletedAt`, `Message.deletedAt`). A telepítés után egyszer futtasd:
```bash
npx prisma generate
npx prisma db push
```
A módosítás után Vercelben indíts új Production deploymentet.

A beszélgetések archiválása, némítása és törlése felhasználónként működik. A törlés a felhasználó saját listájából rejti el a beszélgetést, a másik résztvevő előzményeit nem törli. Az üzenetek módosítása csak a saját üzenetekre engedélyezett; törölni a saját üzenetet, illetve admin jogosultsággal más üzenetét is lehet. A törölt üzenet helyén törlési jelzés marad.
