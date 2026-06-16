const changelog = [
  {
    version: "0.1.0",
    date: "2025-11-15",
    title: "Lanzamiento inicial",
    items: [
      "Gestión completa de cursos: crear, editar y eliminar cursos",
      "Cuadrícula de puestos personalizable con arrastrar y soltar",
      "Múltiples distribuciones por curso con conmutación instantánea",
      "Listado de estudiantes con creación y eliminación",
      "Sincronización con Google Drive (push/pull manual)",
      "Autenticación con Google OAuth",
      "Paleta de comandos con Ctrl+K",
      "Panel de configuración con opciones de layout",
      "Tema oscuro y claro automático",
      "Interfaz en español",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Versiones
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Historial de cambios y novedades de ClassDeck.
        </p>
      </div>

      <div className="relative space-y-8">
        {changelog.map((entry) => (
          <article key={entry.version} className="relative pl-8">
            {/* Timeline indicator */}
            <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-blue-500 bg-white dark:bg-gray-900" />
            <div className="absolute bottom-0 left-[7px] top-6 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {entry.version}
                </h2>
                <time
                  dateTime={entry.date}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {entry.date}
                </time>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {entry.title}
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {entry.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
