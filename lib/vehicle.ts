export type Vehicle = {
  latitude?: number | null;
  longitude?: number | null;
  locationId?: string;
  timeZone?: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  transmission: "Automatic" | "Manual";
  fuel: string;
  seats: number;
  year: number;
  dailyPriceCents: number;
  location: string;
  mileageKm?: number;
  featured?: boolean;
  topRated?: boolean;
  avatar?: number;
  avatarUrl?: string;
  id?: string;
  isDemo?: boolean;
  description?: string;
};

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
