"use client"

import React, { useEffect, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";

type GoogleTranslateProps = {
    id?: string;
    className?: string;
    variant?: "default" | "icon" | "full";
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
    const [languages, setLanguages] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedLanguage, setSelectedLanguage] = useState("");

    useEffect(() => {
        const containerId = id;
        const scriptSrc = `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=${encodeURIComponent(
            uiLanguage
        )}`;
        let googleSelect: HTMLSelectElement | null = null;

        const handleGoogleChange = () => {
            if (!googleSelect) return;
            setSelectedLanguage(googleSelect.value || "");
        };

        const syncGoogleSelect = () => {
            const container = document.getElementById(containerId);
            const nextGoogleSelect = container?.querySelector("select.goog-te-combo") as HTMLSelectElement | null;

            if (!nextGoogleSelect) return;

            if (googleSelect !== nextGoogleSelect) {
                googleSelect?.removeEventListener("change", handleGoogleChange);
                googleSelect = nextGoogleSelect;
                googleSelect.addEventListener("change", handleGoogleChange);
            }

            const nextLanguages = Array.from(nextGoogleSelect.options)
                .map((option) => ({
                    value: option.value,
                    label: option.textContent?.trim() || "",
                }))
                .filter((option) => option.label);

            setLanguages(nextLanguages);
            setSelectedLanguage(nextGoogleSelect.value || "");
        };

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
            window.setTimeout(syncGoogleSelect, 50);
        };

        const existingScript = document.getElementById("google-translate-script") as HTMLScriptElement | null;
        const isCorrectScript = existingScript?.src === scriptSrc;
        const container = document.getElementById(containerId);
        const observer = container
            ? new MutationObserver(() => {
                syncGoogleSelect();
            })
            : null;

        observer?.observe(container, { childList: true, subtree: true });

        if (window.google?.translate?.TranslateElement && isCorrectScript) {
            init();
            return () => {
                observer?.disconnect();
                googleSelect?.removeEventListener("change", handleGoogleChange);
            };
        }

        window.googleTranslateElementInit = init;

        if (existingScript) {
            if (!isCorrectScript) {
                existingScript.remove();
            } else {
                existingScript.addEventListener("load", init);
                return () => {
                    observer?.disconnect();
                    googleSelect?.removeEventListener("change", handleGoogleChange);
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
            observer?.disconnect();
            googleSelect?.removeEventListener("change", handleGoogleChange);
            script.removeEventListener("load", init);
        };
    }, [id, uiLanguage]);

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextValue = event.target.value;
        setSelectedLanguage(nextValue);

        const googleSelect = document
            .getElementById(id)
            ?.querySelector("select.goog-te-combo") as HTMLSelectElement | null;

        if (!googleSelect) return;

        googleSelect.value = nextValue;
        googleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    };

    return (
        <div
            className={`google-translate google-translate--${variant} ${className}`.trim()}
        >
            <div className="google-translate__control">
                {variant === "icon" && <Languages size={16} className="google-translate__icon" />}
                <select
                    className="google-translate__native"
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    aria-label={triggerLabel}
                    disabled={languages.length === 0}
                >
                    {languages.length === 0 ? (
                        <option value="">{triggerLabel}</option>
                    ) : (
                        languages.map((language) => (
                            <option key={`${id}-${language.value || "default"}`} value={language.value}>
                                {language.label}
                            </option>
                        ))
                    )}
                </select>
                <ChevronDown size={16} className="google-translate__chevron" />
            </div>
            <div id={id} className="google-translate__mount" aria-hidden="true" />
        </div>
    );
};

export default GoogleTranslate;
