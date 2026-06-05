# Plan de Ejecución: ElChat

## 1. Configuración Base y Arquitectura
- [x] Configurar Firebase en Angular (añadir `environment.ts` con los datos de `el-chat-69585`).
- [x] Crear estructura modular (`auth`, `chat`, `shared` con sus subcarpetas).
- [x] Configurar enrutamiento base con Lazy Loading apuntando a `auth.routes.ts` y `chat.routes.ts`.

## 2. Autenticación y Seguridad
- [x] Implementar Servicio de Autenticación (`auth/services/auth.service.ts`) con soporte para Email/Password y Google Sign-In.
- [x] Crear UI de la página de Login y Registro (`auth/pages/login` y `auth/pages/register`), incluyendo campo de 'Nombre' en el registro y botón de Google.
- [x] Desarrollar los Angular Guards (`auth/guards/auth.guard.ts` y `no-auth.guard.ts`) para proteger las rutas.
- [x] Añadir pruebas unitarias básicas para los guards y el servicio de auth.

## 3. Sistema de Chat (MVP)
- [x] Implementar Servicio de Chat (`chat/services/chat.service.ts`) y Servicio de Usuarios para el buscador.
- [x] Instalar plugin `@capacitor/geolocation` y configurar permisos.
- [x] Crear UI del Listado de Chats y añadir buscador por Nombre (`chat/pages/chat-list`).
- [x] Crear UI de la pantalla de Chat (`chat/pages/chat-detail`).
- [x] Añadir formulario reactivo para el envío de mensajes y adjuntar la ubicación (lat/lng) antes del envío.
- [x] Implementar **Paginación Bidireccional Inteligente (Stateful)** y doble **Infinite Scroll** nativo de Ionic.
- [x] Añadir sistema de **Marcador de Lectura (LastRead)** y divisor visual de "Nuevos mensajes".
- [x] Añadir funcionalidad de **Rol Administrador** (Settings) para limpiar base de datos y forzar no leídos.

## 4. Integración de IA (Gemini)
- [ ] Implementar Servicio de IA que consuma la API de Google Gemini (`chat/services/ai.service.ts` o en `shared/services/`).
- [ ] Configurar la creación automática de "Chats Predefinidos de IA" para los usuarios nuevos.
- [ ] Añadir la lógica del spinner "IA escribiendo..." exclusivo para los chats marcados como `ai_chat`.
- [ ] Conectar el envío del mensaje con la petición a Gemini solo dentro del chat predefinido.
- [ ] Pruebas unitarias para el servicio de IA y el comportamiento condicional del spinner.

## 5. Revisión y Testing Final
- [x] Configurar Karma/Jasmine para la cobertura de código.
- [x] Ejecutar suite de pruebas (25/25 pasando) para `ChatDetailComponent`, `SettingsComponent` y Servicios aislando dependencias.
- [x] Realizar pruebas manuales (iOS Safari/Chrome) y resolver bugs críticos:
  - [x] Solución al login infinito en Chrome iOS (`signInWithRedirect`).
  - [x] Solución al bug de enrutamiento con `<ion-back-button>`.
  - [x] Solución al último mensaje oculto por el teclado (padding-bottom adaptativo).
