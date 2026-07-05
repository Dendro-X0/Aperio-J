import type { Messages } from "./zh-CN";
import { messages as en } from "./en";

export const messages: Messages = {
  ...en,
  app: {
    ...en.app,
    tagline: "Motor de oportunidades · Coincidencia algorítmica, sin anuncios",
    description: "Descubrimiento y coincidencia de empleo basados en tu perfil",
  },
  nav: {
    inbox: "Coincidencias",
    sources: "Fuentes",
    settings: "Ajustes",
    backToInbox: "Volver a coincidencias",
  },
  shell: {
    ...en.shell,
    groups: {
      discover: "Descubrir",
      mine: "Mío",
    },
    pages: {
      inbox: "Oportunidades coincidentes",
      inboxDetail: "Detalle de oportunidad",
      sources: "Fuentes",
      settings: "Ajustes de perfil",
    },
    stats: {
      streams: "{count} fuentes",
      matches: "{count} coincidencias",
      streamsTooltip: "Ver y administrar tus fuentes de empleo",
    },
    collapseSidebar: "Contraer barra lateral",
    expandSidebar: "Expandir barra lateral",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    breadcrumbLabel: "Ruta de navegación",
    themeLight: "Modo claro",
    themeDark: "Modo oscuro",
    skipToContent: "Saltar al contenido principal",
    navLabel: "Navegación principal",
  },
  locale: {
    label: "Idioma",
    zhCN: "简体中文",
    en: "English",
    es: "Español",
  },
  common: {
    ...en.common,
    intent: "Intención",
    close: "Cerrar",
  },
  inbox: {
    ...en.inbox,
    title: "Oportunidades coincidentes",
    refresh: "Actualizar coincidencias",
    refreshing: "Actualizando…",
    localeNote: "Las ofertas conservan el idioma original de publicación.",
    card: {
      ...en.inbox.card,
      scoreStrong: "Fuerte",
      scoreFair: "Justa",
      scoreBroad: "Amplia",
      scoreWeak: "Débil",
      matchScore: "Puntuación {score}",
    },
    detail: {
      ...en.inbox.detail,
      matchExplanation: "Por qué coincide",
      scoreBreakdown: "Desglose de puntuación",
      fullDescription: "Descripción completa",
    },
    excluded: {
      ...en.inbox.excluded,
      expandFiltered: "Mostrar filtradas ({count})",
      collapseFiltered: "Ocultar filtradas ({count})",
    },
    marketplace: {
      ...en.inbox.marketplace,
      searchPlaceholder: "Buscar empleos, empresas, habilidades…",
      filter: "Filtros",
      resultCount: "{count} oportunidades",
    },
    pagination: {
      ...en.inbox.pagination,
      showing: "Mostrando {from}–{to} de {total}",
      previous: "Anterior",
      next: "Siguiente",
      page: "Página {page} de {totalPages}",
    },
  },
  sources: {
    ...en.sources,
    title: "Fuentes",
    rediscover: "Redescubrir fuentes",
    discovering: "Descubriendo…",
    table: {
      ...en.sources.table,
      health: "Estado",
      confidence: "Ajuste",
      enabled: "En coincidencias",
    },
  },
  profile: {
    ...en.profile,
    title: "Ajustes de perfil",
    cancel: "Cancelar",
    save: "Guardar",
    setupRedirect: {
      title: "Completa tu perfil para ver coincidencias",
      description:
        "Las coincidencias requieren industria y ocupación como mínimo. Termina los pasos abajo y abre Coincidencias en la barra lateral.",
    },
  },
};
