export interface ProfileOption {
  id: string;
  label: string;
  description: string;
}

export interface OfferingCategoryOption extends ProfileOption {
  focusId: string;
}

export interface CategorySpecializationOption extends ProfileOption {
  categoryId: string;
  keywordHints: string[];
}

export interface ProfileOptionGroup {
  id: string;
  label: string;
  description: string;
  optionIds: string[];
}

export const PRIMARY_INDUSTRY_OPTIONS: ProfileOption[] = [
  {
    id: "construction",
    label: "Građevina i infrastruktura",
    description: "Niskogradnja, visokogradnja, rekonstrukcije i infrastrukturni projekti.",
  },
  {
    id: "it",
    label: "IT i digitalna rješenja",
    description: "Softver, licence, hardver, mreže, cloud i digitalizacija.",
  },
  {
    id: "equipment",
    label: "Oprema i roba",
    description: "Uredska, školska, industrijska i druga oprema za isporuku.",
  },
  {
    id: "medical",
    label: "Medicinska i laboratorijska oprema",
    description: "Medicinski uređaji, potrošni materijal i laboratorijska rješenja.",
  },
  {
    id: "maintenance",
    label: "Održavanje i servis",
    description: "Servisiranje opreme, održavanje sistema, podrška i interventni radovi.",
  },
  {
    id: "consulting",
    label: "Konsalting, projektovanje i nadzor",
    description: "Projektovanje, stručni nadzor, edukacije, pravne i savjetodavne usluge.",
  },
  {
    id: "logistics",
    label: "Transport, logistika i komunalne usluge",
    description: "Prevoz, komunalne usluge, zimsko održavanje, odvoz i logistika.",
  },
  {
    id: "security_energy",
    label: "Sigurnost, zaštita i energija",
    description: "Video nadzor, zaštitarske usluge, elektro i energetski sistemi.",
  },
  {
    id: "facilities_hospitality",
    label: "Objekti, higijena i ugostiteljstvo",
    description: "Čišćenje, higijenski program, prehrana, catering i podrška objektima.",
  },
  {
    id: "communications_media",
    label: "Komunikacije, štampa i događaji",
    description: "Štampa, promotivni materijali, kampanje, audio-video i organizacija događaja.",
  },
];

export const OFFERING_CATEGORY_OPTIONS: OfferingCategoryOption[] = [
  {
    id: "software_licenses",
    label: "Softver i licence",
    description: "ERP, DMS, antivirus, licence, SaaS i aplikativna rješenja.",
    focusId: "it",
  },
  {
    id: "it_hardware",
    label: "IT oprema i mreže",
    description: "Računari, serveri, printeri, mrežna oprema i periferija.",
    focusId: "it",
  },
  {
    id: "telecom_av",
    label: "Telekomunikacije i audio-video sistemi",
    description: "Telefonija, konferencijski sistemi, video zidovi, razglas i AV oprema.",
    focusId: "it",
  },
  {
    id: "cloud_cyber_data",
    label: "Cloud, cyber sigurnost i podaci",
    description: "Cloud infrastruktura, backup, SIEM, cyber zaštita i data platforme.",
    focusId: "it",
  },
  {
    id: "construction_works",
    label: "Građevinski radovi",
    description: "Izvođenje radova, rekonstrukcije, sanacije i adaptacije.",
    focusId: "construction",
  },
  {
    id: "electro_mechanical",
    label: "Elektro i mašinski radovi",
    description: "Instalacije, mašinske pozicije, HVAC i tehnički sistemi.",
    focusId: "construction",
  },
  {
    id: "design_supervision",
    label: "Projektovanje i nadzor",
    description: "Glavni projekti, idejna rješenja, stručni nadzor i revizije.",
    focusId: "consulting",
  },
  {
    id: "maintenance_support",
    label: "Održavanje i podrška",
    description: "Servis, helpdesk, održavanje opreme i ugovori o podršci.",
    focusId: "maintenance",
  },
  {
    id: "office_school_equipment",
    label: "Uredska i školska oprema",
    description: "Namještaj, učionička oprema, uredski materijal i enterijer.",
    focusId: "equipment",
  },
  {
    id: "industrial_tools_machinery",
    label: "Industrijska oprema i alati",
    description: "Mašine, alati, radionice, rezervni dijelovi i tehnička oprema.",
    focusId: "equipment",
  },
  {
    id: "furniture_interior",
    label: "Namještaj i enterijerska oprema",
    description: "Kancelarijski, školski, zdravstveni i drugi enterijerski program.",
    focusId: "equipment",
  },
  {
    id: "medical_supplies",
    label: "Medicinska oprema i potrošni materijal",
    description: "Medicinski uređaji, laboratorijski materijal i potrošna roba.",
    focusId: "medical",
  },
  {
    id: "laboratory_diagnostics",
    label: "Laboratorija i dijagnostika",
    description: "Laboratorijska oprema, dijagnostički sistemi, reagensi i analizatori.",
    focusId: "medical",
  },
  {
    id: "vehicles_transport",
    label: "Vozila i transport",
    description: "Putnička i teretna vozila, rezervni dijelovi i transportne usluge.",
    focusId: "logistics",
  },
  {
    id: "utility_waste_winter",
    label: "Komunalne, zimske i odvoz usluge",
    description: "Odvoz otpada, komunalne usluge, zimsko održavanje i terenska logistika.",
    focusId: "logistics",
  },
  {
    id: "cleaning_hygiene",
    label: "Čišćenje i higijena",
    description: "Usluge čišćenja, hemija, higijenski i sanitarni program.",
    focusId: "facilities_hospitality",
  },
  {
    id: "food_catering",
    label: "Hrana i catering",
    description: "Prehrambeni artikli, catering, kantine i ugostiteljske usluge.",
    focusId: "facilities_hospitality",
  },
  {
    id: "security_video",
    label: "Sigurnost i video nadzor",
    description: "Alarmni sistemi, video nadzor, zaštitarske i sigurnosne usluge.",
    focusId: "security_energy",
  },
  {
    id: "fuel_energy",
    label: "Gorivo, energenti i energetski sistemi",
    description: "Gorivo, lož ulje, energenti, agregati i energetska infrastruktura.",
    focusId: "security_energy",
  },
  {
    id: "legal_finance_consulting",
    label: "Pravne, finansijske i savjetodavne usluge",
    description: "Pravno savjetovanje, revizija, računovodstvo, due diligence i consulting.",
    focusId: "consulting",
  },
  {
    id: "training_research",
    label: "Edukacije, istraživanja i stručne obuke",
    description: "Obuke, certifikacije, istraživanja tržišta i stručni razvoj kadra.",
    focusId: "consulting",
  },
  {
    id: "printing_marketing_events",
    label: "Štampa, marketing i događaji",
    description: "Promotivni materijali, štampa, kampanje, sajmovi i organizacija događaja.",
    focusId: "communications_media",
  },
];

