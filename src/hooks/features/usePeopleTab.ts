import { useState, useEffect } from 'react';
import { getRestaurantProfiles, adminUpdateProfile, createLinkInvite, createEmailInvite, sendPasswordReset } from '../../lib/supabase.js';
import type { Profile, Role, Station } from '../../lib/types.js';

export type InviteMode = 'link' | 'email';

export function usePeopleTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRestaurantProfiles().then(setUsers).catch(() => {});
  }, []);

  const toggleActive = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    await adminUpdateProfile(id, { active: !user.active });
    setUsers(us => us.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const changeRole = async (id: string, role: Role) => {
    await adminUpdateProfile(id, { role });
    setUsers(us => us.map(u => u.id === id ? { ...u, role } : u));
  };

  const changeStation = async (id: string, station: Station) => {
    await adminUpdateProfile(id, { station });
    setUsers(us => us.map(u => u.id === id ? { ...u, station } : u));
  };

  const changeSecondaryStations = async (id: string, stations: Station[]) => {
    await adminUpdateProfile(id, { secondary_stations: stations });
    setUsers(us => us.map(u => u.id === id ? { ...u, secondary_stations: stations } : u));
  };

  const generateLinkInvite = async (role: Role, station: Station): Promise<string> => {
    setLoading(true);
    try {
      const token = await createLinkInvite({ role, station });
      return `${window.location.origin}/join/${token}`;
    } finally {
      setLoading(false);
    }
  };

  const sendEmailInvite = async (email: string, role: Role, station: Station): Promise<void> => {
    setLoading(true);
    try {
      await createEmailInvite({ email, role, station });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setLoading(true);
    try {
      await sendPasswordReset(email, `${window.location.origin}/reset-password`);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    toggleActive,
    changeRole,
    changeStation,
    changeSecondaryStations,
    generateLinkInvite,
    sendEmailInvite,
    resetPassword,
  };
}
