export default function DocumentationPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Documentación
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Aprendé a usar ClassDeck para gestionar los puestos del aula de forma
          simple y visual.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Funcionalidades
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Cuadrícula de puestos
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Organizá los estudiantes en una cuadrícula personalizable. Cada
              puesto tiene nombre, fila y columna. Redimensioná la cuadrícula
              sin perder los datos existentes.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Arrastrar y soltar
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Mové estudiantes entre puestos o devolvelos al listado con solo
              arrastrar. Ideal para reacomodar el aula sobre la marcha.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Múltiples distribuciones
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Guardá distintas distribuciones de puestos para cada curso.
              Cambiá entre ellas al instante sin perder la configuración
              anterior.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Sincronización en la nube
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Sincronizá los datos con Google Drive para acceder desde
              cualquier máquina. Tus distribuciones viajan con vos.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Cómo empezar
        </h2>
        <ol className="mt-4 list-inside list-decimal space-y-3 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Creá un curso</strong> — desde el panel lateral, usá el
            botón &quot;Nuevo curso&quot; y asignale un nombre.
          </li>
          <li>
            <strong>Agregá estudiantes</strong> — usando el botón
            &quot;Añadir estudiante&quot; en el panel del curso.
          </li>
          <li>
            <strong>Configurá la cuadrícula</strong> — ajustá filas y columnas
            desde la configuración con el ícono de engranaje.
          </li>
          <li>
            <strong>Ubicá los estudiantes</strong> — arrastrá cada estudiante
            desde el listado a su puesto en la cuadrícula.
          </li>
          <li>
            <strong>Guardá la distribución</strong> — con el botón
            &quot;Guardar&quot; en el panel de distribuciones.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Atajos de teclado
        </h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Atajo
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 font-mono text-sm text-gray-800 dark:text-gray-200">
                  <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800">
                    K
                  </kbd>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Abrir la paleta de comandos
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Arquitectura
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          ClassDeck está construido con una arquitectura de capas:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Frontend</strong> — React 18 con TypeScript, Vite como
            bundler, TailwindCSS para estilos y Zustand para estado global.
          </li>
          <li>
            <strong>Backend</strong> — Tauri 2 como runtime nativo, con
            comandos Rust para operaciones del sistema y acceso a archivos.
          </li>
          <li>
            <strong>Base de datos</strong> — SQLite a través de rusqlite,
            manejado desde el lado Rust.
          </li>
          <li>
            <strong>Sincronización</strong> — Google Drive API para backup y
            sincronización entre dispositivos.
          </li>
        </ul>
      </section>
    </div>
  );
}