export const OFFERING_CATEGORY_GROUPS: ProfileOptionGroup[] = PRIMARY_INDUSTRY_OPTIONS.map(
  (focusOption) => ({
    id: focusOption.id,
    label: focusOption.label,
    description: focusOption.description,
    optionIds: OFFERING_CATEGORY_OPTIONS.filter(
      (option) => option.focusId === focusOption.id
    ).map((option) => option.id),
  })
).filter((group) => group.optionIds.length > 0);

export const CATEGORY_SPECIALIZATION_OPTIONS: CategorySpecializationOption[] = [
  {
    id: "food_meat_supply",
    categoryId: "food_catering",
    label: "Meso i mesne prerađevine",
    description: "Tenderi za svježe meso, preradu mesa i srodni prehrambeni program.",
    keywordHints: ["meso", "mesne prerađevine", "svježe meso", "klaonica"],
  },
  {
    id: "food_basic_groceries",
    categoryId: "food_catering",
    label: "Osnovne prehrambene namirnice",
    description: "Tenderi za prehrambene artikle, pekarske, mliječne i srodne proizvode.",
    keywordHints: ["prehrambeni artikli", "osnovne životne namirnice", "pekarski proizvodi", "mliječni proizvodi"],
  },
  {
    id: "food_beverages",
    categoryId: "food_catering",
    label: "Pića i napici",
    description: "Tenderi za bezalkoholna pića, tople napitke i srodnu nabavku.",
    keywordHints: ["piće", "napici", "bezalkoholna pića", "topli napici"],
  },
  {
    id: "food_catering_services",
    categoryId: "food_catering",
    label: "Catering i priprema obroka",
    description: "Tenderi za catering, gotove obroke, kuhinje i radničke restorane.",
    keywordHints: ["catering", "priprema obroka", "gotovi obroci", "radnički restoran"],
  },
  {
    id: "cleaning_services",
    categoryId: "cleaning_hygiene",
    label: "Usluge čišćenja objekata",
    description: "Redovno, generalno i specijalizirano čišćenje poslovnih i javnih objekata.",
    keywordHints: ["usluge čišćenja", "održavanje higijene", "čišćenje objekata", "generalno čišćenje"],
  },
  {
    id: "cleaning_consumables",
    categoryId: "cleaning_hygiene",
    label: "Higijenski i potrošni materijal",
    description: "Sredstva za čišćenje, papirna konfekcija i sanitarni potrošni program.",
    keywordHints: ["higijenski materijal", "sanitarni potrošni materijal", "sredstva za čišćenje", "papirna konfekcija"],
  },
  {
    id: "cleaning_disinfection",
    categoryId: "cleaning_hygiene",
    label: "Dezinfekcija i sanitarni tretmani",
    description: "Dezinfekcija, dezinsekcija, deratizacija i srodne sanitarne usluge.",
    keywordHints: ["dezinfekcija", "dezinsekcija", "deratizacija", "sanitarni tretman"],
  },
  {
    id: "training_finance_admin",
    categoryId: "training_research",
    label: "Finansijske i administrativne obuke",
    description: "Računovodstvo, budžet, javne finansije i administrativna edukacija.",
    keywordHints: ["finansijske obuke", "računovodstvene obuke", "budžet", "javne finansije"],
  },
  {
    id: "training_procurement_compliance",
    categoryId: "training_research",
    label: "Javne nabavke i usklađenost",
    description: "Obuke iz javnih nabavki, compliance tema, etike i antikorupcije.",
    keywordHints: ["javne nabavke", "usklađenost", "compliance", "antikorupcija"],
  },
  {
    id: "training_technical_safety",
    categoryId: "training_research",
    label: "Tehničke i sigurnosne obuke",
    description: "Zaštita na radu, tehnička osposobljavanja i stručne certifikacije.",
    keywordHints: ["zaštita na radu", "tehničke obuke", "stručno osposobljavanje", "certifikacija"],
  },
  {
    id: "training_market_research",
    categoryId: "training_research",
    label: "Istraživanja i ankete",
    description: "Istraživanje tržišta, anketiranje i ispitivanje javnog mnijenja.",
    keywordHints: ["istraživanje tržišta", "anketiranje", "analiza tržišta", "ispitivanje javnog mnijenja"],
  },
  {
    id: "consulting_legal",
    categoryId: "legal_finance_consulting",
    label: "Pravne usluge",
    description: "Pravno savjetovanje, ugovori, zastupanje i pravna podrška.",
    keywordHints: ["pravne usluge", "pravno savjetovanje", "ugovori", "zastupanje"],
  },
  {
    id: "consulting_accounting_audit",
    categoryId: "legal_finance_consulting",
    label: "Računovodstvo i revizija",
    description: "Knjigovodstvo, finansijski izvještaji, revizija i porezno savjetovanje.",
    keywordHints: ["računovodstvo", "revizija", "finansijski izvještaji", "porezno savjetovanje"],
  },
  {
    id: "consulting_business_advisory",
    categoryId: "legal_finance_consulting",
    label: "Poslovno i finansijsko savjetovanje",
    description: "Due diligence, strateško planiranje i poslovna transformacija.",
    keywordHints: ["finansijsko savjetovanje", "due diligence", "poslovno savjetovanje", "strateško planiranje"],
  },
  {
    id: "software_business_apps",
    categoryId: "software_licenses",
    label: "Poslovni softver",
    description: "ERP, CRM, DMS i druga aplikativna rješenja za rad institucija i firmi.",
    keywordHints: ["erp", "crm", "dms", "poslovni softver"],
  },
  {
    id: "software_security_productivity",
    categoryId: "software_licenses",
    label: "Licence, Office i sigurnosni softver",
    description: "Office paketi, antivirus, endpoint zaštita i srodne licence.",
    keywordHints: ["licence", "office paketi", "antivirus", "sigurnosni softver"],
  },
  {
    id: "software_sector_apps",
    categoryId: "software_licenses",
    label: "Sektorska aplikativna rješenja",
    description: "Specijalizirani informacioni sistemi i evidencije za javni sektor.",
    keywordHints: ["specijalizirani softver", "informacioni sistem", "evidencije", "aplikativno rješenje"],
  },
  {
    id: "hardware_end_user_devices",
    categoryId: "it_hardware",
    label: "Računari i korisnička oprema",
    description: "Laptopi, desktop računari, monitori i radne stanice.",
    keywordHints: ["računari", "laptopi", "monitori", "radne stanice"],
  },
  {
    id: "hardware_servers_storage",
    categoryId: "it_hardware",
    label: "Serveri i storage",
    description: "Serverska oprema, backup uređaji i sistemi za pohranu podataka.",
    keywordHints: ["server", "storage", "backup uređaji", "data centar"],
  },
  {
    id: "hardware_network_security",
    categoryId: "it_hardware",
    label: "Mrežna i sigurnosna oprema",
    description: "Switch, router, firewall i druga mrežna infrastruktura.",
    keywordHints: ["switch", "router", "firewall", "mrežna oprema"],
  },
  {
    id: "hardware_print_scan",
    categoryId: "it_hardware",
    label: "Print i scan oprema",
    description: "Printeri, skeneri, MFP uređaji i potrošni materijal za njih.",
    keywordHints: ["printer", "skener", "multifunkcijski uređaji", "toneri"],
  },
  {
    id: "telecom_conference_systems",
    categoryId: "telecom_av",
    label: "Konferencijski i komunikacijski sistemi",
    description: "Telefonija, konferencijske sale, IP centrale i komunikacijska oprema.",
    keywordHints: ["telefonija", "ip centrala", "konferencijski sistem", "komunikacijska oprema"],
  },
  {
    id: "telecom_av_classroom",
    categoryId: "telecom_av",
    label: "Audio-video i prezentacijska oprema",
    description: "Projektori, displeji, razglas i prezentacijski sistemi za sale i učionice.",
    keywordHints: ["projektori", "displeji", "razglas", "prezentacijski sistem"],
  },
  {
    id: "telecom_broadcast_multimedia",
    categoryId: "telecom_av",
    label: "Multimedija i produkcijska oprema",
    description: "Video zidovi, snimanje, streaming i produkcijska AV infrastruktura.",
    keywordHints: ["video zid", "streaming", "produkcijska oprema", "multimedija"],
  },
  {
    id: "cloud_infrastructure",
    categoryId: "cloud_cyber_data",
    label: "Cloud infrastruktura",
    description: "Hosting, virtualni serveri i cloud platforme.",
    keywordHints: ["cloud infrastruktura", "virtualni serveri", "hosting", "container platforma"],
  },
  {
    id: "cloud_cyber_security",
    categoryId: "cloud_cyber_data",
    label: "Cyber sigurnost",
    description: "SIEM, SOC, endpoint zaštita i upravljanje sigurnošću.",
    keywordHints: ["cyber sigurnost", "siem", "soc", "zaštita endpointa"],
  },
  {
    id: "cloud_backup_data",
    categoryId: "cloud_cyber_data",
    label: "Backup i upravljanje podacima",
    description: "Backup, disaster recovery, arhiviranje i data platforme.",
    keywordHints: ["backup", "disaster recovery", "arhiviranje podataka", "data platforma"],
  },
  {
    id: "construction_building_finish",
    categoryId: "construction_works",
    label: "Visokogradnja i završni radovi",
    description: "Adaptacije, sanacije objekata i završni građevinski radovi.",
    keywordHints: ["visokogradnja", "adaptacija", "sanacija objekta", "završni građevinski radovi"],
  },
  {
    id: "construction_infrastructure",
    categoryId: "construction_works",
    label: "Infrastruktura i niskogradnja",
    description: "Saobraćajnice, vodovod, kanalizacija i komunalna infrastruktura.",
    keywordHints: ["niskogradnja", "saobraćajnica", "vodovod", "kanalizacija"],
  },
  {
    id: "construction_roof_facade",
    categoryId: "construction_works",
    label: "Krovovi, fasade i stolarija",
    description: "Krovopokrivački radovi, fasaderski radovi i ugradnja stolarije.",
    keywordHints: ["krov", "fasada", "stolarija", "termofasada"],
  },
  {
    id: "electro_power_installations",
    categoryId: "electro_mechanical",
    label: "Elektroinstalacije i rasvjeta",
    description: "Jaka i slaba struja, javna rasvjeta, ormari i elektroinstalacioni radovi.",
    keywordHints: ["elektroinstalacije", "javna rasvjeta", "slaba struja", "razvodni ormar"],
  },
  {
    id: "electro_hvac_machine",
    categoryId: "electro_mechanical",
    label: "Mašinske instalacije i HVAC",
    description: "Grijanje, ventilacija, klimatizacija i mašinski sistemi u objektima.",
    keywordHints: ["hvac", "klimatizacija", "ventilacija", "mašinske instalacije"],
  },
  {
    id: "electro_industrial_automation",
    categoryId: "electro_mechanical",
    label: "Automatika i upravljački sistemi",
    description: "Industrijska automatika, upravljanje postrojenjima i srodni sistemi.",
    keywordHints: ["automatika", "upravljački sistem", "postrojenje", "scada"],
  },
  {
    id: "design_architectural",
    categoryId: "design_supervision",
    label: "Projektovanje",
    description: "Idejna rješenja, glavni projekti i izvedbena dokumentacija.",
    keywordHints: ["projektovanje", "glavni projekat", "idejno rješenje", "izvedbeni projekat"],
  },
  {
    id: "design_supervision_services",
    categoryId: "design_supervision",
    label: "Stručni nadzor i revizija",
    description: "Građevinski nadzor, projektantski nadzor i revizije projekta.",
    keywordHints: ["stručni nadzor", "građevinski nadzor", "projektantski nadzor", "revizija projekta"],
  },
  {
    id: "design_studies_permits",
    categoryId: "design_supervision",
    label: "Studije, elaborati i dozvole",
    description: "Studije izvodljivosti, elaborati i ishođenje dozvola.",
    keywordHints: ["elaborat", "studija izvodljivosti", "urbanistička saglasnost", "dozvole"],
  },
  {
    id: "maintenance_equipment_service",
    categoryId: "maintenance_support",
    label: "Servis opreme i sistema",
    description: "Preventivno i korektivno održavanje opreme, sistema i instalacija.",
    keywordHints: ["servis opreme", "održavanje sistema", "preventivno održavanje", "rezervni dijelovi"],
  },
  {
    id: "maintenance_software_support",
    categoryId: "maintenance_support",
    label: "Softverska podrška i helpdesk",
    description: "Podrška korisnicima, održavanje aplikacija i nadogradnje.",
    keywordHints: ["tehnička podrška", "helpdesk", "održavanje aplikacije", "nadogradnje"],
  },
  {
    id: "maintenance_facility_support",
    categoryId: "maintenance_support",
    label: "Održavanje objekata i instalacija",
    description: "Interventno održavanje objekata, servis instalacija i ugovori o održavanju.",
    keywordHints: ["interventno održavanje", "održavanje objekta", "servis instalacija", "ugovor o održavanju"],
  },
  {
    id: "office_furniture_school",
    categoryId: "office_school_equipment",
    label: "Učionički i kancelarijski namještaj",
    description: "Školski i kancelarijski stolovi, stolice, ormari i enterijerski program.",
    keywordHints: ["školski namještaj", "kancelarijski namještaj", "stolice", "ormari"],
  },
  {
    id: "office_consumables_materials",
    categoryId: "office_school_equipment",
    label: "Uredski i školski materijal",
    description: "Potrošni kancelarijski materijal, pribor i školski potrošni program.",
    keywordHints: ["uredski materijal", "školski pribor", "potrošni materijal", "papir"],
  },
  {
    id: "office_specialized_classrooms",
    categoryId: "office_school_equipment",
    label: "Specijalizirana učionička oprema",
    description: "Kabineti, laboratorijski stolovi i namjenska oprema za učionice.",
    keywordHints: ["učionička oprema", "kabinet", "laboratorijski stol", "namjenska oprema"],
  },
  {
    id: "industrial_workshop_tools",
    categoryId: "industrial_tools_machinery",
    label: "Radionička oprema i alati",
    description: "Ručni i električni alati, radionički setovi i servisna oprema.",
    keywordHints: ["alat", "radionička oprema", "električni alati", "servisna oprema"],
  },
  {
    id: "industrial_heavy_machinery",
    categoryId: "industrial_tools_machinery",
    label: "Mašine i teška tehnička oprema",
    description: "Industrijske mašine, agregati, postrojenja i teža tehnička oprema.",
    keywordHints: ["industrijske mašine", "agregat", "postrojenje", "tehnička oprema"],
  },
  {
    id: "industrial_spare_parts_consumables",
    categoryId: "industrial_tools_machinery",
    label: "Rezervni dijelovi i tehnički potrošni program",
    description: "Rezervni dijelovi, tehnička galanterija i srodni industrijski materijal.",
    keywordHints: ["rezervni dijelovi", "tehnička galanterija", "ležajevi", "industrijski materijal"],
  },
  {
    id: "interior_office_furniture",
    categoryId: "furniture_interior",
    label: "Kancelarijski i upravni enterijer",
    description: "Recepcije, kancelarije, sale i drugi upravni enterijerski program.",
    keywordHints: ["enterijer", "kancelarijski program", "recepcija", "sale za sastanke"],
  },
  {
    id: "interior_healthcare_school",
    categoryId: "furniture_interior",
    label: "Zdravstveni i školski enterijer",
    description: "Namještaj i oprema za ambulante, učionice, vrtiće i ustanove.",
    keywordHints: ["zdravstveni namještaj", "školski enterijer", "ambulanta", "vrtić"],
  },
  {
    id: "interior_custom_joinery",
    categoryId: "furniture_interior",
    label: "Namjenski i stolarski enterijer",
    description: "Namještaj po mjeri, stolarske pozicije i specifična enterijerska izvedba.",
    keywordHints: ["namještaj po mjeri", "stolarija", "ugradbeni namještaj", "enterijerska izvedba"],
  },
  {
    id: "medical_devices",
    categoryId: "medical_supplies",
    label: "Medicinski uređaji",
    description: "Dijagnostički, terapijski i drugi medicinski uređaji za ustanove.",
    keywordHints: ["medicinski uređaji", "dijagnostička oprema", "terapijski uređaji", "aparati"],
  },
  {
    id: "medical_consumables",
    categoryId: "medical_supplies",
    label: "Potrošni medicinski materijal",
    description: "Rukavice, setovi, zavoji, kateteri i drugi potrošni medicinski program.",
    keywordHints: ["potrošni medicinski materijal", "rukavice", "zavoji", "kateteri"],
  },
  {
    id: "medical_implants_specialized",
    categoryId: "medical_supplies",
    label: "Specijalizirani medicinski program",
    description: "Implantati, ortopedski i drugi visokospecijalizirani medicinski artikli.",
    keywordHints: ["implantati", "ortopedski program", "specijalizirani medicinski artikli", "hirurški program"],
  },
  {
    id: "lab_reagents_tests",
    categoryId: "laboratory_diagnostics",
    label: "Reagensi i testovi",
    description: "Laboratorijski reagensi, testovi i potrošni materijal za analizu.",
    keywordHints: ["reagensi", "testovi", "laboratorijski potrošni materijal", "analiza uzoraka"],
  },
  {
    id: "lab_analyzers_instruments",
    categoryId: "laboratory_diagnostics",
    label: "Analizatori i laboratorijski instrumenti",
    description: "Biohemijski, hematološki i drugi laboratorijski analizatori i instrumenti.",
    keywordHints: ["analizatori", "laboratorijski instrumenti", "biohemijski analizator", "hematološki analizator"],
  },
  {
    id: "lab_service_maintenance",
    categoryId: "laboratory_diagnostics",
    label: "Servis i podrška laboratoriji",
    description: "Održavanje laboratorijske opreme, validacija i tehnička podrška.",
    keywordHints: ["servis laboratorijske opreme", "validacija", "kalibracija", "tehnička podrška laboratoriji"],
  },
  {
    id: "transport_vehicle_supply",
    categoryId: "vehicles_transport",
    label: "Nabavka vozila",
    description: "Putnička, teretna i specijalna vozila za javni sektor i firme.",
    keywordHints: ["vozila", "automobili", "kombi", "specijalna vozila"],
  },
  {
    id: "transport_service_parts",
    categoryId: "vehicles_transport",
    label: "Servis, gume i dijelovi",
    description: "Održavanje voznog parka, gume i rezervni dijelovi za vozila.",
    keywordHints: ["rezervni dijelovi", "servis vozila", "gume", "održavanje voznog parka"],
  },
  {
    id: "transport_passenger_logistics",
    categoryId: "vehicles_transport",
    label: "Prevoz i logističke usluge",
    description: "Prevoz putnika, shuttle usluge i logistička podrška.",
    keywordHints: ["prevoz putnika", "transportne usluge", "shuttle", "logistika"],
  },
  {
    id: "utility_waste_collection",
    categoryId: "utility_waste_winter",
    label: "Odvoz otpada i komunalni servis",
    description: "Sakupljanje, odvoz otpada i redovni komunalni terenski poslovi.",
    keywordHints: ["odvoz otpada", "sakupljanje otpada", "komunalni servis", "terenski radovi"],
  },
  {
    id: "utility_winter_maintenance",
    categoryId: "utility_waste_winter",
    label: "Zimsko održavanje",
    description: "Čišćenje snijega, posipanje i održavanje prohodnosti u zimskom režimu.",
    keywordHints: ["zimsko održavanje", "čišćenje snijega", "posipanje", "prohodnost puteva"],
  },
  {
    id: "utility_public_hygiene",
    categoryId: "utility_waste_winter",
    label: "Javna higijena i terensko održavanje",
    description: "Održavanje javnih površina, parkova i komunalne higijene.",
    keywordHints: ["javna higijena", "održavanje javnih površina", "parkovi", "komunalna higijena"],
  },
  {
    id: "security_video_surveillance",
    categoryId: "security_video",
    label: "Video nadzor",
    description: "Kamere, snimači, nadzorni centri i prateća oprema.",
    keywordHints: ["video nadzor", "kamere", "snimači", "nadzorni centar"],
  },
  {
    id: "security_access_alarm",
    categoryId: "security_video",
    label: "Alarm i kontrola pristupa",
    description: "Alarmni sistemi, kontrola pristupa, protuprovala i vatrodojava.",
    keywordHints: ["alarmni sistem", "kontrola pristupa", "protuprovala", "vatrodojava"],
  },
  {
    id: "security_guard_services",
    categoryId: "security_video",
    label: "Fizička zaštita",
    description: "Zaštitarske usluge, čuvarske službe i patrole.",
    keywordHints: ["fizička zaštita", "zaštitarske usluge", "čuvarska služba", "patrola"],
  },
  {
    id: "energy_fuel_supply",
    categoryId: "fuel_energy",
    label: "Gorivo i energenti",
    description: "Motorna goriva, lož ulje, pelet i drugi energenti za isporuku.",
    keywordHints: ["gorivo", "lož ulje", "pelet", "energenti"],
  },
  {
    id: "energy_electro_power",
    categoryId: "fuel_energy",
    label: "Elektroenergetski sistemi",
    description: "Agregati, trafostanice, napajanje i elektroenergetska infrastruktura.",
    keywordHints: ["agregati", "trafostanica", "napajanje", "elektroenergetski sistem"],
  },
  {
    id: "energy_efficiency_heating",
    categoryId: "fuel_energy",
    label: "Grijanje i energetska efikasnost",
    description: "Kotlovnice, grijanje, toplotne pumpe i projekti energetske efikasnosti.",
    keywordHints: ["grijanje", "kotlovnica", "toplotna pumpa", "energetska efikasnost"],
  },
  {
    id: "print_materials",
    categoryId: "printing_marketing_events",
    label: "Štampa i obrasci",
    description: "Brošure, letci, obrasci i ostali štampani materijali.",
    keywordHints: ["štampa", "brošure", "letci", "obrasci"],
  },
  {
    id: "print_promo_branding",
    categoryId: "printing_marketing_events",
    label: "Promotivni materijali i branding",
    description: "Brendiranje, reklamni pokloni i promotivni materijal.",
    keywordHints: ["promotivni materijal", "brendiranje", "reklamni pokloni", "vizuelni identitet"],
  },
  {
    id: "print_events_production",
    categoryId: "printing_marketing_events",
    label: "Događaji i produkcija",
    description: "Organizacija konferencija, sajmova i događaja.",
    keywordHints: ["organizacija događaja", "konferencija", "sajam", "scenska produkcija"],
  },
];

