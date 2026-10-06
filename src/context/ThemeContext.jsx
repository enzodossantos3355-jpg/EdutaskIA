import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("edutask_theme", "light");
  }, []);

  const toggle = () => {
    // Dark mode is permanently disabled
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
