import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useShortcutMap } from "../hooks/useShortcuts";
import { SHORTCUT_ACTIONS, isEventMatchingShortcut, shouldIgnoreGlobalShortcutTarget } from "../utils/shortcuts";
export default function GlobalKeyboardShortcuts(){const navigate=useNavigate();const location=useLocation();const shortcuts=useShortcutMap();
 useEffect(()=>{const onKeyDown=(e)=>{if(e.repeat||shouldIgnoreGlobalShortcutTarget(e.target))return;
   const action=SHORTCUT_ACTIONS.find(a=>a.path&&shortcuts[a.id]&&isEventMatchingShortcut(e,shortcuts[a.id]));
   if(action){e.preventDefault();navigate(action.path);return;}
   if(shortcuts.global_search&&isEventMatchingShortcut(e,shortcuts.global_search)){e.preventDefault();if(location.pathname!=="/"){navigate("/",{state:{focusGlobalSearch:true}});}else{window.dispatchEvent(new CustomEvent("textrade:focus-global-search"));}}
 };window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown);},[location.pathname,navigate,shortcuts]);return null;}
