/**
 * Applied before first paint so a dark-preferring visitor never sees a light
 * frame, and a visitor who chose a design language does not watch Factory paint
 * first on every full load. Server-rendered into <head>; it reads the keys the
 * theme provider and the language hook write, and nothing else.
 */
export const THEME_BOOT_SCRIPT = `(()=>{try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);var b=sessionStorage.getItem("nebutra.design.brand");if(b&&b!=="factory"&&/^[a-z-]+$/.test(b))r.dataset.brand=b}catch(e){}})()`;
