import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/documentacion", label: "Documentación" },
  { to: "/versiones", label: "Versiones" },
  { to: "/acerca-de", label: "Acerca de" },
];

export default function NavLinks() {
  return (
    <nav className="flex items-center gap-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive
              ? "text-blue-600 font-medium"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
