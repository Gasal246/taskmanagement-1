"use client"

import React, { useEffect } from "react";
import { Languages } from "lucide-react";

type GoogleTranslateProps = {
    id?: string;
    className?: string;
    variant?: "default" | "icon";
    triggerLabel?: string;
    uiLanguage?: string;
};

declare global {
    interface Window {
        googleTranslateElementInit?: () => void;
        google?: {
            translate?: {
                TranslateElement?: new (
                    options: {
                        pageLanguage: string;
                        autoDisplay?: boolean;
                        layout?: unknown;
                    },
                    containerId: string
                ) => void;
            };
        };
    }
}

const GoogleTranslate = ({
    id = "google_translate_element",
    className = "",
    variant = "default",
    triggerLabel = "Language",
    uiLanguage = "en",
}: GoogleTranslateProps) => {
    useEffect(() => {
        const containerId = id;
        const scriptSrc = `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=${encodeURIComponent(
            uiLanguage
        )}`;

        const init = () => {
            const container = document.getElementById(containerId);
            const translate = window.google?.translate?.TranslateElement;
            if (!container || !translate) return;
            container.innerHTML = "";
            new translate(
                {
                    pageLanguage: "en",
                    autoDisplay: false,
                },
                containerId
            );
        };

        const existingScript = document.getElementById("google-translate-script") as HTMLScriptElement | null;
        const isCorrectScript = existingScript?.src === scriptSrc;

        if (window.google?.translate?.TranslateElement && isCorrectScript) {
            init();
            return;
        }

        window.googleTranslateElementInit = init;

        if (existingScript) {
            if (!isCorrectScript) {
                existingScript.remove();
            } else {
                existingScript.addEventListener("load", init);
                return () => {
                    existingScript.removeEventListener("load", init);
                };
            }
        }

        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = scriptSrc;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", init);
        document.body.appendChild(script);

        return () => {
            script.removeEventListener("load", init);
        };
    }, [id, uiLanguage]);

    return (
        <div
            className={`google-translate ${variant === "icon" ? "google-translate--icon" : ""} ${className}`.trim()}
        >
            {variant === "icon" && (
                <button type="button" className="google-translate__trigger" tabIndex={-1} aria-hidden="true">
                    <Languages size={16} />
                    <span>{triggerLabel}</span>
                </button>
            )}
            <div id={id} className={variant === "icon" ? "google-translate__select" : ""} />
        </div>
    );
};

export default GoogleTranslate;
