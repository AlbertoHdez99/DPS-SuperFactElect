
/*Configuración*/
const TAX_RATE = 0.13; // IVA 13% (puedes ajustarlo)
document.getElementById('tax-rate-label').textContent = `${(TAX_RATE*100).toFixed(0)}%`;

// Estado de la app
const state = {
  products: [
    { id: 'P001', name: 'Café de especialidad 340g', price: 7.5, stock: 25 },
    { id: 'P002', name: 'Taza cerámica 12oz',        price: 5.0, stock: 40 },
    { id: 'P003', name: 'Filtro V60 (x100)',          price: 4.25, stock: 30 },
    { id: 'P004', name: 'Prensa francesa 600ml',      price: 22.9, stock: 10 },
    { id: 'P005', name: 'Termo acero 500ml',          price: 16.5, stock: 12 },
  ],
  cart: [], // {id, name, price, qty}
  pendingInvoice: null // se llena al hacer checkout y se confirma para afectar inventario
};

/*Utilidades*/
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function money(n){ return n.toLocaleString('es-SV', { style:'currency', currency:'USD' }); }

function findProductById(id){ return state.products.find(p => p.id === id); }

function findCartItem(id){ return state.cart.find(i => i.id === id); }

function computeCartTotals(){
  const subtotal = state.cart.reduce((acc, it) => acc + it.price * it.qty, 0);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { subtotal, tax, total };
}

function generateInvoiceNumber(){
  const now = new Date();
  // YYYYMMDD-HHMMSS-XXX
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random()*900+100);
  return `F-${stamp}-${rand}`;
}

/** =====================
 *  Render de Productos
 *  ===================== */
function renderProducts(){
  const list = $('#product-list');
  list.innerHTML = '';
  state.products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      <span class="badge">#${p.id}</span>
      <h3>${p.name}</h3>
      <div class="price">${money(p.price)}</div>
      <div class="stock">Disponibles: <strong>${p.stock}</strong></div>

      <div class="qty-row">
        <input type="number" min="1" step="1" value="1" id="qty-${p.id}" aria-label="Cantidad para ${p.name}">
        <button class="btn primary" data-add="${p.id}">Agregar</button>
      </div>
    `;
    // deshabilitar si no hay stock
    if(p.stock <= 0){
      div.querySelector('input').disabled = true;
      div.querySelector('[data-add]').disabled = true;
    }
    list.appendChild(div);
  });
}

/** =====================
 *  Carrito
 *  ===================== */
function addToCart(productId, qty){
  const product = findProductById(productId);
  if(!product) return alert('Producto no encontrado.');

  // Validación de entrada
  qty = Number(qty);
  if(!Number.isInteger(qty) || qty <= 0) return alert('Cantidad inválida.');
  if(qty > product.stock) return alert(`No hay suficiente inventario. Disponible: ${product.stock}`);

  const existing = findCartItem(productId);
  const requestedTotal = qty + (existing?.qty || 0);
  if(requestedTotal > product.stock) return alert(`En total superarías el inventario. Disponible: ${product.stock}`);

  if(existing){
    existing.qty += qty;
  }else{
    state.cart.push({ id: product.id, name: product.name, price: product.price, qty });
  }
  renderCart();
}

function removeFromCart(productId){
  state.cart = state.cart.filter(i => i.id !== productId);
  renderCart();
}

function clearCart(){
  state.cart = [];
  renderCart();
}

function changeCartQty(productId, qty){
  const item = findCartItem(productId);
  if(!item) return;
  qty = Number(qty);
  const product = findProductById(productId);
  if(!Number.isInteger(qty) || qty <= 0){
    // si ponen 0 o inválido -> quitar
    removeFromCart(productId);
    return;
  }
  if(qty > product.stock){
    alert(`No hay suficiente inventario. Disponible: ${product.stock}`);
    // revertir al máximo permitido
    item.qty = product.stock;
  }else{
    item.qty = qty;
  }
  renderCart();
}

function renderCart(){
  const tbody = $('#cart-body');
  tbody.innerHTML = '';
  state.cart.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>
        <input type="number" min="1" step="1" value="${item.qty}" class="qty-input" data-qty="${item.id}" aria-label="Cantidad en carrito para ${item.name}">
      </td>
      <td>${money(item.price)}</td>
      <td>${money(item.price * item.qty)}</td>
      <td><button class="btn danger" data-remove="${item.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  });

  const { subtotal, tax, total } = computeCartTotals();
  $('#subtotal').textContent = money(subtotal);
  $('#tax').textContent = money(tax);
  $('#grand-total').textContent = money(total);

  // habilitar/deshabilitar acciones
  $('#btn-clear').disabled = state.cart.length === 0;
  $('#btn-checkout').disabled = state.cart.length === 0;
}

/** =====================
 *  Facturación
 *  ===================== */
function buildInvoiceData(){
  const totals = computeCartTotals();
  const number = generateInvoiceNumber();
  const now = new Date();
  return {
    number,
    date: now.toLocaleString('es-SV'),
    items: state.cart.map(i => ({
      id: i.id, name: i.name, qty: i.qty, unit: i.price, total: +(i.qty * i.price).toFixed(2)
    })),
    ...totals
  };
}

function showInvoice(){
  if(state.cart.length === 0) return;
  state.pendingInvoice = buildInvoiceData();

  const inv = state.pendingInvoice;
  const body = $('#invoice-body');
  const rows = inv.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${money(i.unit)}</td>
      <td>${money(i.total)}</td>
    </tr>
  `).join('');

  body.innerHTML = `
    <h4>Factura #${inv.number}</h4>
    <small>Fecha: ${inv.date}</small>
    <div class="table-wrap" style="margin-top:8px">
      <table class="table">
        <thead>
          <tr><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals" style="margin-top:12px">
      <div><span>Subtotal:</span> <strong>${money(inv.subtotal)}</strong></div>
      <div><span>Impuesto (${(TAX_RATE*100).toFixed(0)}%):</span> <strong>${money(inv.tax)}</strong></div>
      <div class="grand"><span>Total a pagar:</span> <strong>${money(inv.total)}</strong></div>
    </div>
  `;

  const modal = $('#invoice-modal');
  modal.setAttribute('aria-hidden', 'false');
}

