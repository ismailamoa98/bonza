// components/explore/ExploreMap.jsx — Phase 18. MapLibre GL world map (CARTO Positron) with HTML price-pin
// markers (flag + cheapest cash fare + green award-seats dot), clustered via supercluster so the world view
// stays legible; clicking a cluster zooms in. The map holds no selection state — it renders from props and
// reports hover/select up. Reduced motion skips map eases.
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import Supercluster from "supercluster";
import "maplibre-gl/dist/maplibre-gl.css";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ExploreMap({ countries, selected, hovered, onSelect, onHover }) {
  const ref = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const index = useRef(null); // supercluster
  const pins = useRef({}); // code → Marker (individual price pins currently on screen)
  const clusterMk = useRef([]); // cluster badge markers currently on screen

  // Reflect selection/hover onto whichever individual pins are on screen.
  const applyState = () => {
    for (const [code, m] of Object.entries(pins.current)) {
      const el = m.getElement();
      el.classList.toggle("is-selected", code === selected);
      el.classList.toggle("is-hovered", code === hovered);
    }
  };

  const pinEl = (c) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "bonza-pin";
    el.setAttribute("aria-label", `${c.name}, from £${c.cashFrom}`);
    el.innerHTML = `
      <span class="bonza-pin-body">
        <span class="bonza-pin-flag"><img src="https://flagcdn.com/w40/${c.code}.png" alt="" onerror="this.style.visibility='hidden'" /></span>
        <span class="bonza-pin-price">£${Number(c.cashFrom).toLocaleString()}</span>
      </span>
      ${c.awardSeatsOpen ? '<span class="bonza-pin-seats"></span>' : ""}
      <span class="bonza-pin-tail"></span>`;
    el.addEventListener("click", () => onSelect(c.code));
    el.addEventListener("mouseenter", () => onHover(c.code));
    el.addEventListener("mouseleave", () => onHover(null));
    return el;
  };

  // Recompute clusters for the current viewport and (re)render markers.
  const render = () => {
    if (!map.current || !index.current) return;
    const b = map.current.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const zoom = Math.floor(map.current.getZoom());
    const clusters = index.current.getClusters(bbox, zoom);

    Object.values(pins.current).forEach((m) => m.remove());
    pins.current = {};
    clusterMk.current.forEach((m) => m.remove());
    clusterMk.current = [];

    for (const f of clusters) {
      const [lng, lat] = f.geometry.coordinates;
      if (f.properties.cluster) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "bonza-cluster";
        el.textContent = f.properties.point_count_abbreviated ?? f.properties.point_count;
        el.addEventListener("click", () => {
          const z = index.current.getClusterExpansionZoom(f.properties.cluster_id);
          map.current.easeTo({ center: [lng, lat], zoom: Math.min(z, 6), duration: reduceMotion() ? 0 : 500 });
        });
        clusterMk.current.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map.current));
      } else {
        const c = f.properties;
        pins.current[c.code] = new maplibregl.Marker({ element: pinEl(c), anchor: "bottom" }).setLngLat([lng, lat]).addTo(map.current);
      }
    }
    applyState();
  };

  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: ref.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [10, 30],
      zoom: 1.4,
      attributionControl: true,
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current.on("load", () => {
      ready.current = true;
      map.current.resize(); // grid cell height can resolve after init — force the GL canvas to fill it
      render();
    });
    map.current.on("moveend", render);
    map.current.on("error", (e) => console.warn("MapLibre error:", e?.error?.message || e));
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      map.current?.remove();
      map.current = null;
      ready.current = false;
      pins.current = {};
      clusterMk.current = [];
    };
  }, []);

  // Build the cluster index from the data and (re)render.
  useEffect(() => {
    if (!countries.length) return;
    const features = countries
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        type: "Feature",
        properties: { code: c.code, name: c.name, cashFrom: c.cashFrom, awardSeatsOpen: c.awardSeatsOpen },
        geometry: { type: "Point", coordinates: [c.longitude, c.latitude] },
      }));
    index.current = new Supercluster({ radius: 50, maxZoom: 6 }).load(features);
    if (ready.current) render();
    else map.current?.once("load", render);
  }, [countries]);

  // Selection/hover + ease.
  useEffect(() => {
    applyState();
    if (selected) {
      const c = countries.find((x) => x.code === selected);
      if (c && c.latitude != null) {
        map.current?.easeTo({ center: [c.longitude, c.latitude], zoom: 3.4, duration: reduceMotion() ? 0 : 700 });
      }
    }
  }, [selected, hovered, countries]);

  return <div ref={ref} className="h-full overflow-hidden rounded-[18px] border border-[#E5E9EA]" />;
}
