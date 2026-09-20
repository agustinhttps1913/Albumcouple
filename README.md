# Nuestro álbum — GitHub Pages + Firebase + Cloudinary

La web está preparada para funcionar como sitio estático en GitHub Pages.

## Servicios usados

- GitHub Pages: publica la web.
- Firebase Authentication: controla el ingreso.
- Firebase Realtime Database: guarda títulos, fechas, lugares, textos y URLs.
- Cloudinary: almacena las fotos.

## Configuración ya puesta en el código

- Firebase project: `nuestro-album-fa8be`
- Usuario interno: `album@nuestroalbum.app`
- Cloudinary cloud name: `za7ctybr`
- Cloudinary upload preset: `nuestro_album`

## IMPORTANTE — contraseña del usuario Firebase

Para que la pantalla acepte `21/09/2025`, el usuario `album@nuestroalbum.app` en Firebase Authentication debe tener exactamente esta contraseña:

`21/09/2025`

Ruta aproximada:

Firebase Console → Authentication → Usuarios → `album@nuestroalbum.app` → editar/restablecer contraseña.

La fecha NO está guardada en el JavaScript: se envía a Firebase Authentication como contraseña cuando ustedes la escriben.

## Reglas recomendadas de Realtime Database

Usá el UID real del usuario `album@nuestroalbum.app`:

```json
{
  "rules": {
    ".read": "auth != null && auth.uid === 'TU_UID_REAL'",
    ".write": "auth != null && auth.uid === 'TU_UID_REAL'"
  }
}
```

## Cloudinary

El preset `nuestro_album` debe estar en modo **Unsigned**.

Conviene limitar ese preset desde Cloudinary a:

- Solo imágenes.
- Tamaño máximo razonable (por ejemplo, 10 MB).
- Carpeta/Asset folder: `nuestro-album`.

Los presets Unsigned son visibles desde una web pública, por lo que no deben contener configuraciones sensibles.

## Subir a GitHub Pages

1. Creá un repositorio, por ejemplo `nuestro-album`.
2. Subí estos archivos directamente en la raíz:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
3. En GitHub: Settings → Pages.
4. Source: Deploy from a branch.
5. Branch: `main` / `(root)`.
6. Guardá.

La dirección quedará similar a:

`https://TU-USUARIO.github.io/nuestro-album/`

## Autorizar GitHub Pages en Firebase

Cuando sepas tu dominio final, entrá a:

Firebase → Authentication → Settings → Authorized domains

y agregá:

`TU-USUARIO.github.io`

No agregues `https://` ni la ruta `/nuestro-album`.

## Nota sobre borrar recuerdos

El botón "Eliminar del álbum" borra el registro de Firebase. Por seguridad, una web estática no puede usar el API Secret de Cloudinary para destruir archivos, así que la foto puede seguir guardada en Cloudinary y ocupar espacio. Si necesitás borrarla definitivamente, hacelo desde Cloudinary Media Library.

## Archivos

No hace falta instalar Node, npm ni compilar nada. Es HTML/CSS/JS listo para GitHub Pages.
