---
name: Calidad de cambios sin errores de build
description: No introducir errores de compilación ni funciones montadas a medias; verificar imports y que cada componente creado esté accesible desde la UI
type: preference
---
Nunca entregar un cambio con errores de build. Antes de responder: verificar que todo componente usado esté importado y que todo componente/página creado esté realmente montado en una ruta o pestaña accesible.

**Why:** El usuario reportó módulos existentes que nunca aparecían en la UI (ej. CollectionControlTab) y errores TS al agregar pestañas.

**How to apply:** Al agregar un componente a una página, agregar el import en el mismo patch y correr tsgo antes de cerrar la respuesta.