// Romanian administrative divisions data for location dropdowns

export interface County {
  code: string;
  name: string;
  cities: string[];
}

// Complete list of Romanian counties (județe) with major cities
export const romanianCounties: County[] = [
  {
    code: "AB",
    name: "Alba",
    cities: ["Alba Iulia", "Aiud", "Blaj", "Câmpeni", "Cugir", "Ocna Mureș", "Sebeș", "Zlatna"]
  },
  {
    code: "AR", 
    name: "Arad",
    cities: ["Arad", "Chișineu-Criș", "Curtici", "Ineu", "Lipova", "Nădlac", "Pecica", "Sântana"]
  },
  {
    code: "AG",
    name: "Argeș", 
    cities: ["Pitești", "Câmpulung", "Curtea de Argeș", "Mioveni", "Ștefănești", "Costești", "Topoloveni"]
  },
  {
    code: "BC",
    name: "Bacău",
    cities: ["Bacău", "Moinești", "Onești", "Comănești", "Buhuși", "Slănic-Moldova", "Târgu Ocna"]
  },
  {
    code: "BH", 
    name: "Bihor",
    cities: ["Oradea", "Beiuș", "Salonta", "Marghita", "Aleșd", "Valea lui Mihai", "Săcueni"]
  },
  {
    code: "BN",
    name: "Bistrița-Năsăud",
    cities: ["Bistrița", "Beclean", "Năsăud", "Sângeorz-Băi", "Rodna", "Sângeorziu de Pădure"]
  },
  {
    code: "BT",
    name: "Botoșani", 
    cities: ["Botoșani", "Dorohoi", "Darabani", "Săveni", "Flămânzi", "Ștefănești", "Bucecea"]
  },
  {
    code: "BV",
    name: "Brașov",
    cities: ["Brașov", "Făgăraș", "Săcele", "Codlea", "Zărnești", "Râșnov", "Predeal", "Victoria"]
  },
  {
    code: "BR",
    name: "Brăila",
    cities: ["Brăila", "Ianca", "Însurăței", "Faurei"]
  },
  {
    code: "B",
    name: "București",
    cities: ["București", "Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6"]
  },
  {
    code: "BZ",
    name: "Buzău",
    cities: ["Buzău", "Râmnicu Sărat", "Nehoiu", "Pogoanele", "Pătârlagele"]
  },
  {
    code: "CS",
    name: "Caraș-Severin",
    cities: ["Reșița", "Caransebeș", "Lugoj", "Moldova Nouă", "Oțelu Roșu", "Anina", "Băile Herculane"]
  },
  {
    code: "CL",
    name: "Călărași",
    cities: ["Călărași", "Oltenița", "Fundulea", "Lehliu Gară", "Budești"]
  },
  {
    code: "CJ",
    name: "Cluj",
    cities: ["Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla", "Huedin"]
  },
  {
    code: "CT",
    name: "Constanța",
    cities: ["Constanța", "Mangalia", "Medgidia", "Năvodari", "Cernavodă", "Eforie", "Techirghiol", "Murfatlar"]
  },
  {
    code: "CV",
    name: "Covasna",
    cities: ["Sfântu Gheorghe", "Târgu Secuiesc", "Covasna", "Baraolt", "Întorsura Buzăului"]
  },
  {
    code: "DB",
    name: "Dâmbovița",
    cities: ["Târgoviște", "Moreni", "Pucioasa", "Găești", "Fieni", "Titu", "Răzvad"]
  },
  {
    code: "DJ",
    name: "Dolj",
    cities: ["Craiova", "Băilești", "Calafat", "Filiași", "Dăbuleni", "Segarcea"]
  },
  {
    code: "GL",
    name: "Galați",
    cities: ["Galați", "Tecuci", "Târgu Bujor", "Berești"]
  },
  {
    code: "GR",
    name: "Giurgiu",
    cities: ["Giurgiu", "Bolintin-Vale", "Mihăilești"]
  },
  {
    code: "GJ",
    name: "Gorj",
    cities: ["Târgu Jiu", "Motru", "Rovinari", "Novaci", "Țicleni", "Bumbești-Jiu"]
  },
  {
    code: "HR",
    name: "Harghita", 
    cities: ["Miercurea Ciuc", "Odorheiu Secuiesc", "Gheorgheni", "Toplița", "Cristuru Secuiesc", "Bălan"]
  },
  {
    code: "HD",
    name: "Hunedoara",
    cities: ["Deva", "Hunedoara", "Petroșani", "Lupeni", "Vulcan", "Petrila", "Orăștie", "Brad"]
  },
  {
    code: "IL",
    name: "Ialomița",
    cities: ["Slobozia", "Fetești", "Urziceni", "Țăndărei", "Amara"]
  },
  {
    code: "IS",
    name: "Iași",
    cities: ["Iași", "Pașcani", "Hârlău", "Târgu Frumos", "Podu Iloaiei"]
  },
  {
    code: "IF",
    name: "Ilfov",
    cities: ["București", "Buftea", "Voluntari", "Pantelimon", "Popești-Leordeni", "Chitila", "Otopeni", "Măgurele"]
  },
  {
    code: "MM",
    name: "Maramureș",
    cities: ["Baia Mare", "Sighetu Marmației", "Borșa", "Vișeu de Sus", "Târgu Lăpuș", "Săliștea de Sus"]
  },
  {
    code: "MH",
    name: "Mehedinți", 
    cities: ["Drobeta-Turnu Severin", "Orșova", "Strehaia", "Vânju Mare"]
  },
  {
    code: "MS",
    name: "Mureș",
    cities: ["Târgu Mureș", "Reghin", "Sighișoara", "Târnăveni", "Luduș", "Iernut"]
  },
  {
    code: "NT",
    name: "Neamț",
    cities: ["Piatra Neamț", "Roman", "Târgu Neamț", "Bicaz", "Roznov"]
  },
  {
    code: "OT",
    name: "Olt",
    cities: ["Slatina", "Caracal", "Balș", "Corabia", "Piatra-Olt", "Drăgănești-Olt"]
  },
  {
    code: "PH",
    name: "Prahova",
    cities: ["Ploiești", "Câmpina", "Băicoi", "Mizil", "Vălenii de Munte", "Sinaia", "Bușteni", "Azuga"]
  },
  {
    code: "SM",
    name: "Satu Mare",
    cities: ["Satu Mare", "Carei", "Negrești-Oaș", "Tășnad", "Livada", "Ardud"]
  },
  {
    code: "SJ",
    name: "Sălaj",
    cities: ["Zalău", "Șimleu Silvaniei", "Jibou", "Cehu Silvaniei"]
  },
  {
    code: "SB",
    name: "Sibiu",
    cities: ["Sibiu", "Mediaș", "Cisnădie", "Dumbrăveni", "Copșa Mică", "Tălmaciu", "Avrig"]
  },
  {
    code: "SV",
    name: "Suceava",
    cities: ["Suceava", "Botoșani", "Fălticeni", "Rădăuți", "Câmpulung Moldovenesc", "Vatra Dornei", "Gura Humorului"]
  },
  {
    code: "TR",
    name: "Teleorman",
    cities: ["Alexandria", "Rosiori de Vede", "Turnu Măgurele", "Zimnicea", "Videle"]
  },
  {
    code: "TM",
    name: "Timiș",
    cities: ["Timișoara", "Lugoj", "Caransebeș", "Sânnicolau Mare", "Jimbolia", "Făget", "Deta"]
  },
  {
    code: "TL",
    name: "Tulcea",
    cities: ["Tulcea", "Măcin", "Babadag", "Sulina", "Isaccea"]
  },
  {
    code: "VS",
    name: "Vaslui",
    cities: ["Vaslui", "Bârlad", "Huși", "Negrești", "Murgeni"]
  },
  {
    code: "VL",
    name: "Vâlcea",
    cities: ["Râmnicu Vâlcea", "Drăgășani", "Băbeni", "Călimănești", "Horezu", "Brezoi"]
  },
  {
    code: "VN",
    name: "Vrancea",
    cities: ["Focșani", "Adjud", "Panciu", "Mărășești", "Odobești"]
  }
];

// Get cities for a specific county
export const getCitiesForCounty = (countyCode: string): string[] => {
  const county = romanianCounties.find(c => c.code === countyCode);
  return county ? county.cities : [];
};

// Get county name by code
export const getCountyName = (countyCode: string): string => {
  const county = romanianCounties.find(c => c.code === countyCode);
  return county ? county.name : countyCode;
};

// Get all county options for dropdown
export const getCountyOptions = () => {
  return romanianCounties.map(county => ({
    value: county.name,
    label: county.name,
    code: county.code
  }));
};