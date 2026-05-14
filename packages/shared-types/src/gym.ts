export type GymPlanTier = "trial" | "basic" | "standard" | "pro";
export type GymStatus = "active" | "suspended" | "trial" | "churned";

export interface Gym {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  planTier: GymPlanTier;
  status: GymStatus;
  gstNo: string | null;
  address: GymAddress;
  phone: string;
  timezone: string;
  logoUrl: string | null;
  operatingHours: OperatingHours | null;
  createdAt: string;
  updatedAt: string;
}

export interface GymAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OperatingHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  open: string;
  close: string;
}

export interface Branch {
  id: string;
  gymId: string;
  name: string;
  address: GymAddress;
  phone: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateGymDto {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
}
