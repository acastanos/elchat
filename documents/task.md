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
- [x] Crear el servicio Orquestador (`AiOrchestratorService`) para auto-crear los perfiles "Mamá" y "Mi amor churri" para todos los usuarios.
- [x] Implementar la lógica de "Mensajes Automáticos" de "Mamá" (Array de 10-12 mensajes aleatorios) enviados cada vez que el usuario entre en la app.
- [x] Construir un Backend Seguro (`netlify/functions/gemini.js`) para aislar la API Key de Google.
- [x] Implementar Servicio de IA (`AiService`) que consuma nuestra propia Netlify Function.
- [x] Definir los System Prompts para garantizar respuestas genéricas (sin marcas de género) y con el tono humorístico/intenso requerido.
- [x] Añadir la lógica del spinner "IA escribiendo..." exclusivo para los chats marcados como bots.
- [x] Conectar el envío del mensaje con la petición a Gemini solo dentro de estos chats predefinidos.
- [ ] Pruebas unitarias para el servicio de IA y el comportamiento condicional.

## 5. Revisión y Testing Final
- [x] Configurar Karma/Jasmine para la cobertura de código.
- [x] Ejecutar suite de pruebas (25/25 pasando) para `ChatDetailComponent`, `SettingsComponent` y Servicios aislando dependencias.
- [x] Realizar pruebas manuales (iOS Safari/Chrome) y resolver bugs críticos:
  - [x] Solución al login infinito en Chrome iOS (`signInWithRedirect`).
  - [x] Solución al bug de enrutamiento con `<ion-back-button>`.
  - [x] Solución al último mensaje oculto por el teclado (padding-bottom adaptativo).
