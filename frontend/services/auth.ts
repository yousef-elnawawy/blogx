import api from "@/lib/api";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  cover: string | null;
  website: string | null;
  location: string | null;
  social_links?: Record<string, string> | Array<{ platform: string; url: string }> | null;
  equipped_badges?: string[] | null;
  preferences?: Record<string, any> | null;
  verified: boolean;
  is_admin?: boolean;
  has_2fa: boolean;
  is_email_verified: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDevice {
  id: number;
  device_type: "desktop" | "mobile" | "tablet" | string;
  browser: string;
  platform: string;
  ip_address: string;
  is_current: boolean;
  last_active_at: string;
  created_at: string | null;
}

export interface LoginData {
  login: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfileData {
  name?: string;
  username?: string;
  email?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: File;
  cover?: File;
  remove_avatar?: boolean;
  remove_cover?: boolean;
  social_links?: any;
}

export interface ChangePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordData {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface TwoFactorChallengeData {
  ticket: string;
  code?: string;
  recovery_code?: string;
}

export async function login(data: LoginData) {
  const response = await api.post("/api/login", data);
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
}

export async function register(data: RegisterData) {
  const response = await api.post("/api/register", data);
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
}

export async function logout() {
  try {
    const response = await api.post("/api/logout");
    return response.data;
  } finally {
    localStorage.removeItem("auth_token");
  }
}

export async function logoutOthers() {
  const response = await api.post("/api/logout-others");
  return response.data;
}

export async function logoutAll() {
  try {
    const response = await api.post("/api/logout-all");
    return response.data;
  } finally {
    localStorage.removeItem("auth_token");
  }
}

export async function getUser(): Promise<{ user: User }> {
  const response = await api.get("/api/user");
  return response.data;
}

export async function getDevices(): Promise<{ devices: UserDevice[] }> {
  const response = await api.get("/api/user/devices");
  return response.data;
}

export async function revokeDevice(id: number) {
  const response = await api.delete(`/api/user/devices/${id}`);
  return response.data;
}

export async function updateProfile(data: UpdateProfileData) {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === "boolean") {
        formData.append(key, value ? "1" : "0");
      } else {
        formData.append(key, String(value));
      }
    }
  });

  const response = await api.post("/api/user/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function changePassword(data: ChangePasswordData) {
  const response = await api.post("/api/user/change-password", data);
  return response.data;
}

export async function exchangeOAuthTicket(ticket: string) {
  const response = await api.post("/api/auth/google/exchange", { ticket });
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
}

export async function forgotPassword(email: string) {
  const response = await api.post("/api/forgot-password", { email });
  return response.data;
}

export async function resetPassword(data: ResetPasswordData) {
  const response = await api.post("/api/reset-password", data);
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
}

export async function resendVerificationEmail() {
  const response = await api.post("/api/email/verification-notification");
  return response.data;
}

export async function verifyEmail(id: string, hash: string) {
  const response = await api.get(`/api/email/verify/${id}/${hash}`);
  return response.data;
}

// Two-Factor Authentication (2FA)
export async function enable2FA(): Promise<{ secret: string; qr_uri: string }> {
  const response = await api.post("/api/2fa/enable");
  return response.data;
}

export async function confirm2FA(code: string): Promise<{ message: string; recovery_codes: string[] }> {
  const response = await api.post("/api/2fa/confirm", { code });
  return response.data;
}

export async function disable2FA(password: string) {
  const response = await api.post("/api/2fa/disable", { password });
  return response.data;
}

export async function verify2FALogin(data: TwoFactorChallengeData) {
  const response = await api.post("/api/2fa/verify-login", data);
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
}

export async function getRecoveryCodes(password: string): Promise<{ recovery_codes: string[] }> {
  const response = await api.get("/api/2fa/recovery-codes", { params: { password } });
  return response.data;
}

export async function regenerateRecoveryCodes(password: string): Promise<{ recovery_codes: string[]; message: string }> {
  const response = await api.post("/api/2fa/recovery-codes", { password });
  return response.data;
}