export function getCategorySpecializationOptions(categoryId: string): CategorySpecializationOption[] {
  return CATEGORY_SPECIALIZATION_OPTIONS.filter((option) => option.categoryId === categoryId);
}

export const TENDER_TYPE_OPTIONS: ProfileOption[] = [
  {
    id: "goods",
    label: "Robe",
    description: "Isporuka opreme, potrošnog materijala i druge robe.",
  },
  {
    id: "services",
    label: "Usluge",
    description: "Održavanje, podrška, konsultantske i druge usluge.",
  },
  {
    id: "works",
    label: "Radovi",
    description: "Građevinski, infrastrukturni i izvedbeni radovi.",
  },
];

const PRIMARY_INDUSTRY_KEYWORDS: Record<string, string[]> = {
  construction: ["građevin", "izgradnj", "rekonstrukcij", "sanacij", "adaptacij"],
  it: ["softver", "licenc", "server", "računar", "informatičk"],
  equipment: ["namještaj", "inventar", "mašin", "alat", "uredsk"],
  medical: ["medicinsk", "laboratorij", "dijagnostik", "reagens"],
  maintenance: ["održavanj", "servisiranj", "helpdesk", "intervencij"],
  consulting: ["projektovanj", "nadzor", "savjetovanj", "revizij", "obuk"],
  logistics: ["transport", "prevoz", "vozil", "odvoz", "zimsk"],
  security_energy: ["videonadzor", "alarm", "zaštit", "goriv", "energent"],
  facilities_hospitality: ["čišćenj", "higijen", "dezinfekcij", "catering"],
  communications_media: ["štamp", "marketing", "brendiranj", "događaj"],
};

