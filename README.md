# 🏠 SmartHome Automation System

A real-time IoT backend for controlling and automating smart home devices. Built with **Node.js**, **Express**, and **MongoDB**, the system bridges a web dashboard to physical hardware — an **Arduino Uno** driving **3 LED bulbs** over serial — through a clean layered architecture with JWT authentication, role-based access control, automation rules, energy tracking, and event analytics.


## What It Does

Users can control physical devices from a dashboard in real time. When a command is issued, the backend updates the database, sends a serial command to the Arduino (`LED:1:ON\n`), and the Arduino confirms execution by sending JSON feedback back (`{"led":1,"status":"ON"}`). Every state change is logged as an immutable event and used to build energy records, Markov chain transitions, and Poisson rate estimates.

Admins can set up automation rules that fire on a schedule or when a sensor reading crosses a threshold — turning devices off at 10 PM, or cutting power when energy consumption exceeds a limit.


## Core Features

**Authentication & Access**
- JWT access + refresh token flow with a 15-minute access token lifetime
- Google OAuth sign-in — roles are preserved on returning logins, never escalatable
- Role-based access control with two roles: `ADMIN` and `RESIDENT`
- 3-step OTP password reset: request code → verify → reset (bcrypt-hashed OTPs, 15-minute expiry)
- Email enumeration prevention — forgot-password always returns 200

**Device Management**
- Full CRUD for devices, each with a name, type, room, and power rating
- Real-time control (ON / OFF / IDLE) with hardware confirmation feedback
- Fault-state guard — a device in FAULT cannot be controlled until cleared
- IoT feedback ingestion endpoint for hardware-initiated state reports

**Automation Rules**
- **TIME triggers** — fire daily at a fixed time using `node-cron`, scheduled at startup
- **CONDITION triggers** — evaluated on every IoT feedback call against live sensor readings (supports `gt`, `lt`, `eq`, `gte`, `lte`)
- Each action in a rule executes independently — one failure does not block the rest
- Rules can be toggled on/off or triggered manually via the API

**Home & Resident Management**
- Admins create and manage a home, invite residents by email, and remove them
- Token-based invitation acceptance flow
- Residents see only their own home; admins have full visibility

**Analytics & Observability**
- **Poisson λ estimation** — average event rate per device over a configurable rolling window
- **Markov chain transitions** — every `fromState → toState` pair is persisted for behavioural modelling
- **Energy tracking** — per-device sessions recording start time, duration, and kWh consumed (`powerRatingWatt × durationSeconds / 3,600,000`)
- **Fault alerting** — a FAULT state change auto-creates a critical alert and fires a domain event


## Hardware

An **Arduino Uno** is connected over **USB serial on COM6** at 9600 baud. The backend maps three MongoDB Device IDs to physical LED numbers 1, 2, and 3. Commands are sent as plain-text strings (`LED:2:OFF\n`); the Arduino echoes confirmation as JSON. When the serial port is unavailable, the system falls back to mock mode — logging commands to the console — so the API works normally without hardware connected.

## Architecture

The backend is built around a reactive event-driven core. `DeviceService` is the single entry point for all hardware interactions — it updates state, writes to the serial port, and fires a `device.stateChanged` domain event. Everything else reacts to that event through `EventLogListener`: event logs, Markov transitions, energy records, and fault alerts are all written asynchronously without coupling to the control flow.

Automation rules are evaluated the same way — `AutomationService` listens for IoT feedback and checks condition rules, or fires time-based rules via cron jobs registered at startup.

```
controlDevice()
    ├── save to MongoDB
    ├── SerialController → LED:n:ON\n → Arduino
    └── DomainEvents.emit("device.stateChanged")
            ├── EventLogListener → Event document
            ├── EventLogListener → MarkovTransition
            ├── EventLogListener → EnergyRecord open/close
            └── EventLogListener → Alert (on FAULT)
```

Controllers are thin HTTP adapters with no business logic. All rules live in the service layer. Input validation is composed onto routes as decorator arrays. Error handling is centralised in a single terminal middleware that maps Mongoose errors, JWT failures, and domain errors to consistent JSON responses.

## API Overview

| Group | Base Path | What It Covers |
|---|---|---|
| Auth | `/api/auth` | Register, login, Google OAuth, token refresh, password reset |
| Devices | `/api/devices` | CRUD, control, status, IoT feedback |
| Automations | `/api/automations` | CRUD, toggle, manual run |
| Homes | `/api/homes` | Home management, residents, invitations |
| Users | `/api/users` | Profile, password change, admin user management |
| Events | `/api/events` | Poisson λ, action frequency (read-only) |

All responses follow a consistent envelope:

```json
{
  "success": true,
  "message": "Device state updated",
  "data": { "status": "ON" }
}
```

Errors include a machine-readable `code` field alongside the message, making client-side error handling straightforward.

## Tech Stack

| | |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | jsonwebtoken + google-auth-library |
| Email | Nodemailer (SMTP) |
| Serial | serialport + readline parser |
| Scheduling | node-cron |
| Validation | express-validator |
| Password hashing | bcryptjs |


## Design Patterns

The codebase applies 14 design patterns deliberately. A few highlights:

- **Template Method** — `BaseController.handle()` wraps every route in a try/catch skeleton; subclasses never repeat error forwarding
- **Observer / Event Bus** — `DomainEvents` decouples device control from all side-effects; adding a new reaction means a new listener, not a change to `DeviceService`
- **Strategy** — auth methods (email/password, Google), automation triggers (TIME, CONDITION), and email transports are all swappable strategies
- **Chain of Responsibility** — `protect → restrictTo → handler` middleware chain; the error handler is its terminal link
<img width="1460" height="887" alt="Screenshot 2026-06-07 161146" src="https://github.com/user-attachments/assets/5cf43f53-683c-4592-800a-6286a23d61dd" />
<img width="1873" height="877" alt="Screenshot 2026-06-07 161108" src="https://github.com/user-attachments/assets/c20f44ec-aeea-4171-99c4-cf4be22780c6" />
<img width="1521" height="754" alt="Screenshot 2026-06-07 161039" src="https://github.com/user-attachments/assets/c7262cf3-0f01-4a50-a54c-03a74868e08a" />
<img width="1900" height="759" alt="Screenshot 2026-06-07 160956" src="https://github.com/user-attachments/assets/a49303a1-7b2e-426c-8e3d-43e584545e61" />
<img width="1670" height="819" alt="Screenshot 2026-06-07 160905" src="https://github.com/user-attachments/assets/0790fe59-5e9d-43ac-8192-acd62b1b348e" />
