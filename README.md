# Aabhira Jewels — Website Setup Guide (Hinglish)

Plain HTML/CSS/JS website — koi build tool, npm install nahi chahiye. Do free services use ho rahi hain:

- **Firebase** (Google) → product data, admin login. **Spark (free) plan**, card nahi chahiye.
- **Cloudinary** → sirf photo/video ke liye. Free plan me kaafi generous limit hai, card yahan bhi nahi chahiye.

**5 files:** `index.html`, `style.css`, `app.js`, `firebase-config.js`, `README.md`

---

## Kaise access hota hai (poora security model samajh lo)

> **Note:** Shuru me humne "Sign in with Google" (OAuth) try kiya tha, lekin kai mobile/tablet browsers me yeh redirect reliably kaam nahi karta (browser ki privacy settings login ka result "bhool" jaati hain). Isliye ab hum seedha **email + password login** use kar rahe hain — yeh har device pe 100% reliably kaam karta hai.

1. Website ke search bar me secret phrase daalo → login screen khulti hai
2. **Step 1:** apna admin email + password daalo (yeh Firebase me tumne/maine manually banaya hoga — tumhare **asli Gmail password se alag** hai, sirf isi website ke liye hai)
3. **Step 2:** ek chhota panel password daalo (extra layer)
4. Dono sahi hone pe hi admin panel khulta hai

Asli security yeh hai: **sirf wahi log login kar sakte hain jinke liye humne khud Firebase console me account banaya hai** — koi bhi random insaan apna email/password bana ke andar nahi ghus sakta, website pe kahin "sign up" ka option hai hi nahi.

---

## Step 1 — Firebase project banao (free)

1. [console.firebase.google.com](https://console.firebase.google.com) → login → **"Add project"** → naam do → Analytics off kar sakte ho → Create.

## Step 2 — Firestore aur Authentication on karo

**Build** section me:
1. **Firestore Database** → Create database → production mode → region `asia-south1` (ya paas wala) → Enable.
2. **Authentication** → Get started → Sign-in method tab → **"Email/Password"** provider ko enable karo.

## Step 3 — Website ko apni Firebase keys do

1. ⚙️ **Project settings** → "Your apps" → **`</>`** web icon → naam do → Register.
2. `firebaseConfig = {...}` wala code copy karo → `firebase-config.js` file me `PASTE_...` values replace karo.

## Step 4 — Cloudinary banao (photos + videos ke liye, free, no card)

1. [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) pe account banao.
2. Dashboard pe **"Cloud name"** copy karo.
3. Settings (⚙️) → **Upload** tab → **Upload presets** → **Add upload preset**.
4. **Signing Mode = "Unsigned"** karo (zaroori) → Save.
5. Cloud name aur preset naam `firebase-config.js` me `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_UPLOAD_PRESET` ki jagah daal do.

## Step 5 — Admin login accounts banao (zaroori security step)

Yeh step Firebase console me karna hai — website se nahi (security ke liye zaroori hai):

1. Firebase console → **Authentication** → **Users** tab → **"Add user"**
2. Har admin (tum, friend, koi bhi recovery account) ke liye:
   - **Email:** unka Gmail address (jaise `friend@gmail.com`)
   - **Password:** koi bhi strong password chuno — **yeh unke Google account ka password nahi hai**, sirf isi website ke liye ek naya password hai. Unhe yeh password bata dena.
3. Repeat karo har admin ke liye

**Naya admin baad me add karna ho:** wapas isi jagah (Authentication → Users → Add user) — 2 minute ka kaam hai, website se nahi hota (jaan-boojh kar, security ke liye).

## Step 6 — Pehla Firestore document banao (panel password + record ke liye)

1. **Firestore Database → Data tab** → "Start collection" → Collection ID: `config` → Next
2. Document ID: `admins`. Do fields banao:
   - `emails` → type **array** → sabhi admin emails daal do (sirf record/display ke liye, yeh access control nahi karta — asli control Step 5 wale Users list se hota hai)
   - `panelPassword` → type **string** → koi bhi shuruaati password (baad me admin panel se change ho sakta hai)
3. Ek aur document banao usi `config` collection me — Document ID: `settings` (khaali chhod sakte ho)

## Step 7 — Security rules laga do (zaroori)

Firestore Database → **Rules tab** me yeh paste karo → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /config/settings {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /config/admins {
      allow read, write: if request.auth != null;
    }

    match /products/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Matlab: koi bhi products dekh sakta hai, lekin sirf woh log jo Step 5 me signed-in hain (matlab jinke liye humne Firebase Users me account banaya) hi data change kar sakte hain.

## Step 8 — Website ko live karo (free hosting)

GitHub + Netlify (jo tumne already kar liya hai) — koi terminal nahi chahiye, tablet se hi ho jaata hai. Naye updates ke liye bas GitHub pe file re-upload karo, Netlify khud rebuild kar dega.

---

## Roz ka use — admin panel kaise khulega

1. Search bar me `shop admin` type karke Enter (yeh phrase `app.js` ki pehli line se badal sakte ho)
2. Apna admin **email + password** daalo (Step 5 wala)
3. Panel password daalo
4. Andar se:
   - **Products** → add/edit/delete, multiple photos + ek video per product
   - **Home banners** → home page ke upar slider ke liye images add/remove
   - **Shop settings** → naam, tagline, address, WhatsApp number, categories
   - **Admin access** → yahan sirf list dikhti hai kiske paas access hai; naya add/remove karna ho to Firebase console (Step 5) me karna hoga. Panel password yahan se change ho sakta hai.
5. Kaam ho jaaye to **"Sign out"**

## Enquiry list (cart jaisa, bina payment ke)

Customer kai products "Add to enquiry list" se select kar sakta hai, phir top ke bag icon se ek hi WhatsApp message me sab bhej sakta hai. **Payment kahin nahi hai** — yeh sirf ek shuruaati message hai, order/payment counter pe hi hoga.

## Copyright/footer

Footer me automatic dikhta hai: `© [current year] [Shop name]. All rights reserved.` — saal khud-ba-khud update hota rahega. Shop ka naam aur address "Shop settings" se aata hai.

> **Trademark (™):** jaan-boojh kar nahi lagaya — sirf tabhi lagana sahi hai jab naam/logo registered ho. Register karaya ho to bata dena, add kar dunga.

## Yeh site light kyu hai

- Koi heavy framework nahi — plain HTML/CSS/JS
- Images `loading="lazy"` — jab tak scroll na karo, load nahi hoti
- Cloudinary khud compress/optimize karta hai
- Firestore free tier chhoti/medium shop ke liye kaafi hai, koi card nahi

## Agar kuch fix karwana ho

Agli baar bata dena — seedha update kar dunga.
