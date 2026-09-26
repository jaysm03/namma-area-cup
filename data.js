// 64 Bangalore areas, paired as 32 round-of-64 matchups (neighbourhood rivalries)
const PAIRS = [
  ["Indiranagar","Koramangala"],["HSR Layout","BTM Layout"],["Jayanagar","JP Nagar"],["Malleshwaram","Rajajinagar"],
  ["Basavanagudi","Banashankari"],["Whitefield","Marathahalli"],["Electronic City","Bommanahalli"],["Hebbal","Yelahanka"],
  ["Frazer Town","Cox Town"],["Richmond Town","Langford Town"],["Sadashivanagar","RT Nagar"],["Ulsoor","Domlur"],
  ["Bellandur","Sarjapur Road"],["Kammanahalli","Kalyan Nagar"],["Vijayanagar","Basaveshwaranagar"],["Banaswadi","Ramamurthy Nagar"],
  ["Shivajinagar","Vasanth Nagar"],["Seshadripuram","Gandhinagar"],["Chickpet","Chamarajpet"],["KR Puram","Mahadevapura"],
  ["Hennur","Thanisandra"],["Yeshwanthpur","Mathikere"],["Kengeri","RR Nagar"],["Bannerghatta Road","Arekere"],
  ["Kanakapura Road","Uttarahalli"],["Wilson Garden","Shanthinagar"],["CV Raman Nagar","Old Airport Road"],["Sanjaynagar","Vidyaranyapura"],
  ["Brookefield","Varthur"],["Jalahalli","Peenya"],["Magadi Road","Nagarbhavi"],["Cooke Town","Benson Town"]
];
const AREAS = PAIRS.flat();
const ROUNDS = [
  {name:"Round of 64", slug:"r64", start:0,  count:32},
  {name:"Round of 32", slug:"r32", start:32, count:16},
  {name:"Sweet 16",    slug:"r16", start:48, count:8},
  {name:"Quarterfinals",slug:"qf", start:56, count:4},
  {name:"Semifinals",  slug:"sf",  start:60, count:2},
  {name:"Final",       slug:"final",start:62, count:1}
];
