/**
 * Runs before first paint (inlined in <head> by the root layout): saved
 * choice first, then the OS preference, defaulting to dark (the brand
 * default). Wrapped in try/catch so blocked storage can't break the page.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.setAttribute("data-theme",t)}catch(e){d.setAttribute("data-theme","dark")}})();`;
