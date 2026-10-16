import type { ReactNode } from 'react';
import type { ContentNode, RichSegment } from '../lib/content-types';
import styles from './notion-content.module.css';

function RichText({ parts }: { parts: RichSegment[] }) {
  return parts.map((part, index) => {
    let content: ReactNode = part.text;
    if (part.code) content = <code>{content}</code>;
    if (part.bold) content = <strong>{content}</strong>;
    if (part.italic) content = <em>{content}</em>;
    if (part.strike) content = <s>{content}</s>;
    return part.href ? (
      <a key={index} href={part.href}>
        {content}
      </a>
    ) : (
      <span key={index}>{content}</span>
    );
  });
}

function Nodes({ nodes }: { nodes: ContentNode[] }) {
  const output: ReactNode[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const text = <RichText parts={node.rich} />;
    const children = node.children.length ? <Nodes nodes={node.children} /> : null;
    if (['bulleted_list', 'numbered_list'].includes(node.type)) {
      const group = [node];
      while (nodes[index + 1]?.type === node.type) group.push(nodes[++index]);
      const items = group.map((item) => (
        <li key={item.id}>
          <RichText parts={item.rich} />
          <Nodes nodes={item.children} />
        </li>
      ));
      output.push(
        node.type === 'numbered_list' ? (
          <ol key={node.id}>{items}</ol>
        ) : (
          <ul key={node.id}>{items}</ul>
        ),
      );
      continue;
    }
    switch (node.type) {
      case 'image':
        if (node.source)
          output.push(
            <figure key={node.id}>
              <img
                src={node.source}
                alt={node.rich.map((part) => part.text).join('') || 'Concept illustration'}
                width={1536}
                height={1024}
                loading="lazy"
              />
              {node.caption ? <figcaption>{node.caption}</figcaption> : null}
            </figure>,
          );
        break;
      case 'pdf':
        if (node.source)
          output.push(
            <figure key={node.id} className={styles.document}>
              <iframe src={node.source} title="Original document" loading="lazy" />
              <figcaption>
                <a href={node.source}>Open the original PDF</a>
              </figcaption>
            </figure>,
          );
        break;
      case 'file':
        if (node.source)
          output.push(
            <p key={node.id}>
              <a href={node.source}>{node.rich.length ? text : 'Download file'}</a>
            </p>,
          );
        break;
      case 'header':
      case 'sub_header':
        output.push(
          <section key={node.id}>
            <h2>{text}</h2>
            {children}
          </section>,
        );
        break;
      case 'sub_sub_header':
        output.push(
          <section key={node.id}>
            <h3>{text}</h3>
            {children}
          </section>,
        );
        break;
      case 'divider':
        output.push(<hr key={node.id} />);
        break;
      case 'toggle':
        output.push(
          <details key={node.id}>
            <summary>{text}</summary>
            {children}
          </details>,
        );
        break;
      case 'code':
        output.push(
          <pre key={node.id}>
            <code>{node.rich.map((part) => part.text).join('')}</code>
          </pre>,
        );
        break;
      case 'quote':
      case 'callout':
        output.push(
          <blockquote key={node.id}>
            {text}
            {children}
          </blockquote>,
        );
        break;
      default:
        if (node.rich.length)
          output.push(
            <div key={node.id}>
              <p>{text}</p>
              {children}
            </div>,
          );
        else if (children) output.push(<div key={node.id}>{children}</div>);
    }
  }
  return output;
}

export default function NotionContent({ nodes }: { nodes: ContentNode[] }) {
  return (
    <div className={styles.content}>
      <Nodes nodes={nodes} />
    </div>
  );
}
