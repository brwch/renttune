import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const DarkModeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className="dark-mode-toggle" onClick={toggleTheme}>
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default DarkModeToggle;
