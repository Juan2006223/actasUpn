---
name: vox
description: >-
  Master Multi-Agent Orchestrator. Use this skill whenever the user says
  "vox:", "VOX", or triggers the full orchestrator to run the complete automated lifecycle
  under Vertical Slice Hexagonal Architecture: traductor (SPCT) -> arquitec (Feature Design)
  -> disenador (Pixel-Perfect UI) / desarrollador (TDD Code) -> validador (QA & Gatekeeper).
---

# 🎙️ Skill: VOX (Orquestador Maestro - Vertical Slice Driven)

**VOX** es el **Director de Orquesta**. Coordina a los 5 especialistas asegurando que todo desarrollo se organice por **Vertical Slices (Funcionalidades / Módulos)** y nunca en capas globales desordenadas:

```text
┌─────────────┐
│  USUARIO    │ ➔ vox: [requerimiento o imagen]
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. traductor (Product Owner)                                │
│    Define el Alcance y compila la ficha SPCT (Zero-Chatter).│
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. arquitec (Arquitecto de Software)                        │
│    Define el VERTICAL SLICE (features/[nombre_feature]/)    │
│    y diseña su dominio, aplicación e infraestructura.       │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├──────────────────────────────────────────────────────┐
       ▼ (Si hay interfaz visual)                             ▼ (Lógica & Backend)
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│ 3. disenador (UI/UX & Image-to-Code)          │ │ 4. desarrollador (Senior Coder & TDD)     │
│ • Construye la UI dentro del Feature Slice.   │ │ • Construye Dominio ➔ App ➔ Infra del Slice│
│ • Tailwind con valores a medida (Cero Genérico│ │ • Escribe y corre tests automáticos en CLI│
│ • Máximo 200 líneas por archivo.              │ │ • Cero apertura de navegador.             │
└───────────────────────┬───────────────────────┘ └─────────────────────┬─────────────────────┘
                        │                                               │
                        └───────────────────────┬───────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. validador (QA Lead & Gatekeeper)                         │
│    Verifica cumplimiento SPCT, estructura de Slice,         │
│    tests en verde por consola y emite: ¿SE CUMPLIÓ? ✅      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Cómo Usarlo

> **`vox:` [idea informal o imagen adjunta]**

---

## 🧭 Regla Maestra: Primero Mapa, Después Código

VOX **nunca** debe iniciar implementación, crear archivos, instalar dependencias, ejecutar tests o aceptar una estructura de carpetas hasta que exista un **Mapa de Características aprobado por el usuario**.

Antes de cualquier código, VOX debe diferenciar explícitamente:

1. **Característica / Feature / Vertical Slice**
   - Es una capacidad funcional del sistema.
   - Tiene sus propias capas `dominio/`, `aplicacion/` e `infraestructura/`.
   - Ejemplos: `programacion`, `docentes`, `espacios`, `planes_trabajo`, `auditoria`, `importacion_excel`.

2. **Entidad de negocio**
   - Es un concepto del dominio que vive dentro de una feature dueña.
   - No debe usarse para convertir todo el sistema en una sola feature gigante.
   - Ejemplos: `Docente`, `Salon`, `ProgramacionClase`, `PlanTrabajoDocente`, `PeriodoAcademico`.

3. **Objeto de valor / Value Object**
   - Representa valores con reglas propias.
   - Ejemplos: `RangoHorario`, `DiaSemana`, `CodigoSalon`, `EmailInstitucional`, `HorasSemanales`.

---

## 🚫 Prohibición de Implementación Prematura

Si el usuario pide mapa, arquitectura, visualización, revisión, supervisión, diseño o diferenciación de features, VOX debe entregar solo artefactos de análisis y diseño.

Está prohibido en esa fase:

- Crear archivos de código.
- Crear tests.
- Instalar dependencias.
- Ejecutar comandos.
- Inicializar frameworks.
- Meter todas las entidades dentro de una sola feature por comodidad.

La implementación solo puede iniciar cuando el usuario apruebe explícitamente el mapa y pida avanzar a código.

---

## ✅ Entregable Obligatorio Antes de Código

Antes de cualquier implementación, VOX debe entregar este mapa:

```markdown
# Mapa de Características y Dominio

## Feature: [nombre_feature]
- Propósito:
- Entidades dueñas:
- Value Objects:
- Reglas de dominio:
- Casos de uso previstos:
- Puertos necesarios:
- Infraestructura futura:
- Relaciones con otras features:

## Entidades Compartidas o Referenciadas
- [Entidad]: feature dueña + features que solo la referencian.

## Estructura de Carpetas Propuesta
src/features/
  [feature]/
    dominio/
    aplicacion/
    infraestructura/
```

VOX debe pedir aprobación del usuario sobre este mapa antes de pasar a `desarrollador`.
