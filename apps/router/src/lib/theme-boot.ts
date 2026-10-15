import { THEME_STORAGE_KEY } from "@nebutra/tokens";

/**
 * Runs in <head> before first paint. The server already renders the class from
 * the cookie ThemeProvider writes; this covers the cases the cookie cannot —
 * a first visit with a dark OS preference, and a stored "system" choice whose
 * OS preference changed since the cookie was written. Reads only the key the
 * provider writes.
 */
export const THEME_BOOT_SCRIPT = `(()=>{try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.classList.toggle("light",!d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
