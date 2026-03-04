import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar isOpen={sidebarOpen} />
        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
