"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import type { RecommendationResponse } from "@/types/travel";
import type { TravelCountryRecord } from "@/hooks/use-travel-countries";
import styles from "./recommendation-map.module.css";

const TILE_SIZE = 256;
const MIN_ZOOM = 0;
const MAX_ZOOM = 18;

type View = { latitude: number; longitude: number; zoom: number };
type Size = { width: number; height: number };
type Point = { x: number; y: number };

function placeLabel(city: string, state: string, country: string) {
  const parts = [city, state, country].map(part => part.trim()).filter(Boolean);
  return parts.filter((part, index) =>
    parts.findIndex(value => value.toLocaleLowerCase() === part.toLocaleLowerCase()) === index
  ).join(", ");
}

function nightlyPrice(accommodationCost: number, nights: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(accommodationCost / Math.max(1, nights));
}

function project(latitude: number, longitude: number, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
  const sin = Math.sin(safeLatitude * Math.PI / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(point: Point, zoom: number): Pick<View, "latitude" | "longitude"> {
  const scale = TILE_SIZE * 2 ** zoom;
  const n = Math.PI - 2 * Math.PI * point.y / scale;
  return {
    latitude: 180 / Math.PI * Math.atan(Math.sinh(n)),
    longitude: point.x / scale * 360 - 180,
  };
}

function fitView(points: { latitude: number; longitude: number }[], size: Size): View {
  const longitudes = points.map(point => point.longitude);
  const latitudes = points.map(point => point.latitude);
  const bounds = {
    west: Math.min(...longitudes), east: Math.max(...longitudes),
    south: Math.min(...latitudes), north: Math.max(...latitudes),
  };
  for (let zoom = 15; zoom >= MIN_ZOOM; zoom -= 1) {
    const a = project(bounds.north, bounds.west, zoom);
    const b = project(bounds.south, bounds.east, zoom);
    if (b.x - a.x <= Math.max(150, size.width - 130) &&
        b.y - a.y <= Math.max(150, size.height - 130)) {
      return { ...unproject({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, zoom), zoom };
    }
  }
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.west + bounds.east) / 2,
    zoom: MIN_ZOOM,
  };
}

export function RecommendationMap({
  recommendations,
  onOpen,
}: {
  recommendations: RecommendationResponse;
  onOpen: (row: TravelCountryRecord) => void;
}) {
  const items = recommendations.top10.filter(item =>
    Number.isFinite(item.accommodation.latitude) &&
    Number.isFinite(item.accommodation.longitude));
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; center: Point } | null>(null);
  const [size, setSize] = useState<Size>({ width: 900, height: 490 });
  const [view, setView] = useState<View>({
    latitude: items[0]?.accommodation.latitude ?? 0,
    longitude: items[0]?.accommodation.longitude ?? 0,
    zoom: 3,
  });
  const [selectedRank, setSelectedRank] = useState(items[0]?.rank ?? 1);
  const [hoveredRank, setHoveredRank] = useState<number | null>(null);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rectangle = entries[0]?.contentRect;
      if (rectangle) setSize({ width: rectangle.width, height: rectangle.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const coordinatesKey = items.map(item =>
    `${item.rank}:${item.accommodation.latitude}:${item.accommodation.longitude}`).join("|");
  useEffect(() => {
    if (items.length === 0) return;
    setView(fitView(items.map(item => item.accommodation), size));
    setSelectedRank(items[0].rank);
    setHoveredRank(null);
    // Fit the points after the map has measured its actual width and height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinatesKey, size.width, size.height]);

  const center = project(view.latitude, view.longitude, view.zoom);
  const topLeft = { x: center.x - size.width / 2, y: center.y - size.height / 2 };
  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  const tileCount = 2 ** view.zoom;
  const firstX = Math.floor(topLeft.x / TILE_SIZE);
  const lastX = Math.floor((topLeft.x + size.width) / TILE_SIZE);
  const firstY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE));
  const lastY = Math.min(tileCount - 1, Math.floor((topLeft.y + size.height) / TILE_SIZE));
  for (let x = firstX; x <= lastX; x += 1) {
    for (let y = firstY; y <= lastY; y += 1) {
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${view.zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${view.zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - topLeft.x,
        top: y * TILE_SIZE - topLeft.y,
      });
    }
  }

  const markers = items.map(item => {
    const actual = project(item.accommodation.latitude, item.accommodation.longitude, view.zoom);
    return { item, actual: { x: actual.x - topLeft.x, y: actual.y - topLeft.y } };
  });
  const placed: Point[] = [];
  const visibleMarkers = markers.flatMap(marker => {
    const { actual } = marker;
    if (actual.x < -30 || actual.x > size.width + 30 ||
        actual.y < -30 || actual.y > size.height + 30) return [];
    let position = actual;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const radius = attempt === 0 ? 0 : 38 + Math.floor((attempt - 1) / 12) * 24;
      const angle = attempt * Math.PI * 2 / 12;
      const candidate = {
        x: Math.max(22, Math.min(size.width - 22, actual.x + Math.cos(angle) * radius)),
        y: Math.max(22, Math.min(size.height - 22, actual.y + Math.sin(angle) * radius)),
      };
      if (placed.every(previous => Math.hypot(previous.x - candidate.x, previous.y - candidate.y) >= 43)) {
        position = candidate;
        break;
      }
    }
    placed.push(position);
    return [{ ...marker, position }];
  });

  const selected = items.find(item => item.rank === selectedRank) ?? items[0];
  if (!selected) return null;
  const displayed = items.find(item => item.rank === hoveredRank) ?? selected;
  const previewMarker = visibleMarkers.find(marker => marker.item.rank === displayed.rank);

  function focus(rank: number) {
    const target = items.find(item => item.rank === rank);
    if (!target) return;
    setSelectedRank(rank);
    setHoveredRank(null);
    setView({
      latitude: target.accommodation.latitude,
      longitude: target.accommodation.longitude,
      zoom: 16,
    });
  }

  function changeZoom(delta: number) {
    setView(current => ({
      ...current,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom + delta)),
    }));
  }

  function openSelected() {
    const accommodation = displayed.accommodation;
    onOpen({
      destination_id: accommodation.id,
      origin_country: "", origin_state: "", origin_city: "",
      city_town: accommodation.city, state_region: accommodation.state,
      country: accommodation.country, pricing_type: "recommendation",
      latitude: String(accommodation.latitude),
      longitude: String(accommodation.longitude),
    });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, center };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { x, y, center: startCenter } = dragRef.current;
    setView(current => ({ ...current, ...unproject({
      x: startCenter.x - (event.clientX - x),
      y: startCenter.y - (event.clientY - y),
    }, current.zoom) }));
  }

  return (
    <section className={styles.panel} aria-labelledby="recommendation-map-title">
      <div className={styles.header}>
        <div>
          <h2 id="recommendation-map-title">Recommendation map</h2>
          <p>Choose a recommendation to zoom to its exact accommodation coordinates. Drag the map to explore.</p>
        </div>
        <span className={styles.mapBadge}>Latitude and longitude · {items.length} locations</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapColumn}>
          <div
            ref={mapRef}
            className={styles.map}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
            aria-label="Interactive map of recommended accommodations"
          >
            {tiles.map(tile => (
              <div
                key={tile.key}
                className={styles.tile}
                style={{ left: tile.left, top: tile.top, backgroundImage: `url(${tile.url})` }}
              />
            ))}
            <svg className={styles.connections} aria-hidden="true">
              {visibleMarkers.map(({ item, actual, position }) =>
                Math.hypot(actual.x - position.x, actual.y - position.y) > 5 ? (
                  <g key={item.rank}>
                    <line x1={actual.x} y1={actual.y}
                      x2={position.x} y2={position.y} />
                    <circle cx={actual.x} cy={actual.y} r="4" />
                  </g>
                ) : null)}
            </svg>
            {visibleMarkers.map(({ item, position }) => (
              <button
                key={item.rank}
                type="button"
                className={`${styles.marker} ${displayed.rank === item.rank ? styles.markerSelected : ""}`}
                style={{ left: position.x, top: position.y }}
                onPointerDown={event => event.stopPropagation()}
                onMouseEnter={() => setHoveredRank(item.rank)}
                onMouseLeave={() => setHoveredRank(null)}
                onFocus={() => setHoveredRank(item.rank)}
                onBlur={() => setHoveredRank(null)}
                onClick={() => focus(item.rank)}
                aria-label={`Zoom to recommendation ${item.rank}: ${item.accommodation.name}, ${placeLabel(item.accommodation.city, item.accommodation.state, item.accommodation.country)}, ${nightlyPrice(item.accommodationCost, item.nights)} per night`}
              >{item.rank}</button>
            ))}
            {previewMarker && (
              <div
                className={styles.markerPreview}
                style={{
                  left: Math.max(120, Math.min(size.width - 120, previewMarker.position.x)),
                  top: previewMarker.position.y > size.height - 120
                    ? previewMarker.position.y - 110
                    : previewMarker.position.y + 27,
                }}
                aria-hidden="true"
              >
                <strong>{displayed.accommodation.name}</strong>
                <small>{placeLabel(displayed.accommodation.city, displayed.accommodation.state, displayed.accommodation.country)}</small>
                <b>{nightlyPrice(displayed.accommodationCost, displayed.nights)} / night</b>
              </div>
            )}
            <div className={styles.mapControls} onPointerDown={event => event.stopPropagation()}>
              <button type="button" onClick={() => changeZoom(1)} aria-label="Zoom in"><Plus size={17} /></button>
              <button type="button" onClick={() => changeZoom(-1)} aria-label="Zoom out"><Minus size={17} /></button>
              <button type="button" onClick={() => setView(fitView(items.map(item => item.accommodation), size))}
                aria-label="Show all recommendations"><RotateCcw size={16} /></button>
            </div>
            <a className={styles.attribution} href="https://www.openstreetmap.org/copyright"
              target="_blank" rel="noreferrer" onPointerDown={event => event.stopPropagation()}>
              © OpenStreetMap contributors
            </a>
          </div>
          <div className={styles.selectedPlace}>
            <div>
              <strong>#{displayed.rank} · {displayed.accommodation.name}</strong>
              <span>{placeLabel(displayed.accommodation.city, displayed.accommodation.state, displayed.accommodation.country)}</span>
              <span>{nightlyPrice(displayed.accommodationCost, displayed.nights)} / night</span>
              <code>{displayed.accommodation.latitude.toFixed(6)}, {displayed.accommodation.longitude.toFixed(6)}</code>
            </div>
            <button type="button" onClick={openSelected}>View details</button>
          </div>
        </div>
        <ol className={styles.placeList} aria-label="Recommended map locations">
          {items.map(item => (
            <li key={item.rank}>
              <button type="button" onClick={() => focus(item.rank)}
                onMouseEnter={() => setHoveredRank(item.rank)}
                onMouseLeave={() => setHoveredRank(null)}
                onFocus={() => setHoveredRank(item.rank)}
                onBlur={() => setHoveredRank(null)}
                className={displayed.rank === item.rank ? styles.placeSelected : ""}
                aria-current={selected.rank === item.rank ? "location" : undefined}>
                <span className={styles.placeRank}>{item.rank}</span>
                <span className={styles.placeInfo}>
                  <strong>{item.accommodation.name}</strong>
                  <small>{placeLabel(item.accommodation.city, item.accommodation.state, item.accommodation.country)}</small>
                </span>
                <span className={styles.placePrice}>{nightlyPrice(item.accommodationCost, item.nights)}<small>/night</small></span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
