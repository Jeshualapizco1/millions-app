// ============================================================================
// Aviso de privacidad y términos de uso.
//
// Viven como datos y no como JSX para que el mismo texto se pueda mostrar
// antes de iniciar sesión (en el registro) y dentro de la app (en Perfil).
//
// Al cambiar el texto hay que subir LEGAL_VERSION: la app compara esa cadena
// contra la que la persona aceptó y, si no coinciden, vuelve a pedir la
// aceptación. Cambiar el texto sin subir la versión deja constancias que dicen
// que alguien aceptó algo que nunca vio.
// ============================================================================

/** Sube esto (fecha del cambio) cada vez que edites PRIVACIDAD o TERMINOS. */
export const LEGAL_VERSION = "2026-08-31";

// ── Datos del responsable (LFPDPPP art. 16) ─────────────────────────────────
// El aviso es inválido sin identidad, domicilio y un medio de contacto real.
// TODO(antes de abrir el registro): sustituir los tres valores marcados.
export const RESPONSABLE = "PENDIENTE — nombre o razón social del responsable";
export const DOMICILIO = "PENDIENTE — domicilio del responsable";
export const CORREO_ARCO = "PENDIENTE — correo de contacto";

/** Días que la cuenta sobrevive tras pedir el borrado. Debe coincidir con la migración 0014. */
export const GRACIA_DIAS = 30;

/** True mientras el aviso siga trayendo los placeholders sin llenar. */
export const LEGAL_INCOMPLETO = [RESPONSABLE, DOMICILIO, CORREO_ARCO].some((v) => v.startsWith("PENDIENTE"));

export interface LegalSection {
  title: string;
  body: string[];
}

