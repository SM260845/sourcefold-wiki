import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Sourcefold Wiki',
  description:
    'Public documentation and reference CLI for folding repositories into a single Markdown artifact.',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Quick start', link: '/quick-start' },
      { text: 'Format spec', link: '/format-spec' },
      { text: 'CLI reference', link: '/cli-reference' },
      { text: 'Techniques', link: '/exploration-techniques-and-use-cases' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Quick start', link: '/quick-start' },
          { text: 'Format spec', link: '/format-spec' },
          {
            text: 'Ignore and inclusion rules',
            link: '/ignore-and-inclusion-rules',
          },
          {
            text: 'Security and threat model',
            link: '/security-and-threat-model',
          },
          { text: 'CLI reference', link: '/cli-reference' },
          {
            text: 'Exploration techniques and use cases',
            link: '/exploration-techniques-and-use-cases',
          },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SM260845/sourcefold-wiki' },
    ],
  },
});