const OFFERING_CATEGORY_KEYWORDS: Record<string, string[]> = {
  software_licenses: ["softver", "licenc", "erp", "dms", "saas", "aplikacij"],
  it_hardware: ["server", "računar", "printer", "switch", "router", "firewall", "mrežna oprema"],
  telecom_av: ["telekom", "telefonij", "konferencij", "audio", "video", "razglas"],
  cloud_cyber_data: ["cloud", "backup", "cyber sigurnost", "siem", "data platform", "disaster recovery"],
  construction_works: ["izgradnj", "rekonstrukcij", "sanacij", "adaptacij", "građevin", "radov"],
  electro_mechanical: ["elektroinstalacij", "mašinsk", "instalacij", "hvac", "grijanj", "hlađenj"],
  design_supervision: ["projektovanj", "nadzor", "idejn", "glavn", "revizij"],
  maintenance_support: ["održavanj", "servisiranj", "tehnička podrška", "helpdesk", "intervencij"],
  office_school_equipment: ["uredsk", "kancelarij", "školsk", "namještaj", "inventar"],
  industrial_tools_machinery: ["industrijsk", "alat", "mašin", "rezervn", "radionic"],
  furniture_interior: ["namještaj", "stolic", "stol", "ormar", "enterijer"],
  medical_supplies: ["medicinsk", "potrošn", "instrument", "sanitetsk", "uređaj"],
  laboratory_diagnostics: ["laboratorij", "dijagnostik", "reagens", "analizator"],
  vehicles_transport: ["vozil", "automobil", "kombi", "kamion", "transport", "prevoz"],
  utility_waste_winter: ["komunaln", "otpad", "odvoz", "zimsk", "održavanj"],
  cleaning_hygiene: ["čišćenj", "higijen", "dezinfekcij", "sanitarn", "hemij"],
  food_catering: ["hran", "prehramben", "catering", "ugostitelj", "obrok"],
  security_video: ["sigurnost", "zaštit", "alarm", "video", "nadzor", "videonadzor"],
  fuel_energy: ["goriv", "lož", "energ", "elektroenergetsk", "agregat"],
  legal_finance_consulting: ["pravn", "finansij", "računovodstv", "revizij", "savjetovanj"],
  training_research: ["obuk", "edukacij", "certifikacij", "istraživanj", "seminar"],
  printing_marketing_events: ["štamp", "marketing", "promotivn", "brendiranj", "događaj"],
};

