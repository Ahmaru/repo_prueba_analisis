
# Funcionalidades principales

## F-01 Gestión de reservas

* HU-01 Consultar disponibilidad de canchas y materiales — *rol: usuario consumidor*
* HU-02 Reservar cancha o material para uso individual — *rol: usuario consumidor*
* HU-03 Reserva de cancha y materiales para actividad extracurricular — *rol: usuario privilegiado*
* HU-04 Cancelar una reserva propia — *rol: usuario consumidor*

**Objetivo de negocio:** que toda solicitud de uso de canchas o materiales del DEFIDER se resuelva a través del sistema digital, sin gestión manual ni presencial.

**Relación con los objetivos del Hito 1:** materializa el objetivo principal de evitar la fricción en la reserva de canchas y optimizar su uso para cada sede, además de los objetivos específicos de facilitar para la comunidad estudiantil USM la obtención de información de canchas, talleres y materiales disponibles, y reducir el tiempo y los pasos necesarios para reservar canchas o material.

**Por qué es una capacidad relevante:** sin esta funcionalidad no existe digitalización del servicio — es el flujo que reemplaza el proceso presencial y permite bloquear automáticamente los horarios ocupados.

**Roles involucrados:** Usuario consumidor, Usuario privilegiado.

**HU que la componen:** HU-01, HU-02, HU-03, HU-04.

---

## F-02 Control y fiscalización de uso

* HU-05 Registro de entrega y recepción de material — *rol: fiscalizador*
* HU-06 Registrar una incidencia por mal uso o pérdida — *rol: fiscalizador*

**Objetivo de negocio:** asegurar que los recursos prestados se usen y devuelvan correctamente, dejando evidencia de cualquier mal uso o pérdida.

**Relación con los objetivos del Hito 1:** responde directamente al objetivo principal de reducir la pérdida de material del DEFIDER y al objetivo específico de fomentar la responsabilidad por el uso del material y evitar el deterioro por mal uso en la comunidad USM.

**Por qué es una capacidad relevante:** sin control de entrega/recepción, el sistema no puede sustentar las penalizaciones ni proteger el inventario.

**Roles involucrados:** Fiscalizador (Encargado de canchas).

**HU que la componen:** HU-05, HU-06.

---

## F-03 Gestión de catálogo y normativas (Administración del sistema)

* HU-07 Actualizar el catálogo de canchas y materiales disponibles — *rol: administrador del sistema*
* HU-08 Gestionar las reglas de penalización — *rol: administrador del sistema*
* HU-09 Cancelar cancha o reserva por razones externas — *rol: administrador del sistema*
* HU-10 Inscripción calendarizada especial — *rol: administrador del sistema*

**Objetivo de negocio:** mantener actualizada la información base (catálogo de recursos, horarios calendarizados, cierres por contingencia y reglas de penalización) que usan las otras dos funcionalidades para operar correctamente.

**Relación con los objetivos del Hito 1:** contribuye al objetivo principal de optimizar el uso de las canchas para cada sede y reducir la pérdida de material, así como a los objetivos específicos de facilitar a la comunidad estudiantil la obtención de información de canchas, talleres y materiales disponibles, y fomentar la responsabilidad por el uso del material mediante normas claras.

**Por qué es una capacidad relevante:** sin un catálogo confiable, horarios semestrales inscritos ni reglas configurables de penalización, ni las reservas (F-01) ni la fiscalización (F-02) tendrían datos correctos con qué trabajar.

**Roles involucrados:** Administrador del sistema (Administrador DEFIDER).

**HU que la componen:** HU-07, HU-08, HU-09, HU-10.
