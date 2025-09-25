async function guardarPrediccion(clase, probabilidad) {
  await fetch("http://localhost:5000/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clase, probabilidad })
  });
}
