// Augment the JSX namespace with @react-three/fiber's ThreeElements
// so tsc recognizes Three.js primitives as valid JSX elements.
// This bridges the gap between @react-three/fiber types and the
// @types/three package version that ships with this project.
import { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
