import { memo, useMemo, useState, type CSSProperties } from 'react';
import type { Block, PropsOf } from '../../types/block';
import { sanitizeImageUrl, sanitizeLinkUrl } from '../../utils/sanitize';

/*
 * All user content is rendered as React text nodes or attribute values that
 * React escapes. There is no dangerouslySetInnerHTML anywhere in the app.
 * URLs are re-checked at render time as defence in depth, even though state
 * only ever holds sanitised values.
 */

interface ContentProps<P> {
  props: P;
  /** In the editor, links are inert so clicking a button selects it instead of navigating. */
  live: boolean;
}

const TextContent = memo(function TextContent({ props }: ContentProps<PropsOf<'text'>>) {
  const style = useMemo<CSSProperties>(
    () => ({
      fontSize: props.fontSize,
      color: props.color,
      textAlign: props.align,
      fontWeight: props.bold ? 700 : 400,
    }),
    [props.fontSize, props.color, props.align, props.bold],
  );
  return (
    <p className="content-text" style={style}>
      {props.text}
    </p>
  );
});

const ImageContent = memo(function ImageContent({ props }: ContentProps<PropsOf<'image'>>) {
  const src = sanitizeImageUrl(props.src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const style = useMemo<CSSProperties>(
    () => ({ objectFit: props.fit, borderRadius: props.radius }),
    [props.fit, props.radius],
  );

  if (!src || failedSrc === src) {
    return (
      <div className="content-image-empty" style={style}>
        <span>{src ? 'Image failed to load' : 'Add an image URL'}</span>
      </div>
    );
  }
  return (
    <img
      className="content-image"
      src={src}
      alt={props.alt}
      style={style}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  );
});

const ButtonContent = memo(function ButtonContent({ props, live }: ContentProps<PropsOf<'button'>>) {
  const style = useMemo<CSSProperties>(
    () => ({ background: props.background, color: props.color, borderRadius: props.radius }),
    [props.background, props.color, props.radius],
  );
  const href = sanitizeLinkUrl(props.href);

  return (
    <div className={`content-button-wrap align-${props.align}`}>
      {live && href ? (
        <a className="content-button" style={style} href={href} target="_blank" rel="noopener noreferrer nofollow">
          {props.label}
        </a>
      ) : (
        <span className="content-button" style={style}>
          {props.label}
        </span>
      )}
    </div>
  );
});

const ContainerContent = memo(function ContainerContent({ props }: ContentProps<PropsOf<'container'>>) {
  const style = useMemo<CSSProperties>(
    () => ({
      background: props.background,
      borderColor: props.borderColor,
      borderRadius: props.radius,
    }),
    [props.background, props.borderColor, props.radius],
  );
  return <div className="content-container" style={style} />;
});

export function BlockContent({ block, live = false }: { block: Block; live?: boolean }) {
  switch (block.type) {
    case 'text':
      return <TextContent props={block.props} live={live} />;
    case 'image':
      return <ImageContent props={block.props} live={live} />;
    case 'button':
      return <ButtonContent props={block.props} live={live} />;
    case 'container':
      return <ContainerContent props={block.props} live={live} />;
  }
}
