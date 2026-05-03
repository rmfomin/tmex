import React from "react";
import { ColorTheme } from "@/newtab/helpers/types";
import ThemeAutoIcon from "./icons/theme-auto.svg";
import ThemeDarkIcon from "./icons/theme-dark.svg";
import ThemeLightIcon from "./icons/theme-light.svg";

export const ThemeOptionIcon = (props: { theme: ColorTheme }) => {
  if (props.theme === "light") {
    return <ThemeLightIcon className="dropdown-menu__theme-icon" />;
  }

  if (props.theme === "dark") {
    return <ThemeDarkIcon className="dropdown-menu__theme-icon" />;
  }

  return <ThemeAutoIcon className="dropdown-menu__theme-icon" />;
};