const TENDER_TYPE_KEYWORDS: Record<string, string[]> = {
  goods: [],
  services: [],
  works: [],
};

const PRIMARY_INDUSTRY_CPV_CODES: Record<string, string[]> = {
  construction: ["45000000", "45200000", "45400000"],
  it: ["30200000", "32400000", "48000000"],
  equipment: ["39000000", "42000000", "42600000"],
  medical: ["33100000", "33140000", "38430000"],
  maintenance: ["50000000", "50300000", "72253000"],
  consulting: ["71200000", "71520000", "79400000"],
  logistics: ["34100000", "60100000", "90500000"],
  security_energy: ["09100000", "09300000", "35120000"],
  facilities_hospitality: ["15000000", "39800000", "90910000"],
  communications_media: ["79340000", "79800000", "79952000"],
};

const OFFERING_CATEGORY_CPV_CODES: Record<string, string[]> = {
  software_licenses: ["48000000", "48218000", "48761000"],
  it_hardware: ["30200000", "32420000", "48820000"],
  telecom_av: ["32000000", "32260000", "32321200"],
  cloud_cyber_data: ["48730000", "72250000", "72317000"],
  construction_works: ["45000000", "45200000", "45400000"],
  electro_mechanical: ["45310000", "45330000", "50700000"],
  design_supervision: ["71200000", "71247000", "71520000"],
  maintenance_support: ["50000000", "50300000", "72253000"],
  office_school_equipment: ["30190000", "39100000", "39160000"],
  industrial_tools_machinery: ["42000000", "42600000", "43800000"],
  furniture_interior: ["39100000", "39130000", "39160000"],
  medical_supplies: ["33100000", "33140000", "33600000"],
  laboratory_diagnostics: ["33124100", "33696500", "38430000"],
  vehicles_transport: ["34100000", "34300000", "60100000"],
  utility_waste_winter: ["90511000", "90600000", "90620000"],
  cleaning_hygiene: ["33700000", "39800000", "90910000"],
  food_catering: ["15000000", "55500000", "55520000"],
  security_video: ["32323500", "35120000", "79710000"],
  fuel_energy: ["09100000", "09300000", "31100000"],
  legal_finance_consulting: ["79100000", "79200000", "79400000"],
  training_research: ["73000000", "79300000", "80500000"],
  printing_marketing_events: ["79340000", "79800000", "79952000"],
};

