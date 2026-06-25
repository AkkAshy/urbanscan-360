# Гео-VR пространство — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VR-комната, где папки объектов расставлены по реальному географическому азимуту от офиса заказчика; клик по папке открывает её 360-тур.

**Architecture:** Новая страница `/geo` переиспользует существующий `AFrameScene` (с нейтральным небом в гео-режиме) + новый `GeoVRRoom` ставит папки на `yaw = bearing(офис→объект)` вокруг камеры. Клик грузит фото папки и переключает сцену в 360-тур (тот же `AFrameScene` + `LinkArrows`/`VRMenu`). Азимут/дистанция считаются на фронте новым util `geo.ts`.

**Tech Stack:** React 19 + Vite 7 + TypeScript + A-Frame 1.7, zustand, vitest. Ветка от `main`.

**Дизайн-решения:** точка отсчёта — константа `OFFICE_COORDS` (офис заказчика, placeholder Нукус, Канат заменит). Вход в immersive — через кнопку VR от A-Frame (браузерное ограничение). Десктоп работает с мышью (папки видны в сцене).

---

## File Structure

**Создаём:**
- `frontend/src/utils/geo.ts` — `bearing()`, `haversineKm()`, тип `LatLon`
- `frontend/src/utils/geo.test.ts` — vitest
- `frontend/src/config/office.ts` — `OFFICE_COORDS`, `OFFICE_NAME`
- `frontend/src/components/viewer/GeoVRRoom.tsx` — in-scene папки по азимутам
- `frontend/src/pages/GeoVRPage.tsx` — страница: гео-режим ↔ 360-тур

**Меняем:**
- `frontend/src/components/viewer/AFrameScene.tsx` — нейтральное небо при пустом `photoUrl`
- `frontend/src/App.tsx` — роут `/geo`
- `frontend/src/components/layout/Navbar.tsx` — ссылка «Гео-VR»

---

## Phase 1 — Геометрия (util) + офис

### Task 1: util geo.ts (TDD)

**Files:**
- Create: `frontend/src/utils/geo.ts`
- Test: `frontend/src/utils/geo.test.ts`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/utils/geo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bearing, haversineKm } from "./geo";

