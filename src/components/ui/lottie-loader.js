"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "../../lib/utils.js";

const loaderSources = {
  add: "/Add new.lottie",
  dataTable: "/Datatable loader.lottie",
  education: "/Educatin.lottie",
  enroll: "/Enroll.lottie",
  school: "/SchoolBuilding.lottie"
};

export function LottieLoader({
  name = "dataTable",
  className,
  src,
  loop = true,
  autoplay = true,
  ariaLabel = "Loading",
  ...props
}) {
  return (
    <div
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel || undefined}
      className={cn("pointer-events-none flex items-center justify-center", className)}
      role={ariaLabel ? "img" : "presentation"}
      {...props}
    >
      <DotLottieReact
        autoplay={autoplay}
        loop={loop}
        src={src || loaderSources[name] || loaderSources.dataTable}
      />
    </div>
  );
}

export { loaderSources };
