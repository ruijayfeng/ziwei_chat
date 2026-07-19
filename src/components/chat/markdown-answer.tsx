import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

export function MarkdownAnswer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('ziwei-markdown max-w-[72ch] text-base leading-[1.8] text-foreground/90', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-8 mb-4 font-serif text-2xl font-semibold leading-tight text-foreground first:mt-0">{children}</h1>,
          h2: ({ children }) => (
            <h2 className="mt-7 mb-3 flex items-center gap-2 font-serif text-xl font-semibold leading-tight text-foreground first:mt-0">
              <span aria-hidden className="size-1.5 rotate-45 bg-primary" />
              {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="mt-6 mb-2 text-base font-semibold text-foreground first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-3 text-pretty first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
          ul: ({ children }) => <ul className="my-4 space-y-2 pl-0">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 marker:font-medium marker:text-primary">{children}</ol>,
          li: ({ children, ...props }) => (
            <li {...props} className="relative pl-5 leading-[1.75] [&>p]:my-0">
              <span aria-hidden className="absolute top-[0.72em] left-0 size-1 rounded-full bg-primary/80" />
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-md bg-primary/[0.07] px-4 py-3 text-foreground/80 [&>p]:my-0">
              <span aria-hidden className="mr-2 font-serif text-xl text-primary">“</span>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary">{children}</a>,
          hr: () => <hr className="my-7 border-0 border-t border-border/70" />,
          code: ({ className: codeClass, children }) => codeClass ? (
            <code className={cn('block overflow-x-auto rounded-md bg-black/25 p-4 font-mono text-sm leading-6 text-foreground', codeClass)}>{children}</code>
          ) : <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.875em] text-primary">{children}</code>,
          table: ({ children }) => <div className="my-5 overflow-x-auto rounded-md border border-border/70"><table className="w-full min-w-[32rem] border-collapse text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="bg-muted/45 px-3 py-2.5 font-semibold text-foreground">{children}</th>,
          td: ({ children }) => <td className="border-t border-border/60 px-3 py-2.5 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
