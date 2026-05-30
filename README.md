# ⚡ TeamFlow — Setup Guide
## তোমার টিম ম্যানেজমেন্ট অ্যাপ চালু করতে মাত্র ৩টা ধাপ

---

## ধাপ ১ — Supabase সেটআপ (৫ মিনিট, ফ্রি)

1. যাও → https://supabase.com → "Start your project" → Google দিয়ে sign up
2. "New project" ক্লিক করো → নাম দাও (যেমন: teamflow) → পাসওয়ার্ড দাও → Create
3. প্রজেক্ট তৈরি হলে বাম মেনু থেকে **SQL Editor** খোলো
4. `supabase_setup.sql` ফাইলের সব কোড copy করে paste করো → **Run** চাপো
5. এখন **Settings → API** থেকে দুটো জিনিস copy করো:
   - Project URL (https://xxxxx.supabase.co)
   - anon public key

---

## ধাপ ২ — App এ Supabase যুক্ত করো (২ মিনিট)

`src/lib/supabase.js` ফাইল খোলো:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'  // ← তোমার URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'                // ← তোমার key
```

এই দুটো জায়গায় তোমার copy করা URL ও key বসাও।

---

## ধাপ ৩ — App Deploy করো Vercel এ (৫ মিনিট, ফ্রি, permanent link)

1. যাও → https://github.com → নতুন repository বানাও (যেমন: teamflow)
2. এই পুরো folder টা upload করো (drag & drop)
3. যাও → https://vercel.com → "New Project" → GitHub repo select করো → Deploy
4. ৩০ সেকেন্ডে তোমার app live হয়ে যাবে!
5. Vercel একটা link দেবে যেমন: https://teamflow-xxx.vercel.app
6. এই link টা টিমকে share করো — ওরা গিয়ে account খুলবে!

---

## Admin হওয়ার পদ্ধতি (প্রথমবার)

প্রথমে তুমি sign up করো। তারপর Supabase → Table Editor → profiles table → তোমার row খোলো → role কলামে `admin` লিখে save করো।

এরপর থেকে তুমি Admin Panel দেখতে পাবে এবং task assign করতে পারবে।

---

## Local এ Test করতে চাইলে

Node.js install থাকলে:

```bash
npm install
npm run dev
```

তারপর browser এ যাও: http://localhost:5173

---

## সমস্যা হলে

- Supabase URL বা key ভুল → supabase.js ফাইল চেক করো
- SQL error → supabase_setup.sql আবার run করো
- Deploy fail → Vercel এর logs দেখো

---

**তোমার টিম এখন এই app ব্যবহার করতে পারবে! 🎉**
