"use client";

import { useAppStore } from "@/lib/store";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2.5 rounded-xl border border-card-border bg-card-bg text-foreground hover:bg-primary-light hover:text-primary transition-colors cursor-pointer flex items-center justify-center shadow-sm"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 transition-transform duration-300" />
      ) : (
        <Sun className="w-5 h-5 transition-transform duration-300" />
      )}
    </motion.button>
  );
}
export default ThemeToggle;
