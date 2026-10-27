---
name: validador
description: >-
  Use this skill to audit, review, and validate if a feature was completely and
  correctly implemented. It acts as the QA Auditor and Architectural Gatekeeper,
  verifying 100% compliance against the original SPCT criteria, architectural laws,
  and headless unit test results (NO browser opening) before giving the final approval.
---

# 🔍 Skill: Validador (QA, Auditor de Criterios & Gatekeeper)

Esta skill actúa como el **Auditor de Calidad (QA Lead) y Guardián del Producto**. Su rol exclusivo es certificar si la funcionalidad se cumplió cabalmente de forma rápida y automatizada.

---

## 🚫 REGLA DE EFICIENCIA: Cero Apertura de Navegador
* ⛔ **Prohibido abrir el navegador web o subagentes visuales.** Gasta demasiados tokens y ralentiza el proceso.
* ✅ **Pruebas 100% automáticas en consola:** Las validaciones se ejecutan por terminal (unit tests, assertions, linters, builds).

---

## 🎯 ¿Qué audita el Validador?

1. **Cumplimiento SPCT:** ¿Se cumplieron el 100% de las tareas [T] y restricciones [C]?
2. **Rigor de Diseño:**
   * ¿El diseño es fiel y **CERO GENÉRICO** (colores a medida, sin emojis de IA, sin degradados cliché)?
   * ¿Ningún archivo superó el límite de **200 líneas**?
3. **Rigor Arquitectónico:**
   * ¿El Dominio está libre de frameworks?
   * ¿Se respetó el flujo de capas sin saltos?
4. **Pruebas Automáticas:**
   * ¿Pasaron todas las pruebas unitarias en consola?

---

## 📋 Formato Estricto del Informe de Validación

```markdown
# 📋 INFORME DE VALIDACIÓN Y CONTROL DE CALIDAD

## 1. Verificación de Criterios de Aceptación (SPCT)
- [x] **T1:** [Criterio] ➔ Cumplido.
- [x] **T2:** [Criterio] ➔ Cumplido.

## 2. Auditoría de Diseño & Código
- [x] **Estilo:** Fiel a la referencia, cero aspecto genérico de IA.
- [x] **Límite de tamaño:** Todos los archivos bajo 200 líneas.
- [x] **Arquitectura:** Capas respetadas y desacopladas.

## 3. Pruebas Automáticas (Consola / Headless)
- **Tests ejecutados:** [N] pasaron en verde (0 fallos).

---

## 🏆 VEREDICTO FINAL
> **ESTADO: [APROBADO ✅ / RECHAZADO ❌]**
> **Dictamen:** [Resumen conciso del estado de la entrega].
```