const SEARCH_KEYWORD_STOP_WORDS = new Set([
  "firma",
  "firme",
  "naša",
  "naše",
  "naš",
  "njihov",
  "njihove",
  "koja",
  "koje",
  "koji",
  "kako",
  "gdje",
  "kroz",
  "radi",
  "radimo",
  "vrste",
  "vrsta",
  "ponuda",
  "ponude",
  "usluga",
  "usluge",
  "roba",
  "radova",
  "opis",
  "fokus",
  "profil",
  "tender",
  "tendere",
  "bosna",
  "hercegovina",
  "cijela",
  "bih",
]);

export interface StructuredCompanyProfile {
  version: 1;
  primaryIndustry: string | null;
  offeringCategories: string[];
  specializationIds?: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
  manualKeywords?: string[];
}

export interface ParsedCompanyProfile {
  primaryIndustry: string | null;
  offeringCategories: string[];
  specializationIds?: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
  manualKeywords?: string[];
  legacyIndustryText: string | null;
}

const optionLookup = new Map(
  [...PRIMARY_INDUSTRY_OPTIONS, ...OFFERING_CATEGORY_OPTIONS, ...CATEGORY_SPECIALIZATION_OPTIONS, ...TENDER_TYPE_OPTIONS].map((option) => [
    option.id,
    option,
  ])
);

