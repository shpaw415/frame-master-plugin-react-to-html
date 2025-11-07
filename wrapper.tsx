import type { JSX } from "react";

export async function Wrapper({
  wrapperPath,
  children,
}: {
  wrapperPath: string;
  children?: JSX.Element;
}) {
  const Mod = (await import(wrapperPath)) as {
    default: (props: { children?: JSX.Element }) => JSX.Element;
  };
  return (
    <>
      <Mod.default>{children}</Mod.default>
    </>
  );
}
