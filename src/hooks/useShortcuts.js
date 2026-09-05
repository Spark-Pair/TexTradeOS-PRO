import { useMemo } from "react";
import useAuth from "./useAuth";
import { updateMyShortcuts } from "../api/auth.api";
import { DEFAULT_SHORTCUTS, assignShortcutInMap } from "../utils/shortcuts";
function normalizeShortcuts(user){return{...DEFAULT_SHORTCUTS,...(user?.shortcuts||{})};}
export function useShortcutMap(){const{user}=useAuth();return useMemo(()=>normalizeShortcuts(user),[user]);}
export function useShortcut(actionId){const shortcuts=useShortcutMap();return shortcuts[actionId]||"";}
export function useShortcutActions(){const{user,setUser}=useAuth();const shortcutMap=useShortcutMap();
 const persist=async(map)=>{const res=await updateMyShortcuts(map);const persisted={...DEFAULT_SHORTCUTS,...(res?.shortcuts||map)};setUser(prev=>prev?{...prev,shortcuts:persisted}:prev);return persisted;};
 const assignShortcut=async(actionId,combo)=>{const{map,removedFromActionId}=assignShortcutInMap(shortcutMap,actionId,combo);return{map:await persist(map),removedFromActionId};};
 const resetShortcut=async(actionId)=>{const desired=DEFAULT_SHORTCUTS[actionId]||"";const{map,removedFromActionId}=assignShortcutInMap(shortcutMap,actionId,desired);return{map:await persist(map),removedFromActionId};};
 const resetShortcuts=async()=>persist(DEFAULT_SHORTCUTS);
 return{shortcutMap,user,assignShortcut,resetShortcut,resetShortcuts};}
