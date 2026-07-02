import {
  Calendar,
  Home,
  Newspaper,
  Radio,
  Search,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Live Scores", href: "/dashboard/live", icon: Radio },
  { label: "Fixtures", href: "/dashboard/fixtures", icon: Calendar },
  { label: "Competitions", href: "/dashboard/competitions", icon: Trophy },
  { label: "News", href: "/dashboard/news", icon: Newspaper },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Live", href: "/dashboard/live", icon: Radio },
  { label: "Fixtures", href: "/dashboard/fixtures", icon: Calendar },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];
