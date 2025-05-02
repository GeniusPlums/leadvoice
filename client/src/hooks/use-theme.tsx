import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  highContrast: boolean;
  toggleHighContrast: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedHighContrast = localStorage.getItem("high-contrast");
    if (savedHighContrast === "true") {
      setHighContrast(true);
      document.documentElement.setAttribute("data-high-contrast", "true");
    }
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem("high-contrast", String(newValue));
    document.documentElement.setAttribute("data-high-contrast", String(newValue));
  };

  return (
    <ThemeContext.Provider value={{ highContrast, toggleHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
