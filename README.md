<p align="center">
  <img src="./logo.png" width="180" alt="BlogX Logo" />
</p>

<h1 align="center">BlogX</h1>

<p align="center">
  A full-stack social blogging platform built for writers, thinkers, and communities.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-13-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Laravel" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PHP-8.3-777BB4?style=flat-square&logo=php&logoColor=white" alt="PHP" />
  <img src="https://img.shields.io/badge/License-MIT-gold?style=flat-square" alt="License" />
</p>

---

## Overview

BlogX is a modern social blogging platform that combines long-form writing with social interaction. Users can publish posts, follow writers, engage through comments and likes, explore trending topics via hashtags, and receive real-time notifications — all within a clean, distraction-free interface.

---

## Screenshot


![Feed](./screenshots/feed.png)
---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Laravel | 13.x | API framework |
| PHP | 8.3 | Runtime |
| Laravel Sanctum | 4.x | Token-based API authentication |
| Laravel Socialite | * | Google OAuth integration |
| SQLite / MySQL | — | Database |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | 4.x | Component library |
| Motion | 12.x | Animations |
| React Hook Form + Zod | — | Form validation |
| Axios | — | HTTP client |
| Sonner | — | Toast notifications |

---

## Features

- **Authentication** — Register, login, Google OAuth, email verification, password reset
- **Two-Factor Authentication** — TOTP-based 2FA with recovery codes
- **Multi-Device Sessions** — View and revoke active sessions per device
- **Posts** — Create, edit, delete posts with image attachments
- **Social Feed** — Global feed and a following-only feed
- **Interactions** — Likes, comments, comment likes, shares, bookmarks, impressions
- **Mentions** — Tag other users in posts and comments
- **Hashtags** — Trending hashtags, hashtag feeds, auto-suggest while typing
- **Search** — Full-text search across posts, users, and hashtags
- **Notifications** — Real-time notifications via Server-Sent Events (SSE)
- **User Profiles** — Follow/unfollow, follower and following lists, user suggestions
- **Verification** — User verification requests with admin review flow
- **Admin Panel** — Review and approve/reject verification requests

---

## Project Structure

```
BlogX/
├── backend/          # Laravel 13 REST API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
│       └── api.php
│
└── frontend/         # Next.js 16 App Router
    ├── app/
    │   ├── (auth)/   # Login, Register pages
    │   └── (main)/   # Feed, Profile, Search, Notifications...
    ├── components/
    ├── contexts/
    ├── lib/
    └── services/
```

---

## Getting Started

### Prerequisites

- PHP 8.3+
- Composer
- Node.js 20+
- npm

### Backend Setup

```bash
cd backend

# Install dependencies and set up environment
composer run setup

# Or step by step:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

Configure your `.env` file with database credentials and OAuth keys:

```env
DB_CONNECTION=sqlite

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
```

Start the backend:

```bash
composer run dev
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend

npm install
```

Configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## API Reference

All API routes are prefixed with `/api`. Authentication uses Laravel Sanctum bearer tokens.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Guest | Create a new account |
| `POST` | `/login` | Guest | Login with email/password |
| `POST` | `/auth/google/exchange` | Guest | Exchange Google OAuth ticket |
| `POST` | `/forgot-password` | Guest | Send password reset email |
| `POST` | `/reset-password` | Guest | Reset password with token |
| `POST` | `/logout` | Required | Logout current session |
| `POST` | `/logout-all` | Required | Logout all devices |

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/posts` | Optional | Get paginated post feed |
| `POST` | `/posts` | Required | Create a new post |
| `GET` | `/posts/{id}` | Optional | Get single post |
| `POST` | `/posts/{id}/update` | Required | Update a post |
| `DELETE` | `/posts/{id}` | Required | Delete a post |
| `POST` | `/posts/{id}/like` | Required | Toggle like on a post |
| `POST` | `/posts/{id}/bookmark` | Required | Toggle bookmark |
| `GET` | `/following/posts` | Required | Get following-only feed |

### Profile & Social

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/{username}` | Optional | Get user profile |
| `POST` | `/users/{id}/follow` | Required | Follow / unfollow a user |
| `GET` | `/users/suggestions` | Optional | Get user suggestions |
| `GET` | `/profile/{username}/followers` | Optional | List followers |

### Search & Hashtags

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | Optional | Search posts, users, hashtags |
| `GET` | `/hashtags/trending` | Optional | Get trending hashtags |
| `GET` | `/hashtags/{tag}/posts` | Optional | Get posts for a hashtag |

---

## License

This project is open-sourced under the [MIT License](https://opensource.org/licenses/MIT).
