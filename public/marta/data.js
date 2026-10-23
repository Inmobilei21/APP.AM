// Datos de Marta Wellness.
// MAQUINAS: catálogo del gimnasio (de ejemplo hasta tener la lista real).
// DIETA: plan del nutricionista (de ejemplo hasta tener el real).
// Para cambiarlos basta con editar este archivo; la app lo lee al arrancar.

window.MW_DATA = {
  ejemplo: { maquinas: true, dieta: true },

  // icono: pierna | gluteo | abductor | espalda | remo | pecho | hombro | brazo | core | cardio
  MAQUINAS: [
    { id: "prensa", nombre: "Prensa de piernas", grupo: "Pierna", icono: "pierna" },
    { id: "extension", nombre: "Extensión de cuádriceps", grupo: "Pierna", icono: "pierna" },
    { id: "femoral", nombre: "Curl femoral tumbado", grupo: "Pierna", icono: "pierna" },
    { id: "hack", nombre: "Sentadilla hack", grupo: "Pierna", icono: "pierna" },
    { id: "hip-thrust", nombre: "Hip thrust", grupo: "Glúteo", icono: "gluteo" },
    { id: "patada", nombre: "Patada de glúteo en máquina", grupo: "Glúteo", icono: "gluteo" },
    { id: "abductores", nombre: "Abductores", grupo: "Glúteo", icono: "abductor" },
    { id: "aductores", nombre: "Aductores", grupo: "Pierna", icono: "abductor" },
    { id: "jalon", nombre: "Jalón al pecho", grupo: "Espalda", icono: "espalda" },
    { id: "remo-sentado", nombre: "Remo sentado", grupo: "Espalda", icono: "remo" },
    { id: "pecho-press", nombre: "Press de pecho", grupo: "Pecho", icono: "pecho" },
    { id: "contractor", nombre: "Contractor de pecho", grupo: "Pecho", icono: "pecho" },
    { id: "press-hombro", nombre: "Press de hombro", grupo: "Hombro", icono: "hombro" },
    { id: "elevaciones", nombre: "Elevaciones laterales", grupo: "Hombro", icono: "hombro" },
    { id: "biceps", nombre: "Curl de bíceps en máquina", grupo: "Brazo", icono: "brazo" },
    { id: "triceps", nombre: "Extensión de tríceps en polea", grupo: "Brazo", icono: "brazo" },
    { id: "abdominal", nombre: "Crunch abdominal en máquina", grupo: "Core", icono: "core" },
    { id: "cinta", nombre: "Cinta inclinada", grupo: "Cardio", icono: "cardio" }
  ],

  // Rutinas con las que arranca la app; luego Marta las edita desde Entreno.
  RUTINAS: [
    { id: "r-pierna", nombre: "Pierna y glúteo", maquinas: ["prensa", "hip-thrust", "abductores", "femoral", "patada"] },
    { id: "r-superior", nombre: "Tren superior", maquinas: ["jalon", "remo-sentado", "pecho-press", "press-hombro", "elevaciones"] }
  ],

  COMIDAS: [
    { id: "desayuno", nombre: "Desayuno", hora: "8:00" },
    { id: "media", nombre: "Media mañana", hora: "11:00" },
    { id: "comida", nombre: "Comida", hora: "14:30" },
    { id: "merienda", nombre: "Merienda", hora: "18:00" },
    { id: "cena", nombre: "Cena", hora: "21:00" }
  ],

  // Pasillos en el orden en que aparecen en la lista de la compra.
  PASILLOS: ["Fruta y verdura", "Carne y pescado", "Lácteos y huevos", "Panadería", "Despensa"],

  // Cada alimento: [nombre, cantidad, unidad (g | ml | ud), pasillo]
  DIETA: {
    lunes: {
      desayuno: [["Copos de avena", 50, "g", "Despensa"], ["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Frutos rojos", 80, "g", "Fruta y verdura"], ["Nueces", 15, "g", "Despensa"]],
      media: [["Manzana", 1, "ud", "Fruta y verdura"], ["Almendras", 20, "g", "Despensa"]],
      comida: [["Arroz basmati", 70, "g", "Despensa"], ["Pechuga de pollo", 150, "g", "Carne y pescado"], ["Brócoli", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Pan integral", 40, "g", "Panadería"], ["Pavo en lonchas", 50, "g", "Carne y pescado"], ["Tomate", 1, "ud", "Fruta y verdura"]],
      cena: [["Salmón", 140, "g", "Carne y pescado"], ["Calabacín", 200, "g", "Fruta y verdura"], ["Huevos", 1, "ud", "Lácteos y huevos"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    martes: {
      desayuno: [["Pan integral", 60, "g", "Panadería"], ["Aguacate", 0.5, "ud", "Fruta y verdura"], ["Huevos", 2, "ud", "Lácteos y huevos"]],
      media: [["Plátano", 1, "ud", "Fruta y verdura"]],
      comida: [["Patata", 200, "g", "Fruta y verdura"], ["Merluza", 170, "g", "Carne y pescado"], ["Judías verdes", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Nueces", 15, "g", "Despensa"]],
      cena: [["Pechuga de pavo", 150, "g", "Carne y pescado"], ["Espinacas", 120, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    miercoles: {
      desayuno: [["Copos de avena", 50, "g", "Despensa"], ["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Frutos rojos", 80, "g", "Fruta y verdura"], ["Nueces", 15, "g", "Despensa"]],
      media: [["Manzana", 1, "ud", "Fruta y verdura"], ["Almendras", 20, "g", "Despensa"]],
      comida: [["Quinoa", 70, "g", "Despensa"], ["Ternera magra", 140, "g", "Carne y pescado"], ["Pimiento rojo", 1, "ud", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Pan integral", 40, "g", "Panadería"], ["Queso fresco batido", 100, "g", "Lácteos y huevos"]],
      cena: [["Tofu firme", 150, "g", "Despensa"], ["Calabacín", 200, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    jueves: {
      desayuno: [["Pan integral", 60, "g", "Panadería"], ["Aguacate", 0.5, "ud", "Fruta y verdura"], ["Huevos", 2, "ud", "Lácteos y huevos"]],
      media: [["Plátano", 1, "ud", "Fruta y verdura"]],
      comida: [["Arroz basmati", 70, "g", "Despensa"], ["Pechuga de pollo", 150, "g", "Carne y pescado"], ["Brócoli", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Frutos rojos", 80, "g", "Fruta y verdura"]],
      cena: [["Salmón", 140, "g", "Carne y pescado"], ["Espárragos verdes", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    viernes: {
      desayuno: [["Copos de avena", 50, "g", "Despensa"], ["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Plátano", 1, "ud", "Fruta y verdura"]],
      media: [["Manzana", 1, "ud", "Fruta y verdura"], ["Almendras", 20, "g", "Despensa"]],
      comida: [["Patata", 200, "g", "Fruta y verdura"], ["Merluza", 170, "g", "Carne y pescado"], ["Judías verdes", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Pan integral", 40, "g", "Panadería"], ["Pavo en lonchas", 50, "g", "Carne y pescado"], ["Tomate", 1, "ud", "Fruta y verdura"]],
      cena: [["Huevos", 2, "ud", "Lácteos y huevos"], ["Champiñones", 150, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    sabado: {
      desayuno: [["Pan integral", 60, "g", "Panadería"], ["Tomate", 1, "ud", "Fruta y verdura"], ["Jamón serrano", 40, "g", "Carne y pescado"], ["Aceite de oliva virgen extra", 5, "ml", "Despensa"]],
      media: [["Yogur griego natural", 125, "g", "Lácteos y huevos"]],
      comida: [["Pasta integral", 70, "g", "Despensa"], ["Atún al natural", 80, "g", "Despensa"], ["Tomate", 1, "ud", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Manzana", 1, "ud", "Fruta y verdura"], ["Nueces", 15, "g", "Despensa"]],
      cena: [["Tofu firme", 150, "g", "Despensa"], ["Espinacas", 120, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    },
    domingo: {
      desayuno: [["Copos de avena", 50, "g", "Despensa"], ["Yogur griego natural", 125, "g", "Lácteos y huevos"], ["Frutos rojos", 80, "g", "Fruta y verdura"]],
      media: [["Plátano", 1, "ud", "Fruta y verdura"]],
      comida: [["Lentejas cocidas", 200, "g", "Despensa"], ["Zanahoria", 1, "ud", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]],
      merienda: [["Queso fresco batido", 100, "g", "Lácteos y huevos"], ["Frutos rojos", 80, "g", "Fruta y verdura"]],
      cena: [["Pechuga de pollo", 150, "g", "Carne y pescado"], ["Calabacín", 200, "g", "Fruta y verdura"], ["Aceite de oliva virgen extra", 10, "ml", "Despensa"]]
    }
  }
};
