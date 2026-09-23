(() => {
  const gallery = document.querySelector('.event-gallery');
  if (!gallery) return;

  const figures = Array.from(gallery.querySelectorAll('.mosaic-item'));
  let resizeFrame = 0;

  const layout = () => {
    gallery.classList.remove('is-balanced');
    gallery.replaceChildren(...figures);

    const count = Number.parseInt(getComputedStyle(gallery).columnCount, 10) || 1;
    if (count === 1) return;

    const columns = Array.from({ length: count }, () => {
      const column = document.createElement('div');
      column.className = 'event-gallery-column';
      return column;
    });

    const landscapes = count === 4
      ? figures.filter((figure) => {
        const image = figure.querySelector('img');
        return Number(image?.getAttribute('width')) > Number(image?.getAttribute('height'));
      })
      : [];
    const featured = landscapes.length === 2 ? document.createElement('div') : null;
    const layoutFigures = featured ? figures.filter((figure) => !landscapes.includes(figure)) : figures;
    if (featured) featured.className = 'event-gallery-featured';

    gallery.style.setProperty('--event-column-count', String(count));
    gallery.classList.add('is-balanced');
    gallery.replaceChildren(...(featured ? [featured] : []), ...columns);

    if (featured) featured.append(...landscapes);

    columns[0].append(...layoutFigures);
    const heights = layoutFigures.map((figure) => figure.getBoundingClientRect().height);
    const gap = Number.parseFloat(getComputedStyle(columns[0]).rowGap) || 0;
    const totals = Array(count).fill(0);
    const sizes = Array(count).fill(0);
    const assignment = Array(layoutFigures.length);
    let bestAssignment = null;
    let bestSpread = Infinity;
    let bestHeight = Infinity;

    const search = (index, used) => {
      if (layoutFigures.length - index < count - used) return;

      if (index === layoutFigures.length) {
        const max = Math.max(...totals);
        const spread = max - Math.min(...totals);
        if (spread < bestSpread || (spread === bestSpread && max < bestHeight)) {
          bestSpread = spread;
          bestHeight = max;
          bestAssignment = assignment.slice();
        }
        return;
      }

      for (let column = 0; column < Math.min(used + 1, count); column += 1) {
        const added = heights[index] + (sizes[column] ? gap : 0);
        totals[column] += added;
        sizes[column] += 1;
        assignment[index] = column;
        search(index + 1, Math.max(used, column + 1));
        totals[column] -= added;
        sizes[column] -= 1;
      }
    };

    search(0, 0);
    layoutFigures.forEach((figure, index) => columns[bestAssignment[index]].appendChild(figure));
  };

  document.fonts.ready.then(layout);
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layout);
  }, { passive: true });
})();