export interface LegalDoc {
  key: "privacidad" | "terminos";
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACIDAD: LegalDoc = {
  key: "privacidad",
  title: "Aviso de privacidad",
  intro:
    `${RESPONSABLE}, con domicilio en ${DOMICILIO}, es responsable del tratamiento de tus datos personales ` +
    "en Millions. Este aviso explica qué datos recabamos, para qué los usamos, con quién los compartimos y " +
    "cómo puedes controlarlos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de " +
    "los Particulares.",
  sections: [
    {
      title: "1. Qué datos recabamos",
      body: [
        "Datos de identificación y contacto: el nombre que escribes al registrarte y tu correo electrónico.",
        "Datos financieros que tú capturas: cuentas, saldos, movimientos, créditos, presupuestos y metas de ahorro. Los escribes tú; Millions no se conecta a tu banco ni descarga tus estados de cuenta.",
        "Datos de uso: registro de errores de la aplicación y conteo de consultas al asistente, para operar el servicio y controlar su costo.",
        "No recabamos datos personales sensibles ni datos de tarjetas de pago.",
      ],
    },
    {
      title: "2. Para qué los usamos",
      body: [
        "Finalidades necesarias para el servicio: crear y mantener tu cuenta, guardar y mostrar tus finanzas, calcular saldos y presupuestos, y responder tus consultas al asistente.",
        "Finalidades secundarias: medir el uso agregado para mejorar la aplicación. Puedes oponerte a esta finalidad escribiéndonos, sin que eso afecte el servicio.",
      ],
    },
    {
      title: "3. Dónde viven tus datos y quién más los procesa",
      body: [
        "Tus datos se almacenan en Supabase, cuya infraestructura está en Estados Unidos. Esto implica una transferencia internacional de datos, necesaria para prestarte el servicio.",
        "Cuando usas el asistente, el texto de tu consulta y un resumen de tus cifras se envían a Anthropic para generar la respuesta. Anthropic actúa como encargado y no usa ese contenido para entrenar sus modelos.",
        "No vendemos tus datos ni los compartimos con anunciantes. Fuera de los dos encargados anteriores, solo los entregaríamos a una autoridad competente que lo requiera legalmente.",
      ],
    },
    {
      title: "4. Cuánto tiempo los conservamos",
      body: [
        `Mientras tu cuenta exista. Si pides borrarla, la conservamos ${GRACIA_DIAS} días más por si te arrepientes, y después se elimina de forma permanente junto con todos tus movimientos, cuentas, créditos, presupuestos y metas.`,
        "El borrado es definitivo: no guardamos copias de respaldo de cuentas eliminadas.",
      ],
    },
    {
      title: "5. Tus derechos ARCO",
      body: [
        "Tienes derecho a Acceder a tus datos, Rectificarlos si son inexactos, Cancelarlos y Oponerte a su tratamiento.",
        "Acceso: desde Perfil o desde Historial puedes exportar todos tus movimientos a CSV cuando quieras.",
        "Rectificación: puedes editar o borrar cualquier movimiento, cuenta, crédito, presupuesto o meta desde la propia aplicación.",
        "Cancelación: desde Perfil puedes borrar tu cuenta y todos tus datos.",
        `Oposición y cualquier otra solicitud: escríbenos a ${CORREO_ARCO}. Responderemos en un plazo máximo de 20 días hábiles.`,
        "También puedes revocar tu consentimiento en cualquier momento por el mismo correo; hacerlo implica dar de baja tu cuenta, porque sin tratar esos datos no podemos prestarte el servicio.",
      ],
    },
    {
      title: "6. Seguridad",
      body: [
        "Cada persona solo puede leer y escribir sus propias filas: la base de datos lo impone con Row Level Security, no la aplicación. La conexión viaja cifrada y las contraseñas se guardan como hash, nunca en claro.",
        "Ninguna medida de seguridad es absoluta. Si ocurriera una vulneración que afecte tus datos, te lo comunicaríamos por correo.",
      ],
    },
    {
      title: "7. Cambios a este aviso",
      body: [
        `Si modificamos este aviso, la aplicación te pedirá aceptarlo de nuevo la próxima vez que entres, indicando la fecha de la versión vigente. La versión actual es ${LEGAL_VERSION}.`,
      ],
    },
  ],
};

export const TERMINOS: LegalDoc = {
  key: "terminos",
  title: "Términos y condiciones",
  intro:
    "Estos términos rigen tu uso de Millions. Al crear una cuenta, los aceptas. " +
    "Están escritos para leerse: si algo no se entiende, escríbenos y lo aclaramos.",
  sections: [
    {
      title: "1. Qué es Millions",
      body: [
        "Una aplicación para registrar y entender tus finanzas personales: capturas movimientos con voz o texto, y la aplicación lleva tus saldos, presupuestos, créditos y metas.",
        "El servicio se presta tal como está. Trabajamos para que esté siempre disponible, pero no garantizamos operación ininterrumpida ni libre de errores.",
      ],
    },
    {
      title: "2. Millions no es asesoría financiera",
      body: [
        "El asistente genera sugerencias automáticas a partir de las cifras que tú capturas. No es asesoría financiera, fiscal, contable ni de inversión, y no sustituye a un profesional.",
        "Las decisiones sobre tu dinero son tuyas. No respondemos por pérdidas derivadas de actuar según lo que sugiera la aplicación.",
        "El asistente puede equivocarse. Verifica cualquier cifra antes de tomar una decisión importante.",
      ],
    },
    {
      title: "3. No manejamos tu dinero",
      body: [
        "Millions no custodia fondos, no transfiere dinero, no cobra ni paga por ti, y no se conecta a tus cuentas bancarias. Las transferencias y pagos que registras son anotaciones dentro de la aplicación, no movimientos reales en tu banco.",
        "Por lo anterior, Millions no es una Institución de Tecnología Financiera en términos de la Ley para Regular las Instituciones de Tecnología Financiera.",
      ],
    },
    {
      title: "4. Tu cuenta",
      body: [
        "Necesitas ser mayor de edad y dar información veraz al registrarte.",
        "Eres responsable de tu contraseña y de lo que ocurra en tu cuenta. Si sospechas un acceso indebido, cambia tu contraseña desde Perfil y avísanos.",
        "No uses la aplicación para actividades ilícitas, ni intentes vulnerar su seguridad o la de otras personas usuarias.",
      ],
    },
    {
      title: "5. La promoción de 60 días",
      body: [
        "Durante el lanzamiento el servicio es gratuito por 60 días contados desde tu registro, con un límite diario de consultas al asistente para mantener el costo bajo control.",
        "Al terminar los 60 días te avisaremos con anticipación y podrás decidir si continúas. Si no continúas, conservarás el acceso a tus datos y la posibilidad de exportarlos; podríamos limitar únicamente las funciones del asistente.",
        "Podemos ajustar los límites de uso del asistente si el consumo pone en riesgo la operación del servicio. Te lo comunicaríamos dentro de la aplicación.",
      ],
    },
    {
      title: "6. Baja y terminación",
      body: [
        `Puedes borrar tu cuenta cuando quieras desde Perfil. Se elimina de forma permanente a los ${GRACIA_DIAS} días, y durante ese plazo puedes cancelar la solicitud.`,
        "Podemos suspender una cuenta que incumpla estos términos, avisando por correo salvo que la ley lo impida.",
        "Antes de darte de baja, exporta tus movimientos a CSV desde Perfil: después del borrado no podremos recuperarlos.",
      ],
    },
    {
      title: "7. Cambios y contacto",
      body: [
        `Si cambiamos estos términos, la aplicación te pedirá aceptarlos de nuevo antes de seguir usándola. La versión actual es ${LEGAL_VERSION}.`,
        `Para cualquier duda: ${CORREO_ARCO}.`,
        "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.",
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACIDAD, TERMINOS];
