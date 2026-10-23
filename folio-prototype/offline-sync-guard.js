/* Hide the app while a previously interrupted import is restored. */
(()=>{try{if(localStorage.getItem('folio-sync-import-pending-v1'))document.documentElement.classList.add('sync-recovering');}catch{}})();
