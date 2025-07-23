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
    cities: ["Alba Iulia", "Aiud", "Blaj", "Câmpeni", "Cugir", "Ocna Mureș", "Sebeș", "Zlatna", "Abrud", "Băbeni", "Băgău", "Berghin", "Bistra", "Blandiana", "Bucerdea Grânoasă", "Bucium", "Câlnic", "Cenade", "Cereza", "Ciugud", "Ciuruleasa", "Cricău", "Cut", "Daia Română", "Doștat", "Fărău", "Galda de Jos", "Gârbova", "Hopârta", "Horea", "Ighiu", "Întregalde", "Jidvei", "Livezile", "Lopadea Nouă", "Lupșa", "Meteș", "Mihalț", "Mirăslău", "Noșlac", "Ohaba", "Pianu", "Ponor", "Poșaga", "Rimetea", "Roșia de Secaș", "Roșia Montană", "Săliștea", "Sălciua", "Sâncel", "Șona", "Șpring", "Șugag", "Teiuș", "Unirea", "Vadu Moților", "Vidra", "Vinița", "Vlăhița"]
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
    cities: ["Oradea", "Beiuș", "Salonta", "Marghita", "Aleșd", "Valea lui Mihai", "Săcueni", "Nucet", "Ștei", "Vașcău", "Abram", "Aștileu", "Aușeu", "Avram Iancu", "Balc", "Batăr", "Biharia", "Boianu Mare", "Borod", "Borș", "Bratca", "Brusturi", "Budureasa", "Buduslău", "Bulz", "Buntești", "Căbești", "Câmpani", "Căpâlna", "Cărpinet", "Cefa", "Ceica", "Cetariu", "Cherechiu", "Chișlaz", "Ciumeghiu", "Cociuba Mare", "Copăcel", "Criștioru de Jos", "Curățele", "Curtuișeni", "Derna", "Diosig", "Dobrești", "Drăgănești", "Drăgești", "Finiș", "Gepiu", "Girișu de Criș", "Hidișelu de Sus", "Holod", "Husasău de Tinca", "Ineu", "Lăzăreni", "Lazuri de Beiuș", "Lugașu de Jos", "Lunca", "Mădăras", "Măgești", "Nojorid", "Olcea", "Oșorhei", "Paleu", "Petreu", "Pietroasa", "Pocola", "Pomezeu", "Popești", "Răbăgani", "Remetea", "Rieni", "Roșia", "Roșiori", "Sâmbăta", "Sâniob", "Sânnicolau Român", "Sânmartin", "Sântandrei", "Sârbi", "Săcădat", "Sălacea", "Sălard", "Spinuș", "Suplacu de Barcău", "Șimian", "Șinteu", "Șoimi", "Șuncuiuș", "Tămășeu", "Tărcaia", "Tarcea", "Tăuteu", "Tileagd", "Tinca", "Toboliu", "Tulca", "Țețchea", "Uileacu de Beiuș", "Vadu Crișului", "Vârciorog", "Viișoara"]
  },
  {
    code: "BN",
    name: "Bistrița-Năsăud",
    cities: ["Bistrița", "Beclean", "Năsăud", "Sângeorz-Băi", "Bistrița Bârgăului", "Braniștea", "Budacu de Jos", "Budești", "Căianu Mic", "Cetate", "Chiochiș", "Chiuza", "Ciceu-Giurgești", "Ciceu-Mihăiești", "Coșbuc", "Dumitra", "Dumitrița", "Feldru", "Galații Bistriței", "Ilva Mare", "Ilva Mică", "Josenii Bârgăului", "Leșu", "Lechința", "Livezile", "Lunca Ilvei", "Maieru", "Matei", "Măgura Ilvei", "Mărișelu", "Miceștii de Câmpie", "Milaș", "Monor", "Negrilești", "Nimigea", "Nușeni", "Parva", "Petru Rareș", "Poiana Ilvei", "Prundu Bârgăului", "Rebra", "Rebrișoara", "Rodna", "Romuli", "Runcu Salvei", "Salva", "Sânmihaiu de Câmpie", "Șieu", "Șieu-Odorhei", "Șieu-Măgheruș", "Șieuț", "Șintereag"]
  },
  {
    code: "BT",
    name: "Botoșani", 
    cities: ["Botoșani", "Dorohoi", "Darabani", "Săveni", "Flămânzi", "Ștefănești", "Bucecea", "Albești", "Avrămeni", "Băluşeni", "Blândești", "Boscoteni", "Brăești", "Broscăuți", "Budești", "Cândești", "Copalău", "Copălău", "Cordareni", "Coșula", "Cristești", "Cristinești", "Curteşti", "Dărmănești", "Drăgușeni", "Dumeni", "Frumușica", "George Enescu", "Gorban", "Hălăucești", "Havârna", "Hilișeu-Horia", "Hlipiceni", "Hudești", "Ibănești", "Leorda", "Lozna", "Lunca", "Manoleasa", "Mihăileni", "Mihai Eminescu", "Mitoc", "Nicșeni", "Păltinoasa", "Pomîrla", "Prăjești", "Răchiți", "Ripiceni", "Roma", "Românești", "Răuseni", "Santa Mare", "Sendriceni", "Șendriceni", "Suharău", "Ștefănești", "Stăuceni", "Suceava", "Todireni", "Trușești", "Tudora", "Ungureni", "Vârfu Câmpului", "Văculești", "Vorona"]
  },
  {
    code: "BV",
    name: "Brașov",
    cities: ["Brașov", "Făgăraș", "Săcele", "Codlea", "Zărnești", "Râșnov", "Predeal", "Victoria", "Ghimbav", "Augustin", "Beclean", "Bod", "Bran", "Brasov", "Budila", "Bunești", "Căpățânenii Pământeni", "Căpățânenii Ungureni", "Cincu", "Crizbav", "Dăbâca", "Dumbravița", "Feldioara", "Fundata", "Gârcini", "Hălchiu", "Hărman", "Hinog", "Holbav", "Hoghiz", "Homorod", "Hârtibaciu", "Iarăș", "Jibert", "Lisa", "Măieruș", "Mândra", "Mărgineni", "Ormenis", "Părău", "Pătrăuți", "Persani", "Poiana Mărului", "Prejmer", "Purcăreni", "Recea", "Rodbav", "Rotbav", "Rupea", "Sânpetru", "Șercaia", "Șinca", "Șimon", "Teliu", "Tohanu Nou", "Tormac", "Ucea de Jos", "Ucea de Sus", "Ungra", "Vama Buzăului", "Viștea de Jos", "Viștea de Sus", "Voila", "Voronet", "Vulcan"]
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
    cities: ["Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla", "Huedin", "Apahida", "Baciu", "Băișoara", "Beliș", "Bobâlna", "Borșa", "Buza", "Călățele", "Căpușu Mare", "Cătina", "Chinteni", "Ciurila", "Cojocna", "Cornești", "Cuzdrioara", "Dăbâca", "Feleacu", "Florești", "Frata", "Fundătura", "Gârbău", "Geaca", "Gilău", "Hasdate", "Iara", "Iclod", "Jichișu de Jos", "Jucu", "Luna", "Luna de Sus", "Măcicașu", "Mărgău", "Mărișelu", "Mihai Viteazu", "Mintiu Gherlii", "Mociu", "Moldovenești", "Negreni", "Palatca", "Panticeu", "Petreștii de Jos", "Ploscoș", "Pomoșten", "Răscruci", "Recea-Cristur", "Rișca", "Sâncraiu", "Sânmărtin", "Sânpaul", "Sălicea", "Săliștea", "Sălișcan", "Savadisla", "Suatu", "Tritenii de Jos", "Tureni", "Unguraș", "Vad", "Valea Ierii", "Valea Florilor", "Viișoara", "Vișea", "Vlaha"]
  },
  {
    code: "CT",
    name: "Constanța",
    cities: ["Constanța", "Mangalia", "Medgidia", "Năvodari", "Cernavodă", "Eforie", "Techirghiol", "Murfatlar", "Ovidiu", "Băneasa", "Cobadin", "Cumpăna", "Adamclisi", "Albeşti", "23 August", "Bărăganu", "Canlia", "Castelu", "Cerchezu", "Chirnogi", "Ciobanu", "Ciocârlia", "Corbu", "Costinești", "Crucea", "Cuza Vodă", "Deleni", "Dorobanțu", "Dunărea", "Ghindarești", "Grădina", "Horia", "Independența", "Ion Corvin", "Istria", "Limanu", "Lipnița", "Lumina", "Mereni", "Mihai Viteazul", "Mihail Kogălniceanu", "Mircea Vodă", "Negru Vodă", "Nicolae Bălcescu", "Oltina", "Ostrov", "Pantelimon", "Peștera", "Poarta Albă", "Rasova", "Saligny", "Săcele", "Seimeni", "Ștefan cel Mare", "Tăgân", "Târgușor", "Topraisar", "Tortoman", "Tuzla", "Vadu", "Valea Dacilor", "Valea Nucarilor", "Vama Veche", "Vânători"]
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
    cities: ["Iași", "Pașcani", "Hârlău", "Târgu Frumos", "Podu Iloaiei", "Andrieșeni", "Aroneanu", "Bahna", "Bălțați", "Bârnova", "Belcești", "Bivolari", "Boghicea", "Brăești", "Broscăuți", "Bulbucani", "Căiuți", "Ciohorăni", "Ciortești", "Ciurea", "Coarnele Caprei", "Comarna", "Cotnari", "Cozma", "Cristești", "Cucuteni", "Deleni", "Dolhești", "Drăgușeni", "Dumeștii de Jos", "Erbiceni", "Extravere", "Focuri", "Grajduri", "Gropnița", "Guliaie", "Halăucești", "Helesteni", "Holboca", "Hostărie", "Ipatele", "Lespezi", "Letcani", "Lungani", "Mădârjac", "Măgureai", "Mirceștii de Sus", "Miroslava", "Mogosești", "Moldoveni", "Moțca", "Movileni", "Oțeleni", "Plugari", "Popești", "Popricani", "Priești", "Probota", "Răducăneni", "Rediu", "Roșcani", "Sârca", "Săveni", "Scânteia", "Șcheia", "Sinești", "Sirețel", "Știntești", "Stolniceni-Prăjăilă", "Șuletea", "Tibana", "Tomeștii de Sus", "Tomșani", "Trifești", "Țuțora", "Ungheni", "Valea Lupului", "Valea Seacă", "Victoria", "Voineasa", "Voinești"]
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
    cities: ["Ploiești", "Câmpina", "Băicoi", "Mizil", "Vălenii de Munte", "Sinaia", "Bușteni", "Azuga", "Breaza", "Comarnic", "Plopeni", "Slănic", "Urlați", "Adunatii-Copaceni", "Albești-Paleologu", "Apostolache", "Ariceștii-Rahtivani", "Bărcănești", "Bărcănești", "Berceni", "Bertea", "Boldești-Scăeni", "Brazi", "Bucov", "Cărbunești", "Ceairu", "Cerasu", "Chiojdeanca", "Ciocănești", "Cocorăștii-Colț", "Colceag", "Cornu", "Doftana", "Drăgănești", "Drajna", "Dumbrăvești", "Filipeștii de Pădure", "Filipeștii de Sus", "Florești", "Gherghița", "Gornet-Cricov", "Gorgota", "Gura Vadului", "Gura Vitioarei", "Izvoarele", "Jugureni", "Lapos", "Lipănești", "Măgurele", "Măgureni", "Măneciu", "Mănești", "Olari", "Păcureți", "Păulești", "Pietrărel", "Plopu", "Posești", "Predeal-Sărari", "Provița de Jos", "Provița de Sus", "Puchenii Mari", "Râfov", "Salcia", "Sângeru", "Scorteni", "Șirna", "Șoimarii", "Șotrile", "Starchiojd", "Surani", "Talea", "Tămașani", "Teișani", "Tinosu", "Tomșani", "Tufeni", "Vadu Săpat", "Varbilău", "Vipla"]
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
    cities: ["Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia", "Făget", "Deta", "Buziaș", "Ciacova", "Gătaia", "Recaș", "Sânpetru Mare", "Avram Iancu", "Baciu", "Băcești", "Barna", "Becicherecu Mic", "Beled", "Bethausen", "Biertan", "Birda", "Bodzaș", "Bogda", "Boldur", "Brestovăț", "Bucovăț", "Călacea", "Căpălnaș", "Cărpiniș", "Cenad", "Chevereșu Mare", "Comloșu Mare", "Coșava", "Coștei", "Criciova", "Cutina", "Darova", "Dudeștii Noi", "Dudeștii Vechi", "Dumbrăvița", "Fârdea", "Fărășești", "Fibișu", "Foeni", "Gavojdia", "Ghilad", "Ghiroda", "Giarmata", "Giroc", "Giulvăz", "Gottlob", "Jamu Mare", "Jebel", "Lenauheim", "Liebling", "Livezile", "Lovrin", "Mănăștiur", "Margina", "Masliaca", "Moșnița Nouă", "Murani", "Nădrag", "Nitchidorf", "Ohaba Lungă", "Orlat", "Orțișoara", "Parța", "Pătruțești", "Peciu Nou", "Peregu Mare", "Pesac", "Pietroasa", "Pișchiei", "Radna", "Recea", "Remetea Mare", "Roma", "Românești", "Sacoșu Turcesc", "Șag", "Șandra", "Săcălaz", "Sânandrei", "Sânmihaiu Român", "Secaș", "Semlac", "Șoșdea", "Stamora Moravița", "Stiuca", "Șuștra", "Teremia Mare", "Tomeștii Mari", "Topolovățu Mare", "Traian Vuia", "Uivar", "Utvin", "Variaș", "Voiteni", "Voiteg"]
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