const genericProfileKeywordTerms = new Set(
  [...PRIMARY_INDUSTRY_OPTIONS, ...OFFERING_CATEGORY_OPTIONS, ...CATEGORY_SPECIALIZATION_OPTIONS, ...TENDER_TYPE_OPTIONS]
    .map((option) => option.label)
    .map((term) =>
      term
        .trim()
        .toLowerCase()
        .replace(/[“”"']/g, "")
        .replace(/[(),.;:/\\]+/g, " ")
        .replace(/\s+/g, " ")
    )
);

const AMBIGUOUS_SINGLE_WORD_KEYWORD_PATTERNS = [
  /^mrež/i,
  /^oprem/i,
  /^nabavk/i,
  /^radov/i,
  /^uslug/i,
  /^servis$/i,
  /^podršk/i,
  /^sistem/i,
  /^rješenj/i,
  /^digitalizacij/i,
  /^podat$/i,
  /^data$/i,
];

const offeringCategoryLookup = new Map(
  OFFERING_CATEGORY_OPTIONS.map((option) => [option.id, option])
);

const specializationLookup = new Map(
  CATEGORY_SPECIALIZATION_OPTIONS.map((option) => [option.id, option])
);

function normalizeSpecializationIds(
  specializationIds: Array<string | null | undefined>,
  offeringCategories: string[]
): string[] {
  const selectedCategorySet = new Set(offeringCategories);

  return [...new Set(
    specializationIds.filter((item): item is string => typeof item === "string" && item.length > 0)
  )].filter((specializationId) => {
    const specialization = specializationLookup.get(specializationId);
    return Boolean(specialization && selectedCategorySet.has(specialization.categoryId));
  });
}

function buildSelectedSpecializationKeywordSeeds(profile: ParsedCompanyProfile): string[] {
  return sanitizeSearchKeywords(
    (profile.specializationIds ?? []).flatMap(
      (specializationId) => specializationLookup.get(specializationId)?.keywordHints ?? []
    )
  );
}

function normalizeSearchKeywordTerm(term: string): string | null {
  const normalized = term
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[(),.;:/\\]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized || normalized.length < 3) {
    return null;
  }

  return normalized;
}

function uniqueSearchKeywordTerms(terms: Array<string | null | undefined>): string[] {
  return [...new Set(terms.map((term) => (term ? normalizeSearchKeywordTerm(term) : null)).filter(Boolean) as string[])];
}

function isAmbiguousSingleWordKeyword(term: string): boolean {
  if (term.includes(" ")) {
    return false;
  }

  return AMBIGUOUS_SINGLE_WORD_KEYWORD_PATTERNS.some((pattern) => pattern.test(term));
}

function extractDescriptionKeywordTerms(description: string | null | undefined): string[] {
  if (!description?.trim()) {
    return [];
  }

  const words = description
    .split(/[^a-zA-Z0-9čćžšđČĆŽŠĐ-]+/)
    .map((word) => normalizeSearchKeywordTerm(word))
    .filter((word): word is string => typeof word === "string" && word.length >= 5)
    .filter((word) => !SEARCH_KEYWORD_STOP_WORDS.has(word))
    .filter((word) => !isAmbiguousSingleWordKeyword(word));

  return uniqueSearchKeywordTerms(words).slice(0, 8);
}

function buildCategoryKeywordSeeds(profile: ParsedCompanyProfile): string[] {
  const derivedPrimaryIndustry = derivePrimaryIndustry(
    profile.offeringCategories,
    profile.primaryIndustry
  );

  return sanitizeSearchKeywords([
    ...(derivedPrimaryIndustry ? PRIMARY_INDUSTRY_KEYWORDS[derivedPrimaryIndustry] ?? [] : []),
    ...profile.offeringCategories.flatMap((item) => OFFERING_CATEGORY_KEYWORDS[item] ?? []),
    ...buildSelectedSpecializationKeywordSeeds(profile),
    ...profile.preferredTenderTypes.flatMap((item) => TENDER_TYPE_KEYWORDS[item] ?? []),
  ]);
}

export function sanitizeSearchKeywords(terms: Array<string | null | undefined>): string[] {
  return uniqueSearchKeywordTerms(terms)
    .filter((term) => !genericProfileKeywordTerms.has(term))
    .filter((term) => !SEARCH_KEYWORD_STOP_WORDS.has(term))
    .slice(0, 24);
}

export function buildRecommendationKeywords({
  explicitKeywords = [],
  profile,
}: {
  explicitKeywords?: Array<string | null | undefined>;
  profile: ParsedCompanyProfile;
}): string[] {
  return sanitizeSearchKeywords([
    ...explicitKeywords,
    ...buildProfileKeywordSeeds(profile),
  ])
    .filter((term) => !isAmbiguousSingleWordKeyword(term))
    .slice(0, 18);
}

export function buildStrictRecommendationKeywords({
  explicitKeywords = [],
  profile,
}: {
  explicitKeywords?: Array<string | null | undefined>;
  profile: ParsedCompanyProfile;
}): string[] {
  const categoryKeywordSeedSet = new Set(buildCategoryKeywordSeeds(profile));
  const specializationKeywords = buildSelectedSpecializationKeywordSeeds(profile).filter(
    (term) => !isAmbiguousSingleWordKeyword(term)
  );
  const manualKeywords = sanitizeSearchKeywords(profile.manualKeywords ?? []).filter(
    (term) => !isAmbiguousSingleWordKeyword(term)
  );
  const explicitSpecificKeywords = sanitizeSearchKeywords(explicitKeywords)
    .filter((term) => !categoryKeywordSeedSet.has(term))
    .filter((term) => !isAmbiguousSingleWordKeyword(term));

  if (specializationKeywords.length > 0 || manualKeywords.length > 0 || explicitSpecificKeywords.length > 0) {
    return [...new Set([...specializationKeywords, ...manualKeywords, ...explicitSpecificKeywords])].slice(0, 12);
  }

  return sanitizeSearchKeywords([
    ...extractDescriptionKeywordTerms(profile.companyDescription ?? profile.legacyIndustryText),
  ])
    .filter((term) => !categoryKeywordSeedSet.has(term))
    .filter((term) => !isAmbiguousSingleWordKeyword(term))
    .slice(0, 12);
}

export function buildStrictRecommendationCpvCodes({
  explicitCpvCodes = [],
  profile,
}: {
  explicitCpvCodes?: Array<string | null | undefined>;
  profile: ParsedCompanyProfile;
}): string[] {
  const categorySeedSet = new Set(buildProfileCpvSeeds(profile));
  const explicitSpecificCodes = uniqueCpvCodes(explicitCpvCodes).filter(
    (code) => !categorySeedSet.has(code)
  );

  if (explicitSpecificCodes.length > 0) {
    return explicitSpecificCodes.slice(0, 12);
  }

  return [];
}

export function derivePrimaryIndustry(
  offeringCategories: string[],
  fallbackPrimaryIndustry?: string | null
): string | null {
  if (offeringCategories.length === 0) {
    return fallbackPrimaryIndustry ?? null;
  }

  const counts = new Map<string, number>();

  for (const categoryId of offeringCategories) {
    const focusId = offeringCategoryLookup.get(categoryId)?.focusId;

    if (!focusId) {
      continue;
    }

    counts.set(focusId, (counts.get(focusId) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return fallbackPrimaryIndustry ?? null;
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackPrimaryIndustry ?? null;
}

export function serializeCompanyProfile(profile: ParsedCompanyProfile): string | null {
  const manualKeywords = sanitizeSearchKeywords(profile.manualKeywords ?? []);

  const normalized: StructuredCompanyProfile = {
    version: 1,
    primaryIndustry: derivePrimaryIndustry(
      profile.offeringCategories,
      profile.primaryIndustry
    ),
    offeringCategories: [...new Set(profile.offeringCategories)],
    specializationIds: normalizeSpecializationIds(profile.specializationIds ?? [], profile.offeringCategories),
    preferredTenderTypes: [...new Set(profile.preferredTenderTypes)],
    companyDescription: profile.companyDescription?.trim() || null,
    manualKeywords,
  };

  if (
    !normalized.primaryIndustry &&
    normalized.offeringCategories.length === 0 &&
    normalized.preferredTenderTypes.length === 0 &&
    !normalized.companyDescription &&
    manualKeywords.length === 0 &&
    !profile.legacyIndustryText?.trim()
  ) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function parseCompanyProfile(industry: string | null | undefined): ParsedCompanyProfile {
  if (!industry?.trim()) {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      specializationIds: [],
      preferredTenderTypes: [],
      companyDescription: null,
      manualKeywords: [],
      legacyIndustryText: null,
    };
  }

  try {
    const parsed = JSON.parse(industry) as Partial<StructuredCompanyProfile>;
    if (parsed.version === 1) {
      return {
        primaryIndustry: parsed.primaryIndustry ?? null,
        offeringCategories: parsed.offeringCategories ?? [],
        specializationIds: normalizeSpecializationIds(
          parsed.specializationIds ?? [],
          parsed.offeringCategories ?? []
        ),
        preferredTenderTypes: parsed.preferredTenderTypes ?? [],
        companyDescription: parsed.companyDescription ?? null,
        manualKeywords: sanitizeSearchKeywords(parsed.manualKeywords ?? []),
        legacyIndustryText: null,
      };
    }
  } catch {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      specializationIds: [],
      preferredTenderTypes: [],
      companyDescription: null,
      manualKeywords: [],
      legacyIndustryText: industry,
    };
  }

  return {
    primaryIndustry: null,
    offeringCategories: [],
    specializationIds: [],
    preferredTenderTypes: [],
    companyDescription: null,
    manualKeywords: [],
    legacyIndustryText: industry,
  };
}

export function getProfileOptionLabel(optionId: string): string {
  return optionLookup.get(optionId)?.label ?? optionId;
}

export function getPreferredContractTypes(preferredTenderTypes: string[]): string[] {
  const mapping: Record<string, string> = {
    goods: "Robe",
    services: "Usluge",
    works: "Radovi",
  };

  return preferredTenderTypes
    .map((item) => mapping[item])
    .filter((item): item is string => Boolean(item));
}

function uniqueCpvCodes(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.replace(/[^0-9]/g, "") ?? "")
        .map((value) => {
          if (value.length >= 8) {
            return value.slice(0, 8);
          }

          return value;
        })
        .filter((value) => value.length >= 5)
    ),
  ];
}

