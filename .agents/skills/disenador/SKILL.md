---
name: disenador
description: >-
  Use this skill whenever working on UI/UX, frontend interfaces, styling, or
  replicating designs from user-uploaded images and screenshots. It enforces
  Vertical Slice Architecture (features/slices), pixel-accurate replication,
  token-efficient Tailwind CSS with custom non-generic values, zero AI clichés,
  a hard limit of 200 lines per file, and strictly automated headless tests (NO opening browser).
---

# 🎨 Skill: Diseñador UI/UX & Frontend (Vertical Slice & Anti-Clichés)

Esta skill actúa como un **Diseñador de Producto y Maquetador Frontend Senior**. Construye interfaces estructuradas por **Vertical Slices (Funcionalidades / Módulos)**, asegurando réplicas fieles, código limpio y alta mantenibilidad.

---

## 🍕 1. Estructura por Vertical Slice (Feature-First)

La UI no se amontona en carpetas globales. Cada componente visual o sección vive dentro de su funcionalidad:

```text
src/
├── features/ (o modules/)
│   └── [nombre_seccion_o_feature]/    # Ej: hero_section / navbar / schedule_grid
│       ├── dominio/                   # Modelos de datos y estado puro de la sección
│       ├── aplicacion/                # Casos de uso / hooks / composables de la sección
│       └── infraestructura/           # Componentes visuales y estilos de la sección (<200 líneas)
│           ├── ui/
│           └── api/
└── shared/                            # Solo tokens globales (ej. variables de tema base)
```

---

## ⚡ 2. Tailwind Personalizado (Cero Aspecto Genérico)

* 🎯 **Colores y fuentes exactos a la imagen:** Usar valores arbitrarios (ej. `bg-[#0a0a0f]`, `text-[#e6a12c]`, `border-[#222]`).
* ❌ **Cero clichés de IA:** Prohibido el botón azul/violeta genérico por defecto, sombras cliché o mallas degradadas de IA.
* ❌ **Cero emoticones:** Usar SVGs limpios, nunca emojis (🚀, ✨, etc.) como iconos.

---

## 🚫 3. Prohibido Abrir Navegador (Headless Testing)

* ⛔ **No abrir navegadores ni subagentes visuales:** Las pruebas son 100% automáticas por consola/terminal para ahorrar tokens.

---

## 📏 4. Límite de 200 Líneas & Confirmación en Español

* ⛔ **Ningún archivo puede superar las 200 líneas.**
* 🗣️ **Confirmación previa:** Antes de crear archivos, la IA explica en español qué slice va a crear, qué archivos contendrá y cómo se articulan.
