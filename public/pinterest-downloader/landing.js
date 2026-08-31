(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = document.getElementById('toast');
  let toastTimer;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  document.querySelectorAll('.install-link').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('is-opening');
      setTimeout(() => btn.classList.remove('is-opening'), 900);
    });
  });

  document.querySelectorAll('.demo-action,.dl').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.classList.contains('dl')) {
        btn.classList.remove('auto-click');
        void btn.offsetWidth;
        btn.classList.add('auto-click');
      }
      showToast('Install Pinterest Downloader to use this download action.');
    });
  });

  const filters = [...document.querySelectorAll('.filter')];
  const files = [...document.querySelectorAll('.file')];
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.filter;
    files.forEach(file => {
      file.style.display = type === 'all' || file.dataset.fileType === type ? 'grid' : 'none';
    });
  }));

  const bulkCards = [...document.querySelectorAll('.bulk-card')];
  const bulkCount = document.getElementById('bulkCount');
  const bulkTopCount = document.getElementById('bulkTopCount');
  const bulkButton = document.querySelector('.bulk-footer button');

  const flipText = (node, text) => {
    node.textContent = text;
    node.classList.remove('count-flip');
    void node.offsetWidth;
    node.classList.add('count-flip');
  };

  const updateBulk = () => {
    const n = bulkCards.filter(x => x.classList.contains('selected')).length;
    flipText(bulkCount, n + ' selected · Images · Videos · GIFs');
    flipText(bulkTopCount, n + ' selected');
    bulkButton.classList.toggle('ready', n > 0);
  };

  bulkCards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      card.querySelector('.sel').textContent = card.classList.contains('selected') ? '✓' : '';
      updateBulk();
    });
  });

  const hero = document.getElementById('heroDemo');
  const cursor = document.getElementById('demoCursor');
  const heroFiles = [...document.querySelectorAll('#heroDemo .file')];
  const heroSelected = document.getElementById('heroSelected');
  const zipButton = document.querySelector('#heroDemo .zip');
  const heroTargets = [
    document.querySelector('#heroDemo .pin[data-type="image"]'),
    document.querySelector('#heroDemo .pin[data-type="video"]'),
    document.querySelector('#heroDemo .pin[data-type="gif"]')
  ].filter(Boolean);

  let demoStopped = false;
  let demoRunning = false;

  const heroRelativePoint = el => {
    const host = hero.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left - host.left + r.width * .54,
      y: r.top - host.top + r.height * .48
    };
  };

  const moveCursorTo = async el => {
    const p = heroRelativePoint(el);
    cursor.classList.add('show');
    cursor.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
    await sleep(700);
  };

  const flyToFile = async (pin, file) => {
    const img = pin.querySelector('img');
    const target = file.querySelector('.file-thumb');
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src = img.src;
    clone.className = 'fly-thumb';
    clone.style.left = a.left + 'px';
    clone.style.top = a.top + 'px';
    clone.style.width = Math.min(a.width, 120) + 'px';
    clone.style.height = Math.min(a.height, 120) + 'px';
    clone.style.transform = 'scale(.92)';
    document.body.appendChild(clone);
    await sleep(30);
    clone.style.left = b.left + 'px';
    clone.style.top = b.top + 'px';
    clone.style.width = b.width + 'px';
    clone.style.height = b.height + 'px';
    clone.style.transform = 'scale(1)';
    await sleep(720);
    clone.remove();
  };

  const resetHeroDemo = () => {
    heroTargets.forEach(pin => {
      pin.classList.remove('auto-target');
      const b = pin.querySelector('.dl');
      if (b) b.classList.remove('auto-click');
    });
    heroFiles.forEach(f => {
      f.classList.add('demo-dim');
      f.classList.remove('arrived');
    });
    if (heroSelected) heroSelected.textContent = '0 selected';
    zipButton?.classList.remove('demo-ready');
  };

  const runHeroDemo = async () => {
    if (reduceMotion || demoStopped || demoRunning || !heroTargets.length) return;
    demoRunning = true;
    resetHeroDemo();
    await sleep(350);

    for (let i = 0; i < Math.min(3, heroTargets.length); i++) {
      if (demoStopped) break;
      const pin = heroTargets[i];
      const button = pin.querySelector('.dl');
      const file = heroFiles[i];

      pin.classList.add('auto-target');
      await moveCursorTo(button);

      cursor.classList.add('press');
      button.classList.add('auto-click');
      await sleep(170);
      cursor.classList.remove('press');

      await flyToFile(pin, file);

      file.classList.remove('demo-dim');
      file.classList.add('arrived');
      flipText(heroSelected, (i + 1) + ' selected');
      pin.classList.remove('auto-target');
      button.classList.remove('auto-click');
      await sleep(320);
    }

    if (!demoStopped) {
      const p = heroRelativePoint(zipButton);
      cursor.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
      zipButton.classList.add('demo-ready');
      await sleep(950);
      cursor.classList.remove('show');
      await sleep(250);
    }

    demoRunning = false;
  };

  if (!reduceMotion && hero) {
    const heroObserver = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting && e.intersectionRatio > .35)) {
        heroObserver.disconnect();
        setTimeout(runHeroDemo, 650);
        setTimeout(() => {
          if (!demoStopped) runHeroDemo();
        }, 11500);
      }
    }, {threshold:[.35]});
    heroObserver.observe(hero);

    ['pointerdown','mouseenter','focusin'].forEach(evt => {
      hero.addEventListener(evt, () => {
        demoStopped = true;
        cursor.classList.remove('show');
        heroTargets.forEach(x => x.classList.remove('auto-target'));
      }, {once:true});
    });
  }

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        reveal.unobserve(entry.target);
      }
    });
  }, {threshold:.09});
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

  const progress = document.getElementById('progress');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  };
  addEventListener('scroll', updateProgress, {passive:true});
  updateProgress();
})();