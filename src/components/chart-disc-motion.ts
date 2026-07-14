"use client";

/**
 * [INPUT]: Depends on GSAP, @gsap/react, and a scoped chart-disc root
 * [OUTPUT]: Provides phase-driven, reduced-motion-safe chart-disc animation
 * [POS]: Motion controller for the shared compact/full chart visual component
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP);

export type ChartDiscMotionPhase = "empty" | "calculating" | "ready" | "analyzing" | "critic" | "complete" | "failed";

export function useChartDiscMotion(rootRef: RefObject<HTMLElement | null>, phase: ChartDiscMotionPhase) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
      const reduceMotion = Boolean(conditions?.reduceMotion);
      const ring = ".chart-disc-ring";
      const nodes = ".chart-disc-node";
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (phase === "calculating") {
        timeline.fromTo(ring, { rotation: -8 }, { rotation: 8, duration: reduceMotion ? 0 : 0.8, repeat: reduceMotion ? 0 : -1, yoyo: true, ease: "sine.inOut" });
      } else if (phase === "ready" || phase === "complete") {
        timeline.fromTo(nodes, { autoAlpha: 0, scale: 0.82 }, { autoAlpha: 1, scale: 1, duration: reduceMotion ? 0 : 0.45, stagger: reduceMotion ? 0 : 0.035 });
      } else if (phase === "analyzing") {
        timeline.fromTo(nodes, { autoAlpha: 0.72, scale: 0.94 }, { autoAlpha: 1, scale: 1.04, duration: reduceMotion ? 0 : 0.55, stagger: reduceMotion ? 0 : 0.08, yoyo: true, repeat: reduceMotion ? 0 : 1 });
        timeline.to(ring, { rotation: 360, duration: reduceMotion ? 0 : 18, repeat: reduceMotion ? 0 : -1, ease: "none" }, "<");
        timeline.to(".chart-disc-node-content", { rotation: -360, duration: reduceMotion ? 0 : 18, repeat: reduceMotion ? 0 : -1, ease: "none" }, "<");
      } else if (phase === "critic") {
        timeline.to(".chart-disc-core", { scale: reduceMotion ? 1 : 1.06, duration: reduceMotion ? 0 : 0.55, yoyo: true, repeat: reduceMotion ? 0 : 1, ease: "sine.inOut" });
      }

      return () => timeline.kill();
    }, rootRef.current ?? undefined);

    return () => media.revert();
  }, { scope: rootRef, dependencies: [phase], revertOnUpdate: true });
}
