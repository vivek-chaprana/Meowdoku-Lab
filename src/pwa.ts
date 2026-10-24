interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let pendingPrompt: InstallPrompt | undefined;
let installed = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
let offlineMessage = import.meta.env.PROD ? 'Preparing offline access…' : 'Offline mode is available in the production build.';
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); pendingPrompt = event as InstallPrompt; updateButton();
});
window.addEventListener('appinstalled', () => { installed=true;pendingPrompt=undefined;updateButton(); });
function updateButton() {
  const button=document.querySelector<HTMLButtonElement>('#install-app');
  if(button) {button.disabled=installed;button.textContent=installed?'✓ Installed':'⇩ Install app';}
}
export function setupPWA() {
  const button=document.querySelector<HTMLButtonElement>('#install-app');
  const dialog=document.querySelector<HTMLDialogElement>('#install-help');
  updateButton();
  if(button && dialog) button.onclick=async()=>{
    if(pendingPrompt) {
      const prompt=pendingPrompt;pendingPrompt=undefined;
      try { await prompt.prompt(); } catch { showHelp(); }
      return;
    }
    showHelp();
  };
  function showHelp() {
    const message=document.querySelector('#install-message');
    if(message) message.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)
      ? 'In Safari, tap Share, then Add to Home Screen. Open Meowdoku once online to prepare it for offline use.'
      : 'Use your browser’s Install app or Add to Home Screen menu. If that option is unavailable, open this site in a browser that supports installation, such as Chrome or Edge. Installation requires HTTPS or localhost.';
    const status=document.querySelector('#offline-status');if(status)status.textContent=offlineMessage;
    dialog?.showModal();
  }
  if(import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(async registration=>{
      await navigator.serviceWorker.ready;
      offlineMessage='Ready for offline use. Both pages, screenshot import, and solving are saved on this device.';
      const status=document.querySelector('#offline-status');if(status)status.textContent=offlineMessage;
      // New versions activate after older tabs close, keeping their assets intact.
      void registration.update().catch(()=>{});
    }).catch(()=>{
      offlineMessage='Offline preparation failed. Reopen the app online to retry.';
      const status=document.querySelector('#offline-status');if(status)status.textContent=offlineMessage;
    });
  } else if(import.meta.env.PROD) offlineMessage='Offline mode is not supported by this browser or connection.';
}
