// Type compatibility fix for React 18/19 mismatch
// This resolves the conflict between @types/react@18 (in package.json)
// and @types/react@19 (in workspace root node_modules)

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {}

  // Override ReactNode to exclude bigint which causes the type error
  type ReactNode =
    | ReactElement
    | string
    | number
    | Iterable<ReactNode>
    | ReactPortal
    | boolean
    | null
    | undefined;
}

// Suppress lucide-react component type errors
declare module "lucide-react" {
  import { FC, SVGProps } from "react";
  export type LucideIcon = FC<SVGProps<SVGSVGElement>>;
  export const Database: LucideIcon;
  export const Code: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const FolderTree: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Mail: LucideIcon;
  export const Twitter: LucideIcon;
  export const Linkedin: LucideIcon;
  export const Youtube: LucideIcon;
}

// Suppress next/image component type errors
declare module "next/image" {
  import { FC, ImgHTMLAttributes } from "react";
  export interface ImageProps
    extends Omit<
      ImgHTMLAttributes<HTMLImageElement>,
      "src" | "srcSet" | "ref" | "width" | "height" | "loading"
    > {
    src: string | StaticImport;
    alt: string;
    width?: number | string;
    height?: number | string;
    fill?: boolean;
    loader?: ImageLoader;
    quality?: number | string;
    priority?: boolean;
    loading?: "lazy" | "eager";
    placeholder?: "blur" | "empty";
    blurDataURL?: string;
    unoptimized?: boolean;
    onLoadingComplete?: (img: HTMLImageElement) => void;
    layout?: string;
    objectFit?: string;
    objectPosition?: string;
    lazyBoundary?: string;
    lazyRoot?: string;
  }
  export interface StaticImport {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
  }
  export type ImageLoader = (resolverProps: {
    src: string;
    width: number;
    quality?: number;
  }) => string;
  const Image: FC<ImageProps>;
  export default Image;
}

export {};
