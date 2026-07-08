import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Documentos legales genéricos por tienda. El dueño puede pedir ajustarlos.
const DOCS = {
  terminos: { title: "Términos y condiciones" },
  privacidad: { title: "Política de privacidad" },
} as const;

type DocKey = keyof typeof DOCS;

function isDoc(v: string): v is DocKey {
  return v === "terminos" || v === "privacidad";
}

async function getStore(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    select: { name: true, slug: true, whatsapp: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!isDoc(doc)) return { title: "No encontrado" };
  return { title: DOCS[doc].title };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ storeSlug: string; doc: string }>;
}) {
  const { storeSlug, doc } = await params;
  if (!isDoc(doc)) notFound();

  const store = await getStore(storeSlug);
  if (!store) notFound();

  const today = new Intl.DateTimeFormat("es", { dateStyle: "long" });
  const contacto = store.whatsapp
    ? `WhatsApp ${store.whatsapp}`
    : "los canales de contacto publicados en la tienda";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${store.slug}`}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Volver a la tienda
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">
        {DOCS[doc].title}
      </h1>
      <p className="mt-1 text-sm text-gray-400">{store.name}</p>

      <div className="prose-legal mt-6 space-y-5 text-sm leading-relaxed text-gray-600">
        {doc === "terminos" ? (
          <Terminos storeName={store.name} contacto={contacto} />
        ) : (
          <Privacidad storeName={store.name} contacto={contacto} />
        )}
        <p className="border-t border-gray-100 pt-5 text-xs text-gray-400">
          Última actualización: {today.format(new Date())}. Este documento es una
          referencia general; ante cualquier duda escríbenos a través de{" "}
          {contacto}.
        </p>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900">{children}</h2>;
}

function Terminos({
  storeName,
  contacto,
}: {
  storeName: string;
  contacto: string;
}) {
  return (
    <>
      <p>
        Al realizar una compra en {storeName} aceptas los siguientes términos y
        condiciones. Te recomendamos leerlos antes de finalizar tu pedido.
      </p>

      <H>1. Productos y precios</H>
      <p>
        Mostramos la información de cada producto (descripción, imágenes, tallas
        y colores) con la mayor exactitud posible. Los precios están expresados
        en pesos colombianos (COP) e incluyen los impuestos aplicables. Podemos
        actualizar precios y disponibilidad en cualquier momento; el precio
        válido es el vigente al momento de confirmar el pedido.
      </p>

      <H>2. Pedidos y pago</H>
      <p>
        El pedido se confirma una vez recibido el pago (pago en línea) o
        aceptado el envío contra entrega, según los métodos habilitados en la
        tienda. Nos reservamos el derecho de cancelar un pedido por falta de
        existencias o errores evidentes de precio, informándote y reintegrando
        cualquier valor pagado.
      </p>

      <H>3. Envíos</H>
      <p>
        Realizamos envíos según la cobertura y los costos indicados durante la
        compra. Los tiempos de entrega son estimados y pueden variar por causas
        de la transportadora o de fuerza mayor. Podrás seguir el estado de tu
        pedido desde la opción “Rastrear pedido”.
      </p>

      <H>4. Cambios y devoluciones</H>
      <p>
        De acuerdo con la normativa colombiana de protección al consumidor,
        cuentas con el derecho de retracto dentro de los cinco (5) días hábiles
        siguientes a la entrega, siempre que el producto esté en las mismas
        condiciones en que lo recibiste. Para gestionar un cambio o devolución
        escríbenos a través de {contacto}.
      </p>

      <H>5. Garantía</H>
      <p>
        Los productos cuentan con la garantía legal frente a defectos de calidad
        o idoneidad. Si tu producto presenta una falla, contáctanos con el
        número de pedido y una descripción del problema.
      </p>

      <H>6. Contacto</H>
      <p>
        Para cualquier consulta relacionada con tu pedido puedes comunicarte con
        nosotros a través de {contacto}.
      </p>
    </>
  );
}

function Privacidad({
  storeName,
  contacto,
}: {
  storeName: string;
  contacto: string;
}) {
  return (
    <>
      <p>
        En {storeName} respetamos tu privacidad. Esta política explica qué datos
        recopilamos y cómo los usamos al comprar en nuestra tienda.
      </p>

      <H>1. Datos que recopilamos</H>
      <p>
        Recopilamos los datos que nos proporcionas al hacer un pedido o crear una
        cuenta: nombre, correo electrónico, teléfono y dirección de entrega.
        También guardamos el historial de tus pedidos para poder gestionarlos y
        ofrecerte seguimiento.
      </p>

      <H>2. Para qué usamos tus datos</H>
      <p>
        Usamos tu información únicamente para procesar y entregar tus pedidos,
        enviarte notificaciones sobre su estado y atender tus solicitudes. No
        vendemos ni cedemos tus datos a terceros con fines publicitarios.
      </p>

      <H>3. Con quién los compartimos</H>
      <p>
        Compartimos los datos estrictamente necesarios con los proveedores que
        hacen posible la compra: la pasarela de pago (para procesar el cobro) y
        la empresa de transporte (para entregar tu pedido). Estos proveedores
        tratan tus datos solo para prestar ese servicio.
      </p>

      <H>4. Seguridad</H>
      <p>
        Tu contraseña se almacena cifrada y protegemos tu información con medidas
        técnicas razonables. Aun así, ningún sistema es completamente infalible,
        por lo que te pedimos cuidar tus credenciales de acceso.
      </p>

      <H>5. Tus derechos</H>
      <p>
        Conforme a la Ley 1581 de 2012 de Colombia, puedes conocer, actualizar,
        rectificar o solicitar la eliminación de tus datos personales. Para
        ejercer estos derechos escríbenos a través de {contacto}.
      </p>

      <H>6. Contacto</H>
      <p>
        Si tienes preguntas sobre el manejo de tus datos, comunícate con nosotros
        a través de {contacto}.
      </p>
    </>
  );
}
