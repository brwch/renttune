import { useTheme } from "../context/ThemeContext";
import logoL from "../assets/small-logoLt.svg";
import logoD from "../assets/small-logoDt.svg";

const Footer = () => {
    const { theme } = useTheme();
    const logo = theme === "light" ? logoD : logoL;

    return (
        <footer className="footer">
            <div className="footer-content">
                <img src={logo} alt="Logo" className="footer-logo" />
                <span className="footer-text">
                    RentTune &copy; • Bruno Wiech • 2025
                </span>
            </div>
        </footer>
    );
};

export default Footer;