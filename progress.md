# Maket Lakay — Pwogrè Pwojè a

_Dènye mizajou: 24 septanm 2026_

Maket Lakay se yon mache an liy (marketplace) plizyè vandè pou Ayiti ak dyaspora a.

| | |
|---|---|
| **Sit an liy** | https://maket-lakay.vercel.app |
| **Kòd** | github.com/Espedro/maket-lakay (branch `main`, Vercel deplwaye otomatikman chak `push`) |
| **Teknoloji** | Next.js (App Router) · TypeScript · Tailwind · Supabase (Auth + Postgres + RLS) · Stripe Connect · Vercel |
| **Baz done** | Supabase `maket-lakay` (`arignidxbnrwwrjujxmo`, us-east-1, plan Free) |
| **Kantite commit** | 45 (30 jiyè → 12 septanm 2026) |

---

## Rezime rapid

- ✅ **Faz 1 (frontend/design)** fini epi an liy.
- ✅ **Backend reyèl (Supabase)**: prèske tout sistèm yo konekte ak vrè done kounye a (kont, katalòg, kòmand, vandè, admin, sipò, livrezon, komisyon, peman vandè).
- 🟡 **Peman pa kat (Stripe Connect)**: tout kòd la bati epi teste nan mòd test, men **li toujou etenn** (`CARD_PAYMENTS_ENABLED = false`) jiskaske vandè yo konekte kont Stripe yo.
- 🔴 **Pwoblèm kounye a**: yon vandè pa rive konekte kont Stripe li (gade [Stripe — Estati ak Pwoblèm](#stripe--estati-ak-pwoblèm-kounye-a)).

---

## Kronoloji travay la

### Faz 1 — Fondasyon ak design (30 jiyè – 3 out)
- Pwototip konplè marketplace la (kliyan, vandè, admin, sipò) ak done mock.
- Koulè prensipal mak la chanje an `#17233e`.
- Deplwaye sou Vercel ak deplwaman otomatik depi GitHub.

### Faz 2 — Otantifikasyon reyèl (3 out)
- Pwojè Supabase dedye kreye; tab `profiles`, `vendors`, `stores`, `categories`, `products` ak RLS.
- Paj `/login` ak `/signup` reyèl (Supabase Auth).
- Ansyen "role switcher" mock la retire → sesyon reyèl ak wòl (customer / vendor / admin / support).
- Konfimasyon imèl **etenn** pou kounye a (SMTP gratis Supabase la twò limite).

### Faz 3 — Katalòg ak kòmand reyèl (3–4 out)
- Katalòg piblik (pwodui, magazen, kategori, rechèch) li nan Supabase.
- Vandè ka kreye vrè pwodui.
- Aplikasyon vandè (`/sell`) → apwobasyon admin kreye vrè kont vandè + magazen.
- Checkout kreye vrè kòmand (`orders`, `order_items`), vandè ak kliyan wè yo.
- Admin wè tout itilizatè ak tout kòmand; admin ka chanje wòl yon moun.

### Faz 4 — Eksperyans kliyan (4 out)
- Adrès, wishlist, ak avi (pwodui + magazen) reyèl, sou tout aparèy.
- Checkout itilize adrès reyèl kliyan an te anrejistre.

### Faz 5 — Eksperyans vandè (4–5 out)
- Pwomosyon, demann peman (payout), ak istwa lajan reyèl.
- Bous vandè (wallet) kalkile an dirèk sou kòmand reyèl yo (8% komisyon), pa gen balans ki ka dekale.
- Chanjman estati kòmand (confirm / ship / deliver) sove nan Supabase.
- Paramèt magazen (`/vendor/settings`) reyèl.
- Frè livrezon soti nan vrè tab `delivery_zones` (admin ka modifye yo).

### Faz 6 — Sipò, dispit, ranbousman (5–8 out)
- Dispit + prèv (foto) + demann ranbousman reyèl pou kliyan / vandè / admin.
- Tikè sipò ak mesaj reyèl; wòl `support` gen aksè.
- Admin ka apwouve ranbousman ak rezoud dispit pou tout bon.

### Faz 7 — Operasyon (8–9 out)
- Komisyon (default + pa vandè) reyèl.
- Admin ka make kòmand "pou revize" oswa "ranbouse".
- Livrezon: asiyasyon, swivi kòmand (tracking), prèv livrezon reyèl.
- Admin payout requests konekte ak vrè demann vandè yo (anvan sa se te yon kopi mock).
- Odit done tès: tout done tès yo netwaye.

### Faz 8 — Stripe (4 out → 21 out)
- **4 out**: Stripe Payment Element nan checkout (nimewo kat pa janm pase sou sèvè nou).
- **20 out**: Stripe te make kont lan pou "payment facilitation" (yon sèl kont ap resevwa lajan pou plizyè vandè). Peman pa kat **etenn** (kill switch).
- **20 out**: Migrasyon sou **Stripe Connect** (Separate Charges and Transfers):
  - Vandè kreye yon kont Stripe Express nan `/vendor/settings` → "Connect with Stripe".
  - Checkout verifye PaymentIntent la sou sèvè a, anrejistre kòmand yo, epi voye pati chak vandè ba li (transfer).
  - Admin: badj estati Stripe sou lis vandè yo + paj `/admin/payout-reconciliation` pou transfè ki echwe.
- **21 out**: 2 bug korije pandan tès konplè nan mòd test (estati vandè pa t mete ajou apre onboarding; fòm kat la te disparèt anvan "Place order").

### Faz 9 — Koreksyon apre itilizatè reyèl (14 out → 12 sept)
- Aplikasyon vandè ki te echwe san mesaj → korije.
- Header te rete "Log in" apre enskripsyon → korije; lyen "Become a vendor" nan kont kliyan.
- Dokiman PDF: *App Flow* ak *Case Study* (nan `docs/`).
- Apwobasyon vandè ki pa t kreye kont reyèl → korije.
- Dashboard vandè ki te kraze ("Application error") pou vandè reyèl → korije.
- Paj erè global (pa gen ekran blan ankò).
- Moderasyon pwodui admin (`/admin/products`) reyèl.
- Admin users montre sèlman vrè kont yo.
- Panye/checkout ki te efase pwodui vandè reyèl yo san di anyen → korije.
- Istwa kòmand kliyan (`/orders`) montre vrè kòmand yo.
- **Forgot password / reset password** ajoute (lyen rekiperasyon pa imèl).

---

## Stripe — Estati ak pwoblèm kounye a

**Kisa ki konfigire:**
- Kle Stripe (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`) mete nan `.env.local` ak Vercel (Production / Preview / Development). Kle lokal yo se kle **test** (`pk_test` / `sk_test`).
- Stripe Connect mache nan mòd test: kont platfòm lan aktif, epi yon kont vandè tès te konekte avèk siksè 21 out.
- Peman pa kat pou kliyan: **toujou etenn** (`CARD_PAYMENTS_ENABLED = false` nan `lib/stripe/client.ts` ak `lib/stripe/server.ts`).

**Pwoblèm vandè a rapòte (24 sept):**
- Sèl vandè reyèl la (magazen "Sens") pa gen okenn kont Stripe: `stripe_connect_account_id` vid nan baz done a, epi pa gen okenn kont ak imèl li sou Stripe. Sa vle di tantativ la te kraze **anvan oswa pandan** kreyasyon kont lan, pa pandan fòm Stripe la.
- Log Vercel yo pa kenbe dat sa a ankò, kidonk nou pa ka wè erè egzak la.
- Screenshot vandè a (peyi: United States) montre *"Couldn't start payout setup — Something went wrong. Please try again."* Mesaj sa a parèt sèlman lè sèvè a kraze san l pa voye JSON, sa ki konfime bug ki anba a.
- **Bug nou jwenn epi korije (poko deplwaye):** lè Stripe te voye yon erè, sèvè a te kraze (500) epi vandè a te wè sèlman *"Something went wrong"*. Kounye a `lib/stripe/connect.ts` retounen vrè mesaj Stripe la, konsa vandè a (ak nou) ap wè rezon an.

**Kòz ki pi posib yo:**
1. **Peyi**: Stripe Connect pa sipòte Ayiti. Vandè a dwe gen yon kont labank / biznis Ozetazini, Kanada oswa Frans (sèl chwa yo nan fòm lan). Si li pa genyen, li pa ka fini.
2. **Kle live vs test**: si pwodiksyon an sou kle **test**, onboarding lan se yon sandbox, epi vandè a pa p janm resevwa vrè lajan. Si li sou kle **live**, fòk Connect aktive epi "platform profile" la ranpli nan dashboard Stripe live la (Stripe te deja make kont lan 20 out).
3. Yon lòt erè Stripe (imèl, enfòmasyon biznis…) ki kounye a ap parèt klè apre koreksyon an fin deplwaye.

**Pwochen etap:**
- Deplwaye koreksyon mesaj erè a, epi mande vandè a eseye ankò pou nou wè mesaj egzak la.
- Konfime nan dashboard Stripe si pwodiksyon an sou kle test oswa live, epi si Connect aktive an live.
- Konfime nan ki peyi vandè a gen kont labank li.

---

## Sa ki rete pou fè

| Priyorite | Travay | Kiyès ki dwe fè l |
|---|---|---|
| 1 | Rezoud konèksyon Stripe vandè a (gade anwo) epi limen peman pa kat (`CARD_PAYMENTS_ENABLED = true`) | Pwopriyetè a + dev |
| 2 | Pase sou kle Stripe **live** + aktive Connect an live | Pwopriyetè a |
| 3 | SMTP reyèl (Resend / SendGrid) + relimen konfimasyon imèl | Pwopriyetè a (ranvwaye) |
| 4 | Webhook Stripe pou transfè (kounye a se paj reconciliation admin lan ki ranplase l) | Dev |
| 5 | Pwoteksyon modpas ki koule (leaked password): bezwen plan Pro Supabase | Pwopriyetè a (ranvwaye) |

**Ti bagay ki konnen men ki pa ijan:**
- Komisyon admin konfigire a pa afekte kalkil peman an (8% fiks nan `lib/payments.ts`).
- Plizyè paj admin/vandè/sipò toujou melanje done demo (`mergeOrders`) ak done reyèl.
- `components/admin/refunds-disputes-client.tsx` ak `components/orders/admin-delivery-client.tsx`: konpozan ki pa itilize okenn kote.
- Lis kòmand vandè a montre ID kliyan an olye non li.
- Pa gen tès otomatik; `lib/i18n.ts` (Kreyòl / Fransè) poko fèt.
