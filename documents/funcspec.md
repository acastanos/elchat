# Especificación Funcional: App de Chat con IA (ElChat)

## 1. Visión General
Aplicación de mensajería instantánea para plataformas iOS y Android, desarrollada con tecnologías web modernas y empaquetada como aplicación nativa. La app permitirá a los usuarios registrarse, mantener conversaciones y recibir respuestas automatizadas generadas por un modelo de Inteligencia Artificial ligero.

## 2. Stack Tecnológico
*   **Frontend**: Ionic Framework con Angular.
*   **Contenedor Nativo**: Capacitor (para compilación a iOS y Android).
*   **Autenticación**: Firebase Authentication (Login/Registro).
*   **Base de Datos**: Firebase Realtime Database (Requisito del ejercicio).
*   **Inteligencia Artificial**: Modelo ligero gratuito y de fácil implementación.

## 3. Capacidades Core (MVP)

### 3.1. Autenticación, Usuarios y Roles
*   Registro de nuevos usuarios (Email, Contraseña y Nombre).
*   Inicio de sesión dual: Email/Contraseña y Google Sign-In (Gmail). Ajustado con `signInWithRedirect` para robustez en navegadores móviles (iOS Chrome).
*   Gestión básica de perfil (Nombre de usuario, Avatar).
*   **Roles y Permisos**: Soporte para perfil de `admin`. El administrador dispone de utilidades en la pantalla de Ajustes para resetear la base de datos o marcar chats como no leídos.
*   **Protección de Rutas (Guards)**: Uso de Angular Guards para restringir el acceso a las vistas internas, permitiendo a los usuarios no logueados acceder únicamente a las páginas de Login y Registro.

### 3.2. Sistema de Chat
*   **Buscador de Usuarios**: Posibilidad de buscar a otros usuarios registrados por su nombre en la base de datos para iniciar una nueva conversación privada.
*   Listado de conversaciones activas (incluyendo chats con humanos y el chat predefinido con la IA).
*   **Marcador de Lectura (LastRead)**: Sistema que recuerda exactamente el último mensaje leído por el usuario mediante timestamps persistidos en `/userChats`.
*   **Paginación Bidireccional Inteligente**: Pantalla de chat con Infinite Scroll nativo hacia arriba (mensajes antiguos) y hacia abajo (mensajes nuevos sin leer), posicionando el inicio justo en la frontera de mensajes sin leer con un divisor visual.
*   Almacenamiento del historial de mensajes en Firebase Realtime Database.
*   **Validación de Entrada**: Uso de **Formularios Reactivos (Reactive Forms)** en Angular para la caja de texto.
*   **Geolocalización:** Los mensajes se enviarán con la posición geográfica (latitud y longitud) del remitente utilizando el plugin nativo de Capacitor.

### 3.3. Interacción con IA (Perfiles "Mamá" y "Mi amor churri")
La Inteligencia Artificial se integra a través de dos **chats predefinidos** que todos los usuarios tendrán activos obligatoriamente. El objetivo es dar un tono "jugoso" y divertido a la app.
*   **Condición Crítica**: La IA no conoce el género del usuario, por lo que todas sus respuestas (y los mensajes predefinidos) usarán lenguaje genérico o neutral.
*   **Perfil "Mamá"**: Actuará como la típica madre. Además de interactuar, enviará un mensaje automático sin consumir la API (elegido aleatoriamente de un array de 10-12 frases preparadas) "cada vez que el usuario entre en la app" (ej: "Tenías mala cara ayer", "Te estás quedando en los huesos"). Si el usuario responde, entrará en juego el modelo de IA bajo la premisa: *"qué diría una madre a su hijo/a"*.
*   **Perfil "Mi amor churri"**: Actuará como la pareja del usuario (se definirá más a fondo tras finalizar a "Mamá").

