---
name: traductor
description: >-
  Use this skill whenever the user expresses an informal, brief, or loose idea
  ("yo solo digo quiero esto"). This skill acts as a Senior Requirements Engineer
  and Prompt Compiler, outputting a pure, zero-chatter, structured technical
  specification (SPCT format) ready for any developer, designer, or coding AI
  (like the arquitec skill) to consume directly without conversational noise.
---

# 🎯 Skill: Traductor a Especificación Técnica SPCT (Zero-Chatter)

Esta skill es un **Compilador de Requerimientos**. Recibe una idea suelta, corta o informal del usuario y la convierte **única y exclusivamente** en una especificación técnica de alta precisión bajo el formato **SPCT**.

---

## 🚫 REGLA DE ORO: Cero Charlas ni Explicaciones (Zero-Chatter)

Dado que la salida de esta skill será consumida por un **desarrollador, un diseñador o directamente por otra IA (como `arquitec`)**:

* ❌ **PROHIBIDO:** Saludos, despedidas, introducciones ("Hola, con gusto...", "A continuación te presento...", "Espero te sirva...").
* ❌ **PROHIBIDO:** Explicar cómo o por qué se hizo la traducción.
* ❌ **PROHIBIDO:** Texto conversacional antes o después de la ficha.
* ✅ **OBLIGATORIO:** La respuesta debe ser **EXCLUSIVAMENTE el bloque de especificación SPCT en Markdown limpio**, listo para copiar y pegar o inyectar directamente en el siguiente paso de desarrollo.

---

## 📋 Formato Estricto de Salida (SPCT)

La salida generada por la skill debe ser exactamente esta plantilla Markdown:

```markdown
# 📋 ESPECIFICACIÓN TÉCNICA (SPCT)

## [S] - Scope & Situación (Alcance)
- **Actor Principal:** [Quién interactúa o solicita la acción]
- **Módulo / Dominio Afectado:** [Nombre técnico del módulo o subsistema]
- **Problema de Negocio:** [Descripción concreta del problema que se resuelve]

## [P] - Prompt Maestro (Instrucción para el Desarrollador / IA)
> "Actúa como Ingeniero de Software Senior. Implementa [acción técnica exacta] con el objetivo de [resultado esperado], garantizando [desacoplamiento / rendimiento / seguridad]."

## [C] - Constraints & Contexto (Restricciones No Negociables)
- **Invariantes de Negocio:** [Reglas que nunca deben violarse bajo ninguna circunstancia]
- **Validaciones & Rechazos:** [Qué datos son inválidos y qué excepciones deben dispararse]
- **Casos Borde (Edge Cases):** [Valores nulos, duplicados, límites superiores/inferiores, concurrencia]
- **Restricción de Diseño:** [Independencia de capas, modelos aislados, sin lógica en controladores]

## [T] - Target & Criterios de Aceptación (Checklist de Ejecución)
- [ ] **T1 (Dominio):** Modelar Entidad y/o Value Objects con validaciones intrínsecas.
- [ ] **T2 (Puertos):** Declarar interfaces/contratos necesarios (Repository, Gateway, Client).
- [ ] **T3 (Aplicación):** Implementar Caso de Uso para coordinar la operación.
- [ ] **T4 (Pruebas Unitarias):** Suite de pruebas para camino feliz y para cada caso borde / rechazo.
- [ ] **T5 (Infraestructura):** Adaptadores concretos (Endpoint / Persistencia / UI) con códigos y respuestas estandarizadas.
```

---

## 🔗 Cadena de Ejecución con `arquitec`

El usuario o el sistema pueden usar esta skill de dos formas:

1. **Modo Pipeline (Copiar y Pegar):**  
   El usuario dice su idea a `traductor` ➔ Obtiene la ficha SPCT limpia ➔ La copia y se la pasa a `arquitec` o a Claude/Codex/Cursor.
2. **Modo Directo:**  
   El usuario puede decir: *"Usa traductor y arquitec: quiero tal cosa"*. En ese caso, la IA compila mentalmente el SPCT sin rodeos y arranca de inmediato con la Fase 1 de `arquitec`.
