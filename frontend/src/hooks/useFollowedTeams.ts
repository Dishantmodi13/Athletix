"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import {
  FAVORITES_CHANGED_EVENT,
  getFollowedTeams,
  isFollowingTeam,
  removeFollowedTeam,
  setFollowedTeams,
  toggleFavorite,
} from "@/lib/favorites";
import { normalizeTeamName } from "@/lib/football";
import { followTeamOnServer, unfollowTeamOnServer } from "@/lib/user";
import type { FollowedTeam } from "@/types/followedTeam";
import { useUser } from "@/context/UserContext";

export function useFollowedTeams() {
  const { user, refreshUser } = useUser();
  const [localTeams, setLocalTeams] = useState<FollowedTeam[]>([]);

  const syncFromUser = useCallback((teams: FollowedTeam[]) => {
    setFollowedTeams(teams);
    setLocalTeams(teams);
  }, []);

  useEffect(() => {
    if (user?.followedTeams) {
      syncFromUser(user.followedTeams);
      return;
    }
    setLocalTeams(getFollowedTeams());
  }, [user, syncFromUser]);

  useEffect(() => {
    const onChange = () => setLocalTeams(getFollowedTeams());
    window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  }, []);

  const teamIds = useMemo(() => new Set(localTeams.map((team) => team.id)), [localTeams]);

  const followTeam = useCallback(
    async (team: FollowedTeam) => {
      if (!isAuthenticated()) {
        throw new Error("Sign in to follow teams");
      }

      toggleFavorite({
        type: "team",
        id: team.id,
        name: team.name,
        logo: team.logo ?? undefined,
      });
      setLocalTeams(getFollowedTeams());

      try {
        const updated = await followTeamOnServer(team);
        syncFromUser(updated.followedTeams ?? []);
        await refreshUser();
      } catch (error) {
        removeFollowedTeam(team.id);
        setLocalTeams(getFollowedTeams());
        throw error;
      }
    },
    [refreshUser, syncFromUser]
  );

  const unfollowTeam = useCallback(
    async (teamId: number) => {
      if (!isAuthenticated()) {
        throw new Error("Sign in to manage followed teams");
      }

      removeFollowedTeam(teamId);
      setLocalTeams(getFollowedTeams());

      try {
        const updated = await unfollowTeamOnServer(teamId);
        syncFromUser(updated.followedTeams ?? []);
        await refreshUser();
      } catch (error) {
        const existing = user?.followedTeams ?? getFollowedTeams();
        syncFromUser(existing);
        throw error;
      }
    },
    [refreshUser, syncFromUser, user?.followedTeams]
  );

  return {
    teams: localTeams,
    teamIds,
    isFollowing: (teamId: number, teamName?: string) =>
      localTeams.some(
        (team) =>
          team.id === teamId ||
          (teamName
            ? normalizeTeamName(team.name) === normalizeTeamName(teamName)
            : false)
      ) || isFollowingTeam(teamId),
    followTeam,
    unfollowTeam,
  };
}