describe("bearing", () => {
  it("строго на север → 0°", () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0, 0);
  });
  it("строго на восток → 90°", () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 0);
  });
  it("Нукус → Ташкент ≈ 96° (почти восток)", () => {
    const b = bearing({ lat: 42.4731, lon: 59.6103 }, { lat: 41.3111, lon: 69.2797 });
    expect(b).toBeGreaterThan(90);
    expect(b).toBeLessThan(102);
  });
  it("всегда в диапазоне 0..360", () => {
    const b = bearing({ lat: 42, lon: 60 }, { lat: 50, lon: 40 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("haversineKm", () => {
  it("1° долготы на экваторе ≈ 111 км", () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111, 0);
  });
  it("Нукус → Ташкент ≈ 740 км", () => {
    const d = haversineKm({ lat: 42.4731, lon: 59.6103 }, { lat: 41.3111, lon: 69.2797 });
    expect(d).toBeGreaterThan(690);
    expect(d).toBeLessThan(790);
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `cd frontend && pnpm test`
Expected: FAIL — `bearing is not a function`.

- [ ] **Step 3: Реализовать util**

`frontend/src/utils/geo.ts`:

```ts
/** Географическая точка. */
export interface LatLon {
  lat: number;
  lon: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;

/**
 * Азимут (начальный) от точки `from` к `to`, градусы 0..360.
 * 0 = север, 90 = восток. Формула портирована из backend (calculate_bearing).
 */
export function bearing(from: LatLon, to: LatLon): number {
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const deg = Math.atan2(y, x) * (180 / Math.PI);
  return (deg + 360) % 360;
}

/** Расстояние между точками в километрах (haversine). */
export function haversineKm(from: LatLon, to: LatLon): number {
  const R = 6371;
  const dPhi = toRad(to.lat - from.lat);
  const dLambda = toRad(to.lon - from.lon);
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

Run: `cd frontend && pnpm test`
Expected: PASS — geo + sphere + store тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/geo.ts frontend/src/utils/geo.test.ts
git commit -m "feat: add geo util (bearing + haversine distance)"
```

---

### Task 2: Константа офиса

**Files:**
- Create: `frontend/src/config/office.ts`

- [ ] **Step 1: Создать office.ts**

`frontend/src/config/office.ts`:

```ts
import type { LatLon } from "../utils/geo";

/**
 * Точка отсчёта гео-VR пространства — офис компании-заказчика.
 * TODO(Канат): заменить на реальные координаты офиса.
 * Сейчас — placeholder (Нукус).
 */
export const OFFICE_COORDS: LatLon = { lat: 42.4731, lon: 59.6103 };
export const OFFICE_NAME = "Офис (Нукус)";
```

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && pnpm build`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/config/office.ts
git commit -m "feat: add office coords constant for geo-vr"
```

---

## Phase 2 — Нейтральное небо + комната

### Task 3: AFrameScene — нейтральное небо при пустом photoUrl

В гео-режиме нет фото-панорамы; небо должно быть однотонным. Сейчас `<a-sky src>` всегда ждёт картинку.

**Files:**
- Modify: `frontend/src/components/viewer/AFrameScene.tsx`

- [ ] **Step 1: При создании sky — цвет, если нет photoUrl**

В `AFrameScene.tsx`, в первом `useEffect`, блок создания `sky` (где `sky.setAttribute("src", photoUrl)`) заменить:

```ts
    const sky = document.createElement("a-sky");
    sky.setAttribute("id", "photo-sky");
    sky.setAttribute("src", photoUrl);
    sky.setAttribute("rotation", "0 0 0");
```

на:

```ts
    const sky = document.createElement("a-sky");
    sky.setAttribute("id", "photo-sky");
    if (photoUrl) {
      sky.setAttribute("src", photoUrl);
    } else {
      sky.setAttribute("color", "#0b1020");
    }
    sky.setAttribute("rotation", "0 0 0");
```

- [ ] **Step 2: Во втором useEffect — переключение фото/цвета**

В `AFrameScene.tsx`, второй `useEffect` (смена `photoUrl`), внутри `setTimeout` строку `sky.setAttribute("src", photoUrl);` заменить:

```ts
      sky.setAttribute("src", photoUrl);
```

на:

```ts
      if (photoUrl) {
        sky.removeAttribute("color");
        sky.setAttribute("src", photoUrl);
      } else {
        sky.removeAttribute("src");
        sky.setAttribute("color", "#0b1020");
      }
```

Также в начале этого useEffect guard `if (!sky || !photoUrl) return;` заменить на `if (!sky) return;` (чтобы переход в гео-режим тоже обрабатывался):

```ts
    if (!sky) return;
```

- [ ] **Step 3: Проверить сборку + тесты**

Run: `cd frontend && pnpm build && pnpm test`
Expected: build чистый, тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/viewer/AFrameScene.tsx
git commit -m "feat: neutral sky in AFrameScene when no photoUrl"
```

---

### Task 4: GeoVRRoom — папки по азимутам

**Files:**
- Create: `frontend/src/components/viewer/GeoVRRoom.tsx`

- [ ] **Step 1: Создать GeoVRRoom.tsx**

`frontend/src/components/viewer/GeoVRRoom.tsx`:

```tsx
import { useEffect } from "react";
import { OFFICE_COORDS } from "../../config/office";
import { bearing, haversineKm } from "../../utils/geo";
import { yawPitchToXyz } from "../../utils/sphere";
import type { FolderMapPoint } from "../../types";

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  folders: FolderMapPoint[];
  onSelect: (folder: FolderMapPoint) => void;
}

const ROOM_RADIUS = 6;
const EYE_LEVEL = 1.6;

/**
 * In-scene «гео-комната»: для каждой папки с GPS ставит карточку на азимуте
 * bearing(офис → объект) вокруг камеры. Клик/луч → onSelect.
 */
export function GeoVRRoom({ sceneRef, folders, onSelect }: Props) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const container = document.createElement("a-entity");
    scene.appendChild(container);

    const withGps = folders.filter(
      (f) => f.latitude != null && f.longitude != null
    );

    if (withGps.length === 0) {
      const empty = document.createElement("a-text");
      empty.setAttribute("value", "Нет объектов с GPS");
      empty.setAttribute("align", "center");
      empty.setAttribute("color", "#FFFFFF");
      empty.setAttribute("width", "4");
      empty.setAttribute("position", `0 ${EYE_LEVEL} -${ROOM_RADIUS}`);
      container.appendChild(empty);
    }

    withGps.forEach((f) => {
      const target = { lat: f.latitude, lon: f.longitude };
      const az = bearing(OFFICE_COORDS, target);
      const dist = haversineKm(OFFICE_COORDS, target);
      const { x, y, z } = yawPitchToXyz(az, 0, ROOM_RADIUS);

      const card = document.createElement("a-entity");
      card.setAttribute("position", `${x} ${EYE_LEVEL + y} ${z}`);
      card.setAttribute("look-at", "[camera]");
      card.classList.add("clickable");

      const plane = document.createElement("a-plane");
      plane.setAttribute("width", "1.6");
      plane.setAttribute("height", "1.1");
      plane.setAttribute("color", "#1e3a8a");
      plane.setAttribute("material", "shader: flat; opacity: 0.9");
      plane.classList.add("clickable");
      card.appendChild(plane);

      const label = document.createElement("a-text");
      label.setAttribute("value", `${f.name}\n${Math.round(dist)} км`);
      label.setAttribute("align", "center");
      label.setAttribute("color", "#FFFFFF");
      label.setAttribute("width", "3.2");
      label.setAttribute("position", "0 0 0.02");
      card.appendChild(label);

      card.addEventListener("click", () => onSelect(f));
      container.appendChild(card);
    });

    return () => {
      container.parentNode?.removeChild(container);
    };
  }, [sceneRef, folders, onSelect]);

  return null;
}
```

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && pnpm build`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/viewer/GeoVRRoom.tsx
git commit -m "feat: GeoVRRoom places folders by real bearing"
```

---

## Phase 3 — Страница + навигация

### Task 5: GeoVRPage (гео-режим ↔ 360-тур)

**Files:**
- Create: `frontend/src/pages/GeoVRPage.tsx`

- [ ] **Step 1: Создать GeoVRPage.tsx**

`frontend/src/pages/GeoVRPage.tsx`:

```tsx
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFolderMapPoints } from "../api/folders";
import { getViewerPhotos } from "../api/photos";
import { mediaUrl } from "../api/client";
import type { FolderMapPoint } from "../types";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { GeoVRRoom } from "../components/viewer/GeoVRRoom";
import { LinkArrows } from "../components/viewer/LinkArrows";
import { VRMenu } from "../components/viewer/vr/VRMenu";

/**
 * Гео-VR пространство: гео-режим (папки по азимутам) ↔ 360-тур выбранной папки.
 * tourUrl === "" → гео-режим; иначе показываем 360-тур.
 */
export function GeoVRPage() {
  const [folders, setFolders] = useState<FolderMapPoint[]>([]);
  const [tourUrl, setTourUrl] = useState("");
  const sceneRef = useRef<HTMLElement | null>(null);
  const {
    photos: viewerPhotos,
    currentIndex,
    links,
    vrActive,
    setPhotos: setViewerPhotos,
    goToId,
  } = useViewerStore();
  const currentViewerPhoto = viewerPhotos[currentIndex] ?? null;

  useEffect(() => {
    getFolderMapPoints().then(setFolders).catch(() => setFolders([]));
  }, []);

  // Клик по папке в гео-комнате → грузим её фото → в 360-тур
  const handleSelect = useCallback(
    async (folder: FolderMapPoint) => {
      try {
        const photos = await getViewerPhotos(folder.id);
        if (photos.length === 0) return;
        const viewerData = photos.map((p) => ({
          id: p.id,
          title: p.title,
          image: mediaUrl(p.image),
          thumbnail: p.thumbnail,
          preview: p.preview ? mediaUrl(p.preview) : null,
          shot_date: p.shot_date,
          latitude: p.latitude,
          longitude: p.longitude,
        }));
        setViewerPhotos(viewerData, folder.id);
        useViewerStore.getState().goTo(0);
        const first = viewerData[0];
        setTourUrl(mediaUrl(first.preview || first.image));
      } catch (err) {
        console.error("Гео-VR: не удалось открыть тур:", err);
      }
    },
    [setViewerPhotos]
  );

  const backToGeo = useCallback(() => setTourUrl(""), []);

  return (
    <AppLayout>
      <div className="fixed inset-0 z-[60] bg-black">
        <AFrameScene photoUrl={tourUrl} sceneRef={sceneRef} onExit={backToGeo} />

        {/* Гео-режим: комната с папками по азимутам */}
        {tourUrl === "" && (
          <GeoVRRoom sceneRef={sceneRef} folders={folders} onSelect={handleSelect} />
        )}

        {/* 360-тур: стрелки-хотспоты + VR-меню */}
        {tourUrl !== "" && currentViewerPhoto && (
          <>
            <LinkArrows
              sceneRef={sceneRef}
              links={links}
              onNavigate={(id) => goToId(id)}
            />
            {vrActive && <VRMenu sceneRef={sceneRef} />}
          </>
        )}

        {/* HTML-кнопка «назад в гео» (десктоп; в VR — кнопка B / Выход) */}
        {!vrActive && tourUrl !== "" && (
          <button
            onClick={backToGeo}
            className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            К карте объектов
          </button>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && pnpm build`
Expected: без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/GeoVRPage.tsx
git commit -m "feat: GeoVRPage — geo room <-> 360 tour"
```

---

### Task 6: Роут /geo + ссылка в навбаре

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Роут в App.tsx**

В `App.tsx` добавить импорт после `import { MapPage } ...`:

```ts
import { GeoVRPage } from "./pages/GeoVRPage";
```

И добавить роут перед `{/* Редирект ... */}`:

```tsx
        <Route
          path="/geo"
          element={
            <ProtectedRoute>
              <GeoVRPage />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 2: Ссылка в Navbar.tsx**

В `Navbar.tsx` импорт иконки — заменить строку импорта:

```ts
import { LogOut, Map, Upload, Users } from "lucide-react";
```

на:

```ts
import { Globe, LogOut, Map, Upload, Users } from "lucide-react";
```

И в массив `links` добавить пункт (после `/map`):

```ts
    { to: "/geo", label: "Гео-VR", icon: Globe },
```

- [ ] **Step 3: Проверить сборку**

Run: `cd frontend && pnpm build`
Expected: без ошибок.

- [ ] **Step 4: Ручная проверка (desktop)**

Run: `cd frontend && pnpm dev` (нужен бэк/прод). Залогиниться → навбар «Гео-VR» → открывается тёмная сцена, по сторонам карточки папок с названием и расстоянием (мышью можно осмотреться, перетягивая). Клик по карточке → открывается 360-тур; «К карте объектов» → назад в гео.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Navbar.tsx
git commit -m "feat: /geo route + navbar link"
```

> **Веха:** гео-VR пространство работает на десктопе (мышь) и в VR (Enter VR → осмотр головой → клик лучом).

---

## Phase 4 — Полировка + деплой

### Task 7: Прогон, деплой, проверка на Quest

**Files:** (без изменений кода; верификация + деплой)

- [ ] **Step 1: Полный прогон**

Run: `cd frontend && pnpm test && pnpm build`
Expected: тесты зелёные (geo + sphere + store), build успешен.

- [ ] **Step 2: Проверка в Chrome (desktop + Immersive Web Emulator)**

`pnpm dev` (или после деплоя — прод). Чек-лист: навбар «Гео-VR» → карточки папок в направлениях (азимут совпадает с реальной географией) · клик → 360-тур · назад в гео · Enter VR (эмулятор) → осмотр головой, клик лучом.

- [ ] **Step 3: Деплой на Vercel**

```bash
cd frontend && vercel --prod
```
Expected: задеплоено на `https://urbanscan360.vercel.app`.

- [ ] **Step 4: Проверка на реальном Quest 3**

В браузере Quest открыть `urbanscan360.vercel.app` → «Гео-VR» → Enter VR → надеть шлем → вокруг папки по сторонам света → посмотреть на объект → клик лучом → 360-тур → B / Выход → назад.
Expected: гео-пространство работает на железе.

- [ ] **Step 5: Записать в канал + Obsidian**

Отчёт в `vps_prod:/root/kanat/claude-comms/urbanscan-360/` + обновить `~/Projects/Obsidian/UrbanScan/urbanscan-360/Фронтенд.md` (новая страница GeoVRPage, geo util) и снять задачу в `Задачи/Текущие задачи.md`.

---

## Self-Review

**Spec coverage:**
- Папки по азимуту от офиса → Task 1 (bearing), Task 2 (офис), Task 4 (GeoVRRoom) ✅
- Подпись название + расстояние → Task 4 (haversineKm + label) ✅
- Клик → 360-тур → Task 5 (handleSelect → setTourUrl) ✅
- Нейтральное окружение гео-режима → Task 3 ✅
- Вход через кнопку (десктоп + VR) → Task 5/6 (страница + навбар; Enter VR от A-Frame) ✅
- Переиспользование (Folder lat/lon, getFolderMapPoints, AFrameScene, getViewerPhotos, viewerStore, LinkArrows, VRMenu, yawPitchToXyz) ✅
- TDD geo, ручная верификация VR → Task 1 + Task 7 ✅

**Placeholder scan:** код полный в каждом шаге; единственный TODO — реальные координаты офиса в `office.ts` (осознанно, ждём от Каната, placeholder рабочий).

**Type consistency:** `LatLon {lat,lon}`, `bearing(LatLon,LatLon)→number`, `haversineKm(LatLon,LatLon)→number`, `yawPitchToXyz(yaw,pitch,radius)→{x,y,z}` (из sphere.ts), `FolderMapPoint {id,name,latitude,longitude,photo_count}`, `getViewerPhotos(id)→PhotoViewer[]` с `preview`. Согласовано.

**Заметки:** `LinkArrows` в туре без `editMode`/`onDeleteLink` — в гео-туре только навигация (создание связей остаётся на `/upload`), это осознанно. `VRMenu` переиспользуется как есть; его кнопки next/prev/Связи работают и тут.
