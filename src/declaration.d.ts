declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}

declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

declare const __OVERRIDE_NEWTAB: boolean;
declare const MIXPANEL_TOKEN: string;

declare module "mixpanel-browser" {
  const mixpanel: any;
  export default mixpanel;
}
