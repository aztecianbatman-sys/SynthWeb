const SYNTH_I18N = {
  en:{home:"Home",assist:"Synth Assist",shield:"Shield",bookmarks:"Bookmarks",history:"History",downloads:"Downloads",profiles:"Profiles",extensions:"Extensions",tools:"Browser Tools",settings:"Settings",search:"Search…",browserTools:"Browser Tools",privacy:"Privacy",ready:"Ready"},
  hi:{home:"होम",assist:"Synth Assist",shield:"शील्ड",bookmarks:"बुकमार्क",history:"इतिहास",downloads:"डाउनलोड",profiles:"प्रोफ़ाइल",extensions:"एक्सटेंशन",tools:"ब्राउज़र टूल्स",settings:"सेटिंग्स",search:"खोजें…",browserTools:"ब्राउज़र टूल्स",privacy:"गोपनीयता",ready:"तैयार"},
  es:{home:"Inicio",assist:"Synth Assist",shield:"Escudo",bookmarks:"Marcadores",history:"Historial",downloads:"Descargas",profiles:"Perfiles",extensions:"Extensiones",tools:"Herramientas",settings:"Ajustes",search:"Buscar…",browserTools:"Herramientas",privacy:"Privacidad",ready:"Listo"},
  fr:{home:"Accueil",assist:"Synth Assist",shield:"Bouclier",bookmarks:"Signets",history:"Historique",downloads:"Téléchargements",profiles:"Profils",extensions:"Extensions",tools:"Outils",settings:"Réglages",search:"Rechercher…",browserTools:"Outils",privacy:"Confidentialité",ready:"Prêt"},
  de:{home:"Startseite",assist:"Synth Assist",shield:"Shield",bookmarks:"Lesezeichen",history:"Verlauf",downloads:"Downloads",profiles:"Profile",extensions:"Erweiterungen",tools:"Browser-Tools",settings:"Einstellungen",search:"Suchen…",browserTools:"Browser-Tools",privacy:"Privatsphäre",ready:"Bereit"},
  ja:{home:"ホーム",assist:"Synth Assist",shield:"シールド",bookmarks:"ブックマーク",history:"履歴",downloads:"ダウンロード",profiles:"プロフィール",extensions:"拡張機能",tools:"ブラウザーツール",settings:"設定",search:"検索…",browserTools:"ブラウザーツール",privacy:"プライバシー",ready:"準備完了"}
};

window.synthT = function(key){
  const lang=document.documentElement.lang||"en";
  return SYNTH_I18N[lang]?.[key] ?? SYNTH_I18N.en[key] ?? key;
};

window.applySynthLanguage = function(){
  const labels={
    home:"home",assist:"assist",shield:"shield",bookmarks:"bookmarks",history:"history",
    downloads:"downloads",profiles:"profiles",extensions:"extensions",tools:"tools",settings:"settings"
  };
  for(const [key,action] of Object.entries(labels)){
    document.querySelectorAll('[data-home-action="'+action+'"] span').forEach(x=>x.textContent=synthT(key));
  }
  const railSearch=document.getElementById("railSearch");
  if(railSearch)railSearch.placeholder=synthT("search");
  document.querySelectorAll("[data-i18n]").forEach(x=>x.textContent=synthT(x.dataset.i18n));
};
