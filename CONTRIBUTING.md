# Guía de Contribución - SAGIM

## Configuración del Entorno

### Requisitos Previos

- **Node.js** >= 20.x
- **Rust** >= 1.70 (para Tauri)
- **npm** >= 10.x

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd sagim-app

# Instalar dependencias
npm install --legacy-peer-deps

# Ejecutar en desarrollo
npm run tauri dev
```

## Scripts Disponibles

### Desarrollo
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run tauri dev` | App Tauri en modo desarrollo |
| `npm run build` | Build de producción (frontend) |
| `npm run tauri build` | Build de producción (app completa) |

### Testing
| Comando | Descripción |
|---------|-------------|
| `npm run test` | Tests unitarios en modo watch |
| `npm run test:run` | Tests unitarios (una vez) |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run test:ui` | UI interactiva de Vitest |
| `npm run test:e2e` | Tests E2E con Playwright |
| `npm run test:e2e:ui` | Tests E2E con UI de Playwright |

### Calidad de Código
| Comando | Descripción |
|---------|-------------|
| `npm run lint` | Ejecutar ESLint |
| `npm run lint:fix` | ESLint con auto-fix |
| `npm run format` | Formatear con Prettier |
| `npm run format:check` | Verificar formato |
| `npm run audit` | Auditoría de seguridad |

## Flujo de Trabajo

### Antes de Commitear

Los pre-commit hooks (Husky + lint-staged) ejecutan automáticamente:
- ESLint con auto-fix
- Prettier para formateo

### Crear un Pull Request

1. Crear branch desde `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/mi-feature
   ```

2. Hacer cambios y commitear:
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   ```

3. Ejecutar tests antes de push:
   ```bash
   npm run test:run
   npm run lint
   ```

4. Push y crear PR hacia `develop`

### Convención de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `style:` Formato (no afecta lógica)
- `refactor:` Refactorización
- `test:` Agregar/modificar tests
- `chore:` Tareas de mantenimiento

Ejemplos:
```
feat: agregar exportación de clientes a Excel
fix: corregir cálculo de vencimientos
docs: actualizar README con instrucciones de instalación
```

## Estructura del Proyecto

```
sagim-app/
├── src/                    # Código fuente React/TypeScript
│   ├── components/         # Componentes React
│   │   ├── shared/         # Componentes reutilizables
│   │   └── ui/             # Componentes UI base (shadcn)
│   ├── db/                 # Capa de base de datos
│   │   ├── queries/        # Queries SQLite
│   │   └── schema/         # Definiciones de esquema
│   ├── lib/                # Utilidades
│   ├── pages/              # Páginas/Módulos
│   └── test/               # Configuración de tests
├── src-tauri/              # Código Rust de Tauri
├── e2e/                    # Tests E2E (Playwright)
├── .github/workflows/      # GitHub Actions
└── public/                 # Assets estáticos
```

## Testing

### Tests Unitarios (Vitest)

Los tests se ubican junto al código que prueban:
```
src/lib/utils.ts        → src/lib/utils.test.ts
src/db/queries/clientes.ts → src/db/queries/clientes.test.ts
```

Ejemplo de test:
```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    const result = formatCurrency(50000);
    expect(result).toContain('50');
  });
});
```

### Mocks de Tauri

Los mocks de APIs de Tauri están en `src/test/setup.ts`. 
Si necesitas mockear nuevas APIs, agrégalas ahí.

### Tests de Componentes

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

it('renders button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

## Seguridad

### SQL Injection

El proyecto usa **prepared statements** (`$1, $2, ...`) para todos los queries.
Nunca concatenes strings directamente en queries SQL.

```typescript
// ✅ Correcto
await dbSelect("SELECT * FROM clientes WHERE cedula = $1", [cedula]);

// ❌ Incorrecto - NUNCA hacer esto
await dbSelect(`SELECT * FROM clientes WHERE cedula = '${cedula}'`);
```

### Validación de Inputs

Usa las utilidades de `src/lib/validation.ts`:

```typescript
import { sanitizeCedula, validateOrderBy } from '@/lib/validation';

const cedula = sanitizeCedula(userInput);
const orderBy = validateOrderBy(input, ['nombre', 'fecha'], 'nombre');
```

## CI/CD

### GitHub Actions

- **CI** (`ci.yml`): Se ejecuta en cada push/PR
  - Lint, Tests, TypeScript check
  - Build frontend y Tauri (macOS + Windows)

- **Release** (`release.yml`): Se ejecuta con tags `v*`
  - Crea release en GitHub
  - Sube instaladores para todas las plataformas

- **Security** (`security.yml`): Semanal + cambios en deps
  - npm audit
  - cargo audit

### Crear un Release

```bash
# Actualizar versión en package.json y tauri.conf.json
npm version patch  # o minor, major

# Crear tag y push
git tag v1.0.9
git push origin v1.0.9
```

## Solución de Problemas

### Error de dependencias

```bash
npm install --legacy-peer-deps
```

### Tests fallan por Tauri APIs

Verifica que los mocks estén configurados en `src/test/setup.ts`.

### Build de Tauri falla

```bash
# Verificar Rust está instalado
rustc --version

# Limpiar y rebuildir
cd src-tauri
cargo clean
cd ..
npm run tauri build
```

## Recursos

- [Tauri v2 Docs](https://v2.tauri.app/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
