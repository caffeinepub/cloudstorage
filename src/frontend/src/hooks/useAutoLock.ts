import { useContext } from "react";
import { AutoLockContext } from "../contexts/AutoLockContext";

export function useAutoLock() {
  const context = useContext(AutoLockContext);
  if (!context) {
    throw new Error("useAutoLock must be used within an AutoLockProvider");
  }
  return context;
}
