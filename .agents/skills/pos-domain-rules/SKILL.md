---
name: pos-domain-rules
description: Implementar o revisar reglas de POS sobre dinero, impuestos, descuentos, caja, devoluciones, inventario e idempotencia sin inventar reglas fiscales o comerciales.
---

# Dominio del POS

Inspecciona catálogo, configuración, estados y tests. Distingue funciones reales
(impuestos, descuentos, devoluciones, corte) de funciones todavía inexistentes.
No inventes tasas fiscales, política de devolución o reglas de descuentos: usa
configuración/documentación autorizada; pide los datos de negocio si faltan.

## Invariantes
- Autoridad monetaria en servidor. Decimal desde texto decimal, nunca Decimal(float).
  Redondeo y orden de descuentos/impuestos explícitos y verificados con ejemplos.
- En modelos nuevos usa Numeric adecuado. En sistemas JSON heredados conserva el
  contrato numérico y convierte solo en serialización; toda aritmética es decimal.
- Cantidad entera positiva, importes finitos y límites. Precio del catálogo; no del cliente.
- Foto histórica de nombre/precio/impuesto/descuento de cada línea vendida.
- Venta, reserva/descuento de stock y registro de pago en transacción; rollback íntegro.
- UUID estable e inmutable en reintentos. Unicidad en BD, ámbito de cuenta/tienda y
  comparar contenido antes de reutilizar; no revelar ventas de otros usuarios.
- Cancelación por estado; restituir inventario una sola vez. Caja no anula ventas.
- Devolución referencia venta/líneas originales, máximo vendido menos ya devuelto;
  conservar auditoría y medio de reembolso. No confundir cancelación con devolución.
- Corte: saldo inicial + entradas - salidas, separar efectivo de tarjeta, registrar
  diferencia y responsable. No contabilizar ejemplos ni dinero pendiente como cobrado.
- Pasarelas simuladas no son pagos reales; dinero de reparto no es transferencia bancaria.

Prueba decimales, límites, efectivo insuficiente, precios manipulados, última pieza
concurrente, rollback, repetición de cancelación/reembolso y totales históricos.
Si existen impuestos/descuentos, prueba mezcla de tasas, 100%, redondeo por línea
frente al documento y orden de aplicación. Nunca declares probado lo no implementado.
