"use client";

import { useAppStore } from "@/lib/store";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="rounded-xl shadow-xs"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 transition-transform duration-300" />
      ) : (
        <Sun className="w-4 h-4 transition-transform duration-300" />
      )}
    </Button>
  );
}
export default ThemeToggle;
