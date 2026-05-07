# businessRules.md — Reglas de Negocio
## Sistema de Gestión Ganadera

> Este documento contiene las reglas de negocio reales del sistema, basadas en conocimiento
> ganadero validado. El agente de programación debe respetar estas reglas sin excepción.
> Ninguna lógica de negocio debe ser inventada o asumida fuera de lo que está aquí documentado.

---

## 1. ANIMALES — ESTADOS Y TRANSICIONES

### 1.1 Estados válidos de una vaca (`AnimalStatus`)

| Estado | Descripción |
|---|---|
| `ACTIVE` | En el hato, operando con normalidad. Puede estar siendo ordeñada, en celo o sin preñar. Estado por defecto. |
| `PREGNANT` | Tiene una preñez confirmada con `outcome = PENDING`. El sistema lo asigna automáticamente al confirmar la preñez. |
| `DRY` | El ganadero decidió dejar de ordeñarla intencionalmente. Generalmente en los últimos 40-60 días antes del parto para que el ubre descanse y se prepare para la siguiente lactancia. |
| `QUARANTINED` | Separada del hato por razones de salud (enfermedad contagiosa, tratamiento con medicamentos que contaminan la leche, o sospecha en evaluación). Su leche no se mezcla con la producción general. |
| `SOLD` | Salió de la finca por venta. Estado terminal — no vuelve a `ACTIVE`. Genera ingreso en finanzas (`ANIMAL_SALE`). |
| `DECEASED` | Murió. Estado terminal. Genera pérdida de activo en finanzas. |

### 1.2 Transiciones de estado permitidas

```
ACTIVE → PREGNANT      (al confirmar preñez)
ACTIVE → DRY           (decisión del dueño o veterinario)
ACTIVE → QUARANTINED   (decisión del veterinario)
ACTIVE → SOLD          (venta del animal)
ACTIVE → DECEASED      (muerte del animal)

PREGNANT → ACTIVE      (al cerrar la preñez: parto, aborto o complicación)
PREGNANT → DRY         (permitido — una vaca puede estar preñada y seca simultáneamente)

DRY → ACTIVE           (cuando se retoma el ordeño)
DRY → PREGNANT         (si se confirma preñez estando seca — permitido)

QUARANTINED → ACTIVE   (cuando el veterinario da el alta)

SOLD → (ninguna)       ← estado terminal
DECEASED → (ninguna)   ← estado terminal
```

### 1.3 Reglas de estado importantes

- Una vaca en estado `SOLD` o `DECEASED` **no puede** registrar producción de leche, nuevas preñeces ni eventos de salud.
- Una vaca en estado `DRY` **no debe** registrar producción de leche. El sistema debe bloquear este registro y mostrar un error.
- Una vaca en estado `QUARANTINED` puede registrar producción de leche, pero el sistema debe marcarla como **"leche no apta"** y excluirla de los totales de producción comercial.
- El cambio de estado `ACTIVE → DRY` puede hacerlo el dueño o el veterinario. Si lo hace el dueño, el sistema debe mostrar una recomendación: *"Se recomienda confirmar este cambio con el veterinario antes de proceder."*
- Los datos históricos de vacas `SOLD` y `DECEASED` se conservan siempre porque sus crías pueden seguir en la finca y su genealogía sigue siendo válida.

---

## 2. REPRODUCCIÓN

### 2.1 Gestación

- **Duración:** entre **279 y 283 días** desde la fecha de concepción confirmada.
- El sistema calcula la **fecha estimada de parto** usando 281 días como valor central, con un rango mostrado de ±2 días.
- La fecha estimada de parto es orientativa, no exacta.

### 2.2 Reglas para registrar una preñez

- Una vaca **no puede** tener dos preñeces activas simultáneamente (`outcome = PENDING`).
- Una vaca en cualquier estado excepto `SOLD` o `DECEASED` **puede** quedar preñada, incluyendo el estado `DRY`.
- El sistema debe validar estas condiciones antes de registrar una nueva preñez y mostrar un error si no se cumplen.

### 2.3 Tiempo mínimo entre partos

