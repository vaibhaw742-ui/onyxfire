"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import Cookies from "js-cookie";

const KNOWLEDGE_BANK_TOGGLED_COOKIE_NAME = "knowledge_bank_toggled";

function setOpenCookie(open: boolean) {
  const openAsString = open.toString();
  Cookies.set(KNOWLEDGE_BANK_TOGGLED_COOKIE_NAME, openAsString, { expires: 365 });
  if (typeof window !== "undefined") {
    localStorage.setItem(KNOWLEDGE_BANK_TOGGLED_COOKIE_NAME, openAsString);
  }
}

export interface KnowledgeBankProviderProps {
  initialOpen?: boolean;
  children: ReactNode;
}

export function KnowledgeBankProvider({
  initialOpen = false,
  children,
}: KnowledgeBankProviderProps) {
  const [open, setOpenInternal] = useState(initialOpen);

  const setOpen: Dispatch<SetStateAction<boolean>> = (value) => {
    setOpenInternal((prev) => {
      const newState = typeof value === "function" ? value(prev) : value;
      setOpenCookie(newState);
      return newState;
    });
  };

  // Keyboard shortcut: Cmd/Ctrl + Shift + E to toggle Knowledge Bank
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!isModifierPressed || !event.shiftKey || event.key !== "e") return;

      event.preventDefault();
      setOpen((prev) => !prev);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <KnowledgeBankContext.Provider
      value={{
        open,
        setOpen,
      }}
    >
      {children}
    </KnowledgeBankContext.Provider>
  );
}

export interface KnowledgeBankContextType {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const KnowledgeBankContext = createContext<KnowledgeBankContextType | undefined>(
  undefined
);

export function useKnowledgeBankContext() {
  const context = useContext(KnowledgeBankContext);
  if (context === undefined) {
    throw new Error(
      "useKnowledgeBankContext must be used within a KnowledgeBankProvider"
    );
  }
  return context;
}
