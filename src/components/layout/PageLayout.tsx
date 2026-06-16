import { Suspense, lazy } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

const ThreeDecorations = lazy(
  () => import("../3d/ThreeDecorations"),
);

export default function PageLayout() {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />

      <div className="relative flex-1 overflow-y-auto">
        <Suspense fallback={<div className="h-32" />}>
          <ThreeDecorations />
        </Suspense>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
