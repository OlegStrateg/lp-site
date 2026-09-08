module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        'http://127.0.0.1:4321/',
        'http://127.0.0.1:4321/ru/',
        'http://127.0.0.1:4321/extensions/',
        'http://127.0.0.1:4321/pinterest-downloader/',
        'http://127.0.0.1:4321/pt-br/pinterest-downloader/',
        'http://127.0.0.1:4321/ar/pinterest-downloader/',
        'http://127.0.0.1:4321/picture-converter/',
        'http://127.0.0.1:4321/de/picture-converter/',
        'http://127.0.0.1:4321/convert/',
        'http://127.0.0.1:4321/ru/convert/',
        'http://127.0.0.1:4321/convert/png-to-psd/',
        'http://127.0.0.1:4321/formats/psd/',
        'http://127.0.0.1:4321/guides/export-from-ai-builders/'
      ],
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage'
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './quality-reports/lighthouse'
    }
  }
};
