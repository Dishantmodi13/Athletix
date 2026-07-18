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

export const CRICKET_SIDEBAR_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard/cricket", icon: Home },
  { label: "Live Scores", href: "/dashboard/cricket/live", icon: Radio },
  { label: "Fixtures", href: "/dashboard/cricket/fixtures", icon: Calendar },
  { label: "Competitions", href: "/dashboard/cricket/competitions", icon: Trophy },
  { label: "News", href: "/dashboard/cricket/news", icon: Newspaper },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

export const CRICKET_BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard/cricket", icon: Home },
  { label: "Live", href: "/dashboard/cricket/live", icon: Radio },
  { label: "Fixtures", href: "/dashboard/cricket/fixtures", icon: Calendar },
  { label: "News", href: "/dashboard/cricket/news", icon: Newspaper },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];
