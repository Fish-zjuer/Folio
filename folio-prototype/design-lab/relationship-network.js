/* Compatibility entry; the lab HTML loads the shared runtime directly. */
(()=>{const s=document.createElement("script");s.src=new URL("../relationship-view.js",document.currentScript.src).href;document.head.append(s);})();
