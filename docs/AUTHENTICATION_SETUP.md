# Authentication Setup Guide

This project uses Supabase for authentication. Follow these steps to configure it:

## 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 2. Supabase Project Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Once created, navigate to **Settings** > **API**
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Paste these values into your `.env.local` file

## 3. Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Ensure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations** (optional, recommended for production)
   - **Configure email templates** under **Authentication** > **Email Templates**

## 4. How Authentication Works

### Protected Routes
The application uses Next.js middleware to protect routes:
- **Unauthenticated users** → Redirected to `/auth/login`
- **Authenticated users** on auth pages → Redirected to `/workflow`
- **Root path (`/`)** → Redirects to `/workflow` if authenticated, `/auth/login` if not

### Login Flow
1. User enters credentials on `/auth/login`
2. Supabase authenticates the user
3. On success, user is redirected to `/workflow`
4. Session is stored in cookies and managed by Zustand

### Signup Flow
1. User fills out form on `/auth/signup`
2. Supabase creates the account
3. If email confirmation is disabled:
   - User is auto-logged in and redirected to `/workflow`
4. If email confirmation is enabled:
   - User receives a confirmation email
   - After confirming, they can log in at `/auth/login`

### Global Auth State
The application uses a custom hook (`useAuth`) built with Zustand for global state management:

```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) return <div>Not logged in</div>;

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Available Hooks

- `useAuth()` - Main hook with full auth state and methods
- `useUser()` - Get current user without subscribing to changes
- `useIsAuthenticated()` - Check auth status without subscribing
- `useSession()` - Get current session without subscribing

## 5. API Functions

All authentication functions are located in [src/app/api/services/supabase/auth.ts](src/app/api/services/supabase/auth.ts):

- `signUp({ email, password, name })` - Register new user
- `signIn({ email, password })` - Login user
- `signOut()` - Logout user
- `getSession()` - Get current session
- `getCurrentUser()` - Get current user
- `resetPassword(email)` - Request password reset
- `updatePassword(newPassword)` - Update user password

## 6. Testing

To test authentication:

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to `/auth/login`
4. Click "Sign up" and create an account
5. After successful signup, you should be redirected to `/workflow`

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure you created `.env.local` with the correct variables
- Restart the development server after adding environment variables

### User can't log in after signup
- Check if email confirmation is enabled in Supabase
- If enabled, user must confirm email before logging in
- Check Supabase logs for authentication errors

### Redirect loops
- Clear browser cookies and local storage
- Check that middleware is not conflicting with your routes
- Verify environment variables are set correctly