Para los chats de IA, el flujo gestionado en el cliente será:
1. El sistema puede enviar mensajes automáticamente (ej. Mamá al inicio).
2. Si el usuario responde, el mensaje se guarda en Firebase.
3. La interfaz muestra un indicador visual (spinner o burbuja de "IA escribiendo...").
4. La App solicita la respuesta al modelo de IA inyectando el historial y el System Prompt correspondiente.
5. El mensaje de la IA se almacena en Realtime Database simulando una respuesta humana natural.

---

## 4. Decisiones Arquitectónicas Adoptadas

### A. Base de Datos (Realtime DB)
Se utilizará estrictamente **Firebase Realtime Database** según las instrucciones de tu ejercicio. Una estructura de datos típica y recomendada será:
*   `/users/{userId}`: Perfil del usuario (nombre, email). El campo de nombre se usará para el buscador de usuarios.
*   `/chats/{chatId}`: Metadatos de la conversación (participantes, último mensaje, tipo de chat: `ai_chat` o `direct_chat`).
*   `/messages/{chatId}/{messageId}`: Listado cronológico de mensajes.

### B. El Modelo de IA (Google Gemini API)
Dado que el objetivo es mantener un desarrollo ágil y utilizar un modelo gratuito sin la carga de gestionar un servidor local, se utilizará la **API de Google Gemini (Free Tier)**.

*   **Integración**: La app consumirá la API de Gemini directamente (a través de su SDK o endpoints HTTP). Para máxima simplicidad, la llamada se realizará desde el cliente tras almacenar el mensaje del usuario.
*   **Comportamiento**: Al recibir el mensaje del usuario, la App pasará el historial reciente de la conversación a Gemini con un *System Prompt* diseñado para que actúe de forma simple y amigable. Tras recibir el texto de respuesta, la App lo inyectará en la base de datos de Firebase.

---

## 5. Resumen de Flujos de Usuario (MVP)

1.  **Registro/Login**: El usuario se registra (Email/Pass/Nombre) o entra con Gmail. Se guarda/recupera su perfil en `/users/{userId}`.
2.  **Lista de Chats y Búsqueda**: El usuario ve sus chats activos (incluyendo el chat predefinido de IA). Puede usar un buscador para localizar a otro usuario por su nombre e iniciar un chat 1-a-1.
3.  **Chat con IA (Mamá / Mi amor churri)**:
    *   **Automático**: Al entrar en la app, el sistema evalúa si "Mamá" debe hablar e inserta un mensaje aleatorio en nombre de la IA.
    *   **Conversacional**: El usuario envía un mensaje a uno de estos bots.
    *   El mensaje se guarda y aparece en el chat.
    *   Aparece un *spinner* indicando *"Escribiendo..."*.
    *   La app llama a la API de Gemini enviando el historial y el prompt ("Actúa como una madre intensa que no sabe el género de su hijo...").
    *   Gemini responde y la app guarda la respuesta en Firebase como si la IA fuera el remitente.

---

## 6. Metodología y Requisitos Técnicos

*   **Cobertura de Tests**: El proyecto cuenta con un entorno configurado con **Jasmine y Karma**, superando las pruebas unitarias para componentes complejos (`ChatDetailComponent`, `SettingsComponent`) gracias al uso de *Spies* para inyectar mocks asíncronos de Firebase y Ionic.
*   **Desarrollo Modular y Controlado**: Se aplicará una arquitectura modular en Angular.
*   **Estado Actual del Entorno**: El proyecto base ya está inicializado con Ionic/Angular en el directorio de trabajo, tiene Capacitor instalado (iOS/Android), y ya se encuentra enlazado al proyecto de Firebase en la nube (`el-chat-69585`).

## Siguientes Pasos
Con la especificación técnica completada y los requisitos fijados, podemos arrancar con la ejecución. El primer paso será revisar la base del código actual, asentar el esqueleto modular de Angular, y preparar la configuración inicial de Auth y los Guards.
