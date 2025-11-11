import { createContext } from "react";

export const PathContext = createContext<string | null>(null);

export function PathProvider({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  return <PathContext.Provider value={path}>{children}</PathContext.Provider>;
}
