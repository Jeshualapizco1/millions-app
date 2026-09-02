# Ideas futuras

Cosas que no se van a hacer ahora, pero que no queremos perder. Nada de aquí
entra al plan sin pasar antes por `PENDIENTES.md`. El orden dentro de cada
sección es de mayor a menor convicción.

**Regla:** primero salir a las tiendas en México y validar. Todo lo de este
archivo viene después, salvo que se indique lo contrario.

---

## 1. Meses sin intereses — el diferenciador regional

**La idea.** Una compra a 12 MSI hoy se registra como un gasto suelto o como
deuda total de la tarjeta. Ninguna de las dos cosas responde lo que la persona
realmente quiere saber: cuánto pago este mes, cuánto me falta, cuánto de mi
límite está comprometido y cuándo se libera.

**Por qué importa más que cualquier otra idea de este archivo.** Es el patrón de
consumo dominante en México y existe con otro nombre en toda la región: cuotas en
Colombia y Argentina, cuotas sin interés en Chile y Perú. Ninguna app global lo
modela porque su mercado no lo pide. Es lo más difícil de copiar que podemos
construir, y encaja con lo que ya existe (créditos con día de corte, día de pago
y utilización).

**Qué habría que modelar, a grandes rasgos.**
- Una compra a plazos: monto total, número de mensualidades, tarjeta, fecha de
  compra, mensualidad calculada.
- Generación de las mensualidades pendientes con su fecha.
- Distinguir en la tarjeta: deuda revolvente vs. saldo comprometido a plazos.
- Vista de "cuánto pago este mes" sumando todas las mensualidades activas.
- Alerta de compromiso futuro: en qué mes se libera cada plazo.
- Que la IA lo entienda al capturar: "compré un refri de 18 mil a 12 meses con
  la BBVA" debería crear la compra a plazos, no un gasto de 18 mil.

**Preguntas abiertas.** ¿La mensualidad genera una transacción automática cada
mes o solo se proyecta? ¿Cómo interactúa con el módulo de recurrentes que ya
existe? ¿Qué pasa si la persona liquida antes? ¿Cómo se importa una compra a
plazos que ya venía corriendo antes de instalar la app?

**Gancho de marketing.** "¿Sabes cuánto debes realmente si sumas todos tus meses
sin intereses?" Ese video se hace solo.

---

## 2. Comunidad en Skool

**La idea.** Incluir con la suscripción el acceso a una comunidad con cursos de
finanzas personales y de emprendimiento, con mentores invitados.

**Por qué.** No es adquisición, es retención. Las apps de finanzas se cancelan al
tercer mes; una comunidad donde conoces gente y estás a medio curso, no. Y
reposiciona el precio: MonAi cobra $119–149 por una app; nosotros cobramos $129
por una app más completa y además una comunidad.

**Números.** A $129 MXN menos 15 % de comisión quedan unos $110, alrededor de 6
dólares. Skool cuesta unos 99 dólares al mes fijos. Con ~17 suscriptores la
comunidad se paga sola; de ahí para arriba es margen.

**Los tres problemas a resolver ANTES de anunciarla.**
1. **Control de acceso.** Puente entre "está pagando" y "tiene acceso". Si
   alguien comparte el link de invitación, se meten los que no pagan; si alguien
   cancela, se queda dentro. Verificar qué automatización permite Skool. Si
   termina siendo manual, no escala más allá de unos cientos de miembros.
2. **Reglas de Apple.** Se puede vender por la tienda y entregar valor fuera de
   la app, pero no se puede poner un botón que mande a comprar por fuera. La
   comunidad se anuncia dentro y el acceso se entrega después del pago en tienda.
   Es motivo de rechazo si se hace mal.
3. **Quién la atiende a diario.** Una comunidad muerta hace más daño que no
   tener comunidad. Moderar, publicar, responder y organizar es trabajo diario.

**Cuándo.** Cuando haya ~50 suscriptores de pago, no antes. Abierta desde cero se
ve abandonada; abierta con gente adentro se ve viva.

**Riesgo legal, no negociable.** Educación financiera general, sí.
Recomendaciones de inversión personalizadas, no: asesorar sobre valores requiere
registro ante la CNBV en México y hay reglas equivalentes en la región. Los
mentores tienen que tenerlo claro desde el día uno; el riesgo lo carga Millions.

---

## 3. Expansión a Latinoamérica

**La idea.** México valida el producto; el mercado real es la región.

**Lo que deja de ser opcional.**
- **Multi-moneda completa.** Ya está como pendiente y aquí se vuelve
  bloqueante: un colombiano no puede ver pesos mexicanos.
- **Precio por país.** $129 MXN son ~7 USD; en Colombia, Perú o Argentina eso es
  caro para una app. Las tiendas permiten precio por territorio.
- **Voz por variante regional.** Hoy está fija en `es-MX`. Hay que detectar la
  variante del usuario: "gasté dos lucas" no se entiende con el modelo mexicano.
- **Vocabulario local.** Cuotas, MSI, CAE, quincena, aguinaldo, prima. Afecta al
  prompt de captura y a las categorías por defecto.
- **Instituciones locales** en el catálogo de créditos y cuentas.

**Orden sugerido.** México → Colombia → Chile y Perú → Argentina. Argentina al
final por inflación y control cambiario, que complican el manejo de moneda.

**España es otro juego.** RGPD es bastante más estricto que la ley mexicana y no
existen los meses sin intereses. No meterlo en el mismo saco; evaluarlo aparte
después de validar la región.

---

## 4. Distribución

- **TikTok como canal principal.** Es donde MonAi demostró que funciona (creció
  con un creador de contenido). El pitch no es "app de finanzas con IA", que es
  lo que dicen todos; es el dolor concreto: los meses sin intereses, el corte de
  la tarjeta, cuánto tienes de verdad.
- **Programa de referidos con meses gratis.** No con descuento porcentual: no se
  puede implementar con cobro en tienda.
- **Alianza con un creador de finanzas personales en México**, con revenue share
  en vez de pago fijo.

---

## 5. Producto, ideas sueltas

- **Escaneo de recibos** con la cámara. Descartado por ahora: es producto nuevo
  cuando lo que falta es que se entienda el producto actual.
- **Listas o cuentas compartidas** (pareja, familia, negocio). MonAi ya lo tiene.
- **Sincronización bancaria** vía agregador (Belvo o similar en la región). Caro
  y con fricción regulatoria; evaluar solo con volumen.
- **Widgets** de patrimonio o presupuesto en pantalla de inicio. Requiere código
  nativo aunque la app esté en Capacitor.
- **Atajos de Siri** para registrar por voz sin abrir la app.
- **Modo negocio** separado del personal. Ya existe por otro lado para Aromante;
  evaluar si tiene sentido dentro de Millions.
