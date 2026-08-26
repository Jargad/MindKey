# GetPass: Plan de Implementación

Este documento detalla las fases para mejorar la seguridad, privacidad y experiencia de usuario de GetPass.

---

## ✅ Fase 1: Privacidad Total (Metadatos Cifrados)
**Objetivo:** Cifrar el nombre de los ítems para que el servidor no sepa dónde tiene cuentas el usuario.

- [x] **1.1 Actualizar Esquema de DB**: Cambiar campo `name` por `encryptedName` en `vault_items`.
- [x] **1.2 Ajustar API**: Actualizar los endpoints de creación y edición para manejar el nombre cifrado.
- [x] **1.3 Lógica del Cliente**: Cifrar el nombre al guardar y descifrarlo al listar.
- [x] **1.4 Búsqueda Local**: Implementar el filtrado de búsqueda en el cliente (ya no en el servidor).

---

## ✅ Fase 2: Pulido de UX y Seguridad de Sesión
**Objetivo:** Profesionalizar la interfaz y mejorar el flujo de uso diario.

- [x] **2.1 Notificaciones (Toasts)**: Integrar `sonner` para feedback de acciones (copiado, guardado, errores).
- [x] **2.2 Auto-Bloqueo**: Implementar temporizador de inactividad para limpiar la clave del vault.
- [x] **2.3 Persistencia de Sesión**: Permitir refrescar la página sin perder acceso (vía `sessionStorage`).

---

## ✅ Fase 3: Funcionalidades Avanzadas
**Objetivo:** Expandir las capacidades de gestión y migración.

- [x] **3.1 Auditoría de Salud**: Dashboard para detectar contraseñas débiles o reutilizadas.
- [x] **3.2 Importación/Exportación**: Soporte para CSV de Bitwarden/Chrome.
- [x] **3.3 Soporte PWA**: Hacer que la app sea instalable en móviles y escritorio.

---

## ✅ Fase 4: Integración y Distribución
- [x] **4.1 Extensión de Navegador**: (Concepto) Estructura base creada en carpeta `/extension` para auto-completado.
