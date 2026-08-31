# 🛠️ Money Card — Local Development & Physical Android Setup Guide

**Architecture**: Single Local Backend + PostgreSQL supporting both Local Web App and Physical Android Staff Devices simultaneously.

```
                      ┌────────────────────────────┐
                      │   PostgreSQL (Port 5432)   │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │ Local Node.js Backend API  │
                      │  (Listening on 0.0.0.0:3000)│
                      └──────┬──────────────┬──────┘
                             │              │
       http://localhost:3000 │              │ http://<LAPTOP_LAN_IP>:3000
                             ▼              ▼
           ┌──────────────────────┐    ┌───────────────────────────┐
           │   React Web Portal   │    │ Physical Android Device   │
           │  (Browser on Laptop) │    │  (Flutter POS Staff App)  │
           └──────────────────────┘    └───────────────────────────┘
```

---

## 📱 Testing Flutter Staff App on Physical Android Device

### ⚠️ Critical Concept: Understanding `localhost` on Mobile
* On your **Laptop**, `localhost` or `127.0.0.1` refers to your **Laptop**.
* On your **Physical Android Phone**, `localhost` or `127.0.0.1` refers to the **PHONE ITSELF** (the phone has no backend running inside it).
* Therefore, your physical Android phone **MUST** connect to your laptop's Local Area Network (LAN) IP address (e.g. `http://192.168.105.39:3000/api/v1`).

---

### 🚀 Step-by-Step Setup Instructions

#### Step 1: Start PostgreSQL
Ensure your local PostgreSQL service is running on port `5432`:
```bash
# Windows Service Check
net start postgresql-x64-16
```

---

#### Step 2: Start the Backend API
In `Backend Money Card/`:
```bash
cd "Backend Money Card"
npm run dev
```
The server will boot and explicitly bind to `0.0.0.0:3000`:
```
🚀 Money Card Backend Server running on http://0.0.0.0:3000
💻 Local Loopback: http://localhost:3000/api/v1
📱 Network LAN: http://0.0.0.0:3000/api/v1 (Accessible from physical Android phone on Wi-Fi)
🏥 Healthcheck: http://localhost:3000/api/v1/health
```

---

#### Step 3: Find Your Laptop's Current IPv4 Address
Open PowerShell / Command Prompt and run:
```powershell
ipconfig
```
Look for your active **Wireless LAN adapter (Wi-Fi)**:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.105.39   <-- THIS IS YOUR LAPTOP LAN IP
   Default Gateway . . . . . . . . . : 192.168.105.1
```

---

#### Step 4: Connect Both Devices to the Same Wi-Fi
* Ensure your **Android Phone** and your **Laptop** are connected to the **exact same Wi-Fi router / mobile hotspot**.

---

#### Step 5: Verify Connectivity from Phone's Browser (Crucial Sanity Check)
Before opening the app, open Chrome or any browser on your **Android Phone** and navigate to:
```
http://<YOUR_LAPTOP_LAN_IP>:3000/api/v1/health
```
*(Example: `http://192.168.105.39:3000/api/v1/health`)*

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "status": "HEALTHY",
    "database": "CONNECTED",
    "timestamp": "2026-08-31T04:36:21.981Z",
    "uptimeSeconds": 145
  }
}
```

> **Troubleshooting if the browser cannot load**:
> 1. **Windows Firewall**: Run this one-time command in Administrator PowerShell to permit port 3000:
>    ```powershell
>    netsh advfirewall firewall add rule name="MoneyCardBackend" dir=in action=allow protocol=TCP localport=3000 profile=any
>    ```
> 2. **Wi-Fi Router AP Isolation**: Some guest Wi-Fi networks block device-to-device communication. If so, connect both laptop and phone to a phone mobile hotspot.

---

#### Step 6: Install the Release APK on Your Android Phone
Copy the compiled release APK from:
* [app-release.apk](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/build/app/outputs/flutter-apk/app-release.apk)
* Or transfer via USB / WhatsApp / Google Drive to your phone and install.

---

#### Step 7: Dynamic Server IP Configuration (In-App)
You do **NOT** need to rebuild the APK when switching Wi-Fi networks!

1. Open **Money Card Staff** on your phone.
2. On the **Login Screen**, tap the **`[ 🌐 Server: 192.168.105.39:3000 ]`** chip at the bottom.
3. Enter your laptop's current IPv4 address or tap **"Laptop LAN"**.
4. Tap **"Test Connection"** &rarr; see live green confirmation `✓ Connected (24ms) • Backend Online`.
5. Tap **"Save & Apply"** &rarr; the app immediately saves and switches to your laptop backend.

---

#### Step 8: Log in and Test the Complete Staff Workflow
1. **Login**:
   - Email: `staff@maincafe.com` (or any seeded staff user)
   - Password: `Password123!`
2. **Select Active Branch**: Select `"Main Cafeteria"`.
3. **Issue Card**: Tap **Issue Card** &rarr; Scan physical card QR code &rarr; Assign initial ₹100.
4. **POS Cart Purchase**: Select food items &rarr; Tap Charge &rarr; Tap or scan card.
5. **Recharge Card**: Add ₹200 cash/UPI top-up.
6. **Return Card**: Settle session &rarr; remaining balance is refunded to customer, card resets to `AVAILABLE`.

---

## 🔒 Android Cleartext Traffic Configuration

Android 9+ (API 28+) disables unencrypted `http://` traffic by default. This project includes:
1. `Flutter Money card/android/app/src/main/res/xml/network_security_config.xml` permitting cleartext for `192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, and `localhost`.
2. `android:usesCleartextTraffic="true"` and `android:networkSecurityConfig="@xml/network_security_config"` in `AndroidManifest.xml`.

---

## 💻 Running the Local Web App in Parallel

In another terminal, start the web portal:
```bash
cd "Frontend Money Card"
npm run dev
```
Open `http://localhost:5173`. Both the Web App and the Physical Android Staff App communicate with the same local backend and share the exact same PostgreSQL database in real time!
