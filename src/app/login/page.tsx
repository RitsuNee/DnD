"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Sparkles, UserPlus, Shield, User } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Custom ID/PW states
  const [isRegistering, setIsRegistering] = useState(false);
  const [customId, setCustomId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"GM" | "Player">("Player");

  // Fake domain so Firebase treats Custom ID as an Email
  const getFakeEmail = (id: string) => `${id.toLowerCase().replace(/\s+/g, "")}@dnd.app`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customId || !password) {
      setError("Please fill all fields.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const fakeEmail = getFakeEmail(customId);

      if (isRegistering) {
        // REGISTER
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await updateProfile(cred.user, {
          displayName: `${role}|${customId}`
        });
        // Save user profile to Firestore for character assignment
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          customId,
          role,
          createdAt: Date.now()
        });
      } else {
        // LOGIN
        const cred = await signInWithEmailAndPassword(auth, fakeEmail, password);
        // Update user profile in Firestore on each login
        if (cred.user.displayName) {
          const [userRole, userId] = cred.user.displayName.split("|");
          await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            customId: userId || customId,
            role: userRole || "Player",
            lastLogin: Date.now()
          }, { merge: true });
        }
      }
      
      router.push("/gm/party");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This ID is already taken.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid ID or Password.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="arcane-glass p-8 rounded-2xl w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 border border-outline-variant/20">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-on-surface mb-2">
            Arcane <span className="text-primary arcane-text-glow">Glass</span>
          </h1>
          <p className="text-on-surface-variant text-sm">
            {isRegistering ? "Create your custom identity" : "Enter the campaign manager"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Custom ID
            </label>
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="e.g., Ritsu"
              className="w-full px-4 py-3 rounded-xl bg-surface-container/60 text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary/40 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-surface-container/60 text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary/40 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Role Selection (Only shown on register) */}
          <AnimatePresence>
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 pt-2">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setRole("Player")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                      role === "Player"
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <User className="w-4 h-4" /> Player
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("GM")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                      role === "GM"
                        ? "bg-secondary/20 border-secondary text-secondary"
                        : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <Shield className="w-4 h-4" /> GM
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isRegistering ? (
              <><UserPlus className="w-5 h-5" /> Register Account</>
            ) : (
              <><LogIn className="w-5 h-5" /> Login</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {isRegistering 
              ? "Already have an account? Login here." 
              : "Don't have an ID? Create one here."}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
