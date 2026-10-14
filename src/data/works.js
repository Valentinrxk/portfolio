// Las obras: la fuente de la banda de "obras".
// Ficha técnica por capa, el back primero: lo que no se ve en el reel
export const WORKS = [
  {
    key: 'riestra',
    title: 'deportivo riestra',
    domain: 'deportivoriestra.com.ar',
    stack: [
      ['back', 'postgresql + rls · supabase · cloudflare workers · astro ssr'],
      ['front', 'astro · gsap · lenis'],
      ['infra', 'vercel · cloudflare'],
    ],
    video: '/works/riestra.mp4',
    poster: '/works/riestra.jpg',
    link: 'https://deportivoriestra.com.ar/',
  },
  {
    key: 'oclucrm',
    title: 'oclucrm',
    domain: 'oclucrm.com',
    stack: [
      ['back', 'php 8 · laravel · mysql · redis · multi-tenant · api rest · afip · openai'],
      ['front', 'vue 3 · three.js · dicom'],
      ['infra', 'docker · aws s3 · sentry · bitbucket ci'],
    ],
    video: '/works/oclucrm.mp4',
    poster: '/works/oclucrm.jpg',
    link: 'https://www.oclucrm.com/',
  },
  {
    key: 'grip',
    title: 'grip studio',
    domain: 'gripppp.com',
    stack: [['front', 'vite · javascript']],
    video: '/works/grip.mp4',
    poster: '/works/grip.jpg',
    link: 'https://gripppp.com/',
  },
  {
    key: 'taxes',
    title: 'taxes software',
    domain: 'taxes.com.ar',
    stack: [
      ['back', 'php 8 · laravel · mysql · jobs + supervisor · afip ws · openai · mcp (node)'],
      ['front', 'vue'],
      ['app', 'react native · expo · typescript'],
      ['infra', 'docker · sendgrid'],
    ],
    video: '/works/taxes.mp4',
    poster: '/works/taxes.jpg',
    link: 'https://www.taxes.com.ar/',
  },
];
