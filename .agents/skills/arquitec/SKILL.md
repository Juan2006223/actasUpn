---
name: arquitec
description: >-
  Use this skill whenever designing, building, or refactoring features for Frontend
  or Backend in any language (Python, TypeScript, Vue, React, Java, etc.) under
  Vertical Slice Hexagonal Architecture (Feature-First / Slice-Driven). It guarantees
  that every feature encapsulates its own Domain, Application, and Infrastructure layers,
  with strict layer boundaries and mandatory unit testing.
---

# 🏛️ Skill: Arquitectura Hexagonal por Vertical Slices (Feature-First)

Esta skill rige el diseño y estructuración de software tanto para **Backend** como para **Frontend**.

---

## 🧭 0. Regla Obligatoria: Feature no es Entidad

Antes de proponer carpetas, código o tests, `arquitec` debe separar explícitamente:

- **Característica / Feature / Vertical Slice:** capacidad funcional del sistema con sus propias capas `dominio/`, `aplicacion/` e `infraestructura/`.
- **Entidad:** concepto de negocio que pertenece a una feature dueña.
- **Value Object:** valor con reglas propias.

`arquitec` no puede agrupar todo el dominio dentro de una única feature genérica como `programacion` cuando existen subdominios claros como `docentes`, `espacios`, `planes_trabajo`, `catalogos_academicos`, `auditoria` o `importacion_excel`.

El primer entregable siempre debe ser un **Mapa de Características y Entidades**, no código.

Formato mínimo:

```markdown
## Feature: [nombre]
- Propósito:
- Entidades dueñas:
- Value Objects:
- Reglas de dominio:
- Casos de uso:
- Puertos:
- Infraestructura futura:
- Relación con otras features:
```

Solo después de aprobación explícita del usuario se puede pasar a implementación.

---

## 🍕 1. Principio Fundamental: Vertical Slice (Feature-First)

En lugar de tener carpetas globales (`src/dominio`, `src/aplicacion`, `src/infraestructura`) donde todo termina mezclado, **el sistema se divide primero por Funcionalidades / Casos de Uso / Módulos (Vertical Slices)**.

Cada Vertical Slice encapsula sus propias 3 capas hexagonales:

```text
src/
├── features/ (o modules/)
│   ├── [nombre_funcionalidad]/        # SLICE 1 (Ej: profesores, hero_portfolio, comites)
│   │   ├── dominio/                   # Modelos, Value Objects y Reglas puras del Slice
│   │   ├── aplicacion/                # Casos de uso / Composables del Slice
│   │   └── infraestructura/           # UI / Endpoints / Repositorios del Slice (<200 líneas)
│   │
│   ├── [otra_funcionalidad]/          # SLICE 2 (Ej: salones, contacto, novedades)
│   │   ├── dominio/
│   │   ├── aplicacion/
│   │   └── infraestructura/
│   │
│   └── shared/ (o common/)            # Solo componentes/tipos 100% transversales
```

---

## ⚖️ 2. Las 5 Leyes Inviolables dentro de cada Slice

1. **Aislamiento del Slice:** Cada funcionalidad es autónoma. Si se elimina o mueve la carpeta del slice, se va con todo su dominio, lógica e interfaz sin romper el resto del sistema.
2. **Dependencias hacia adentro:** Dentro del slice: `Infraestructura ➔ Aplicación ➔ Dominio`.
3. **No saltar capas:** El controlador o vista UI dentro del slice llama al caso de uso del slice; nunca directo a la base de datos o almacenamiento.
4. **Dominio puro:** El `dominio/` dentro del slice no contiene frameworks, ORMs ni librerías de UI.
5. **Límite de 200 líneas:** Ningún archivo dentro del slice supera las 200 líneas.

---

## 🧪 3. Pruebas Unitarias por Slice

Cada slice contiene o acompaña sus propias pruebas automatizadas en consola (headless, sin abrir navegador):
* **Tests de Dominio:** Validaciones de negocio del slice.
* **Tests de Aplicación:** Casos de uso del slice probados con Fakes en memoria.
