// 64 Bangalore areas with a one-line hook. Pairs (2k, 2k+1) are round-of-64 matchups.
// Regions/seeding are a first pass, to be revisited.
const AREAS_META = [
  ["Indiranagar","100 Feet Road pubs"],["Koramangala","Startup HQ"],
  ["HSR Layout","Founders on cycles"],["BTM Layout","PG capital"],
  ["Jayanagar","4th Block shopping"],["JP Nagar","Jayanagar's sibling"],
  ["Malleshwaram","CTR benne dosa"],["Rajajinagar","Old West Bangalore"],
  ["Basavanagudi","Bull Temple, DVG Road"],["Banashankari","BDA complex"],
  ["Whitefield","ITPL and traffic"],["Marathahalli","The bridge"],
  ["Electronic City","Infosys land"],["Bommanahalli","Hosur Road hustle"],
  ["Hebbal","Flyover and lake"],["Yelahanka","Air show town"],
  ["Frazer Town","Ramzan street food"],["Cox Town","Quiet cantonment"],
  ["Richmond Town","Colonial bungalows"],["Langford Town","Old-school calm"],
  ["Sadashivanagar","Old money"],["RT Nagar","North side staple"],
  ["Ulsoor","The lake"],["Domlur","Flyover junction"],
  ["Bellandur","Big towers, bigger lake"],["Sarjapur Road","Gated communities"],
  ["Kammanahalli","Kerala food street"],["Kalyan Nagar","Cafe hopping"],
  ["Vijayanagar","West side market"],["Basaveshwaranagar","Family favourite"],
  ["Banaswadi","Railway and rent"],["Ramamurthy Nagar","Up-and-coming east"],
  ["Shivajinagar","Russell Market"],["Vasanth Nagar","Palace Grounds"],
  ["Seshadripuram","Old college belt"],["Gandhinagar","Majestic buzz"],
  ["Chickpet","Wholesale everything"],["Chamarajpet","Oldest petes"],
  ["KR Puram","Hanging bridge"],["Mahadevapura","Tech parks"],
  ["Hennur","New-age cafes"],["Thanisandra","Manyata's backyard"],
  ["Yeshwanthpur","Metro and markets"],["Mathikere","IISc's neighbour"],
  ["Kengeri","End of the line"],["RR Nagar","Rajarajeshwari temple"],
  ["Bannerghatta Road","Zoo road"],["Arekere","Lakeside south"],
  ["Kanakapura Road","Metro to the hills"],["Uttarahalli","South hills"],
  ["Wilson Garden","Old south charm"],["Shanthinagar","Double Road"],
  ["CV Raman Nagar","DRDO town"],["Old Airport Road","HAL memories"],
  ["Sanjaynagar","Leafy and quiet"],["Vidyaranyapura","Far north calm"],
  ["Brookefield","Mall and lakes"],["Varthur","Lake country"],
  ["Jalahalli","HMT and air force"],["Peenya","Industrial muscle"],
  ["Magadi Road","Old west artery"],["Nagarbhavi","NLSIU campus"],
  ["Cooke Town","Heritage lanes"],["Benson Town","Cantonment greens"]
];
const AREAS = AREAS_META.map(a => a[0]);
const ROUNDS = [
  {name:"Round of 64",    short:"R64", start:0,  count:32, pts:1},
  {name:"Round of 32",    short:"R32", start:32, count:16, pts:2},
  {name:"Round of 16",    short:"R16", start:48, count:8,  pts:4},
  {name:"Quarter-finals", short:"QF",  start:56, count:4,  pts:8},
  {name:"Semi-finals",    short:"SF",  start:60, count:2,  pts:16},
  {name:"Final",          short:"F",   start:62, count:1,  pts:32}
];
