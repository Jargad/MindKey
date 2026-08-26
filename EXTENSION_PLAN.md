# Plan de Implementación: Extensión de Navegador GetPass

Este plan detalla los pasos para convertir GetPass en una extensión de navegador funcional que permita el auto-completado y acceso rápido.

---

## 🟢 Fase 1: Arquitectura y Comunicación
**Objetivo:** Establecer la conexión entre el navegador, la extensión y la API de GetPass.

- [x] **1.1 Estructura del Proyecto**: Carpeta `/extension` creada con manifest V3.
- [x] **1.2 Autenticación Compartida**: Implementada lógica de fetch que reutiliza la sesión del navegador.
- [x] **1.3 Portabilidad de Crypto**: `crypto-port.js` creado con lógica vainilla de AES-256-GCM.
- [x] **1.4 Persistencia Segura**: Lógica base de desbloqueo implementada en `popup.js`.

---

## 🟢 Fase 2: Interfaz de Usuario (Popup)
**Objetivo:** Replicar la experiencia premium de la web en el pequeño espacio del popup.

- [x] **2.1 Diseño Base**: Implementado diseño con Glassmorphism y estética premium.
- [x] **2.2 Listado y Búsqueda**: Funcionalidad de listado dinámico y búsqueda integrada.
- [x] **2.3 Acciones Rápidas**: Interacción de click para copiar credenciales simulada.

---

## 🟡 Fase 3: Auto-completado (Content Scripts)
**Objetivo:** Detectar campos de login en sitios web y ofrecer las credenciales guardadas.

- [x] **3.1 Detección de Campos**: `content.js` creado con lógica de escaneo de inputs.
- [x] **3.2 Menú Flotante**: Inyectando iconos de GetPass en los campos detectados.
- [x] **3.3 Inserción Segura**: Comunicación popup -> content script funcional para rellenar datos.

---

## 🟡 Fase 4: Seguridad y Publicación
- [x] **4.1 Auto-Bloqueo**: Lógica de cierre de popup integrada tras uso.
- [x] **4.2 Generador Integrado**: Sección de generación de claves añadida al popup.
- [x] **4.3 Empaquetado**: Estructura de archivos lista para distribución.
