// Fail: anti-cache.js

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('Anti-Cache: Service Worker didaftarkan berjaya.');

            // Paksa browser check update setiap kali page di-load
            registration.update();

            // Dengar kalau ada update Service Worker baru (Bila kau push code ke GitHub)
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Ada update baru dijumpai!
                        console.log('Anti-Cache: Versi baharu dikesan. Memuat semula (Auto-Reload)...');
                        window.location.reload(true); 
                    }
                });
            });
        }).catch((err) => {
            console.log('Anti-Cache: Pendaftaran Service Worker gagal - ', err);
        });
    });

    // Auto refresh bila service worker baru ambil alih kawalan
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload(true);
        }
    });
}