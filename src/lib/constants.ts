export const STATIONS = ["Common", "Garmo", "Rolls", "Pans", "Grill", "Tandoor"];

// Single-tenant: CCC is in Calgary. Switch to per-restaurant column when multi-tenant ships (Roadmap #62).
export const RESTAURANT_TIMEZONE = 'America/Edmonton';

export const STATION_COLORS: Record<string, string> = {
  Garmo:   "#22D3EE",
  Rolls:   "#A78BFA",
  Pans:    "#F97316",
  Grill:   "#EF4444",
  Tandoor: "#F59E0B",
  Common:  "#6B7280",
  All:     "#6B7280",
  Default: "#6B7280",
};

export const SECTIONS = ['Prep', 'Opening', 'Closing', 'Other'];

export const SECTION_COLORS: Record<string, string> = {
  Prep:    '#D97706',
  Opening: '#F97316',
  Closing: '#6366F1',
  Other:   '#6B7280',
};

export const ROLE_COLORS: Record<string, string> = {
  superadmin: "#F97316",
  admin:      "#6366F1",
  cook:       "#3A3A3A",
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin:      "Admin",
  cook:       "Cook",
};
