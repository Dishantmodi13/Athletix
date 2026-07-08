export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  avatar: string | null;
}

export interface UpdateProfilePayload {
  username?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatar?: string | null;
}