- Después de un **parto exitoso**, la vaca puede volver a preñarse entre **45 y 90 días** contados desde el día del parto.
- Si intenta registrarse una preñez antes de los 45 días post-parto, el sistema debe mostrar una **advertencia** (no un bloqueo): *"Han pasado menos de 45 días desde el último parto. Se recomienda evaluación veterinaria antes de proceder."*
- Después de un **aborto o complicaciones**, el tiempo de espera lo determina el veterinario caso por caso. El sistema debe mostrar una **advertencia obligatoria**: *"El último evento reproductivo fue un aborto o tuvo complicaciones. Es obligatorio que el veterinario evalúe a la vaca antes de registrar una nueva preñez."* El sistema no bloquea, pero registra que la advertencia fue mostrada.

### 2.4 Métodos de concepción

| Método | Datos requeridos |
|---|---|
| Monta natural | Toro de la finca (padre) |
| Inseminación artificial (IA) | Toro donante (puede ser externo), código de pajilla, laboratorio/centro proveedor |

### 2.5 Resultados de una preñez (`PregnancyOutcome`)

| Resultado | Acción del sistema |
|---|---|
| `SUCCESSFUL` | Se crea automáticamente el registro de la cría. La vaca vuelve a `ACTIVE`. |
| `ABORTION` | No se crea cría. La vaca vuelve a `ACTIVE`. Se muestra advertencia para nueva preñez. |
| `COMPLICATIONS` | No se crea cría automáticamente. La vaca vuelve a `ACTIVE`. Se muestra advertencia para nueva preñez. |

---

## 3. CRÍAS Y TERNEROS

### 3.1 Registro de una cría

- Al registrar un parto exitoso, el sistema crea automáticamente el registro de la cría con:
  - Madre (vaca que parió)
  - Padre (toro de la preñez — natural o por pajilla)
  - Fecha de nacimiento
  - Sexo (macho/hembra)
  - Peso al nacer
  - Raza resultante

### 3.2 Candidato a padrote

- Un ternero macho puede ser marcado manualmente como **"Candidato a padrote"** por el dueño o el veterinario.
- Esta decisión no es automática — el sistema solo registra la decisión tomada por el usuario.
- Los criterios típicos que influyen en esta decisión (no automatizados, son referencia para el usuario):
  - Tamaño y desarrollo físico destacado
  - Alta composición racial del padre (mayor porcentaje de raza pura)
  - Genealogía de alto valor
  - Características físicas sobresalientes respecto a los demás terneros
- Cuando un ternero es marcado como candidato a padrote, el sistema debe reflejarlo en su valoración económica como un factor que incrementa el precio estimado.

### 3.3 Estados de una cría (`CalfStatus`)

| Estado | Descripción |
|---|---|
| `NURSING` | En período de lactancia, con la madre |
| `WEANED` | Destetado, ya separado de la madre |
| `SOLD` | Vendido. Terminal. |
| `DECEASED` | Muerto. Terminal. |
| `PROMOTED` | Promovido a vaca o toro en el sistema (cuando la cría crece y se registra como animal adulto) |

---

## 4. RAZAS

### 4.1 Razas predefinidas en el sistema (mínimo 10)

El sistema debe incluir al menos las siguientes razas como catálogo base:

1. Brahman
2. Holstein
3. Gyr (Gir)
4. Girolando
5. Nelore
6. Guzerat
7. Cebú
8. Angus
9. Jersey
10. Simmental
11. Hereford
12. Romosinuano *(raza colombiana)*

El catálogo de razas debe ser **extensible** — el administrador puede agregar nuevas razas si el sistema no la tiene.

### 4.2 Composición racial en cruces

- Si el animal es de **raza pura**: se registra 100% de una raza.
- Si el animal es **cruce con genealogía conocida**: se registran los porcentajes por raza. Ejemplo: 75% Holstein – 25% Brahman.
- Si el animal es **cruce sin origen exacto conocido**: se registra como `Mestizo` o `Cruce` con una nota opcional.
- Los porcentajes de todas las razas de un animal deben sumar exactamente **100%**. El sistema debe validar esto.
- Categorías especiales reconocidas:
  - **F1**: Primera cruza (50% / 50%)
  - **F2 / Retrocruza**: 75% / 25%
  - El sistema puede calcular automáticamente la composición racial de una cría basándose en los porcentajes del padre y la madre.

