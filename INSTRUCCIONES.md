# Registro Anestesia — Guía de configuración

## ¿Qué necesitas?
- Una cuenta de Google (Gmail)
- 10 minutos la primera vez

---

## PASO 1 — Crea la hoja de cálculo

1. Ve a [sheets.google.com](https://sheets.google.com)
2. Crea una hoja nueva → llámala **"Registro Anestesia"**
3. Copia el **ID** de la hoja desde la URL:
   - La URL tiene este formato: `https://docs.google.com/spreadsheets/d/`**`ESTO_ES_EL_ID`**`/edit`
   - Guarda ese ID (lo necesitarás en el paso 2)

---

## PASO 2 — Configura el script de conexión

1. En la hoja de cálculo → menú **Extensiones** → **Apps Script**
2. Borra todo el código que aparece por defecto
3. Copia y pega todo el contenido del archivo `google-apps-script.gs`
4. Guarda (Ctrl+S o ícono de disquete)
5. Dale un nombre al proyecto: **"Registro Anestesia"**

---

## PASO 3 — Despliega el script como API

1. En Apps Script → botón azul **"Implementar"** → **"Nueva implementación"**
2. Haz clic en el ícono ⚙️ junto a "Tipo" → selecciona **"Aplicación web"**
3. Configura así:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
4. Clic en **"Implementar"**
5. Acepta los permisos que pida Google (es tu propio script)
6. Copia la **URL de la aplicación web** que aparece — tiene este formato:
   `https://script.google.com/macros/s/XXXXXXXX/exec`

---

## PASO 4 — Conecta la app con la hoja

1. Abre el archivo `js/config.js` con cualquier editor de texto (Bloc de notas)
2. Pega la URL entre las comillas de `SHEETS_URL`:
   ```
   SHEETS_URL: 'https://script.google.com/macros/s/TU_URL_AQUI/exec',
   ```
3. Guarda el archivo

---

## PASO 5 — Abre la app en el móvil

### Opción A — Directamente desde el ordenador (recomendada para empezar)
- Abre `index.html` con doble clic → se abre en el navegador del PC

### Opción B — En el móvil via servidor local (para uso real)
Necesitarás que un técnico publique la app en una URL accesible. 
Si tienes acceso a GitHub Pages o Netlify (gratuitos), puedes subir la carpeta.

### Opción C — GitHub Pages (gratuito, para uso real en el móvil)
1. Sube la carpeta a un repositorio GitHub
2. Ve a Settings → Pages → selecciona la rama main
3. GitHub te da una URL pública (ej: `tuusuario.github.io/anestesia`)
4. Abre esa URL en el móvil → menú del navegador → **"Añadir a pantalla de inicio"**

---

## Uso diario

- Cada vez que abres la app, la fecha y hora se rellenan automáticamente
- Rellena los campos que correspondan y pulsa **"✓ Registrar"**
- Los datos aparecen al instante en la hoja de Google Sheets
- Si no tienes internet, los datos se guardan en el móvil y se envían al reconectarte
- Pulsa **"↺ Nuevo"** para empezar un caso nuevo (se limpia el formulario)

---

## ¿Qué datos se recogen?

| Campo | Descripción |
|-------|-------------|
| Nº Caso | Auto-incremental |
| Fecha / Hora | Auto-rellenados |
| Duración | Calculada automáticamente |
| Paciente | Edad, sexo, peso, talla, IMC, ASA, alergias |
| Intervención | Especialidad, procedimiento, urgencia, posición |
| Tipo anestesia | AG inhalatoria / TIVA / balanceada, AR espinal / epidural / CSE / bloqueo, Sedación |
| Vía aérea | Dispositivo, técnica, intentos, Cormack-Lehane, VAD |
| Fármacos | Inducción, opioides, relajantes, mantenimiento, AL, reversores, coadyuvantes, vasoactivos (con dosis) |
| Monitorización | BIS, TOF, arterial invasiva, CVC, ETE, NIRS... |
| Complicaciones | Lista completa (hemodinámicas, respiratorias, metabólicas, etc.) |
| Destino | URPA / UCI / Planta / Domicilio |
| Notas | Texto libre |

---

## Soporte

Si algo no funciona, revisa:
1. Que la URL en `config.js` sea correcta
2. Que el script esté desplegado con acceso "Cualquier usuario"
3. Que hayas aceptado los permisos de Google
