# Aabhira Jewels — Website Setup Guide (Hinglish)

Plain HTML/CSS/JS website — koi build tool, npm install nahi chahiye. Do free services use ho rahi hain:

- **Firebase** (Google) → product data, admin login. **Spark (free) plan**, card nahi chahiye.
- **Cloudinary** → sirf photo/video ke liye. Free plan me kaafi generous limit hai, card yahan bhi nahi chahiye.

**5 files:** `index.html`, `style.css`, `app.js`, `firebase-config.js`, `README.md`

---

## Kaise access hota hai (poora security model samajh lo)

Yeh website **tumhare** Google account se bane Firebase project pe chalti hai — poora control tumhare paas rahega. Friend (ya koi bhi admin) ka access alag tarike se milta hai:

1. Website ke search bar me secret phrase daalo → login screen khulti hai
2. **Step 1:** apne Google account se sign in karo
3. Sirf woh Google account jo tumne pehle se "allowed list" me daala hai — usi ko aage jaane diya jaata hai. Baaki koi bhi Google account try kare, turant "not authorized" dikhega
4. **Step 2:** ek chhota panel password daalo (extra layer)
5. Dono pass hone pe hi admin panel khulta hai

Asli security **allowed list** pe hai, panel password sirf ek extra hurdle hai — is se koi bhi random Google account, chahe usko panel password pata bhi ho, andar nahi jaa sakta.

---

## Step 1 — Firebase project banao (free)

1. [console.firebase.google.com](https://console.firebase.google.com) → login → **"Add project"** → naam do → Analytics off kar sakte ho → Create.

## Step 2 — Firestore aur Authentication on karo

**Build** section me:
1. **Firestore Database** → Create database → production mode → region `asia-south1` (ya paas wala) → Enable.
2. **Authentication** → Get started → Sign-in method tab → **Google** provider ko enable karo (Email/Password ki zaroorat nahi ab).

## Step 3 — Website ko apni Firebase keys do

1. ⚙️ **Project settings** → "Your apps" → **`</>`** web icon → naam do → Register.
2. `firebaseConfig = {...}` wala code copy karo → `firebase-config.js` file me `PASTE_...` values replace karo.

## Step 4 — Cloudinary banao (photos + videos ke liye, free, no card)

1. [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) pe account banao.
2. Dashboard pe **"Cloud name"** copy karo.
3. Settings (⚙️) → **Upload** tab → **Upload presets** → **Add upload preset**.
4. **Signing Mode = "Unsigned"** karo (zaroori) → Save.
5. **Sujhaav:** isi preset ke "Format restrictions" me sirf `jpg,png,webp,mp4,mov` allow karo, aur agar option dikhe to max file size bhi set kar do (image ~10MB, video ~50MB kaafi hai ek product ke liye). Isse koi random bada file daal ke tumhara free quota waste nahi kar payega.
6. Cloud name aur preset naam `firebase-config.js` me `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_UPLOAD_PRESET` ki jagah daal do.

## Step 5 — Pehla admin manually banao (sirf ek baar, zaroori security step)

Website khud apna pehla admin nahi bana sakti (warna koi bhi khud ko admin bana lega) — isliye yeh ek step tumhe khud Firebase console me karna hoga:

1. Firebase console → **Firestore Database** → "Start collection" → collection ID: `config`.
2. Document ID: `admins`. Uske andar 2 fields banao:
   - `emails` → type **array** → usme apna aur friend ka Gmail daal do (jaise `["tumhara@gmail.com","friend@gmail.com"]`)
   - `panelPassword` → type **string** → koi bhi shuru ka password (baad me admin panel se change ho sakta hai)
3. Ek aur document banao usi `config` collection me — Document ID: `settings` (khaali chhod sakte ho, website apne aap default values daal degi pehli baar khulne pe... agar nahi daalti to admin panel ke "Shop settings" se ek baar Save daba dena).

Ab jo bhi email `emails` array me hai, wahi Google account admin panel khol sakta hai. Naye/recovery account baad me **admin panel → "Admin access" tab** se hi add ho sakte hain, code chhue bina.

## Step 6 — Security rules laga do (zaroori)

Firestore Database → **Rules tab** me yeh paste karo → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails;
    }

    match /config/admins {
      allow read, write: if request.auth != null &&
        request.auth.token.email in resource.data.emails;
    }

    match /config/settings {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /products/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

Matlab: koi bhi products dekh sakta hai, lekin sirf allowed Google account hi kuch change kar sakta hai — Google login ke baad bhi, agar email list me nahi hai to kuch bhi read/write nahi hoga.

## Step 7 — Website ko live karo (free hosting)

**Firebase Hosting:**
1. [Node.js](https://nodejs.org) install karo → terminal me `npm install -g firebase-tools`
2. Is folder ke andar: `firebase login` → `firebase init hosting` (public directory: `.`, single-page app: No)
3. `firebase deploy` → live URL milega (jaise `aabhira-jewels.web.app`)

**Ya Netlify (bina terminal ke):** [netlify.com](https://netlify.com) → free account → poore folder ko "Deploy manually" box me drag-drop karo → turant live link.

---

## Roz ka use — admin panel kaise khulega

1. Search bar me `shop admin` type karke Enter (yeh phrase `app.js` ki pehli line se badal sakte ho)
2. **"Continue with Google"** → apna allowed Google account choose karo
3. Panel password daalo
4. Andar se:
   - **Products** → add/edit/delete, multiple photos + ek video per product
   - **Home banners** → home page ke upar slider ke liye images add/remove
   - **Shop settings** → naam, tagline, address, WhatsApp number, categories
   - **Admin access** → naye Google account add/remove karo, panel password badlo
5. Kaam ho jaaye to **"Sign out"**

> Har baar naya session (browser band karke dobara kholne pe) same poora process dobara karna padega — Google apne aap silently sign-in kar sakta hai (agar pehle se signed in ho), lekin panel password har baar dobara maangega.

## Enquiry list (cart jaisa, bina payment ke)

Customer kai products "Add to enquiry list" se select kar sakta hai, phir top ke bag icon se ek hi WhatsApp message me sab bhej sakta hai. **Payment kahin nahi hai** — yeh sirf ek shuruaati message hai, order/payment counter pe hi hoga, jaisa tumne bola.

## Copyright/footer

Footer me automatic dikhta hai: `© [current year] [Shop name]. All rights reserved.` — saal khud-ba-khud update hota rahega. Shop ka naam aur address "Shop settings" se aata hai.

> **Trademark (™) ke baare me:** Maine yeh symbol jaan-boojh kar nahi lagaya. ™ tabhi lagana sahi hai jab naam/logo actually registered ho. Agar future me trademark register karate ho, bata dena, ek line add kar dunga.

## Yeh site light kyu hai

- Koi heavy framework nahi — plain HTML/CSS/JS
- Images `loading="lazy"` — jab tak scroll na karo, load nahi hoti
- Cloudinary khud compress/optimize karta hai, CDN se fast deliver hota hai
- Firestore free tier chhoti/medium shop ke liye kaafi hai, koi card nahi

## Agar kuch fix karwana ho

Agli baar bata dena — "yeh section add karo" ya "yeh badlo" bol dena, seedha update kar dunga.