export function buildProfileCpvSeeds(profile: ParsedCompanyProfile): string[] {
  const derivedPrimaryIndustry = derivePrimaryIndustry(
    profile.offeringCategories,
    profile.primaryIndustry
  );

  return uniqueCpvCodes([
    ...(derivedPrimaryIndustry ? PRIMARY_INDUSTRY_CPV_CODES[derivedPrimaryIndustry] ?? [] : []),
    ...profile.offeringCategories.flatMap((item) => OFFERING_CATEGORY_CPV_CODES[item] ?? []),
  ]).slice(0, 18);
}

export function buildProfileKeywordSeeds(profile: ParsedCompanyProfile): string[] {
  return sanitizeSearchKeywords([
    ...buildCategoryKeywordSeeds(profile),
    ...extractDescriptionKeywordTerms(profile.companyDescription ?? profile.legacyIndustryText),
  ]);
}

export function buildProfileContextText({
  description,
  primaryIndustry,
  offeringCategories,
  specializationIds = [],
  preferredTenderTypes,
  regions,
}: {
  description: string;
  primaryIndustry: string | null;
  offeringCategories: string[];
  specializationIds?: string[];
  preferredTenderTypes: string[];
  regions: string[];
}): string {
  const derivedPrimaryIndustry = derivePrimaryIndustry(offeringCategories, primaryIndustry);

  const lines = [
    derivedPrimaryIndustry ? `Fokus firme: ${getProfileOptionLabel(derivedPrimaryIndustry)}` : null,
    offeringCategories.length > 0
      ? `Ponuda firme: ${offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    specializationIds.length > 0
      ? `Uži smjerovi: ${specializationIds.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    preferredTenderTypes.length > 0
      ? `Vrste tendera: ${preferredTenderTypes.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    regions.length > 0 ? `Regije rada: ${regions.join(", ")}` : "Regije rada: cijela Bosna i Hercegovina",
    `Opis firme: ${description}`,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
