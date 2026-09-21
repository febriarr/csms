import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

markdown.use(markdownItAnchor, {
  slugify: title => {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-{3,}/g, '--');
  },
});

export function renderMarkdown(source: string) {
  return markdown.render(source);
}
