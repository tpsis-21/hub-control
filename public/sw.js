// Service Worker para notificações push
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Escutar notificações push
self.addEventListener('push', (event) => {
  console.log('Notificação push recebida:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nova notificação', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'notification',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icon-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/icon-dismiss.png'
      }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hub Control', options)
  );
});

// Escutar cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Abrir a aplicação ou navegar para uma página específica
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Verificar se já existe uma janela aberta
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não houver janela aberta, abrir uma nova
        if (self.clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return self.clients.openWindow(url);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Apenas fechar a notificação (já foi fechada acima)
    console.log('Notificação dispensada');
  } else {
    // Clique padrão na notificação (sem action)
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return self.clients.openWindow(url);
        }
      })
    );
  }
});

// Escutar fechamento de notificações
self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event);
  // Aqui você pode enviar analytics ou fazer outras ações
});

// Sincronização em background (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Fazer sincronização de dados em background
      console.log('Sincronização em background')
    );
  }
});

// Gerenciar mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('Mensagem recebida no SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});