function hideInvoice(){
  $('#invoice-modal').setAttribute('aria-hidden', 'true');
}

function confirmPurchase(){
  if(!state.pendingInvoice) return;

  // Actualizar inventario
  state.pendingInvoice.items.forEach(i => {
    const p = findProductById(i.id);
    if(p) p.stock -= i.qty;
  });

  // Limpiar carrito e invoice en curso
  state.cart = [];
  const invoiceNumber = state.pendingInvoice.number;
  state.pendingInvoice = null;

  // Re-render
  renderProducts();
  renderCart();
  hideInvoice();

  alert(`¡Compra confirmada! Factura #${invoiceNumber}.
El inventario ha sido actualizado.`);
}

/** =====================
 *  Eventos
 *  ===================== */
document.addEventListener('click', (e) => {
  // Agregar a carrito desde el grid de productos
  const addId = e.target.closest('[data-add]')?.getAttribute('data-add');
  if(addId){
    const qtyInput = document.getElementById(`qty-${addId}`);
    addToCart(addId, qtyInput?.value || 1);
    return;
  }

  // Eliminar del carrito
  const removeId = e.target.closest('[data-remove]')?.getAttribute('data-remove');
  if(removeId){
    removeFromCart(removeId);
    return;
  }

  // Botones de modal
  if(e.target.id === 'btn-checkout'){
    showInvoice();
    return;
  }
  if(e.target.id === 'btn-clear'){
    if(confirm('¿Vaciar el carrito?')) clearCart();
    return;
  }
  if(e.target.id === 'btn-close-invoice'){
    hideInvoice();
    return;
  }
  if(e.target.id === 'btn-continue'){
    hideInvoice(); // seguir comprando sin confirmar
    return;
  }
  if(e.target.id === 'btn-confirm'){
    confirmPurchase();
    return;
  }
});

// Cambios de cantidad en carrito (delegación)
document.addEventListener('input', (e) => {
  const id = e.target.getAttribute('data-qty');
  if(id){
    changeCartQty(id, e.target.value);
  }
});

/** =====================
 *  Inicio
 *  ===================== */
renderProducts();
renderCart();
