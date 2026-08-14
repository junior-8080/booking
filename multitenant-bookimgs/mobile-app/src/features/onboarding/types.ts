export interface RegisterInput {
  business_name: string;
  logo_url?: string;
  description?: string;
  email: string;
  password: string;
  owner_name: string;
  owner_phone: string;
  country: string;
  timezone?: string;
}
