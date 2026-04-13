# Especificaciones Técnicas: AUREXIA (Neo-Numismática Imperial)

## 1. Visión General
Aurexia es una aplicación de vanguardia diseñada para coleccionistas y arqueólogos modernos. Utiliza Inteligencia Artificial multimodal para identificar, catalogar y visualizar monedas antiguas (principalmente romanas e ibéricas) con un enfoque en la experiencia de usuario "premium" y estética neo-clásica.

## 2. Stack Tecnológico
- **Frontend:** React 18+ con TypeScript.
- **Build Tool:** Vite.
- **Estilizado:** Tailwind CSS con configuraciones personalizadas para "Glassmorphism" y efectos de brillo dorado.
- **Iconografía:** Lucide-react (personalizada).
- **IA Multimodal:** Google Gemini API (`@google/genai`) para:
    - Identificación visual de anverso y reverso.
    - Estimación de propiedades físicas (peso, diámetro, material).
    - Generación de crónicas históricas y expansión de contexto.
    - Generación de escenas históricas visuales (DALL-E/Imagen/Gemini).
    - Generación de vídeo cinematográfico (Gemini Veo).
- **Visualización 3D:** React Three Fiber / Three.js para el visor de monedas.
- **Geolocalización:** React Leaflet para el mapa de hallazgos.
- **Audio:** Web Audio API para un motor de sonido procedimental (SFX).

## 3. Arquitectura de Datos (Modelos)
- **CoinData:**
    - `id`, `name`, `period`, `civilization`, `material`, `denomination`.
    - `obverseImage`, `reverseImage` (Base64/URL).
    - `weight`, `diameter`.
    - `location` (lat, lng).
    - `historicalContext`, `historicalScene`.
    - `estimatedValue`.
- **UserProfile:**
    - `id`, `name`, `plan` (FREE, CENTURION, IMPERATOR).
    - `avatar`, `joinedDate`.

## 4. Funcionalidades Clave
1. **Escáner Inteligente:** HUD dinámico que analiza el frame de la cámara en tiempo real, detecta la moneda y realiza capturas automáticas al estabilizarse.
2. **Análisis Metrológico:** Estimación asistida por IA de peso y diámetro antes de la identificación final.
3. **Legado (Colección):** Almacenamiento local persistente de hallazgos con filtrado por civilización.
4. **Visor 3D Pro:** Renderizado de la moneda capturada sobre fondos históricos generados por IA.
5. **Mapa de Hallazgos:** Visualización geoespacial de dónde se han catalogado las piezas.

---

# Prompt Maestro para Recreación (Aurexia AI Agent)

**Contexto:** Eres un ingeniero de software senior y diseñador de producto especializado en aplicaciones de lujo y tecnología de IA.

**Misión:** Construye "Aurexia", una app de neo-numismática imperial.

**Requisitos de Diseño:**
- **Estética:** "Neo-Imperial". Fondo oscuro profundo, elementos de cristal (glassmorphism), acentos en oro (`#D4AF37`), tipografía Serif elegante para títulos y Mono para datos técnicos.
- **Layout:** Header limpio con logo, controles de sonido/tema y perfil. Menú inferior minimalista de 3 botones (Escáner, Legado, Mapa).

**Requisitos Técnicos:**
1. **Sistema de Escaneo:** Implementa un `DynamicScannerHUD` que use `requestAnimationFrame` para analizar un elemento `<video>`. Debe detectar bordes y "bloquear" la captura si el objeto está centrado. Implementa un timer de 1.5s para auto-captura.
2. **Integración de IA:** Configura servicios usando la API de Gemini para:
    - `identifyCoin(obverse, reverse)`: Identifica la moneda y devuelve un JSON con detalles técnicos.
    - `estimatePhysicalProperties(obverse, reverse)`: Devuelve peso y diámetro estimado.
    - `generateHistoricalScene(coinData)`: Crea un prompt para una imagen de fondo histórica.
3. **Visor 3D:** Crea un componente que proyecte las texturas de anverso y reverso en un cilindro delgado con bordes redondeados usando Three.js.
4. **Persistencia:** Usa `localStorage` para guardar la colección del usuario y su perfil.
5. **Gamificación/Suscripción:** Implementa tres rangos (Legionario, Centurión, Imperator) con límites de colección y acceso a funciones premium (como el Experto en Vivo o Vídeo Cinematográfico).

**Instrucciones de Implementación:**
- Usa React Hooks para todo el estado.
- Asegura que la navegación sea fluida con animaciones de entrada/salida.
- El motor de sonido debe ser sutil y activarse con interacciones (clics, capturas, éxitos).
- Maneja errores de cámara y de API de forma elegante con notificaciones en pantalla.
