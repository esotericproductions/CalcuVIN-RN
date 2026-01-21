Absolutely — here’s a **clean, professional README** you can drop straight into the repo. It’s written to be **interview-friendly**, highlights React Native + Expo Dev Client correctly, and subtly shows your native experience without over-explaining.

You can copy-paste this as `README.md`.

---

# 📱 React Native Calculator + VIN Lookup App

A cross-platform **React Native (Expo)** application demonstrating:

- A functional **calculator**
- A **VIN lookup tool** powered by a public REST API
- Native device integration (camera / OCR groundwork)
- iOS & Android parity using **Expo Development Builds**

Built as a learning and evaluation project to become productive in **React Native** from a strong native mobile background.

---

## ✨ Features

### Calculator

- Basic arithmetic operations
- Reducer-based state management
- Shared logic across platforms

### VIN Lookup

- Decode VINs using the **NHTSA vPIC API**
- Displays vehicle metadata (Make, Model, Year, etc.)
- Gracefully handles EVs and missing ICE-specific fields
- Prepared for camera-based VIN OCR using native APIs

### Platform Support

- ✅ iOS (physical device, Expo Dev Client)
- ✅ Android (emulator & physical device)
- 🌗 Light/Dark mode aware UI

---

## 🧱 Tech Stack

- **React Native**
- **Expo + Expo Router**
- **Expo Dev Client**
- **TypeScript**
- **Native Camera & OCR (ML Kit integration groundwork)**
- **NHTSA vPIC REST API**

---

## 🚀 Getting Started

### Prerequisites

- Node.js (18+ recommended)
- Xcode (for iOS)
- Android Studio (for Android)
- Expo CLI (`npx`)

---

### Install dependencies

```bash
npm install
```

---

## ▶️ Running the App

### Start Metro (Dev Client)

```bash
npx expo start --dev-client --host lan
```

---

### iOS (Physical Device Recommended)

```bash
npx expo run:ios
```

> ⚠️ Camera/OCR features require a **development build**, not Expo Go.

---

### Android (Emulator or Device)

```bash
npx expo run:android
```

Android setup is typically seamless once the SDK is installed.

---

## 🌐 Networking Notes (Important)

When running on a **physical device**, `localhost` refers to the device itself.

For local APIs:

- Use your **Mac’s LAN IP** (e.g. `http://192.168.x.x:PORT`)
- API base URLs are centralized for easy switching

---

## 🎨 Dark Mode Support

The app respects system appearance settings using:

```ts
useColorScheme();
```

Text and background colors automatically adapt for:

- Light mode
- Dark mode

---

## 🧠 Architecture Notes

- Shared UI logic across platforms
- Reducer-based state management (calculator)
- Centralized API configuration
- Expo Dev Client used for native capabilities
- Designed for extension (OCR VIN scanning, caching, etc.)

---

## 🔮 Planned Enhancements

- VIN scanning via camera + OCR
- Offline VIN caching
- UI polish for automotive workflows
- Error-state improvements
- Accessibility improvements

---

## 📄 License

This project is for demonstration and educational purposes.

---
