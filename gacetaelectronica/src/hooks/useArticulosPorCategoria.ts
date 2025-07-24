"use client";

import { useEffect, useState } from "react";

/**
 * Tipo base que representa un artículo tal como lo devuelve la API.
 */
export type ArticuloAPI = {
  id: number;
  title: string;
  createdAt: string;
  summary: string;
  status: string;
  category: string;
  author: string;
};

/**
 * Tipo transformado que representa un artículo como lo espera la UI (cards).
 */
export type ArticleCardProps = {
  id: number;
  title: string;
  summary: string;
  author: string;
  date: string;
  etiquetas: string[]; // Cambia 'tag' por 'etiquetas'
  image: string;
};

/**
 * Extrae el ID de Google Drive y genera la URL de previsualización.
 */
function getDriveImageUrl(driveUrl: string): string | null {
  const regex = /\/d\/([a-zA-Z0-9_-]+)/;
  const match = driveUrl.match(regex);
  return match ? `https://drive.google.com/uc?export=preview&id=${match[1]}` : null;
}

/**
 * Mapa que relaciona el IdCategoria de la API con la clave interna usada en la UI.
 * Este valor es usado para agrupar artículos por categoría textual.
 */
const CATEGORY_MAP: Record<number, string> = {
  1: "ciencia",
  2: "humanidades",
  3: "logros",
  4: "social",
  5: "culturales",
};

const CATEGORY_NAME_MAP: Record<string, string> = {
  cienciatecnologia: "ciencia",
  humanidades: "humanidades",
  logros: "logros",
  socialpolitica: "social",
  culturaldeportiva: "culturales",
};

/**
 * Hook personalizado para obtener y agrupar artículos por categoría.
 *
 * - Realiza una petición a la API `/api/articulos`.
 * - Agrupa los artículos por categoría utilizando CATEGORY_MAP.
 * - Transforma los datos a un formato compatible con las tarjetas de artículo.
 *
 * @returns Un objeto con:
 *  - `articlesByCategory`: artículos agrupados por clave de categoría (ej. "ciencia", "logros", etc.)
 *  - `loading`: indica si los datos aún se están cargando
 */
export default function useArticulosPorCategoria() {
  const [articlesByCategory, setArticlesByCategory] = useState<Record<string, ArticleCardProps[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch("/api/articulos?limit=100&offset=0");
        const data: any[] = await res.json();

        // Solo artículos publicados
        const publicados = data.filter((a) => a.status === "published");
        const grouped: Record<string, ArticleCardProps[]> = {};

        await Promise.all(
          publicados.map(async (articulo) => {
            // Obtener etiquetas
            const etiquetasRes = await fetch(`/api/articuloEtiqueta?articuloId=${articulo.id}`);
            const etiquetas = etiquetasRes.ok ? await etiquetasRes.json() : [];

            // Obtener recursos para la imagen
            const resRecursos = await fetch(`/api/recursos?articuloId=${articulo.id}`);
            const recursos = resRecursos.ok ? await resRecursos.json() : [];
            const imagenUrl = Array.isArray(recursos) && recursos.length > 0
              ? getDriveImageUrl(recursos[0].Ruta || recursos[0].ruta || recursos[0].url || "")
              : null;

            // Mapeo de categoría
            const rawKey = articulo.category.toLowerCase();
            const key = CATEGORY_NAME_MAP[rawKey];
            if (!key) return;

            const article: ArticleCardProps = {
              id: articulo.id,
              title: articulo.title,
              summary: articulo.resumen || articulo.summary || "No hay resumen disponible",
              author: articulo.author || "Redacción J-UP",
              date: articulo.createdAt,
              etiquetas: etiquetas.map((e: any) => e.Nombre),
              image: imagenUrl || "/placeholder.svg?height=200&width=300",
            };

            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(article);
          })
        );

        setArticlesByCategory(grouped);
      } catch (err) {
        console.error("Error al obtener artículos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, []);

  return { articlesByCategory, loading };
}