---

## 5. PRODUCCIÓN DE LECHE

### 5.1 Modos de registro

El dueño de la finca configura el modo de registro de producción:

| Modo | Descripción |
|---|---|
| **Por ordeño** | Se registra cada ordeño por separado (mañana y tarde) con hora y litros |
| **Diario total** | Se registra el total del día en un solo registro |

- Esta configuración se hace **por finca**, no globalmente.
- El primer ordeño típicamente ocurre entre las 4:00 AM y las 6:00 AM, pero la hora exacta es libre.

### 5.2 Reglas de producción

- Solo vacas en estado `ACTIVE` o `PREGNANT` pueden registrar producción de leche.
- Vacas en estado `DRY` **no pueden** registrar producción. El sistema bloquea este registro.
- Vacas en estado `QUARANTINED` pueden registrar producción, pero se marca como **"leche no apta"** y se excluye de los totales comerciales.
- Vacas en estado `SOLD` o `DECEASED` no pueden registrar producción.

### 5.3 Ordeño doble

- Las fincas lecheras con vacas de alta producción (más de 15-20 litros diarios) típicamente hacen dos ordeños al día.
- El motivo es que no ordeñar a tiempo puede causar **mastitis** (infección del ubre), lo cual el sistema debe considerar como riesgo de salud si una vaca de alta producción no registra ordeño en más de 14-16 horas.

---

## 6. PAJILLAS (SEMEN)

### 6.1 Datos a registrar por pajilla

| Campo | Obligatorio | Descripción |
|---|---|---|
| Nombre del toro donante | Sí | |
| Raza del toro | Sí | |
| Código único / número de registro | Sí | Clave para trazabilidad |
| Centro de recolección / empresa productora | Sí | |
| País de origen | No | |
| Tipo de semen | Sí | Convencional o Sexado |
| Número de lote | No | |
| Pedigrí del toro (padres, línea genética) | No | |
| Índices productivos (PTA, DEP) | No | |
| Pruebas sanitarias | No | |
| Fecha de producción / congelación | No | |
| Precio de la pajilla | Sí | |
| Color de identificación (para tanque) | No | |

### 6.2 Vencimiento

- Las pajillas **no tienen fecha de vencimiento estricta** si se mantienen correctamente en nitrógeno líquido a -196°C.
- El sistema registra la **fecha de producción/congelación** como referencia.
- Si una pajilla fue descongelada accidentalmente o hubo ruptura de la cadena de frío, debe poder marcarse como **"inutilizable"** en el sistema.

---

## 7. VALORACIÓN ECONÓMICA DE ANIMALES

### 7.1 Factores que influyen en el precio estimado

El precio de un animal no es fijo — el sistema muestra un **precio estimado** basado en los siguientes factores. El precio final lo define el dueño manualmente:

- **Raza y composición racial**: mayor pureza de raza generalmente equivale a mayor valor.
- **Peso actual**: a mayor peso, mayor valor (especialmente en animales de carne).
- **Edad**: animales jóvenes y productivos tienen mayor valor que animales viejos.
- **Producción de leche**: vacas de alta producción tienen mayor valor en fincas lecheras.
- **Historial reproductivo**: vacas con múltiples partos exitosos tienen mayor valor.
- **Estado de salud**: animales con historial de enfermedades pueden tener menor valor.
- **Genealogía**: hijos de toros o vacas de alto valor genético tienen mayor precio.
- **Candidato a padrote**: terneros machos marcados como candidatos a padrote tienen un sobreprecio.
- **Condición del animal**: evaluación subjetiva del dueño o veterinario.

### 7.2 Diferencia financiera entre venta y muerte

