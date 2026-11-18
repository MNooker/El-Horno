const Inventory = (() => {
  const example = {"stock": [{"lote": 1, "org": 1, "articulo": 1, "ubicacion": "Almacén central", "codigo": "H-042", "caduca": null, "fisico": 20000, "reservado": 0, "bloqueado": 0, "disponible": 20000, "valor_centavos": 40000, "nombre": "Harina de trigo", "unidad": "g", "clase": "Insumo"}, {"lote": 2, "org": 2, "articulo": 1, "ubicacion": "Almacén central", "codigo": "H-042", "caduca": null, "fisico": 5000, "reservado": 0, "bloqueado": 0, "disponible": 5000, "valor_centavos": 10000, "nombre": "Harina de trigo", "unidad": "g", "clase": "Insumo"}, {"lote": 3, "org": 1, "articulo": 2, "ubicacion": "Mostrador", "codigo": "C-016", "caduca": null, "fisico": 12, "reservado": 4, "bloqueado": 0, "disponible": 8, "valor_centavos": 7200, "nombre": "Concha de vainilla", "unidad": "pz", "clase": "Terminado"}, {"lote": 4, "org": 1, "articulo": 3, "ubicacion": "Mostrador", "codigo": "P-023", "caduca": null, "fisico": 2250, "reservado": 0, "bloqueado": 0, "disponible": 2250, "valor_centavos": 13500, "nombre": "Pan rústico al peso", "unidad": "g", "clase": "Terminado"}], "ledger": [{"org": 2, "ref": "Compra 42", "motivo": "Cesión aprobada de 5 kg", "actor": "Ana", "aprobador": "Ana", "id": 7, "documento": "T1", "linea": 2, "lote": 2, "fisico": 5000, "reservado": 0, "bloqueado": 0, "valor_centavos": 10000, "nombre": "Harina de trigo", "codigo": "H-042", "unidad": "g", "clase": "Insumo"}, {"org": 1, "ref": "Compra 42", "motivo": "Cesión aprobada de 5 kg", "actor": "Ana", "aprobador": "Ana", "id": 6, "documento": "T1", "linea": 1, "lote": 1, "fisico": -5000, "reservado": 0, "bloqueado": 0, "valor_centavos": -10000, "nombre": "Harina de trigo", "codigo": "H-042", "unidad": "g", "clase": "Insumo"}, {"org": 1, "ref": "Ticket 73", "motivo": "Mostrador", "actor": "Ana", "aprobador": null, "id": 5, "documento": "V1", "linea": 1, "lote": 4, "fisico": -750, "reservado": 0, "bloqueado": 0, "valor_centavos": -4500, "nombre": "Pan rústico al peso", "codigo": "P-023", "unidad": "g", "clase": "Terminado"}, {"org": 1, "ref": "Pedido 12", "motivo": "Recogida en tienda", "actor": "Ana", "aprobador": null, "id": 4, "documento": "A1", "linea": 1, "lote": 3, "fisico": 0, "reservado": 4, "bloqueado": 0, "valor_centavos": 0, "nombre": "Concha de vainilla", "codigo": "C-016", "unidad": "pz", "clase": "Terminado"}, {"org": 1, "ref": "Apertura", "motivo": "Existencias iniciales", "actor": "Ana", "aprobador": "Ana", "id": 3, "documento": "R2", "linea": 2, "lote": 4, "fisico": 3000, "reservado": 0, "bloqueado": 0, "valor_centavos": 18000, "nombre": "Pan rústico al peso", "codigo": "P-023", "unidad": "g", "clase": "Terminado"}, {"org": 1, "ref": "Apertura", "motivo": "Existencias iniciales", "actor": "Ana", "aprobador": "Ana", "id": 2, "documento": "R2", "linea": 1, "lote": 3, "fisico": 12, "reservado": 0, "bloqueado": 0, "valor_centavos": 7200, "nombre": "Concha de vainilla", "codigo": "C-016", "unidad": "pz", "clase": "Terminado"}, {"org": 1, "ref": "Compra 42", "motivo": "Recepción de harina", "actor": "Ana", "aprobador": null, "id": 1, "documento": "R1", "linea": 1, "lote": 1, "fisico": 25000, "reservado": 0, "bloqueado": 0, "valor_centavos": 50000, "nombre": "Harina de trigo", "codigo": "H-042", "unidad": "g", "clase": "Insumo"}]};
  const views = {catalog: 'Catálogo', stock: 'Lotes', ledger: 'Movimientos', scale: 'Pesada'};
  let view = 'catalog', org = '1', term = '', filter = 'all';
  const normalize = value => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const qty = (n, unit) => (unit === 'g' ? n / 1000 : n).toLocaleString('es-MX') + (unit === 'g' ? ' kg' : ' pzas');
  const selected = (value, actual) => value === actual ? ' selected' : '';

  function exampleView() {
    const records = example[view === 'ledger' ? 'ledger' : 'stock'].filter(r => String(r.org) === org);
    if (view === 'scale') {
      const lot = records.find(r => r.clase === 'Terminado' && r.unidad === 'g');
      if (!lot) return '<p class="inv-empty">Este obrador no tiene lotes de producto terminado por peso.</p>';
      return `<div class="inv-scale"><div><h3>${lot.nombre}</h3><p>Lote ${lot.codigo} · ${qty(lot.disponible,'g')} disponibles</p><b>$120.00 por kg</b></div><div><label>Peso bruto (g)<input type="number" min="1" step="1" value="780" id="inv-gross"></label><label>Tara (g)<input type="number" min="0" step="1" value="30" id="inv-tare"></label><output id="inv-total" data-max="${lot.disponible}" aria-live="polite"></output></div></div>`;
    }
    const stock = view === 'stock';
    const head = stock ? ['Artículo y lote','Ubicación','Físico','Reservado','Bloqueado','Disponible'] : ['Documento','Movimiento','Lote','Registró','Autorizó','Físico','Reserva','Costo'];
    const rows = records.map(r => stock
      ? [`<b>${r.nombre}</b><small>${r.codigo} · ${r.clase}</small>`,r.ubicacion,...['fisico','reservado','bloqueado','disponible'].map(k=>qty(r[k],r.unidad))]
      : [r.ref,r.motivo,r.codigo,r.actor,r.aprobador || 'Sin registro',qty(r.fisico,r.unidad),qty(r.reservado,r.unidad),$m(r.valor_centavos/100)]);
    return `<div class="inv-scroll" tabindex="0" role="region" aria-label="${views[view]}"><table><thead><tr>${head.map(h=>'<th scope="col">'+h+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
  }

  function weigh(root) {
    const gross=root.querySelector('#inv-gross'), tare=root.querySelector('#inv-tare'), output=root.querySelector('#inv-total');
    if(!output) return;
    const net = gross.valueAsNumber - tare.valueAsNumber;
    output.textContent = !Number.isSafeInteger(gross.valueAsNumber) || !Number.isSafeInteger(tare.valueAsNumber) || tare.valueAsNumber < 0 || net <= 0
      ? 'Revisa el peso bruto y la tara.' : net > Number(output.dataset.max)
      ? 'El peso supera las existencias.' : qty(net,'g')+' netos · '+$m(Math.round(net*12000/1000)/100);
  }

  function mount(root, data, catalog) {
    if (!root.querySelector('.inv-workspace')) root.innerHTML = `<section class="inv-workspace">
      <header class="inv-heading"><div><h2>Inventario</h2><p>Catálogo, existencias y movimientos del obrador.</p></div></header>
      <nav aria-label="Consultas de inventario">${Object.entries(views).map(([id,name])=>`<button type="button" data-inv="${id}">${name}</button>`).join('')}</nav>
      <div class="inv-tools"></div><div class="inv-body"></div></section>`;
    const toolbar=root.querySelector('.inv-tools'), body=root.querySelector('.inv-body');
    const catalogView=view==='catalog';
    root.querySelectorAll('[data-inv]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inv===view)));
    if(toolbar.dataset.view!==view) {
      toolbar.dataset.view=view;
      toolbar.innerHTML = catalogView ? `<label>Buscar producto<input id="inv-search" type="search" placeholder="Nombre o categoría" value="${esc(term)}"></label><label>Existencias<select id="inv-filter"><option value="all">Todas</option><option value="low"${selected('low',filter)}>Menos de 10 piezas</option><option value="zero"${selected('zero',filter)}>Agotados</option></select></label>`
        : `<label>Negocio de ejemplo<select id="inv-org"><option value="1">Obrador Norte</option><option value="2"${selected('2',org)}>Obrador Sur</option></select></label><p>Datos de ejemplo del modelo por lotes.</p>`;
    }
    function updateCatalog() {
      const products=data.products.filter(p=>normalize(p.n+' '+p.c).includes(normalize(term))&&(filter==='all'||(filter==='low'?p.s<10:p.s===0)));
      // Actualizar solo las filas al buscar conserva el formulario de alta abierto.
      const template=document.createElement('template');
      template.innerHTML=catalog({...data,products});
      if(!products.length)template.content.querySelector('tbody').innerHTML='<tr><td colspan="4">Ningún producto coincide con estos filtros.</td></tr>';
      if(body.querySelector('#npf'))body.querySelector('tbody').replaceWith(template.content.querySelector('tbody'));
      else body.replaceChildren(template.content);
    }
    if(catalogView)updateCatalog();else {body.innerHTML=exampleView();weigh(root);}
    root.onclick=e=>{const button=e.target.closest('[data-inv]');if(button){view=button.dataset.inv;mount(root,data,catalog)}};
    root.oninput=e=>{if(e.target.id==='inv-search'){term=e.target.value;updateCatalog()}else if(['inv-tare','inv-gross'].includes(e.target.id))weigh(root)};
    root.onchange=e=>{if(e.target.id==='inv-filter'){filter=e.target.value;updateCatalog()}if(e.target.id==='inv-org'){org=e.target.value;mount(root,data,catalog)}};
  }
  return {mount};
})();
