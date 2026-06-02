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
- [ ] Instalar plugin `@capacitor/geolocation` y configurar permisos.
- [ ] Crear UI del Listado de Chats y añadir buscador por Nombre (`chat/pages/chat-list`).
- [ ] Crear UI de la pantalla de Chat (`chat/pages/chat-detail`).
- [ ] Añadir formulario reactivo para el envío de mensajes y adjuntar la ubicación (lat/lng) antes del envío.
- [ ] Implementar **Infinite Scroll** nativo de Ionic para paginar mensajes de 10 en 10 hacia atrás.
- [ ] Añadir pruebas unitarias para la lógica del paginado y validación del formulario.

## 4. Integración de IA (Gemini)
- [ ] Implementar Servicio de IA que consuma la API de Google Gemini (`chat/services/ai.service.ts` o en `shared/services/`).
- [ ] Configurar la creación automática de "Chats Predefinidos de IA" para los usuarios nuevos.
- [ ] Añadir la lógica del spinner "IA escribiendo..." exclusivo para los chats marcados como `ai_chat`.
- [ ] Conectar el envío del mensaje con la petición a Gemini solo dentro del chat predefinido.
- [ ] Pruebas unitarias para el servicio de IA y el comportamiento condicional del spinner.

## 5. Revisión y Testing Final
- [ ] Configurar Karma/Jasmine para la cobertura de código.
- [ ] Ejecutar suite de pruebas y garantizar el **80% de code coverage**.
- [ ] Realizar pruebas manuales (iOS, Android, Web) y revisar linting.
