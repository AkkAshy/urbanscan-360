# Многоэтажность (несколько планов этажей на объект) — дизайн

**Дата:** 2026-07-03
**Статус:** утверждён (Канат, 2026-07-03)
**Контекст:** продолжает фичу [[План этажа]] (`2026-07-03 — фронт плана этажа`). Было — один план на папку; стало — 1+ этажей на объект.

## Проблема
Один объект (`Folder`) = здание, у которого может быть несколько этажей. Текущая модель `Folder.floor_plan` (один `ImageField`) + `Photo.map_x/map_y` держит ровно один план. Нужно: несколько планов-этажей на папку, каждое фото на конкретном этаже + координаты на нём, переключатель этажей в редакторе и в мини-карте тура.

## Модель данных

### Новая модель `FloorPlan` (app `folders`)
| Поле | Тип | Заметки |
|------|-----|---------|
| `folder` | FK → Folder | `related_name="floor_plans"`, `on_delete=CASCADE` |
| `image` | ImageField(`upload_to="floor_plans/"`) | картинка плана |
| `name` | CharField(max_length=100) | «Подвал», «1 этаж», «Кровля» |
| `order` | PositiveIntegerField(default=0) | сортировка |
| `created_at` | DateTimeField(auto_now_add) | |

`Meta.ordering = ["order", "id"]`.

### `Photo` — новое поле
- `floor` FK → FloorPlan, `null=True, blank=True, on_delete=SET_NULL, related_name="photos"`. Фото живёт ровно на одном этаже (или ни на одном = не размещено).
- `map_x/map_y` остаются — координаты 0..1 на плане назначенного этажа.

### `Folder.floor_plan` — УДАЛЯЕТСЯ
После data-миграции поле убирается совсем (владеем всем стеком).

## Миграции (порядок критичен, прод не ломаем)
1. `folders 0004`: создать модель `FloorPlan`.
2. `photos 0006`: добавить `Photo.floor` (FK, nullable).
3. **data-миграция** (`folders 0005`, зависит от photos 0006): для каждой папки с непустым `floor_plan` → создать `FloorPlan(folder, image=floor_plan, name="1 этаж", order=0)`; всем `Photo` этой папки с `map_x/map_y != null` проставить `floor` = созданный этаж. Обратная миграция — no-op (данные не теряем при откате назад к 0004, но floor_plan уже удалён на шаге 4).
4. `folders 0006`: удалить поле `Folder.floor_plan`.

> Файлы картинок в `media/floor_plans/` не трогаем — `FloorPlan.image` ссылается на тот же путь, что был у `folder.floor_plan`.

## API
- **`FloorPlanSerializer`**: `id, folder, image, name, order`.
- **`FolderSerializer`**: убрать `floor_plan`, добавить вложенный read-only `floor_plans` (список, сортирован по order). Отдаётся в `GET /folders/` и `GET /folders/{id}/`.
- **Эндпоинты этажей** (паттерн как у photos):
  - `GET/POST /folders/{id}/floor-plans/` — список / создать (multipart: image, name, order).
  - `GET/PATCH/DELETE /floor-plans/{id}/` — деталь / переименовать-переставить-заменить картинку / удалить.
  - Permissions: create/update → `IsAuthenticated` (uploader), delete → manager+ (как у фото).
- **`PhotoSerializer` / `PhotoViewerSerializer`**: добавить `floor` (id). `PATCH /photos/{id}/` принимает `floor` + `map_x/map_y`. Валидация: `floor` (если задан) должен принадлежать той же папке, что и фото.

## Фронт (React/Vite)
### Типы
- `FloorPlan { id, image, name, order }`.
- `Folder`: убрать `floor_plan`, добавить `floor_plans: FloorPlan[]`.
- `Photo` / `PhotoViewer`: добавить `floor: number | null`.

### API-слой
- `folders.ts`: `createFloorPlan(folderId, file, name, order?)`, `updateFloorPlan(id, {name?, order?, image?})`, `deleteFloorPlan(id)`. Удалить старый `uploadFloorPlan`.
- `photos.ts`: `setPhotoPoint(photoId, floorId, x, y)` — теперь с этажом (`null` floor+coords = снять).

### `FloorPlanEditor`
- Сверху **табы этажей** + «＋ этаж» (создать), переименование (двойной клик), удаление.
- Нет этажей → зона «создать первый этаж» (загрузка картинки + имя по умолчанию «1 этаж»).
- Выбран этаж → его план + точки фото этого этажа. Список фото сбоку показывает, на каком этаже каждое (или «не размещено»).
- Клик по плану ставит выбранное фото на **текущий** этаж (`setPhotoPoint(id, floorId, x, y)`). Перенос фото на другой этаж = поставить точку на его плане. Крестик = снять (floor=null).

### `TourMinimap` / `VRMinimap`
- Принимают `floorPlans: FloorPlan[]` вместо одного плана.
- По умолчанию активный этаж = этаж текущего фото; при переходе на фото другого этажа — авто-переключение.
- Табы этажей для ручного просмотра других этажей. Точки — только текущего этажа. Тап = `goToId`.

## Что НЕ меняется
Гео-VR комната (папки по GPS), выпиленные хотспоты, линейная навигация (X/Y, лента превью).

## Тестирование
- Бэк: корректность data-миграции (папка с floor_plan → один этаж «1 этаж», фото с точками перецеплены). Валидация floor↔folder.
- Фронт: `pnpm run build` зелёный; ручной QA редактора (табы, создание/перенос) + тура (авто-переключение этажа); VR — QA на Quest.

## Риски
- Порядок миграций: удаление `floor_plan` строго ПОСЛЕ переноса данных.
- Бэк деплой на vps_prod (в git): `git pull` + `migrate` + рестарт `urbanscan-360.service`. Проверить как именно деплоится (pull vs scp) перед накатом.
- CORS для плана в VR (media cross-origin) — унаследованный вопрос из [[План этажа]], не блокирует.
