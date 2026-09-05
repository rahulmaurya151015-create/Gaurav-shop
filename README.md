# Sree Shiv Alankar Mandir — Website Setup Guide (Hinglish)

Plain HTML/CSS/JS website — koi build tool, npm install nahi chahiye. Do free services use ho rahi hain:

- **Firebase** (Google) → product data, admin login. **Spark (free) plan**, card nahi chahiye.
- **Cloudinary** → sirf photo/video ke liye. Free plan me kaafi generous limit hai, card yahan bhi nahi chahiye.

**5 files:** `index.html`, `style.css`, `app.js`, `firebase-config.js`, `README.md`

---

## Kaise access hota hai

> **Note:** Shuru me "Sign in with Google" (OAuth) try kiya tha, lekin kai mobile/tablet browsers me yeh redirect reliably kaam nahi karta. Isliye ab **email + password login** use ho raha hai — har device pe 100% reliably kaam karta hai.

1. Website ke search bar me secret phrase daalo → login screen khulti hai
2. Apna admin email + password daalo (yeh Firebase me manually banaya gaya hai — tumhare **asli Gmail password se alag** hai, sirf isi website ke liye hai)
3. Sahi hote hi — agar sign-in welcome video set hai to woh pehle turant sound ke saath play hoga, khatam hote hi admin panel khul jaata hai

Asli security yeh hai: **sirf wahi log login kar sakte hain jinke liye humne khud Firebase console me account banaya hai** — website pe kahin "sign up" ka option hai hi nahi, koi bhi random insaan andar nahi ghus sakta.

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

## Step 5 — Admin login accounts banao

Firebase console me (website se nahi — security ke liye jaan-boojh kar):

1. **Authentication** → **Users** tab → **"Add user"**
2. Har admin ke liye: **Email** (unka Gmail) + **Password** (naya password chuno, unka asli Google password nahi) → Add
3. Repeat har admin ke liye

**Naya admin baad me add karna ho:** yahi jagah — 2 minute ka kaam, website se nahi hota (jaan-boojh kar security ke liye).

## Step 6 — Firestore document banao (access record ke liye)

1. **Firestore Database → Data tab** → "Start collection" → Collection ID: `config` → Next
2. Document ID: `admins`. Field banao: `emails` → type **array** → sabhi admin emails daal do (sirf record/display ke liye)
3. Ek aur document banao usi `config` collection me — Document ID: `settings` (khaali chhod sakte ho)

## Step 7 — Security rules laga do

Firestore Database → **Rules tab** me yeh paste karo → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /config/settings {
      allow read: if true;
      allow write: if request.auth != null &&
        (
          !request.resource.data.diff(resource.data).affectedKeys().hasAny(['welcomeVideoUrl'])
          || request.auth.token.email == 'rahulmaurya151015@gmail.com'
        );
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

Yeh rule ka matlab: koi bhi admin shop settings (naam, WhatsApp, categories, etc.) badal sakta hai — lekin agar koi write `welcomeVideoUrl` field ko chhoo rahi hai, to **sirf `rahulmaurya151015@gmail.com`** allowed hai. Kisi aur admin account se try karo (chahe website ke code ko dekh ke seedha Firestore ko call bhi kare), yeh reject ho jayega — asli lock database ke level pe hai, sirf UI me chhupaya hua nahi.

## Step 8 — Website ko live karo

GitHub + Netlify (jo tumne already kar liya hai). Naye updates ke liye bas GitHub pe file re-upload karo, Netlify khud rebuild kar dega.

---

## Roz ka use — admin panel kaise khulega

1. Search bar me `shop admin` type karke Enter (yeh phrase `app.js` ki pehli line se badal sakte ho)
2. Apna admin **email + password** daalo
3. Andar se:
   - **Products** → add/edit/delete, multiple photos + ek video per product
   - **Home banners** → home page ke upar slider ke liye images add/remove
   - **Shop settings** → naam, tagline, address, WhatsApp number, categories
   - **Admin access** → kiske paas access hai uski list (record ke liye), aur yahin se **sign-in welcome video** upload/remove hoti hai
4. Kaam ho jaaye to **"Sign out"**

## Sign-in welcome video

Admin panel → **Admin access** tab → "Sign-in welcome video" me ek video upload kar do (chhota rakhna, 5-10 second, few MB — jitna halka utna better). Login screen khulte hi video background me load hona shuru ho jaati hai (customer ko yeh kabhi load nahi hoti — sirf tab jab koi admin login screen khole), isliye login hote hi turant, bina wait ke play ho jaati hai. Video poori dekhni zaroori hai — **koi skip button nahi hai**, khatam hone ke baad hi admin panel khulta hai. Agar kabhi browser sound-autoplay block kare (rare), ek "Tap to play" button aata hai — usse video sound ke saath shuru hoti hai, phir bhi poori dekhni padegi.

> **Sirf tumhare liye:** Yeh control sirf `rahulmaurya151015@gmail.com` se login karne pe dikhta hai — shop owner ka account (ya koi aur admin) is section ko dekh hi nahi sakta, upload/change/remove to door ki baat. Yeh sirf website me chhupaya nahi gaya — Step 7 ki security rules me database level pe bhi lock hai.

## Shop by category (image tiles)

Home page pe categories ki photo-tiles apne aap ban jaati hain — jo bhi pehla product kisi category me add hoga, uski photo tile ban jaayegi. Koi extra kaam nahi karna.

## Enquiry list (cart jaisa, bina payment ke)

Customer kai products "Add to enquiry list" se select kar sakta hai, phir top ke bag icon se ek hi WhatsApp message me sab bhej sakta hai. **Payment kahin nahi hai** — order/payment counter pe hi hoga.

## Copyright/footer

Footer me automatic: `© [saal] [Shop name]. All rights reserved.` — saal khud update hota hai. Shop naam/address "Shop settings" se aata hai.

## Yeh site light kyu hai

- Koi heavy framework nahi — plain HTML/CSS/JS
- Images `loading="lazy"` — jab tak scroll na karo, load nahi hoti
- Cloudinary khud compress/optimize karta hai
- Firestore free tier chhoti/medium shop ke liye kaafi hai, koi card nahi

## Agar kuch fix karwana ho

Agli baar bata dena — seedha update kar dunga.
