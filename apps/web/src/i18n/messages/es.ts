import type { Messages } from "./zh-CN";
import { messages as en } from "./en";

/**
 * Español UI catalog. Spreads English for any missing keys; primary surfaces are translated.
 * Engine match text uses packages/core/locales/es.json when locale is es.
 */
export const messages: Messages = {
  ...en,
  app: {
    name: "Aperio-J",
    tagline: "Descubrimiento de empleo remoto · Coincidencia por perfil, sin anuncios",
    description:
      "Coincidencia de empleo remoto y tecnológico basada en tu perfil para freelancers y nómadas digitales",
  },
  nav: {
    inbox: "Coincidencias",
    sources: "Fuentes",
    settings: "Ajustes",
    backToInbox: "Volver a coincidencias",
  },
  shell: {
    ...en.shell,
    groups: { discover: "Descubrir", mine: "Mío" },
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
    matchRun: {
      viewInbox: "Ver coincidencias",
      cancel: "Cancelar",
      dismiss: "Descartar",
      completed: "Actualización completada — {matched} / {total} oportunidades",
      cancelled: "Actualización de coincidencias cancelada",
    },
  },
  locale: {
    label: "Idioma",
    en: "English",
    zhCN: "简体中文",
    es: "Español",
  },
  common: {
    ...en.common,
    intent: "Intención",
    externalLink: "Externo",
    separator: " · ",
    close: "Cerrar",
  },
  engine: {
    match: {
      hint: "El motor está en ejecución — puede tardar un minuto.",
      phases: {
        preparing: "Preparando motor de coincidencias…",
        discovering_sources: "Descubriendo fuentes de empleo para tu perfil…",
        scanning_feeds: "Escaneando {count} fuentes…",
        parsing_listings: "Analizando {count} ofertas…",
        matching: "Puntuando coincidencias con tu perfil…",
        saving: "Guardando resultados…",
      },
    },
    discover: {
      hint: "Buscando y validando fuentes para tu región e intención.",
      phases: {
        preparing: "Limpiando fuentes descubiertas automáticamente…",
        searching: "Buscando fuentes de empleo…",
        validating: "Validando {count} candidatos…",
        saving: "Actualizando tu registro de fuentes…",
      },
    },
  },
  enums: {
    posterType: {
      direct: "Contratación directa",
      agency: "Agencia / intermediario",
      unknown: "Publicador poco claro",
    },
    streamKind: {
      rss: "RSS",
      list_page: "Página de listado",
      url_pattern: "Patrón URL",
      capture: "Añadido manual",
      unknown: "Web",
    },
    streamHealth: {
      healthy: "Saludable",
      stale: "Obsoleto",
      dead: "Inactivo",
      unknown: "Desconocido",
    },
    streamOrigin: { user: "Personalizado", auto: "Auto-descubierto" },
    streamWorkCategory: { remote: "Remoto", onsite: "Presencial" },
    sourceIntake: {
      api: "API",
      rss: "RSS",
      scraped: "Raspado",
      custom: "Personalizado",
    },
    employmentType: {
      "full-time": "Tiempo completo",
      "part-time": "Tiempo parcial",
      contract: "Contrato",
    },
    confidence: { high: "alta", medium: "media", low: "baja" },
  },
  inbox: {
    ...en.inbox,
    title: "Oportunidades coincidentes",
    refresh: "Actualizar coincidencias",
    refreshing: "Actualizando…",
    cancelRefresh: "Cancelar",
    localeNote: "Las ofertas aparecen en el idioma en que se publicaron.",
    marketplace: {
      ...en.inbox.marketplace,
      searchPlaceholder: "Buscar empleos, empresas, habilidades…",
      filter: "Filtros",
      workModeRemote: "Remoto",
      workModeOnsite: "Presencial",
      cityFilterAll: "Todas las ciudades",
      workModeAll: "Todas",
      resultCount: "{count} oportunidades",
    },
    pagination: {
      showing: "Mostrando {from}–{to} de {total}",
      previous: "Anterior",
      next: "Siguiente",
      page: "Página {page} de {totalPages}",
    },
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
      relatedJobs: "Empleos relacionados",
    },
    excluded: {
      ...en.inbox.excluded,
      expandFiltered: "Mostrar filtradas ({count})",
      collapseFiltered: "Ocultar filtradas ({count})",
    },
    empty: {
      ...en.inbox.empty,
      title: "Aún no hay coincidencias remotas",
      remoteTitle: "Escaneando tableros remotos",
    },
    fetchErrorsTitle: "No se pudieron obtener algunas fuentes",
    errors: {
      refreshFailed: "Error al actualizar",
      captureFailed: "Error al capturar",
      feedbackFailed: "Error al enviar opinión",
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
    category: {
      ...en.sources.category,
      label: "Modalidad de trabajo",
      all: "Todas",
      remote: "Remoto",
      onsite: "Presencial",
      onsiteHint: "Tableros locales tiempo completo y parcial",
    },
    enableAll: {
      button: "Habilitar todas",
      busy: "Habilitando…",
      success: "Habilitadas {count} fuentes",
    },
    intake: { alwaysOn: "Siempre activo" },
    errors: {
      ...en.sources.errors,
      updateFailed: "Error al actualizar",
      discoverFailed: "Error al redescubrir",
    },
  },
  profile: {
    ...en.profile,
    title: "Ajustes de perfil",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
    setupRedirect: {
      title: "Completa tu perfil para ver coincidencias",
      description:
        "Las coincidencias requieren industria y ocupación como mínimo. Termina los pasos y abre Coincidencias en la barra lateral.",
    },
    remotePreference: {
      label: "Modalidad de trabajo",
      sectionDesc: "Remoto es el valor por defecto. Añade ciudades para tableros locales.",
      hint: "Solo remoto ideal para freelancers y nómadas.",
      "remote-only": "Solo remoto",
      "hybrid-ok": "Híbrido OK",
      "onsite-only": "Solo presencial",
    },
    location: {
      ...en.profile.location,
      citiesLabel: "Ciudades",
      cityPlaceholder: "Escribe una ciudad y pulsa Enter…",
      remoteDefaultHint:
        "Sin ciudad — tableros remotos por defecto. Añade una ciudad para fuentes locales.",
      detectFromIp: "Detectar ciudad por IP",
      detecting: "Detectando…",
      removeCity: "Quitar {city}",
    },
    presets: {
      title: "Plantillas rápidas de intención",
      description: "Rellena industria, objetivos y exclusiones para escenarios comunes.",
      "remote-developer": {
        title: "Ingeniero de software remoto",
        description: "Solo remoto; backend, full-stack, DevOps desde tableros internacionales.",
      },
      "remote-frontend": {
        title: "Frontend remoto",
        description: "React, Vue y roles de UI web desde tableros remotos.",
      },
      "remote-backend": {
        title: "Backend remoto",
        description: "API, sistemas distribuidos, Go/Node — remoto primero.",
      },
      "devops-platform": {
        title: "DevOps / SRE / Plataforma",
        description: "Kubernetes, CI/CD, infraestructura e ingeniería de plataforma.",
      },
      "product-ux": {
        title: "Producto y UX",
        description: "Product manager, UX/UI y diseño B2B SaaS.",
      },
      "data-ml": {
        title: "Datos y ML",
        description: "Ingeniería de datos, analítica, machine learning y MLOps.",
      },
      "digital-nomad": {
        title: "Nómada digital / freelancer",
        description: "Solo remoto; roles compatibles con contrato y equipos asíncronos.",
      },
      "factory-upgrade": {
        title: "Rol más ligero fuera de línea",
        description: "Operario → QC, almacén, materiales.",
      },
      "flexible-hours": {
        title: "Horario más flexible",
        description: "Tiempo completo + parcial; almacén y materiales.",
      },
    },
    errors: {
      ...en.profile.errors,
      discoveryNotReady: "Añade industria y ocupación antes de ejecutar coincidencias.",
      saveFailed: "Error al guardar",
    },
  },
  settings: {
    ...en.settings,
    connectors: {
      ...en.settings.connectors,
      localOnlyNote: "Solo en tu SQLite local — nunca se sube.",
      save: "Guardar credenciales",
      saving: "Guardando…",
      saved: "Credenciales guardadas.",
      saveFailed: "No se pudieron guardar las credenciales",
    },
  },
  api: {
    ...en.api,
    authRequired: "Completa la configuración del perfil primero",
    onboardingRequired: "Completa la incorporación primero",
    profileMissing: "Perfil no encontrado",
    invalidUrl: "Introduce una URL http(s) válida",
    captureFailed: "Error al capturar URL",
    profileSaveFailed: "No se pudo guardar el perfil",
    updateFailed: "Error al actualizar",
    discoveryNotReady: "Industria y ocupación son obligatorias para el descubrimiento",
    streamNotFound: "Fuente no encontrada",
    invalidStreamPatch: "No hay campos válidos para actualizar",
  },
};
