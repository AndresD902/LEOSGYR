# 📚 CattlePro — Documentación

> **Set completo de documentación del proyecto CattlePro.** Cada archivo cumple una función específica y se conecta con los demás. Este README es el mapa.

---

## 📖 ¿Qué es esto?

Es la **documentación foundational del proyecto** — el conjunto de archivos que un agente de IA o un nuevo desarrollador lee para entender el sistema completo antes de tocar código. Está pensado para que cualquiera pueda retomar el trabajo sin contexto previo.

---

## 🗂️ Los documentos

| # | Archivo | Para qué sirve |
| - | ------- | -------------- |
| 1 | **`activeContext.md`** | El más dinámico. Estado *actual* del proyecto: qué se acaba de terminar, qué está en progreso, qué sigue. Se actualiza cada sesión. **Es el primer archivo que se lee al retomar trabajo.** |
| 2 | **`projectbrief.md`** | La biblia. Visión, problema, público objetivo, alcance del MVP, métricas de éxito, restricciones, no-negociables, matriz RBAC. Si solo pudieras leer un archivo, este. |
| 3 | **`productContext.md`** | El "porqué humano". Personas reales, jobs-to-be-done, día en la vida del ganadero, principios de experiencia, anti-patterns de UX. Le da intención de diseño al agente. |
| 4 | **`businessRules.md`** | Reglas de negocio reales validadas con conocimiento ganadero. **Autoritativo en cuestiones de dominio** (gestación, lactancia, salud, reproducción). Provisto por el owner. |
| 5 | **`decisions.md`** | 22 Architecture Decision Records (ADRs). Cada decisión arquitectónica con su contexto, alternativas y consecuencias. Evita que el agente reabra decisiones ya tomadas. |
| 6 | **`techContext.md`** | Stack exhaustivo: cada librería, versión exacta, para qué se usa. Si algo no está aquí, no está aprobado. |
| 7 | **`dataModel.md`** | El esquema completo de la base de datos. Cada entidad, columna, tipo, índice, constraint, invariante de negocio, ciclo de vida. Es el contrato semántico del sistema. |
| 8 | **`systemPatterns.md`** | Patrones de arquitectura y diseño. Estructura del monorepo, capas, repository pattern, error handling, RBAC, audit, eventos, jobs, testing. Plus 20+ anti-patterns explícitos. |
| 9 | **`features.md`** | Catálogo de funcionalidades por módulo con reglas, casos borde, errores tipados, permisos por rol. 100+ features en 20 módulos. |
| 10 | **`useCases.md`** | Casos de uso por rol (OWNER, VETERINARIAN, EMPLOYEE, AUDITOR) más escenarios cross-rol. Cómo usuarios reales operan el sistema. |
| 11 | **`progress.md`** | Tracker dinámico. Checklist por fase con marcadores de 5 estados (⬜ 🟦 🟨 🟩 🟪). Indica qué está construido y qué no. |

---

## 🎯 Orden de lectura recomendado

### Para un agente de IA empezando una sesión

Sigue este orden exacto:

1. **`activeContext.md`** — entender en qué punto está todo *ahora*.
2. **`projectbrief.md`** — visión y scope general.
3. **`businessRules.md`** — las reglas reales del dominio.
4. **`productContext.md`** — la realidad del usuario.
5. Luego, según la tarea específica, carga los documentos relevantes (la sección §7 de `activeContext.md` te dice cuáles para cada tipo de trabajo).

### Para un nuevo desarrollador humano

Lectura completa, en este orden:

1. **`projectbrief.md`** — qué se construye y por qué.
2. **`productContext.md`** — para quién y cómo se siente.
3. **`businessRules.md`** — las reglas de la realidad ganadera.
4. **`decisions.md`** — qué se decidió y por qué.
5. **`techContext.md`** — el stack completo.
6. **`dataModel.md`** — el modelo de datos.
7. **`systemPatterns.md`** — cómo está organizado el código.
8. **`features.md`** — qué hace cada parte.
9. **`useCases.md`** — cómo se usa.
10. **`progress.md`** — qué está hecho.
11. **`activeContext.md`** — qué sigue.

### Por tipo de tarea

| Si vas a trabajar en... | Carga estos documentos |
| ----------------------- | ---------------------- |
| Cualquier código        | `systemPatterns.md` + `techContext.md` + `activeContext.md` |
| Esquema / migraciones   | + `dataModel.md` + `businessRules.md` |
| Backend (feature nuevo) | + `features.md` (módulo) + `useCases.md` (rol) + `dataModel.md` + `businessRules.md` |
| Frontend                | + `features.md` (módulo) + `useCases.md` + `productContext.md` |
| Auth / RBAC             | + `decisions.md` ADR-010/011/012/013 + `dataModel.md` §3 + `features.md` AUTH/USERS + `systemPatterns.md` §10-§12 + `projectbrief.md` §11.1 |
| Finanzas / reportes     | + `features.md` FINANCE/CALF_COST/REPORTS + `dataModel.md` §10 + `businessRules.md` §7 |
| Tests                   | + `systemPatterns.md` §20 + features y entidades en alcance |

---

## ⚖️ Cadena de autoridad

Cuando dos documentos se contradicen sobre un mismo tema, esta es la jerarquía:

| Tema | Documento autoritativo |
| ---- | ---------------------- |
| Reglas del dominio (vacas, leche, reproducción, salud) | `businessRules.md` |
| Estructura de la base de datos | `dataModel.md` |
| Decisiones arquitectónicas top-level | `decisions.md` |
| Scope, mercado objetivo, permisos, no-negociables | `projectbrief.md` |
| Patrones de código y organización | `systemPatterns.md` |
| Qué hace cada feature | `features.md` |
| Flujos de usuario | `useCases.md` |
| Versiones de dependencias | `techContext.md` |
| Qué está construido | `progress.md` |
| Qué está pasando *ahora* | `activeContext.md` |

---

## 🔄 Reglas de mantenimiento

- **`activeContext.md` se actualiza cada sesión.** Estancarlo es un bug crítico.
- **`progress.md` se actualiza en el mismo PR** que cambia el estado de una tarea.
- **El resto se actualiza cuando cambia algo sustantivo** — siempre con un PR titulado `docs(<doc>): <descripción>`.
- **Si código y documento están en desacuerdo:**
  - Para `progress.md` y `activeContext.md`: el código gana, se actualiza el doc.
  - Para los demás: se discute. Generalmente el doc gana porque es el contrato; si el doc estaba mal, se actualiza primero, luego el código.
- **`businessRules.md` no se modifica sin revisión veterinaria.**

---

## 📦 Estructura recomendada en el repo

Cuando muevas estos archivos a tu repositorio:

```
cattlepro/
├── docs/
│   ├── README.md                ← este archivo
│   ├── activeContext.md
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── businessRules.md
│   ├── decisions.md
│   ├── techContext.md
│   ├── dataModel.md
│   ├── systemPatterns.md
│   ├── features.md
│   ├── useCases.md
│   └── progress.md
├── apps/
├── packages/
└── ...
```

---

## 🚀 ¿Por dónde empezar?

Si estás llegando a este proyecto por primera vez:

1. Lee este README hasta aquí. ✅
2. Abre **`activeContext.md`** y revisa la sección **§5 Up Next** — verás las 3 prioridades inmediatas con instrucciones paso a paso.
3. Antes de tocar código, revisa **§7 Context to Load Before Working** y **§8 Working Conventions in Force** del mismo `activeContext.md`.
4. Empieza.

---

*Última actualización: 2026-05-02 — Set inicial completo.*
