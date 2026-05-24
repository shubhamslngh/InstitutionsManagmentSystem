"use client";

import { useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "./button.js";
import { loaderSources } from "./lottie-loader.js";
import { cn } from "../../lib/utils.js";

export function AnimatedAddButton({
  children,
  onClick,
  className,
  variant = "AddBtn",
  lottieName = "add",
  lottieClassName = "-my-1 h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-green-900 bg-black",
  lottieSrc,
  onFocus,
  onMouseEnter,
  size,
  disabled,
  type = "button",
  ...props
}) {
  const lottieRef = useRef(null);

  function playAnimation() {
    lottieRef.current?.stop();
    lottieRef.current?.setFrame(0);
    lottieRef.current?.play();
  }

  function handleClick(event) {
    playAnimation();
    onClick?.(event);
  }

  function handleFocus(event) {
    playAnimation();
    onFocus?.(event);
  }

  function handleMouseEnter(event) {
    playAnimation();
    onMouseEnter?.(event);
  }

  return (
    <Button
      className={cn("group", className)}
      disabled={disabled}
      onFocus={handleFocus}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      size={size}
      type={type}
      variant={variant}
      {...props}
    >
      <span className={lottieClassName}>
        <DotLottieReact
          autoplay={false}
          dotLottieRefCallback={(dotLottie) => {
            lottieRef.current = dotLottie;
          }}
          loop={false}
          src={lottieSrc || loaderSources[lottieName] || loaderSources.add}
        />
      </span>
      {children}
    </Button>
  );
}
