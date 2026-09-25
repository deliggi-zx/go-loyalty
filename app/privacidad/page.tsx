// Página de política de privacidad de Kapusta — requerida por Apple y Google
// para publicar la app en las tiendas. Ruta estática /privacidad, fuera del
// grupo (public)/[slug]/ para no depender de ninguna organización particular.
export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-stone-800">
      <h1 className="text-2xl font-bold mb-2">Política de privacidad de Kapusta</h1>
      <p className="text-sm text-stone-500 mb-8">Última actualización: 24 de septiembre de 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <p>
          Kapusta (&quot;la app&quot;, &quot;el sitio&quot;) es operada por Kapusta Propiedades, con sede en
          Berazategui, Provincia de Buenos Aires, Argentina. Esta política explica qué
          información recolectamos de las personas que usan la aplicación web y la app
          móvil, y cómo la usamos.
        </p>

        <h2 className="text-lg font-semibold pt-2">Información que recolectamos</h2>
        <p>
          Cuando creás una cuenta o iniciás sesión, recolectamos tu nombre, dirección de
          correo electrónico y, si lo proporcionás, tu número de teléfono. Esta
          información se usa para identificarte dentro de la plataforma, gestionar tu
          perfil y tu programa de puntos o fidelización.
        </p>

        <h2 className="text-lg font-semibold pt-2">Uso de la cámara</h2>
        <p>
          La app utiliza la cámara del dispositivo únicamente para escanear códigos QR
          de fidelización (por ejemplo, al acreditar puntos en un local adherido). No
          se capturan, almacenan ni comparten fotos ni videos: la cámara solo se usa
          para leer el código en el momento del escaneo.
        </p>

        <h2 className="text-lg font-semibold pt-2">Cómo almacenamos los datos</h2>
        <p>
          Los datos se almacenan de forma segura utilizando servicios de
          infraestructura de terceros (Supabase) que cumplen con estándares
          de la industria en materia de seguridad. No vendemos ni
          compartimos tu información personal con terceros con fines publicitarios.
        </p>

        <h2 className="text-lg font-semibold pt-2">Tus derechos</h2>
        <p>
          Podés solicitar en cualquier momento que corrijamos o eliminemos tu
          información personal escribiéndonos a través de los medios de contacto que
          figuran más abajo.
        </p>

        <h2 id="eliminar-cuenta" className="text-lg font-semibold pt-2">
          Eliminación de cuenta y datos
        </h2>
        <p>
          Si querés eliminar tu cuenta de Kapusta y los datos asociados a ella,
          enviá un correo a{" "}
          <a href="mailto:deliggi@abc.gob.ar" className="underline">
            deliggi@abc.gob.ar
          </a>{" "}
          solicitando la baja, indicando el nombre o el correo electrónico con el
          que te registraste. Vamos a confirmarte la eliminación de tu cuenta y de
          tu información personal (nombre, correo electrónico, teléfono e
          historial de puntos de fidelización) dentro de los 30 días posteriores a
          la solicitud, salvo que debamos conservar algún dato por una obligación
          legal.
        </p>

        <h2 className="text-lg font-semibold pt-2">Contacto</h2>
        <p>
          Si tenés preguntas sobre esta política de privacidad o sobre el tratamiento
          de tus datos, podés escribirnos a través de los canales de contacto
          disponibles en kapusta.com.ar.
        </p>
      </section>
    </main>
  );
}
