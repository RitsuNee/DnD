"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import { useCharacterStore } from "@/stores/character-store";
import { useCombatStore } from "@/stores/combat-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let unsubCharacters: (() => void) | undefined;
    let unsubCombat: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (user) {
        // Start listening to Firestore when logged in
        unsubCharacters = useCharacterStore.getState().initSync();
        unsubCombat = useCombatStore.getState().initSync();
      } else {
        // Stop listening when logged out
        if (unsubCharacters) unsubCharacters();
        if (unsubCombat) unsubCombat();
      }
    });

    return () => {
      unsubscribe();
      if (unsubCharacters) unsubCharacters();
      if (unsubCombat) unsubCombat();
    };
  }, [setUser]);

  return <>{children}</>;
}