- Animal `SOLD`: genera una transacción de **ingreso** (`ANIMAL_SALE`) en el módulo de finanzas.
- Animal `DECEASED`: genera una **pérdida de activo** en el módulo de finanzas. No genera ingreso.
- El sistema debe distinguir claramente estos dos casos en todos los reportes financieros.

---

## 8. ALERTAS Y NOTIFICACIONES

### 8.1 Alertas de parto próximo

Cuando una vaca tiene una preñez activa, el sistema genera alertas automáticas basadas en la fecha estimada de parto:

| Anticipación | Tipo de alerta |
|---|---|
| 30 días antes | ⚠️ Aviso temprano: *"La vaca [nombre] tiene parto estimado en 30 días"* |
| 15 días antes | 🔔 Aviso medio: *"La vaca [nombre] tiene parto estimado en 15 días. Prepare las condiciones."* |
| 7 días antes | 🚨 Aviso urgente: *"La vaca [nombre] tiene parto estimado en 7 días. Atención prioritaria."* |

### 8.2 Alertas de vacunas

| Anticipación | Tipo de alerta |
|---|---|
| 7 días antes | 🔔 Aviso: *"La vacuna [nombre] de [animal] vence en 7 días"* |
| 1 día antes | 🚨 Aviso urgente: *"La vacuna [nombre] de [animal] vence mañana"* |
| Día de vencimiento o después | 🔴 Vencida: *"La vacuna [nombre] de [animal] está vencida"* |

### 8.3 Alertas de celo estimado

- El celo se estima aproximadamente cada 21 días en vacas que no están preñadas.
- El sistema alerta **5 días antes** del celo estimado para que el ganadero pueda preparar la monta o inseminación.
- Esta alerta solo aplica a vacas en estado `ACTIVE` que no tienen preñez activa.

### 8.4 Otras alertas importantes

- **Vaca de alta producción sin ordeño registrado** en más de 14-16 horas → alerta de riesgo de mastitis.
- **Nueva preñez antes de 45 días post-parto** → advertencia al registrar.
- **Nueva preñez tras aborto o complicaciones** → advertencia obligatoria de evaluación veterinaria.
- **Cambio de estado a `DRY` hecho por el dueño** → recomendación de confirmar con veterinario.

---

## 9. ROLES Y PERMISOS

| Acción | OWNER | VETERINARIAN | EMPLOYEE | AUDITOR |
|---|---|---|---|---|
| Ver todos los animales | ✅ | ✅ | ✅ | ✅ |
| Crear / editar animales | ✅ | ❌ | ✅ | ❌ |
| Cambiar estado del animal | ✅ | ✅ | ❌ | ❌ |
| Registrar producción de leche | ✅ | ❌ | ✅ | ❌ |
| Registrar preñez | ✅ | ✅ | ✅ | ❌ |
| Registrar eventos de salud | ✅ | ✅ | ❌ | ❌ |
| Ver finanzas | ✅ | ❌ | ❌ | ✅ |
| Registrar transacciones financieras | ✅ | ❌ | ❌ | ❌ |
| Marcar ternero como candidato a padrote | ✅ | ✅ | ❌ | ❌ |
| Gestionar usuarios de la finca | ✅ | ❌ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ | ✅ |
| Ver auditoría | ✅ | ❌ | ❌ | ✅ |

---

## 10. REGLAS GENERALES DEL SISTEMA

- Ningún registro se elimina físicamente de la base de datos. Todo es **soft delete**.
- Toda acción crítica queda registrada en el **audit log** con: usuario, fecha, hora, acción realizada y datos antes/después del cambio.
- Los datos de animales `SOLD` o `DECEASED` se conservan permanentemente por valor genealógico e histórico.
- El sistema opera en zona horaria configurable por finca.
- Los precios y valores monetarios se manejan en la moneda local configurada por el tenant (por defecto COP — Peso colombiano).

---

*Documento generado con base en conocimiento ganadero real validado por el propietario del proyecto.*
*Última actualización: Fase 0 — Antes del inicio del desarrollo.*
*⚠️ Campos marcados como PENDIENTE deben resolverse antes de programar el módulo correspondiente.*
