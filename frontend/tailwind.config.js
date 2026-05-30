/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#050309",
          900: "#0a0712",
          800: "#100e1a",
          700: "#161224",
          600: "#1e1830",
          500: "#261f3c",
        },
        brass: {
          900: "#8b6914",
          800: "#a67c1a",
          700: "#c49520",
          600: "#d4af37",
          500: "#dfc052",
          400: "#e8cc72",
          300: "#f0d98a",
          200: "#f5e4a8",
          100: "#faf2d4",
        },
        nebula: {
          purple: "#7b2d8b",
          blue: "#1a3a6b",
          teal: "#0d6b6b",
          rose: "#8b1a3a",
          indigo: "#2d1a8b",
        },
        indicator: {
          amber: "#f59e0b",
          "amber-glow": "#fbbf24",
          emerald: "#10b981",
          "emerald-glow": "#34d399",
          ruby: "#ef4444",
          "ruby-glow": "#f87171",
          idle: "#6b7280",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        display: ["'Cinzel'", "serif"],
      },
      backgroundImage: {
        "cosmic-radial":
          "radial-gradient(ellipse at center, #1e1830 0%, #0a0712 60%, #050309 100%)",
        "nebula-aurora":
          "radial-gradient(ellipse at 20% 50%, rgba(123,45,139,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(26,58,107,0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(13,107,107,0.1) 0%, transparent 50%)",
        "brass-gradient":
          "linear-gradient(135deg, #a67c1a 0%, #d4af37 40%, #f0d98a 60%, #d4af37 80%, #8b6914 100%)",
        "brass-subtle":
          "linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
        "glass-surface":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "inset-engraved":
          "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 30%, rgba(255,255,255,0.02) 100%)",
        "chat-terminal":
          "linear-gradient(180deg, #08060f 0%, #0a0712 100%)",
      },
      boxShadow: {
        "brass-outer":
          "0 0 0 1px rgba(212,175,55,0.3), 0 0 20px rgba(212,175,55,0.1), 0 4px 40px rgba(0,0,0,0.8)",
        "brass-ring":
          "0 0 0 1px rgba(212,175,55,0.5), 0 0 0 3px rgba(212,175,55,0.1), 0 0 0 6px rgba(212,175,55,0.05)",
        "engraved":
          "inset 0 2px 8px rgba(0,0,0,0.8), inset 0 1px 3px rgba(0,0,0,0.6), 0 1px 0 rgba(212,175,55,0.15)",
        "engraved-deep":
          "inset 0 4px 16px rgba(0,0,0,0.9), inset 0 2px 6px rgba(0,0,0,0.7), inset 0 0 1px rgba(0,0,0,0.9)",
        "glass-card":
          "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-hover":
          "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
        "nebula-glow":
          "0 0 60px rgba(123,45,139,0.2), 0 0 120px rgba(26,58,107,0.1)",
        "indicator-amber":
          "0 0 6px rgba(245,158,11,0.8), 0 0 12px rgba(245,158,11,0.4), 0 0 24px rgba(245,158,11,0.2)",
        "indicator-emerald":
          "0 0 6px rgba(16,185,129,0.8), 0 0 12px rgba(16,185,129,0.4), 0 0 24px rgba(16,185,129,0.2)",
        "indicator-ruby":
          "0 0 6px rgba(239,68,68,0.8), 0 0 12px rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.2)",
        "concentric":
          "0 0 0 1px rgba(212,175,55,0.2), 0 0 0 8px rgba(212,175,55,0.05), 0 0 0 20px rgba(212,175,55,0.03), 0 0 0 40px rgba(212,175,55,0.015)",
        "text-brass":
          "0 0 10px rgba(212,175,55,0.5)",
      },
      dropShadow: {
        "brass": "0 0 8px rgba(212,175,55,0.6)",
        "nebula": "0 0 20px rgba(123,45,139,0.4)",
      },
      animation: {
        "pulse-amber": "pulseAmber 1.5s ease-in-out infinite",
        "pulse-emerald": "pulseEmerald 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "spin-slower": "spin 16s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "star-twinkle": "starTwinkle 4s ease-in-out infinite",
        "cursor-blink": "cursorBlink 1s step-end infinite",
        "slide-in-up": "slideInUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "indicator-transition": "indicatorTransition 0.5s ease-in-out",
        "nebula-drift": "nebulaDrift 20s ease-in-out infinite alternate",
      },
      keyframes: {
        pulseAmber: {
          "0%, 100%": {
            boxShadow: "0 0 6px rgba(245,158,11,0.8), 0 0 12px rgba(245,158,11,0.4)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 12px rgba(245,158,11,1), 0 0 24px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.3)",
            opacity: "0.85",
          },
        },
        pulseEmerald: {
          "0%, 100%": {
            boxShadow: "0 0 6px rgba(16,185,129,0.8), 0 0 12px rgba(16,185,129,0.4)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 10px rgba(16,185,129,1), 0 0 20px rgba(16,185,129,0.5)",
            opacity: "0.9",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        starTwinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        cursorBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        slideInUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        indicatorTransition: {
          "0%": { transform: "scale(0.8)", opacity: "0.5" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        nebulaDrift: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      backdropBlur: {
        xs: "2px",
        "4xl": "72px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
