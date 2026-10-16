import { THEME_STORAGE_KEY } from "@nebutra/tokens";

/**
 * Runs in <head> before first paint: follows the system preference unless the
 * reader stored a choice, so a dark-mode reader never sees a white flash.
 */
export const THEME_BOOT_SCRIPT = `(()=>{try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.classList.toggle("light",!d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
