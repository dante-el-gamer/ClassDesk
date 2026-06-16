export default function AboutPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Acerca de
        </h1>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          ClassDeck
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
          ClassDeck es una aplicación de escritorio para gestionar la
          distribución de los puestos en el aula de forma visual e intuitiva.
          Diseñada para docentes que necesitan organizar rápidamente la
          ubicación de sus estudiantes, crear múltiples distribuciones por
          curso, y mantener todo sincronizado en la nube.
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
          El proyecto nace de la necesidad de simplificar una tarea cotidiana
          en el aula: asignar y reorganizar los puestos de los estudiantes.
          Con ClassDeck, esta tarea pasa de ser un dolor de cabeza a un
          proceso de arrastrar y soltar.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Tecnologías
        </h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tecnología
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Versión
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Propósito
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  React
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  18
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  UI Framework
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  TypeScript
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  5.6
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Lenguaje
                </td>
              </tr>
              <tr className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  Tauri
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  2
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Desktop Runtime
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  Vite
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  5
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Build Tool
                </td>
              </tr>
              <tr className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  TailwindCSS
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  3
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Estilos
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  Zustand
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  4
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Estado global
                </td>
              </tr>
              <tr className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  Rust
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  — (backend)
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Backend nativo
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                  SQLite
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  — (rusqlite)
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Base de datos
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Créditos
        </h2>
        <div className="mt-4 space-y-3 text-gray-600 dark:text-gray-400">
          <p>
            Desarrollado por{" "}
            <a
              href="https://github.com/dante-el-gamer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Dante
            </a>
            .
          </p>
          <p>
            Código abierto bajo licencia MIT. Contribuciones, reportes de
            errores y sugerencias son bienvenidos en{" "}
            <a
              href="https://github.com/dante-el-gamer/ClassDesk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              GitHub
            </a>
            .
          </p>
          <p className="text-sm">
            Íconos y assets: iconos del sistema operativo y recursos propios.
          </p>
        </div>
      </section>
    </div>
  );
}
