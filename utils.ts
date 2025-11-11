import { useContext } from "react";
import { PathContext } from "./client";

export function usePath() {
  const path = useContext(PathContext);

  if (path === null && typeof window !== "undefined") {
    return window.location.pathname;
  }
  return path;
}
