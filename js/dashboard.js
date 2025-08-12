const SUPABASE_URL= "https://ghpfayqfnzliltgnpwim.supabase.co";
const SUPABASE_KEY= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocGZheXFmbnpsaWx0Z25wd2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUwNDksImV4cCI6MjA3MDA4MTA0OX0.PHIbsdufPmece1QeqI9KhRziM8-FXeAhLrEXXNagTPM";
                                                                                                                                                                                                                             const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value;
  const correo = document.getElementById("correo").value;
  const clase = document.getElementById("clase").value;

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("No estás autenticado.");
    return;
  }

  const { error } = await client.from("estudiantes").insert({
    nombre,
    correo,
    clase,
    user_id: user.id,
  });

  if (error) {
    alert("Error al agregar: " + error.message);
  } else {
    alert("Estudiante agregado");
    cargarEstudiantes();
  }
}

async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";

  if (error) {
    alert("Error al cargar estudiantes: " + error.message);
    return;
  }

  data.forEach((est) => {
    const item = document.createElement("li");
    item.innerHTML = `
      ${est.nombre} (${est.clase})
      <button onclick="actualizarEstudiante('${est.id}')">Update</button>
      <button onclick="borrarEstudiante('${est.id}')">Delete</button>
    `;
    lista.appendChild(item);
  });
}

// 🔹 Función para borrar
async function borrarEstudiante(id) {
  const result = await Swal.fire({
    title: '¿Estás seguro?',
    text: "No podrás revertir esta acción",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {
    const { error } = await client
      .from("estudiantes")
      .delete()
      .eq("id", id);

    if (error) {
      Swal.fire('Error', error.message, 'error');
    } else {
      Swal.fire('Borrado', 'El estudiante ha sido borrado.', 'success');
      cargarEstudiantes();
    }
  }
}


// 🔹 Función para actualizar
async function actualizarEstudiante(id) {
  // Obtener datos actuales
  const { data, error } = await client
    .from("estudiantes")
    .select("nombre, correo, clase")
    .eq("id", id)
    .single();

  if (error) {
    Swal.fire('Error', 'No se pudo obtener los datos', 'error');
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: 'Actualizar estudiante',
    html:
      `<label>Nombre:</label>` +
      `<input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${data.nombre}">` +
      `<label>Correo:</label>` +
      `<input id="swal-input2" class="swal2-input" placeholder="Correo" value="${data.correo}">` +
      `<label>Clase:</label>` +
      `<input id="swal-input3" class="swal2-input" placeholder="Clase" value="${data.clase}">`,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      const nombre = document.getElementById('swal-input1').value.trim();
      const correo = document.getElementById('swal-input2').value.trim();
      const clase = document.getElementById('swal-input3').value.trim();

      if (!nombre || !correo || !clase) {
        Swal.showValidationMessage('Todos los campos son obligatorios');
        return false;
      }
      return { nombre, correo, clase };
    }
  });

  if (formValues) {
    const { error: updateError } = await client
      .from("estudiantes")
      .update({
        nombre: formValues.nombre,
        correo: formValues.correo,
        clase: formValues.clase
      })
      .eq("id", id);

    if (updateError) {
      Swal.fire('Error', updateError.message, 'error');
    } else {
      Swal.fire('¡Listo!', 'Estudiante actualizado', 'success');
      cargarEstudiantes();
    }
  }
}



async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];

  if (!archivo) {
    alert("Selecciona un archivo primero.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("Sesión no válida.");
    return;
  }

  const safeName = archivo.name.replace(/\s+/g, "_"); // Quitar espacios
  const nombreRuta = `${user.id}/${Date.now()}_${safeName}`; // Nombre único

  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, {
      cacheControl: "3600",
      upsert: true, // permite sobrescribir si hay nombre igual
    });

  if (error) {
    alert("Error al subir: " + error.message);
  } else {
    alert("Archivo subido correctamente.");
    listarArchivos();
  }
}

async function listarArchivos() {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("Sesión no válida.");
    return;
  }

  const { data, error } = await client.storage
    .from("tareas")
    .list(`${user.id}`, { limit: 50 });

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  if (error) {
    lista.innerHTML = "<li>Error al listar archivos</li>";
    return;
  }

  for (const archivo of data) {
    const { data: signedUrlData, error: signedUrlError } = await client.storage
      .from("tareas")
      .createSignedUrl(`${user.id}/${archivo.name}`, 60);
 // 1 hora

    if (signedUrlError) {
      console.error("Error al generar URL firmada:", signedUrlError.message);
      continue;
    }

    const publicUrl = signedUrlData.signedUrl;
    const item = document.createElement("li");

    const esImagen = archivo.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const esPDF = archivo.name.match(/\.pdf$/i);

    if (esImagen) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
        </a>
      `;
    } else if (esPDF) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>
      `;
    } else {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">${archivo.name}</a>
      `;
    }

    lista.appendChild(item);
  }
}

async function cerrarSesion() {
  const { error } = await client.auth.signOut();

  if (error) {
    alert("Error al cerrar sesión: " + error.message);
  } else {
    localStorage.removeItem("token");
    alert("Sesión cerrada.");
    window.location.href = "index.html";
  }
}

// Inicializar cuando cargue la página
cargarEstudiantes();
listarArchivos();
