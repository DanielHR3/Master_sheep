// Interruptor de ranchos visibles en la aplicación.
//
// Don Pablito detuvo su desarrollo en septiembre de 2026 (cambio de CEO en el
// cliente), así que su marca y su opción en el selector de rancho quedan
// ocultas en toda la UI. No se borró nada: ni datos, ni cuentas, ni assets.
//
// Para reactivarlo hay que hacer dos cosas, no una:
//   1. Poner esta constante en true.
//   2. Devolver branding/logo_donpablito.png a frontend/public/, porque la UI
//      lo pide como /logo_donpablito.png. Se movió de ahí para que dejara de
//      ser descargable desde internet; ficha_assets.go lo sigue embebiendo
//      desde su nueva ubicación para el PDF de la ficha genealógica.
export const DON_PABLITO_ENABLED = false;
